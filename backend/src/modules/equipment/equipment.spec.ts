const baseDbUrl = process.env.DATABASE_URL || "mysql://root:123456@localhost:3306/dk_cmms";
process.env.DATABASE_URL = baseDbUrl.includes('?')
  ? baseDbUrl.replace(/\/([^/?]+)\?/, '/dk_cmms_test_equipment?eq')
  : baseDbUrl.replace(/\/([^/]+)$/, '/dk_cmms_test_equipment');

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../prisma/prisma.service';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

jest.setTimeout(30000);

describe('Equipment Module integration tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  

  beforeAll(async () => {
    

    execSync('npx prisma db push --force-reset --accept-data-loss --skip-generate', {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      stdio: 'inherit',
    });

    const nestApp = await NestFactory.create(AppModule);
    app = nestApp;
    app.setGlobalPrefix('api/v1');
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    
  });

  it('should create, update, and soft-delete equipment', async () => {
    // 1. Create equipment
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/equipment')
      .set('x-user-id', 'tech-user-id')
      .send({
        code: 'EQ-SPEC-001',
        name: 'Máy ép thủy lực Spec',
        category: 'Cơ khí',
        location: 'Khu A',
        status: 'OPERATIONAL',
      })
      .expect(201);

    const eqId = createRes.body.id;
    expect(eqId).toBeDefined();
    expect(createRes.body.version).toBe(1);

    // 2. Update equipment (expectedVersion is required)
    const updateRes = await request(app.getHttpServer())
      .patch(`/api/v1/equipment/${eqId}`)
      .set('x-user-id', 'tech-user-id')
      .send({
        name: 'Máy ép thủy lực Spec (Updated)',
        expectedVersion: 1,
      })
      .expect(200);

    expect(updateRes.body.name).toBe('Máy ép thủy lực Spec (Updated)');
    expect(updateRes.body.version).toBe(2);

    // 3. Soft-delete equipment
    await request(app.getHttpServer())
      .delete(`/api/v1/equipment/${eqId}`)
      .set('x-user-id', 'tech-user-id')
      .expect(204);

    // 4. Verify equipment is soft-deleted (not returned in list of active equipment)
    const listRes = await request(app.getHttpServer())
      .get('/api/v1/equipment')
      .set('x-user-id', 'tech-user-id')
      .expect(200);

    const found = listRes.body.some((item: any) => item.id === eqId);
    expect(found).toBe(false);
  });
});
