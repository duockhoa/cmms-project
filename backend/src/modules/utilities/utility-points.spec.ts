import 'reflect-metadata';
import { BadRequestException, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as request from 'supertest';
import { UtilitiesService } from './utilities.service';
import { UtilitiesController } from './utilities.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ResourceAccessService } from '../../common/auth/resource-access.service';

function pointStorage() {
  const original = { id: 'point-a', code: 'ELEC-DB-01', name: 'Meter A', type: 'ELECTRICITY', location: 'Area A',
    tariffType: 'SINGLE', multiplier: 1, unit: 'kWh', description: '', isActive: true,
    readings: [{ id: 'reading-a', pointId: 'point-a', readingValue: 100 }], statusLogs: [] };
  const rows = new Map<string, any>([[original.id, { ...original }],
    ['point-b', { ...original, id: 'point-b', code: 'ELEC-DB-02', name: 'Meter B', readings: [] }]]);
  const duplicate = () => Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
  const prisma = { utilityPoint: {
    findFirst: jest.fn(async ({ where }) => [...rows.values()].find(point => where.OR.some(item => item.id === point.id || item.code === point.code)) || null),
    findUnique: jest.fn(async ({ where }) => [...rows.values()].find(point => point.code.toUpperCase() === where.code.toUpperCase()) || null),
    findMany: jest.fn(async () => [...rows.values()]),
    create: jest.fn(async ({ data }) => {
      if ([...rows.values()].some(point => point.code === data.code)) throw duplicate();
      const point = { id: 'point-created', readings: [], statusLogs: [], ...data };
      rows.set(point.id, point); return point;
    }),
    update: jest.fn(async ({ where, data }) => {
      if (data.code && [...rows.values()].some(point => point.id !== where.id && point.code === data.code)) throw duplicate();
      const point = { ...rows.get(where.id), ...data };
      rows.set(where.id, point); return point;
    }),
  } };
  return { prisma, rows, original };
}

describe('Utility point codes', () => {
  let storage: ReturnType<typeof pointStorage>;
  let service: UtilitiesService;
  beforeEach(() => { storage = pointStorage(); service = new UtilitiesService(storage.prisma as unknown as PrismaService); });

  it('persists a normalized edited code and keeps the point ID and reading history', async () => {
    const saved = await service.updatePoint('point-a', { code: '  elec-db-99  ' });
    expect(saved).toMatchObject({ id: 'point-a', code: 'ELEC-DB-99', readings: storage.original.readings });
    expect((await service.getPointByIdOrCode('point-a')).code).toBe('ELEC-DB-99');
    expect((await service.getPointByIdOrCode('ELEC-DB-99')).id).toBe('point-a');
    await expect(service.getPointByIdOrCode('ELEC-DB-01')).rejects.toMatchObject({ status: 404 });
  });

  it('allows keeping the current code, including normalized input', async () => {
    await expect(service.updatePoint('point-a', { code: ' elec-db-01 ', name: 'Renamed' }))
      .resolves.toMatchObject({ id: 'point-a', code: 'ELEC-DB-01', name: 'Renamed' });
  });

  it('rejects another point code after normalization and leaves the point unchanged', async () => {
    await expect(service.updatePoint('point-a', { code: ' elec-db-02 ', name: 'Not saved' })).rejects.toThrow('ELEC-DB-02');
    expect(storage.prisma.utilityPoint.update).not.toHaveBeenCalled();
    expect(storage.rows.get('point-a')).toMatchObject({ code: 'ELEC-DB-01', name: 'Meter A' });
  });

  it.each(['', '   ', null, 123, false])('rejects invalid edited code %p', async code => {
    await expect(service.updatePoint('point-a', { code })).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.prisma.utilityPoint.update).not.toHaveBeenCalled();
  });

  it('preserves the code for partial updates that omit it', async () => {
    await expect(service.updatePoint('point-a', { name: 'Renamed' })).resolves.toMatchObject({ code: 'ELEC-DB-01', name: 'Renamed' });
  });

  it('updates the resolved point when addressed by its previous code', async () => {
    await expect(service.updatePoint('ELEC-DB-01', { code: 'ELEC-DB-99' })).resolves.toMatchObject({ id: 'point-a', code: 'ELEC-DB-99' });
    expect(storage.rows.size).toBe(2);
  });

  it('returns a validation error if a concurrent write wins the unique code', async () => {
    storage.prisma.utilityPoint.update.mockRejectedValueOnce(Object.assign(new Error('duplicate'), { code: 'P2002' }));
    await expect(service.updatePoint('point-a', { code: 'ELEC-DB-99' })).rejects.toMatchObject({ status: 400 });
  });

  it('keeps unrelated database failures visible', async () => {
    const error = new Error('Database unavailable');
    storage.prisma.utilityPoint.update.mockRejectedValueOnce(error);
    await expect(service.updatePoint('point-a', { code: 'ELEC-DB-99' })).rejects.toBe(error);
  });

  it('still normalizes and stores codes on creation', async () => {
    await expect(service.createPoint({ code: ' water-new ', name: 'Water meter', type: 'WATER' }))
      .resolves.toMatchObject({ code: 'WATER-NEW', unit: 'm3' });
  });

  it('rejects duplicate creation and a concurrent duplicate with a validation error', async () => {
    await expect(service.createPoint({ code: ' elec-db-02 ', name: 'Duplicate', type: 'ELECTRICITY' })).rejects.toMatchObject({ status: 400 });
    storage.prisma.utilityPoint.create.mockRejectedValueOnce(Object.assign(new Error('duplicate'), { code: 'P2002' }));
    await expect(service.createPoint({ code: 'NEW', name: 'Concurrent', type: 'WATER' })).rejects.toMatchObject({ status: 400 });
  });

  it('rejects an empty code on creation', async () => {
    await expect(service.createPoint({ code: ' ', name: 'Empty', type: 'WATER' })).rejects.toMatchObject({ status: 400 });
    expect(storage.prisma.utilityPoint.create).not.toHaveBeenCalled();
  });
});

