process.env.DATABASE_URL = `file:./test-attachments.db`;

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../prisma/prisma.service';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

jest.setTimeout(30000);

describe('Attachments Upload Flow & Validation', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const testDbPath = path.join(__dirname, '..', '..', '..', 'prisma', 'test-attachments.db');

  beforeAll(async () => {
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch (e) {}
    }

    execSync('npx prisma db push --accept-data-loss --skip-generate', {
      env: { ...process.env, DATABASE_URL: `file:./test-attachments.db` },
      stdio: 'inherit',
    });

    const nestApp = await NestFactory.create(AppModule);
    app = nestApp;
    app.setGlobalPrefix('api/v1');
    await app.init();
    prisma = app.get(PrismaService);

    // Seed test equipment so parent entity validation succeeds
    await prisma.equipment.create({
      data: {
        id: 'equipment-test-id',
        code: 'EQ-ATTACH-TEST',
        name: 'Equipment for Attachments Test',
        category: 'Cơ khí',
        location: 'Xưởng A',
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch (e) {}
    }
  });

  it('should upload successfully with valid png magic numbers', async () => {
    // PNG Header magic number: 89 50 4E 47
    const validPngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    
    const res = await request(app.getHttpServer())
      .post('/api/v1/attachments')
      .set('x-user-id', 'tech-user-id')
      .attach('file', validPngBuffer, 'test-image.png')
      .field('entityType', 'Equipment')
      .field('entityId', 'equipment-test-id')
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.originalName).toBe('test-image.png');
  });

  it('should reject with 400 when file type does not match magic numbers', async () => {
    // Fake PNG file containing malicious script content
    const invalidBuffer = Buffer.from('console.log("malicious code");');
    
    const res = await request(app.getHttpServer())
      .post('/api/v1/attachments')
      .set('x-user-id', 'tech-user-id')
      .attach('file', invalidBuffer, 'malicious.png')
      .field('entityType', 'Equipment')
      .field('entityId', 'equipment-test-id')
      .expect(400);

    expect(res.body.message).toContain('Nội dung file thực tế không hợp lệ.');
  });

  it('should reject with 400 when file size exceeds limits', async () => {
    const validPngHeader = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    // Create a 6MB file (limit is 5MB by default)
    const largeBuffer = Buffer.concat([
      Buffer.from(validPngHeader),
      Buffer.alloc(6 * 1024 * 1024)
    ]);

    const res = await request(app.getHttpServer())
      .post('/api/v1/attachments')
      .set('x-user-id', 'tech-user-id')
      .attach('file', largeBuffer, 'huge.png')
      .field('entityType', 'Equipment')
      .field('entityId', 'equipment-test-id')
      .expect(400);

    expect(res.body.message).toContain('Kích thước file vượt quá giới hạn');
  });
});
