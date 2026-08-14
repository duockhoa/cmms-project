const baseDbUrl = process.env.DATABASE_URL || "mysql://root:123456@localhost:3306/dk_cmms";
process.env.DATABASE_URL = baseDbUrl.includes('?')
  ? baseDbUrl.replace(/\/([^/?]+)\?/, '/dk_cmms_test_health?health')
  : baseDbUrl.replace(/\/([^/]+)$/, '/dk_cmms_test_health');

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../prisma/prisma.service';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

jest.setTimeout(30000);

describe('Health Check Module', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  

  beforeAll(async () => {
    

    execSync('npx prisma db push --force-reset --accept-data-loss --skip-generate', {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      stdio: 'inherit',
    });

    const nestApp = await NestFactory.create(AppModule);
    app = nestApp;
    // Set global prefix so it matches actual deployment
    app.setGlobalPrefix('api/v1');
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    
  });

  it('GET /api/v1/health should return 200 and system status', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);

    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body.services).toHaveProperty('database', 'up');
    expect(res.body.services).toHaveProperty('api', 'up');
  });
});
