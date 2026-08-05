process.env.DATABASE_URL = `file:./test-sched.db`;

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { SchedulesService } from './schedules.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

describe('Schedules Module', () => {
  let app: any;
  let prisma: PrismaService;
  let schedulesService: SchedulesService;
  const testDbPath = path.join(__dirname, '..', '..', '..', 'prisma', 'test-sched.db');
  const devDbPath = path.join(__dirname, '..', '..', '..', 'prisma', 'dev.db');

  beforeAll(async () => {
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch (e) {}
    }
    fs.copyFileSync(devDbPath, testDbPath);

    app = await NestFactory.createApplicationContext(AppModule);
    prisma = app.get(PrismaService);
    schedulesService = app.get(SchedulesService);
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
      const equipment = await prisma.equipment.findFirst();
      const activeUser = await prisma.user.findFirst({ where: { isActive: true } });

      const schedule = await schedulesService.create({
        title: 'Bảo trì hàng ngày Spec',
        equipmentId: equipment!.id,
        frequencyType: 'DAILY',
        frequencyInterval: 3,
        startDate: new Date('2026-08-01T00:00:00.000Z').toISOString(),
        createdById: activeUser!.id,
      });
      expect(schedule.status).toBe('DRAFT');

      const active = await schedulesService.activate(schedule.id, { expectedVersion: 1, actedById: activeUser!.id });
      expect(active.status).toBe('ACTIVE');

      const paused = await schedulesService.pause(schedule.id, { reason: 'Bảo trì máy xưởng Spec', expectedVersion: 2, actedById: activeUser!.id });
      expect(paused.status).toBe('PAUSED');
    });
  });

  describe('CONCURRENT TESTS', () => {
    it('should only generate exactly one Work Order concurrently from same Schedule', async () => {
      const activeUser = await prisma.user.findFirst({ where: { isActive: true } });
      const equipment = await prisma.equipment.findFirst();
      const schedule = await prisma.maintenanceSchedule.create({
        data: {
          scheduleCode: `MS-CONC-SPEC-${Date.now()}`,
          title: 'Sched Concurrent Spec',
          equipmentId: equipment!.id,
          frequencyType: 'MONTHLY',
          frequencyInterval: 1,
          createdById: activeUser!.id,
          startDate: new Date('2026-08-01T00:00:00.000Z'),
          status: 'ACTIVE',
          nextDueDate: new Date('2026-08-01T00:00:00.000Z'),
          checklistJson: '[]',
          version: 1,
        },
      });

      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(schedulesService.generateWorkOrder(schedule.id, { expectedVersion: 1, actedById: activeUser!.id }).catch(err => err));
      }

      const resultsArray = await Promise.all(promises);
      const successes = resultsArray.filter(res => res.id && res.orderCode);
      const failures = resultsArray.filter(res => res.status === 409 || res.code === 'P2002' || (res.message && res.message.includes('unique')));

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(9);
    });
  });
});
