import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { UserMergeService } from './user-merge.service';
import { mergedUserIds, userMergeReferences } from './user-merge.references';
import { selectHrmIdentity } from '../auth/identity-resolution';

describe('manual user merge', () => {
  let tables: Record<string, any[]>;
  let database: any;
  let service: UserMergeService;
  const matches = (row: any, where: any = {}): boolean => Object.entries(where).every(([field, value]: [string, any]) => {
    if (field === 'OR') return value.some((condition: any) => matches(row, condition));
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if ('in' in value) return value.in.includes(row[field]);
      if ('not' in value) return value.not === Prisma.DbNull ? row[field] != null : row[field] !== value.not;
      if ('equals' in value) return JSON.stringify(row[field]) === JSON.stringify(value.equals);
    }
    return value === null ? row[field] == null : row[field] === value;
  });
  beforeEach(() => {
    tables = {};
    database = { $queryRaw: jest.fn() };
    for (const model of Prisma.dmmf.datamodel.models) {
      const name = model.name[0].toLowerCase() + model.name.slice(1);
      tables[name] = [];
      const updateRow = (row: any, data: any) => {
        for (const [field, value] of Object.entries(data)) row[field] = value && typeof value === 'object' && 'increment' in value ? row[field] + (value as any).increment : structuredClone(value);
        return structuredClone(row);
      };
      database[name] = {
        findUnique: jest.fn(async ({ where }: any) => structuredClone(tables[name].find(row => matches(row, where)) || null)),
        count: jest.fn(async ({ where }: any) => tables[name].filter(row => matches(row, where)).length),
        findMany: jest.fn(async ({ where, select, cursor, skip = 0, take = 500 }: any) => {
          let rows = tables[name].filter(row => matches(row, where)).sort((first, second) => first.id.localeCompare(second.id));
          if (cursor) rows = rows.slice(rows.findIndex(row => row.id === cursor.id) + skip);
          return structuredClone(rows.slice(0, take).map(row => select ? Object.fromEntries(Object.entries(row).filter(([field]) => select[field])) : row));
        }),
        create: jest.fn(async ({ data }: any) => {
          const row = { id: randomUUID(), createdAt: new Date(), ...structuredClone(data) };
          tables[name].push(row);
          return structuredClone(row);
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const row = tables[name].find(row => matches(row, where));
          if (!row) throw new Error('Record not found');
          return updateRow(row, data);
        }),
        updateMany: jest.fn(async ({ where, data }: any) => {
          const rows = tables[name].filter(row => matches(row, where));
          rows.forEach(row => updateRow(row, data));
          return { count: rows.length };
        }),
      };
    }
    database.$transaction = jest.fn(async (operation: any) => {
      const previous = structuredClone(tables);
      try { return await operation(database); } catch (error) { tables = previous; throw error; }
    });
    tables.user = [
      { id: 'actor', name: 'Administrator', email: 'admin@example.test', role: 'ADMIN', isActive: true, version: 1, mergedIntoId: null },
      { id: 'source', name: 'Original Name', email: 'old@example.test', hrmId: null, dataSource: 'HRM', role: 'ADMIN', isActive: false, version: 2, mergedIntoId: null, customPermissions: '["settings:roles"]' },
      { id: 'target', name: 'Current Name', email: 'new@example.test', hrmId: 'external', role: 'USER', isActive: true, accessBlocked: false, version: 3, mergedIntoId: null, customPermissions: '["equipment:view"]' },
    ];
    tables.workOrder = [{ id: 'order', assignedTechnicianId: 'source', assignedTechnicianIds: ['source', 'target'], supporterIds: ['source-other'], version: 5 }];
    tables.fabricationProgressLog = [{ id: 'log', userId: 'source', userName: 'Original Name' }];
    tables.workflowHistory = [{ id: 'history', performedById: 'source', actedById: 'source' }];
    tables.notification = [{ id: 'notification', userId: 'source' }];
    service = new UserMergeService(database);
  });
  const preview = () => service.preview({ sourceUserId: 'source', targetUserId: 'target' }, 'actor');
  const confirmation = (previewId: string) => ({ previewId, reason: 'Tài khoản trùng do đăng nhập cũ', evidence: 'Đã đối chiếu hồ sơ nhân viên và mã HRM external', confirmed: true });

  it('previews exact references without modifying users, permissions or business records', async () => {
    const users = structuredClone(tables.user);
    const result = await preview();
    expect(result.blockers).toEqual([]);
    expect(result.totalReferences).toBe(6);
    expect(result.totalRecords).toBe(4);
    expect(tables.user).toEqual(users);
    expect(tables.workOrder[0].assignedTechnicianId).toBe('source');
    expect(database.user.updateMany).not.toHaveBeenCalled();
    expect(tables.userMergePreview).toHaveLength(1);
  });

  it('moves foreign keys, non-FK IDs and exact JSON members in one transaction with an audit ledger', async () => {
    const result = await service.confirm(confirmation((await preview()).previewId), 'actor');
    expect(result.totalRecords).toBe(4);
    expect(tables.workOrder[0]).toMatchObject({ assignedTechnicianId: 'target', assignedTechnicianIds: ['target'], supporterIds: ['source-other'], version: 6 });
    expect(tables.fabricationProgressLog[0]).toMatchObject({ userId: 'target', userName: 'Original Name' });
    expect(tables.workflowHistory[0]).toMatchObject({ performedById: 'target', actedById: 'target' });
    expect(tables.notification[0].userId).toBe('target');
    expect(tables.user.find(user => user.id === 'source')).toMatchObject({ isActive: false, accessBlocked: true, mergedIntoId: 'target' });
    expect(tables.user.find(user => user.id === 'target')).toMatchObject({ role: 'USER', hrmId: 'external', customPermissions: '["equipment:view"]', version: 4 });
    expect(tables.userMergeAudit[0].sourceSnapshot.email).toBe('old@example.test');
    expect(tables.userMergeAudit[0].changes).toHaveLength(6);
    expect(Number.isFinite(tables.userMergePreview[0].consumedAt.getTime())).toBe(true);
    expect(database.$transaction).toHaveBeenLastCalledWith(expect.any(Function), expect.objectContaining({ isolationLevel: 'Serializable' }));
  });

  it.each(['version', 'new-reference', 'json-change'])('requires a new preview if %s changes', async change => {
    const prepared = await preview();
    if (change === 'version') tables.user.find(user => user.id === 'target').version++;
    if (change === 'new-reference') tables.notification.push({ id: 'new', userId: 'source' });
    if (change === 'json-change') tables.workOrder[0].assignedTechnicianIds.push('someone');
    await expect(service.confirm(confirmation(prepared.previewId), 'actor')).rejects.toMatchObject({ status: 409 });
    expect(tables.userMergeAudit).toHaveLength(0);
  });

  it('rolls back every record if any reference update fails', async () => {
    const prepared = await preview();
    const original = structuredClone(tables);
    database.workOrder.updateMany.mockRejectedValue(new Error('database failure'));
    await expect(service.confirm(confirmation(prepared.previewId), 'actor')).rejects.toThrow('database failure');
    expect(tables).toEqual(original);
    expect(tables.userMergeAudit).toHaveLength(0);
  });

  it('rejects stale, expired or already consumed previews and a different approving actor', async () => {
    const prepared = await preview();
    const dto = confirmation(prepared.previewId);
    tables.user.push({ ...tables.user[0], id: 'other', email: 'other@example.test' });
    await expect(service.confirm(dto, 'other')).rejects.toMatchObject({ status: 404 });
    tables.userMergePreview[0].expiresAt = new Date(0);
    await expect(service.confirm(dto, 'actor')).rejects.toMatchObject({ status: 409 });
    tables.userMergePreview[0].expiresAt = new Date(Date.now() + 60000);
    await service.confirm(dto, 'actor');
    await expect(service.confirm(dto, 'actor')).rejects.toMatchObject({ status: 409 });
    expect(tables.userMergeAudit).toHaveLength(1);
  });

  it('blocks merging independent HRM identities, self merges, inactive targets and open work sessions', async () => {
    tables.user.find(user => user.id === 'source').hrmId = 'another-external';
    expect((await preview()).blockers.join(' ')).toContain('ID HRM');
    tables.user.find(user => user.id === 'source').hrmId = null;
    tables.user.find(user => user.id === 'target').isActive = false;
    expect((await preview()).previewId).toBeNull();
    tables.user.find(user => user.id === 'target').isActive = true;
    tables.workOrderWorkSession.push({ id: 'active', userId: 'target', status: 'IN_PROGRESS' });
    expect((await preview()).blockers.join(' ')).toContain('phiên làm việc');
    tables.workOrderWorkSession = [];
    expect((await service.preview({ sourceUserId: 'actor', targetUserId: 'target' }, 'actor')).blockers.join(' ')).toContain('chính tài khoản');
    await expect(service.preview({ sourceUserId: 'target', targetUserId: 'target' }, 'actor')).rejects.toMatchObject({ status: 400 });
  });

  it('requires explicit merge permission and proof, and rechecks revoked permissions at confirmation', async () => {
    const prepared = await preview();
    tables.user[0].role = 'USER';
    tables.user[0].customPermissions = '["settings:users"]';
    await expect(preview()).rejects.toMatchObject({ status: 403 });
    await expect(service.confirm(confirmation(prepared.previewId), 'actor')).rejects.toMatchObject({ status: 403 });
    tables.user[0].role = 'ADMIN';
    await expect(service.confirm({ ...confirmation(prepared.previewId), evidence: '          ' }, 'actor')).rejects.toMatchObject({ status: 400 });
    await expect(service.confirm({ ...confirmation(prepared.previewId), confirmed: false }, 'actor')).rejects.toMatchObject({ status: 400 });
    expect(tables.userMergeAudit).toHaveLength(0);
  });

  it('retains canonical HRM resolution after merging a conflicting legacy alias', async () => {
    await service.confirm(confirmation((await preview()).previewId), 'actor');
    const selected = selectHrmIdentity(tables.user, { id: 'external', email: 'old@example.test' });
    expect(selected.user.id).toBe('target');
    expect(selected.reason).toBeNull();
  });

  it('covers all schema user foreign keys plus reviewed scalar/JSON references', () => {
    const references = userMergeReferences();
    for (const model of Prisma.dmmf.datamodel.models.filter(model => model.name !== 'User')) {
      for (const relation of model.fields.filter(field => field.kind === 'object' && field.type === 'User')) {
        for (const field of relation.relationFromFields || []) expect(references).toContainEqual(expect.objectContaining({ model: model.name, field }));
      }
    }
    expect(references).toContainEqual(expect.objectContaining({ model: 'EquipmentOeeRecord', field: 'recordedById' }));
    expect(references).toContainEqual(expect.objectContaining({ model: 'FabricationOrder', field: 'acceptedById' }));
    expect(mergedUserIds(['12', '112', 'target'], '12', 'target')).toEqual(['target', '112']);
    expect(() => mergedUserIds('bad-source-json', 'source', 'target')).toThrow();
    expect(() => mergedUserIds([{ id: 'source' }], 'source', 'target')).toThrow();
  });
});
