const baseDbUrl = process.env.DATABASE_URL || "mysql://root:123456@localhost:3306/dk_cmms";
process.env.DATABASE_URL = baseDbUrl.includes('?')
  ? baseDbUrl.replace(/\/([^/?]+)\?/, '/dk_cmms_test_auth?auth')
  : baseDbUrl.replace(/\/([^/]+)$/, '/dk_cmms_test_auth');

import { NestApplicationContext } from '@nestjs/core';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../prisma/prisma.service';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

jest.setTimeout(30000);

describe('Authentication & Authorization Flow', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  

  beforeAll(async () => {
    

    execSync('npx prisma db push --force-reset --accept-data-loss --skip-generate', {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      stdio: 'inherit',
    });

    const nestApp = await NestFactory.create(AppModule);
    app = nestApp;
    await app.init();
    prisma = app.get(PrismaService);

    // Seed test users with different roles
    await prisma.user.create({
      data: {
        id: 'user-admin-id',
        name: 'Admin User',
        email: 'admin@company.com',
        role: 'ADMIN',
        isActive: true,
      },
    });

    await prisma.user.create({
      data: {
        id: 'user-tech-id',
        name: 'Tech User',
        email: 'tech@company.com',
        role: 'TECHNICIAN',
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    
  });

  it('should return 401 Unauthorized when requesting /auth/me without token', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .expect(401);

    expect(res.body.message).toBe('Authentication token is missing, expired, or invalid.');
  });

  it('should return user info when authenticated via mock headers (ADMIN)', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('x-test-user-id', 'user-admin-id')
      .set('x-test-roles', 'ADMIN')
      .expect(200);

    expect(res.body.authenticated).toBe(true);
    expect(res.body.user.role).toBe('ADMIN');
    expect(res.body.permissions).toContain('ALL');
  });

  it('should return user info when authenticated via mock headers (TECHNICIAN)', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('x-test-user-id', 'user-tech-id')
      .set('x-test-roles', 'TECHNICIAN')
      .expect(200);

    expect(res.body.authenticated).toBe(true);
    expect(res.body.user.role).toBe('TECHNICIAN');
    expect(res.body.permissions).toContain('WORK_ORDER_EXECUTE');
    expect(res.body.permissions).not.toContain('ALL');
  });
});
