const baseDbUrl = process.env.DATABASE_URL || "mysql://root:123456@localhost:3306/dk_cmms";
process.env.DATABASE_URL = baseDbUrl.includes('?') 
  ? baseDbUrl.replace(/\/([^/?]+)\?/, '/dk_cmms_test_wo?$1')
  : baseDbUrl.replace(/\/([^/]+)$/, '/dk_cmms_test_wo');

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { WorkOrdersService } from './work-orders.service';
import { WorkOrderStateMachine } from './work-order-state-machine';
import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

jest.setTimeout(30000);

describe('Work Orders Module', () => {
  let app: any;
  let prisma: PrismaService;
  let workOrdersService: WorkOrdersService;

  beforeAll(async () => {
    // Initialize fresh database schema from prisma schema
    execSync('npx prisma db push --force-reset --accept-data-loss --skip-generate', {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      stdio: 'inherit',
    });

    app = await NestFactory.createApplicationContext(AppModule);
    prisma = app.get(PrismaService);
    workOrdersService = app.get(WorkOrdersService);

    // 3. Dynamic Seeding of essential test environment data
    await prisma.user.create({
      data: {
        id: 'tech-user-id',
        name: 'Tech Test User',
        email: 'tech-test@company.com',
        role: 'TECHNICIAN',
        status: 'AVAILABLE',
        isActive: true,
      },
    });

    await prisma.equipment.create({
      data: {
        id: 'equipment-test-id',
        code: 'EQ-TEST-WO',
        name: 'Thiết bị Test Spec',
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

      const wo = await prisma.workOrder.create({
        data: {
          orderCode: 'WO-SPEC-STOCK',
          equipmentId: 'equipment-test-id',
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
      const wo = await prisma.workOrder.create({
        data: {
          orderCode: 'WO-SPEC-LOCK',
          equipmentId: 'equipment-test-id',
          title: 'WO Spec Lock',
          description: 'Desc',
          status: 'PENDING',
        },
      });

      await workOrdersService.assign(wo.id, { technicianName: 'Tech Test User', expectedVersion: 1 });

      let threwLockError = false;
      try {
        await workOrdersService.assign(wo.id, { technicianName: 'Other Tech User', expectedVersion: 1 });
      } catch (e: any) {
        threwLockError = true;
        expect(e.status).toBe(409);
      }
      expect(threwLockError).toBe(true);
    });
  });

  describe('3. CONCURRENT TESTS', () => {
    it('should complete only 1 work order concurrently', async () => {
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
          equipmentId: 'equipment-test-id',
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
      const successes = resultsArray.filter(res => res && res.status === 'COMPLETED');
      const failures = resultsArray.filter(res => res && (res.status === 409 || (res.response && res.response.statusCode === 409) || res.status === 'Conflict' || res.message?.includes('sửa đổi') || res.message?.includes('lock') || res.status === 409));
      
      expect(successes.length).toBe(1);
      expect(failures.length).toBe(9);

      const finalItem = await prisma.inventoryItem.findUnique({ where: { id: item.id } });
      expect(finalItem?.quantity).toBe(3);
    });
  });

  describe('4. PHASE 4.1 FUNCTIONAL TESTS', () => {
    it('should query work orders correctly by scanned QR token according to unit type and roles', async () => {
      // 1. Setup users
      const workshopUser = await prisma.user.create({
        data: {
          id: 'workshop-user-1',
          name: 'Workshop User One',
          email: 'workshop1@test.com',
          role: 'TECHNICIAN',
          department: 'Xưởng cơ điện A', // resolves to WORKSHOP unitType
        },
      });

      const maintUser = await prisma.user.create({
        data: {
          id: 'maint-user-1',
          name: 'Cơ điện User One',
          email: 'maint1@test.com',
          role: 'TECHNICIAN',
          department: 'Cơ điện sửa chữa', // resolves to MAINTENANCE unitType
        },
      });

      const techAdmin = await prisma.user.create({
        data: {
          id: 'tech-admin-1',
          name: 'Technical Officer',
          email: 'techadmin1@test.com',
          role: 'MANAGER',
          department: 'Kỹ thuật vận hành', // resolves to TECHNICAL unitType
        },
      });

      const equipment = await prisma.equipment.create({
        data: {
          code: 'EQ-QR-ROUTE-1',
          name: 'Pump QR 1',
          category: 'Cơ khí',
          location: 'Khu A',
        },
      });

      // WO 1: Workshop self handling, assigned to workshopUser
      const wo1 = await prisma.workOrder.create({
        data: {
          orderCode: 'WO-R-01',
          equipmentId: equipment.id,
          title: 'Workshop Pump Tune',
          description: 'Adjust blades',
          status: 'ASSIGNED',
          handlingRoute: 'WORKSHOP_SELF_HANDLE',
          assignedTechnicianId: workshopUser.id,
        },
      });

      // WO 2: Technical support, assigned to maintUser
      const wo2 = await prisma.workOrder.create({
        data: {
          orderCode: 'WO-R-02',
          equipmentId: equipment.id,
          title: 'Maint Pump Repair',
          description: 'Rewind motor coils',
          status: 'ASSIGNED',
          handlingRoute: 'TECHNICAL_MAINTENANCE_SUPPORT',
          assignedTechnicianId: maintUser.id,
        },
      });

      // WO 3: Technical support, waiting for classification
      const wo3 = await prisma.workOrder.create({
        data: {
          orderCode: 'WO-R-03',
          equipmentId: equipment.id,
          title: 'Unclassified issue',
          description: 'Unresolved noise',
          status: 'PENDING',
          handlingRoute: 'TECHNICAL_MAINTENANCE_SUPPORT',
        },
      });

      // 2. Query as Workshop User: should see wo1 (Workshop Route active)
      const resWorkshop = await workOrdersService.findByEquipmentQr('EQ-QR-ROUTE-1', workshopUser.id);
      expect(resWorkshop.workOrders.length).toBe(1);
      expect(resWorkshop.workOrders[0].id).toBe(wo1.id);

      // 3. Query as Maintenance User: should see wo2 (assigned to them)
      const resMaint = await workOrdersService.findByEquipmentQr('EQ-QR-ROUTE-1', maintUser.id);
      expect(resMaint.workOrders.length).toBe(1);
      expect(resMaint.workOrders[0].id).toBe(wo2.id);

      // 4. Query as Technical Manager: should see wo3 (PENDING for classification)
      const resTech = await workOrdersService.findByEquipmentQr('EQ-QR-ROUTE-1', techAdmin.id);
      expect(resTech.workOrders.length).toBe(1);
      expect(resTech.workOrders[0].id).toBe(wo3.id);
    });

    it('should escalate to technical support, keeping workshop timeline logs intact', async () => {
      const equipment = await prisma.equipment.create({
        data: {
          code: 'EQ-ESCALATE-1',
          name: 'Mixer EQ',
          category: 'Cơ khí',
          location: 'Khu B',
        },
      });

      const workshopUser = await prisma.user.findUnique({ where: { id: 'workshop-user-1' } });
      const techAdmin = await prisma.user.findUnique({ where: { id: 'tech-admin-1' } });

      const wo = await prisma.workOrder.create({
        data: {
          orderCode: 'WO-ESC-01',
          equipmentId: equipment.id,
          title: 'Mixer issue',
          description: 'Stuck impeller',
          status: 'IN_PROGRESS',
          handlingRoute: 'WORKSHOP_SELF_HANDLE',
          assignedTechnicianId: workshopUser!.id,
        },
      });

      // Create a few logs for the Workshop actions
      await workOrdersService.createExecutionLog(wo.id, { content: 'Đã tháo nắp bảo vệ' }, workshopUser!.id);
      await workOrdersService.createExecutionLog(wo.id, { content: 'Bánh răng quá chặt, không xoay được' }, workshopUser!.id);

      // Escalate to technical support
      const updatedWo = await workOrdersService.escalate(
        wo.id,
        { expectedVersion: 1, reason: 'Vượt quá khả năng sửa chữa của Xưởng' },
        { id: workshopUser!.id, role: 'TECHNICIAN' }
      );

      // Assertions
      expect(updatedWo?.status).toBe('PENDING'); // awaiting classification/reassignment
      expect(updatedWo?.handlingRoute).toBe('TECHNICAL_MAINTENANCE_SUPPORT');
      expect(updatedWo?.assignedTechnicianId).toBeNull(); // reset assignment for classification

      // Verify log history is preserved
      const logs = await workOrdersService.getExecutionLogs(wo.id);
      expect(logs.length).toBe(3); // 2 LOGs + 1 ESCALATE
      expect(logs[2].actionType).toBe('ESCALATE');
      expect(logs[2].content).toContain('Vượt quá khả năng sửa chữa của Xưởng');
    });

    it('should classify and support assignment routes properly, resolving concurrent conflict', async () => {
      const equipment = await prisma.equipment.create({
        data: {
          code: 'EQ-CLASSIFY-1',
          name: 'Boiler EQ',
          category: 'Điện',
          location: 'Khu C',
        },
      });

      const wo = await prisma.workOrder.create({
        data: {
          orderCode: 'WO-CLASS-01',
          equipmentId: equipment.id,
          title: 'Pressure drop',
          description: 'Gauge drops',
          status: 'PENDING',
          handlingRoute: 'TECHNICAL_MAINTENANCE_SUPPORT',
          version: 1,
        },
      });

      const techAdmin = await prisma.user.findUnique({ where: { id: 'tech-admin-1' } });
      const maintUser = await prisma.user.findUnique({ where: { id: 'maint-user-1' } });

      // Concurrent classification simulation: only the first classification request must win!
      const promises = [
        workOrdersService.classify(wo.id, { expectedVersion: 1, classificationResult: 'MAINTENANCE_REQUIRED', classificationNotes: 'Cần thay van' }, { id: techAdmin!.id, role: 'MANAGER' }).catch(e => e),
        workOrdersService.classify(wo.id, { expectedVersion: 1, classificationResult: 'WORKSHOP_CONTINUE', classificationNotes: 'Xưởng tự chỉnh' }, { id: techAdmin!.id, role: 'MANAGER' }).catch(e => e)
      ];

      const results = await Promise.all(promises);
      const successes = results.filter(r => r.id !== undefined);
      const conflicts = results.filter(r => r.status === 409);

      expect(successes.length).toBe(1);
      expect(conflicts.length).toBe(1);

      // Verify assigned tech and status updates work
      const classifiedWo = await prisma.workOrder.findUnique({ where: { id: wo.id } });
      expect(classifiedWo?.classificationResult).toBeDefined();

      // Technical assigns maintenance technician
      const assignedWo = await workOrdersService.assignExecutor(
        wo.id,
        { expectedVersion: classifiedWo!.version, assignedTechnicianId: maintUser!.id },
        { id: techAdmin!.id, role: 'MANAGER' }
      );
      expect(assignedWo?.status).toBe('ASSIGNED');
      expect(assignedWo?.assignedTechnicianId).toBe(maintUser!.id);
    });

    it('should submit handover, accept/reject route redirects properly', async () => {
      const equipment = await prisma.equipment.create({
        data: {
          code: 'EQ-HANDOVER-1',
          name: 'Turbine',
          category: 'Cơ khí',
          location: 'Khu D',
        },
      });

      const maintUser = await prisma.user.findUnique({ where: { id: 'maint-user-1' } });
      const workshopUser = await prisma.user.findUnique({ where: { id: 'workshop-user-1' } });

      const wo = await prisma.workOrder.create({
        data: {
          orderCode: 'WO-HANDOVER-01',
          equipmentId: equipment.id,
          title: 'Speed lock',
          description: 'Impeller speed fluctuates',
          status: 'IN_PROGRESS',
          handlingRoute: 'TECHNICAL_MAINTENANCE_SUPPORT',
          assignedTechnicianId: maintUser!.id,
          version: 1,
        },
      });

      // 1. Submit Handover
      const handoverWo = await workOrdersService.submitHandover(
        wo.id,
        {
          expectedVersion: 1,
          workDone: 'Hiệu chỉnh cảm biến dòng và vệ sinh trục',
          equipmentStatusAfter: 'Chạy ổn định, không ồn',
          testResult: 'Chạy thử 10 phút bình thường',
          conclusion: 'Hoạt động bình thường',
        },
        { id: maintUser!.id, role: 'TECHNICIAN' }
      );
      expect(handoverWo?.status).toBe('COMPLETED');

      // 2. Workshop rejects handover -> goes back to IN_PROGRESS
      const rejectedWo = await workOrdersService.rejectHandover(
        wo.id,
        { expectedVersion: handoverWo!.version, reason: 'Chạy thử vẫn phát nhiệt cao' },
        { id: workshopUser!.id, role: 'TECHNICIAN' }
      );
      expect(rejectedWo?.status).toBe('IN_PROGRESS');
      expect(rejectedWo?.assignedTechnicianId).toBe(maintUser!.id); // responsibility stays with tech

      // 3. Submit Handover again
      const handoverWo2 = await workOrdersService.submitHandover(
        wo.id,
        {
          expectedVersion: rejectedWo!.version,
          workDone: 'Bổ sung mỡ bò chịu nhiệt trục khuỷu',
          equipmentStatusAfter: 'Hoạt động bình thường',
          testResult: 'Nhiệt độ ổn định ở mức 40 độ C',
          conclusion: 'Hoạt động bình thường',
        },
        { id: maintUser!.id, role: 'TECHNICIAN' }
      );

      // 4. Workshop accepts handover -> goes to VERIFIED
      const acceptedWo = await workOrdersService.acceptHandover(
        wo.id,
        { expectedVersion: handoverWo2!.version },
        { id: workshopUser!.id, role: 'TECHNICIAN' }
      );
      expect(acceptedWo?.status).toBe('VERIFIED');
    });

    it('should enforce strict actionType on custom logs', async () => {
      const wo = await prisma.workOrder.create({
        data: {
          orderCode: 'WO-FORCE-LOG-01',
          equipmentId: 'equipment-test-id',
          title: 'Force log test',
          description: 'Desc',
          status: 'IN_PROGRESS',
          assignedTechnicianId: 'tech-user-id',
        },
      });

      const log = await workOrdersService.createExecutionLog(
        wo.id,
        { content: 'Ghi chép bình thường' },
        'tech-user-id'
      );
      expect(log.actionType).toBe('LOG'); // strictly LOG
    });
  });
});
