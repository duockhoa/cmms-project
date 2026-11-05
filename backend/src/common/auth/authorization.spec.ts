import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { JwtAuthGuard } from '../../modules/auth/jwt-auth.guard';
import { AUTHENTICATED_REQUEST, getRoutePolicy, ROUTE_POLICIES } from './route-policy';
import { ALL_PERMISSION_CODES } from '../constants/permissions.registry';
import { effectivePermissionCodes, hasPermission, isGlobalAdmin } from '../utils/rbac.helper';
import { scopedReader } from './scoped-reader';
import { ResourceAccessService } from './resource-access.service';

describe('API authorization inventory', () => {
  it('covers every decorated HTTP handler with known permission codes', () => {
    const root = path.resolve(__dirname, '../..');
    const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap(item => item.isDirectory() ? walk(path.join(dir, item.name)) : [path.join(dir, item.name)]);
    const missing: string[] = [];
    let count = 0;
    for (const file of walk(root).filter(file => file.endsWith('.controller.ts'))) {
      const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
      source.forEachChild(node => {
        if (!ts.isClassDeclaration(node) || !node.name) return;
        for (const method of node.members) {
          if (!ts.isMethodDeclaration(method)) continue;
          const http = (ts.getDecorators(method) || []).some(decorator => ts.isCallExpression(decorator.expression) && /^(Get|Post|Put|Patch|Delete|All|Options|Head)$/.test(decorator.expression.expression.getText(source)));
          if (!http) continue;
          count++;
          const key = `${node.name.text}.${method.name.getText(source)}`;
          if (!ROUTE_POLICIES[key]) missing.push(key);
        }
      });
    }
    expect(count).toBeGreaterThan(240);
    expect(missing).toEqual([]);
    for (const policy of Object.values(ROUTE_POLICIES)) {
      for (const code of policy.any || []) expect(ALL_PERMISSION_CODES).toContain(code);
      expect(Boolean(policy.public || policy.authenticated || policy.any?.length)).toBe(true);
    }
    expect(getRoutePolicy('NewController', 'unreviewedWrite')).toBeUndefined();
  });
});

describe('shared RBAC decisions', () => {
  const actor = { id: 'u', role: 'ADMIN', isActive: true, customRole: { isActive: false, permissions: '["*"]' }, customPermissions: '["equipment:view"]' };
  it('disabled role removes legacy admin bypass but preserves explicit individual grants', () => {
    expect(isGlobalAdmin(actor)).toBe(false);
    expect(hasPermission(actor, 'equipment:delete')).toBe(false);
    expect(hasPermission(actor, 'equipment:view')).toBe(true);
    expect(effectivePermissionCodes(actor)).toEqual(['equipment:view']);
  });
  it('local suspension wins over administrator and wildcard privileges', () => {
    for (const override of [{ isActive: false }, { accessBlocked: true }]) {
      expect(hasPermission({ id: 'u', role: 'ADMIN', ...override }, 'settings:roles')).toBe(false);
    }
  });
  it('malformed role grants never authorize actions', () => {
    for (const permissions of ['{}', 'null', '"*"', 'invalid']) {
      expect(hasPermission({ id: 'u', role: 'USER', customPermissions: permissions }, 'equipment:delete')).toBe(false);
    }
  });
});

describe('machine credential isolation', () => {
  const original = process.env.EVN_SYNC_API_KEY;
  afterEach(() => { if (original === undefined) delete process.env.EVN_SYNC_API_KEY; else process.env.EVN_SYNC_API_KEY = original; });
  const context = (controller: string, handler: string, request: any): any => ({ getClass: () => ({ name: controller }), getHandler: () => ({ name: handler }), switchToHttp: () => ({ getRequest: () => request }) });
  it('allows configured EVN key only on the EVN sync POST with a limited actor', async () => {
    process.env.EVN_SYNC_API_KEY = 'tests-only';
    const resources: any = { assertRequest: jest.fn() };
    const guard = new JwtAuthGuard(resources);
    const request: any = { method: 'POST', headers: { 'x-api-key': 'tests-only' } };
    await expect(guard.canActivate(context('UtilitiesController', 'syncEvnReadings', request))).resolves.toBe(true);
    expect(request.user.role).toBe('SERVICE');
    expect(hasPermission(request.user, 'settings:roles')).toBe(false);
    expect(request[AUTHENTICATED_REQUEST]).toBe(true);
    await expect(guard.canActivate(context('UsersController', 'updateRole', { method: 'PATCH', headers: request.headers }))).rejects.toMatchObject({ status: 403 });
    await expect(guard.canActivate(context('UtilitiesController', 'syncEvnReadings', { method: 'GET', headers: request.headers }))).rejects.toMatchObject({ status: 403 });
  });
  it('has no default machine password and denies unreviewed endpoints', async () => {
    delete process.env.EVN_SYNC_API_KEY;
    const guard = new JwtAuthGuard({} as any);
    await expect(guard.canActivate(context('UtilitiesController', 'syncEvnReadings', { method: 'POST', headers: { 'x-api-key': 'anything' } }))).rejects.toMatchObject({ status: 401 });
    await expect(guard.canActivate(context('UnknownController', 'write', { headers: {} }))).rejects.toMatchObject({ status: 403 });
  });
});

describe('resource scope and native MCP', () => {
  const actor = { id: 'u', role: 'USER', department: 'QA', isActive: true, customPermissions: '["equipment:view"]' };
  it('denies foreign equipment and creation outside known departments', async () => {
    const prisma: any = { equipment: { findFirst: jest.fn().mockResolvedValue(null) } };
    const resources = new ResourceAccessService(prisma);
    await expect(resources.assertRequest('EquipmentController', { user: actor, params: { id: 'foreign' } })).rejects.toMatchObject({ status: 403 });
    expect(prisma.equipment.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { AND: [{ id: 'foreign' }, { department: { in: ['QA'] } }] } }));
    await expect(resources.assertRequest('EquipmentController', { user: { ...actor, department: null }, body: { department: 'QA' } })).rejects.toMatchObject({ status: 403 });
  });
  it('filters MCP query scope, strips unauthorized relations and forbids SQL and writes', async () => {
    const prisma: any = { equipment: { findFirst: jest.fn().mockResolvedValue(null) } };
    const db = scopedReader(prisma, actor);
    await db.equipment.findUnique({ where: { id: 'eq' }, include: { requests: true } });
    expect(prisma.equipment.findFirst).toHaveBeenCalledWith({ where: { AND: [{ id: 'eq' }, { department: { in: ['QA'] } }] }, include: { requests: false } });
    expect(() => db.maintenanceRequest.findMany()).toThrow();
    expect(() => db.equipment.delete({ where: { id: 'eq' } })).toThrow();
    expect(() => db.$queryRawUnsafe('SELECT * FROM User')).toThrow();
  });
  it('rechecks mutated session grants instead of keeping old privileges', () => {
    const principal = { ...actor };
    const db = scopedReader({}, principal);
    principal.customPermissions = '[]';
    expect(() => db.equipment.findMany()).toThrow();
  });
});
