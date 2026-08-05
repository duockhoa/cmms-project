process.env.DATABASE_URL = `file:./test-wo.db`;

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { WorkOrdersService } from './work-orders.service';
import { WorkOrderStateMachine } from './work-order-state-machine';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

describe('Work Orders Module', () => {
  let app: any;
  let prisma: PrismaService;
  let workOrdersService: WorkOrdersService;
  const testDbPath = path.join(__dirname, '..', '..', '..', 'prisma', 'test-wo.db');
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
    workOrdersService = app.get(WorkOrdersService);
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

  describe('1. UNIT TESTS: Work Order State Machine', () => {
    it('should validate status transitions correctly', () => {
      expect(WorkOrderStateMachine.canTransition('PENDING', 'ASSIGNED')).toBe(true);
      expect(WorkOrderStateMachine.canTransition('PENDING', 'CANCELLED')).toBe(true);
      expect(WorkOrderStateMachine.canTransition('PENDING', 'COMPLETED')).toBe(false);
      expect(WorkOrderStateMachine.canTransition('IN_PROGRESS', 'COMPLETED')).toBe(true);
      expect(WorkOrderStateMachine.canTransition('COMPLETED', 'CLOSED')).toBe(false);
      expect(WorkOrderStateMachine.canTransition('COMPLETED', 'VERIFIED')).toBe(true);
      expect(WorkOrderStateMachine.canTransition('VERIFIED', 'CLOSED')).toBe(true);
      expect(WorkOrderStateMachine.canTransition('COMPLETED', 'IN_PROGRESS')).toBe(true);
    });
  });

  describe('2. INTEGRATION TESTS: Stock Integrity & Locking', () => {
    it('should rollback stock deduction on insufficient stock', async () => {
      const item = await prisma.inventoryItem.create({
        data: {
          itemCode: 'WO-SPEC-ITEM-1',
          name: 'Linh kiện test Spec',
          category: 'Cơ khí',
          quantity: 2,
          unit: 'Cái',
          minQuantity: 1,
          unitPrice: 50,
        },
      });

      const equipment = await prisma.equipment.findFirst();
      const wo = await prisma.workOrder.create({
        data: {
          orderCode: 'WO-SPEC-STOCK',
          equipmentId: equipment!.id,
          title: 'WO Spec Stock',
          description: 'Desc',
          status: 'IN_PROGRESS',
        },
      });

      await prisma.workOrderItem.create({
        data: {
          workOrderId: wo.id,
          inventoryItemId: item.id,
          quantity: 3,
          unitPrice: 50,
        },
      });

      let threwStockError = false;
      try {
        await workOrdersService.complete(wo.id, { expectedVersion: 1 });
      } catch (e: any) {
        threwStockError = true;
        expect(e.status).toBe(400);
        expect(e.response.message).toBe('INSUFFICIENT_STOCK');
        expect(e.response.details.available).toBe(2);
      }
      expect(threwStockError).toBe(true);

      const freshItem = await prisma.inventoryItem.findUnique({ where: { id: item.id } });
      expect(freshItem?.quantity).toBe(2);
    });

    it('should enforce optimistic locking', async () => {
      const equipment = await prisma.equipment.findFirst();
      const wo = await prisma.workOrder.create({
        data: {
          orderCode: 'WO-SPEC-LOCK',
          equipmentId: equipment!.id,
          title: 'WO Spec Lock',
          description: 'Desc',
          status: 'PENDING',
        },
      });

      await workOrdersService.assign(wo.id, { technicianName: 'User A Tech', expectedVersion: 1 });

      let threwLockError = false;
      try {
        await workOrdersService.assign(wo.id, { technicianName: 'User B Tech', expectedVersion: 1 });
      } catch (e: any) {
        threwLockError = true;
        expect(e.status).toBe(409);
      }
      expect(threwLockError).toBe(true);
    });
  });

  describe('3. CONCURRENT TESTS', () => {
    it('should complete only 1 work order concurrently', async () => {
      const equipment = await prisma.equipment.findFirst();
      const item = await prisma.inventoryItem.create({
        data: {
          itemCode: 'WO-CONC-SPEC-ITEM',
          name: 'Linh kiện concurrent spec',
          category: 'Cơ khí',
          quantity: 5,
          unit: 'Cái',
        },
      });

      const wo = await prisma.workOrder.create({
        data: {
          orderCode: 'WO-CONC-SPEC-COMP',
          equipmentId: equipment!.id,
          title: 'WO Concurrent Complete Spec',
          description: 'Desc',
          status: 'IN_PROGRESS',
          version: 1,
        },
      });

      await prisma.workOrderItem.create({
        data: {
          workOrderId: wo.id,
          inventoryItemId: item.id,
          quantity: 2,
          unitPrice: 10,
        },
      });

      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(workOrdersService.complete(wo.id, { expectedVersion: 1 }).catch(err => err));
      }

      const resultsArray = await Promise.all(promises);
      const successes = resultsArray.filter(res => res.status === 'COMPLETED');
      const failures = resultsArray.filter(res => res.status === 409);

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(9);

      const finalItem = await prisma.inventoryItem.findUnique({ where: { id: item.id } });
      expect(finalItem?.quantity).toBe(3);
    });
  });
});
