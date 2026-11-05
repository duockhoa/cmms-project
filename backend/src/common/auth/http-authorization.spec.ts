import 'reflect-metadata';
import { Controller, Get, Post, Param, Module, ForbiddenException } from '@nestjs/common';
import { APP_GUARD, NestFactory } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { JwtStrategy } from '../../modules/auth/jwt.strategy';
import { JwtAuthGuard } from '../../modules/auth/jwt-auth.guard';
import { ResourceAccessService } from './resource-access.service';
import * as request from 'supertest';

describe('HTTP global authentication and permission boundary', () => {
  const secret = 'http-boundary-tests-only';
  const jwt = new JwtService({ secret });
  const handler = jest.fn(() => ({ ok: true }));
  const identity = { id: 'u', hrmId: '7', name: 'User', role: 'USER', isActive: true, department: 'QA', customPermissions: '["equipment:view"]' };
  const identities = { validateSession: jest.fn(), resolve: jest.fn() };
  const resources = { assertRequest: jest.fn() };
  let app: any;
  @Controller('_test-equipment')
  class EquipmentController {
    @Get() findAll() { return handler(); }
    @Post() create() { return handler(); }
    @Get(':id') findOne(@Param('id') _id: string) { return handler(); }
  }
  @Module({
    imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
    controllers: [EquipmentController],
    providers: [
      { provide: ResourceAccessService, useValue: resources },
      { provide: JwtStrategy, useFactory: () => new JwtStrategy({ get: (key: string) => key === 'HRM_JWT_SECRET' ? secret : undefined } as any, {} as any, identities as any) },
      { provide: APP_GUARD, useClass: JwtAuthGuard },
    ],
  })
  class TestModule {}
  beforeAll(async () => { app = await NestFactory.create(TestModule, { logger: false }); await app.init(); });
  afterAll(async () => { await app?.close(); });
  beforeEach(() => {
    handler.mockClear();
    identities.validateSession.mockReset().mockResolvedValue({ id: '7', name: 'Verified User' });
    identities.resolve.mockReset().mockResolvedValue({ ...identity });
    resources.assertRequest.mockReset().mockResolvedValue(undefined);
  });
  const bearer = () => `Bearer ${jwt.sign({ sub: 'employee-code-not-identity' })}`;
  it('returns 401 without a token and never calls the business handler', async () => {
    await request(app.getHttpServer()).get('/_test-equipment').expect(401);
    expect(handler).not.toHaveBeenCalled();
  });
  it('allows view but denies create for the same verified principal', async () => {
    await request(app.getHttpServer()).get('/_test-equipment').set('Authorization', bearer()).expect(200);
    handler.mockClear();
    await request(app.getHttpServer()).post('/_test-equipment').set('Authorization', bearer()).send({}).expect(403);
    expect(handler).not.toHaveBeenCalled();
  });
  it('denies cross-department access before a handler executes', async () => {
    resources.assertRequest.mockRejectedValue(new ForbiddenException());
    await request(app.getHttpServer()).get('/_test-equipment/foreign').set('Authorization', bearer()).expect(403);
    expect(handler).not.toHaveBeenCalled();
  });
  it('rejects HRM application revocation and disabled local accounts', async () => {
    identities.validateSession.mockRejectedValueOnce(new ForbiddenException());
    await request(app.getHttpServer()).get('/_test-equipment').set('Authorization', bearer()).expect(403);
    identities.resolve.mockResolvedValueOnce({ ...identity, isActive: false });
    await request(app.getHttpServer()).get('/_test-equipment').set('Authorization', bearer()).expect(401);
    expect(handler).not.toHaveBeenCalled();
  });
  it('does not accept spoofed administrator headers or expired JWTs', async () => {
    await request(app.getHttpServer()).post('/_test-equipment').set('x-user-role', 'ADMIN').set('x-user-id', 'admin').send({}).expect(401);
    await request(app.getHttpServer()).get('/_test-equipment').set('Authorization', `Bearer ${jwt.sign({ exp: 1 })}`).expect(401);
    expect(handler).not.toHaveBeenCalled();
    expect(identities.validateSession).not.toHaveBeenCalled();
  });
});
