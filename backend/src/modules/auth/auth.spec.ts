import 'reflect-metadata';
import { INestApplication, Module } from '@nestjs/common';
import { APP_GUARD, NestFactory } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtStrategy } from './jwt.strategy';
import { HrmIdentityService } from './hrm-identity.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ResourceAccessService } from '../../common/auth/resource-access.service';
import { BrowserSessionService } from './browser-session.service';

describe('Authentication HTTP flow with isolated storage', () => {
  const secret = 'auth-http-tests-only';
  const jwt = new JwtService({ secret });
  const user = { id: 'local-user', hrmId: 'external-user', role: 'USER', name: 'Test User', isActive: true, department: 'QA', customPermissions: '["work_orders:execute"]' };
  const prisma = { user: { findUnique: jest.fn() } };
  const identities = { validateSession: jest.fn(), resolve: jest.fn(), login: jest.fn(), refreshSession: jest.fn(), logout: jest.fn() };
  let app: INestApplication;

  @Module({
    imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
    controllers: [AuthController],
    providers: [
      { provide: PrismaService, useValue: prisma },
      { provide: HrmIdentityService, useValue: identities },
      { provide: BrowserSessionService, useValue: {} },
      { provide: ResourceAccessService, useValue: { assertRequest: jest.fn() } },
      { provide: JwtStrategy, useFactory: () => new JwtStrategy({ get: (key: string) => key === 'HRM_JWT_SECRET' ? secret : undefined } as any, prisma as any, identities as any) },
      { provide: APP_GUARD, useClass: JwtAuthGuard },
    ],
  })
  class TestModule {}

  beforeAll(async () => {
    app = await NestFactory.create(TestModule, { logger: false });
    await app.init();
  });
  afterAll(async () => { await app?.close(); });
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue({ ...user });
    identities.validateSession.mockResolvedValue({ id: user.hrmId, name: user.name });
    identities.resolve.mockResolvedValue({ ...user });
  });

  it('rejects absent JWTs and spoofed administrator headers', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
    await request(app.getHttpServer()).get('/auth/me').set('x-test-user-id', 'admin').set('x-test-roles', 'ADMIN').expect(401);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('returns verified identity and effective local permissions for a signed JWT', async () => {
    const result = await request(app.getHttpServer()).get('/auth/me')
      .set('Authorization', 'Bearer ' + jwt.sign({ sub: 'employee-code' })).expect(200);
    expect(result.body.identity).toEqual({ provider: 'hrm', subject: user.hrmId });
    expect(result.body.user.id).toBe(user.id);
    expect(result.body.permissions).toContain('work_orders:execute');
    expect(result.body.permissions).not.toContain('ALL');
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('returns administrator permissions consistently with the backend resolver', async () => {
    const admin = { ...user, role: 'ADMIN' };
    identities.resolve.mockResolvedValue(admin);
    const result = await request(app.getHttpServer()).get('/auth/me')
      .set('Authorization', 'Bearer ' + jwt.sign({ sub: 'employee-code' })).expect(200);
    expect(result.body.user.role).toBe('ADMIN');
    expect(result.body.permissions).toContain('ALL');
  });
});
