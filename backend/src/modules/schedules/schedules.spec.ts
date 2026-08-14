const baseDbUrl = process.env.DATABASE_URL || "mysql://root:123456@localhost:3306/dk_cmms";
process.env.DATABASE_URL = baseDbUrl.includes('?')
  ? baseDbUrl.replace(/\/([^/?]+)\?/, '/dk_cmms_test_schedules?sched')
  : baseDbUrl.replace(/\/([^/]+)$/, '/dk_cmms_test_schedules');

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { SchedulesService } from './schedules.service';
import { PrismaService } from '../../prisma/prisma.service';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

jest.setTimeout(30000);

describe('Schedules Module', () => {
  let app: any;
  let prisma: PrismaService;
  let schedulesService: SchedulesService;
  

  beforeAll(async () => {
    

    execSync('npx prisma db push --force-reset --accept-data-loss --skip-generate', {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      stdio: 'inherit',
    });

    app = await NestFactory.createApplicationContext(AppModule);
    prisma = app.get(PrismaService);
    schedulesService = app.get(SchedulesService);

    // Seed dynamic data
    await prisma.user.create({
      data: {
        id: 'sched-tech-user',
        name: 'Sched Tester',
        email: 'schedtech@company.com',
        role: 'TECHNICIAN',
        status: 'AVAILABLE',
        isActive: true,
      },
    });

    await prisma.equipment.create({
      data: {
        id: 'sched-eq-test-id',
        code: 'EQ-TEST-SCHED',
        name: 'Thiết bị Test Spec Sched',
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
    
  });

  describe('INTEGRATION TESTS: Preventive Maintenance Schedule', () => {
    it('should calculate next due date correctly for DAILY, WEEKLY, MONTHLY', () => {
      const d1 = new Date('2026-08-01T00:00:00.000Z');
      const dNext = schedulesService.calculateNextDueDate(d1, 'DAILY', 3);
      expect(dNext.toISOString().startsWith('2026-08-04')).toBe(true);

      const w1 = new Date('2026-08-01T00:00:00.000Z');
      const wNext = schedulesService.calculateNextDueDate(w1, 'WEEKLY', 2);
      expect(wNext.toISOString().startsWith('2026-08-15')).toBe(true);

      const mJan31 = new Date('2026-01-31T00:00:00.000Z');
      const mFeb = schedulesService.calculateNextDueDate(mJan31, 'MONTHLY', 1, 31);
      expect(mFeb.toISOString().startsWith('2026-02-28')).toBe(true);

      const mMar = schedulesService.calculateNextDueDate(mFeb, 'MONTHLY', 1, 31);
      expect(mMar.toISOString().startsWith('2026-03-31')).toBe(true);

      const leapJan31 = new Date('2028-01-31T00:00:00.000Z');
      const leapFeb = schedulesService.calculateNextDueDate(leapJan31, 'MONTHLY', 1, 31);
      expect(leapFeb.toISOString().startsWith('2028-02-29')).toBe(true);
    });

    it('should create and transition schedule states', async () => {
      const validActorId = 'sched-tech-user';

      const schedule = await schedulesService.create({
        title: 'Bảo trì hàng ngày Spec',
        equipmentId: 'sched-eq-test-id',
        frequencyType: 'DAILY',
        frequencyInterval: 3,
        startDate: new Date('2026-08-01T00:00:00.000Z').toISOString(),
        createdById: validActorId,
      });
      expect(schedule.status).toBe('DRAFT');

      const active = await schedulesService.activate(schedule.id, { expectedVersion: 1, actedById: validActorId });
      expect(active.status).toBe('ACTIVE');

      const paused = await schedulesService.pause(schedule.id, { reason: 'Bảo trì máy xưởng Spec', expectedVersion: 2, actedById: validActorId });
      expect(paused.status).toBe('PAUSED');
    });
  });

  describe('CONCURRENT TESTS', () => {
    it('should only generate exactly one Work Order concurrently from same Schedule', async () => {
      const validActorId = 'sched-tech-user';
      const schedule = await prisma.maintenanceSchedule.create({
        data: {
          scheduleCode: `MS-CONC-SPEC-${Date.now()}`,
          title: 'Sched Concurrent Spec',
          equipmentId: 'sched-eq-test-id',
          frequencyType: 'MONTHLY',
          frequencyInterval: 1,
          createdById: validActorId,
          startDate: new Date('2026-08-01T00:00:00.000Z'),
          status: 'ACTIVE',
          nextDueDate: new Date('2026-08-01T00:00:00.000Z'),
          checklistJson: '[]',
          version: 1,
        },
      });

      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(schedulesService.generateWorkOrder(schedule.id, { expectedVersion: 1, actedById: validActorId }).catch(err => err));
      }

      const resultsArray = await Promise.all(promises);
      const successes = resultsArray.filter(res => res.id && res.orderCode);
      const failures = resultsArray.filter(res => res.status === 409 || res.code === 'P2002' || (res.message && res.message.includes('unique')));

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(9);
    });
  });
});