describe('Utility point code HTTP regression', () => {
  const storage = pointStorage();
  let app: any;
  let guard: jest.SpyInstance;
  @Module({
    controllers: [UtilitiesController],
    providers: [UtilitiesService, { provide: PrismaService, useValue: storage.prisma },
      { provide: ResourceAccessService, useValue: {} }],
  })
  class TestModule {}

  beforeAll(async () => {
    guard = jest.spyOn(JwtAuthGuard.prototype, 'canActivate').mockResolvedValue(true);
    app = await NestFactory.create(TestModule, { logger: false });
    await app.init();
  });
  afterAll(async () => { await app?.close(); guard?.mockRestore(); });

  it('PUT returns the changed code and subsequent GET/list return the saved value', async () => {
    const result = await request(app.getHttpServer()).put('/utilities/points/point-a')
      .send({ code: ' elec-http-99 ', name: 'HTTP meter' }).expect(200);
    expect(result.body).toMatchObject({ id: 'point-a', code: 'ELEC-HTTP-99', name: 'HTTP meter' });
    const reloaded = await request(app.getHttpServer()).get('/utilities/points/point-a').expect(200);
    expect(reloaded.body.code).toBe('ELEC-HTTP-99');
    const listed = await request(app.getHttpServer()).get('/utilities/points').expect(200);
    expect(listed.body.find(point => point.id === 'point-a').code).toBe('ELEC-HTTP-99');
    await request(app.getHttpServer()).get('/utilities/points/ELEC-HTTP-99').expect(200);
  });

  it('duplicate and blank codes return 400 instead of a misleading success', async () => {
    await request(app.getHttpServer()).put('/utilities/points/point-b').send({ code: ' elec-http-99 ' }).expect(400);
    await request(app.getHttpServer()).put('/utilities/points/point-b').send({ code: ' ' }).expect(400);
    expect(storage.rows.get('point-b').code).toBe('ELEC-DB-02');
  });
});
