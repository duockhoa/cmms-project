process.env.DATABASE_URL = `file:./test-req.db`;

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { RequestsService } from './requests.service';
import { PrismaService } from '../../prisma/prisma.service';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

jest.setTimeout(30000);

describe('Requests Module', () => {
  let app: any;
  let prisma: PrismaService;
  let requestsService: RequestsService;
  const testDbPath = path.join(__dirname, '..', '..', '..', 'prisma', 'test-req.db');

  beforeAll(async () => {
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch (e) {}
    }

    execSync('npx prisma db push --accept-data-loss --skip-generate', {
      env: { ...process.env, DATABASE_URL: `file:./test-req.db` },
      stdio: 'inherit',
    });

    app = await NestFactory.createApplicationContext(AppModule);
    prisma = app.get(PrismaService);
    requestsService = app.get(RequestsService);

    // Seed dynamic data
    await prisma.user.create({
      data: {
        id: 'req-tech-user',
        name: 'Tech Tester',
        email: 'tech@company.com',
        role: 'TECHNICIAN',
        status: 'AVAILABLE',
        isActive: true,
      },
    });

    await prisma.location.create({
      data: {
        id: 'req-loc-test-id',
        code: 'XUONG_A',
        name: 'Xưởng A',
        responsibleTechId: 'req-tech-user',
      },
    });

    await prisma.equipment.create({
      data: {
        id: 'req-eq-test-id',
        code: 'EQ-TEST-REQ',
        name: 'Thiết bị Test Spec Req',
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

  describe('INTEGRATION TESTS: Request Return / Resubmit / Cancel', () => {
    it('should complete workflow transition and validate rules', async () => {
      const validActorId = 'req-tech-user';

      const req = await requestsService.create({
        equipmentId: 'req-eq-test-id',
        title: 'Máy bơm rò rỉ spec test',
        description: 'Rò rỉ dầu thủy lực từ mối nối ống',
        priority: 'HIGH',
        reporterName: 'Nguyễn Văn Test',
        department: 'Phân xưởng A',
      });

      const returned = await requestsService.returnRequest(req.id, {
        reason: 'Thông tin sự cố chưa đầy đủ',
        expectedVersion: req.version,
      }, validActorId);
      expect(returned.status).toBe('RETURNED');
      expect(returned.returnedReason).toBe('Thông tin sự cố chưa đầy đủ');

      let threwNoReason = false;
      try {
        await requestsService.returnRequest(req.id, { reason: '', expectedVersion: returned.version }, validActorId);
      } catch (e: any) {
        threwNoReason = true;
        expect(e.status).toBe(400);
      }
      expect(threwNoReason).toBe(true);

      const resubmitted = await requestsService.resubmitRequest(returned.id, {
        expectedVersion: returned.version,
        comment: 'Đã bổ sung mô tả chi tiết',
        updatedFields: { description: 'Rò rỉ dầu thủy lực từ mối nối ống – Bổ sung: khu vực van điều khiển' },
      }, validActorId);
      expect(resubmitted.status).toBe('PENDING');
      expect(resubmitted.description).toContain('khu vực van điều khiển');

      const returned2 = await requestsService.returnRequest(resubmitted.id, { reason: 'Cần ảnh minh chứng', expectedVersion: resubmitted.version }, validActorId);
      const cancelled = await requestsService.cancelRequest(returned2.id, {
        reason: 'Sự cố đã tự khắc phục',
        expectedVersion: returned2.version,
      }, validActorId);
      expect(cancelled.status).toBe('CANCELLED');
    });

    it('should rollback transaction on simulated error', async () => {
      const pendReqFault = await requestsService.create({ equipmentId: 'req-eq-test-id', title: 'T20 Fault Spec Rollback', description: 'Fault test', priority: 'LOW', reporterName: 'Tester' });
      const versionBefore = pendReqFault.version;
      let txRolledBack = false;

      try {
        await prisma.$transaction(async (tx) => {
          await tx.maintenanceRequest.update({
            where: { id: pendReqFault.id },
            data: { status: 'RETURNED', returnedReason: 'Fault injection reason', version: { increment: 1 } },
          });
          throw new Error('SIMULATED_WORKFLOW_HISTORY_CREATE_FAILURE_SPEC');
        });
      } catch (e: any) {
        if (e.message === 'SIMULATED_WORKFLOW_HISTORY_CREATE_FAILURE_SPEC') {
          txRolledBack = true;
        }
      }

      expect(txRolledBack).toBe(true);
      const reqAfterFault = await prisma.maintenanceRequest.findUnique({ where: { id: pendReqFault.id } });
      expect(reqAfterFault?.status).toBe('PENDING');
      expect(reqAfterFault?.version).toBe(versionBefore);
    });
  });

  describe('CONCURRENT TESTS', () => {
    it('should allow only exactly one approval concurrently', async () => {
      const newReq = await prisma.maintenanceRequest.create({
        data: {
          requestCode: 'REQ-CONCURRENT-SPEC',
          equipmentId: 'req-eq-test-id',
          title: 'Req Concurrent Spec',
          description: 'Desc',
          status: 'PENDING',
          reporterName: 'Test Reporter',
        },
      });

      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(requestsService.approve(newReq.id, { technicianName: `Tech-Spec-${i}` }).catch(err => err));
      }

      const resultsArray = await Promise.all(promises);
      const successes = resultsArray.filter(res => res.workOrder !== undefined);
      const failures = resultsArray.filter(res => res.status === 409);

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(9);
    });
  });
});
