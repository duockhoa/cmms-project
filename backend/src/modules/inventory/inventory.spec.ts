process.env.DATABASE_URL = `file:./test-inv.db`;

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../../prisma/prisma.service';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

jest.setTimeout(30000);

describe('Inventory Module', () => {
  let app: any;
  let prisma: PrismaService;
  let inventoryService: InventoryService;
  const testDbPath = path.join(__dirname, '..', '..', '..', 'prisma', 'test-inv.db');

  beforeAll(async () => {
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch (e) {}
    }

    execSync('npx prisma db push --accept-data-loss', {
      env: { ...process.env, DATABASE_URL: `file:./test-inv.db` },
      stdio: 'inherit',
    });

    app = await NestFactory.createApplicationContext(AppModule);
    prisma = app.get(PrismaService);
    inventoryService = app.get(InventoryService);

    // Seed dynamic data
    await prisma.user.create({
      data: {
        id: 'inv-tech-user',
        name: 'Inv Tester',
        email: 'invtech@company.com',
        role: 'TECHNICIAN',
        status: 'AVAILABLE',
        isActive: true,
      },
    });

    await prisma.equipment.create({
      data: {
        id: 'inv-eq-test-id',
        code: 'EQ-TEST-INV',
        name: 'Thiết bị Test Spec Inv',
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

  describe('INTEGRATION TESTS: Inventory Adjustment & Material Return', () => {
    it('should adjust stock levels and log transaction metadata accurately', async () => {
      const validActorId = 'inv-tech-user';

      const invItem = await prisma.inventoryItem.create({
        data: {
          itemCode: `SPEC-INV-ITEM-${Date.now()}`,
          name: 'Vòng bi SKF Spec',
          category: 'Cơ khí',
          quantity: 10,
          unit: 'Cái',
          unitPrice: 200000,
          version: 1,
        },
      });

      const adjInRes = await inventoryService.adjustIn(invItem.id, {
        quantity: 5,
        reason: 'Kiểm kê phát hiện thừa Spec',
        referenceCode: 'KK-2026-IN-SPEC',
        expectedVersion: 1,
        actedById: validActorId,
      });
      expect(adjInRes.quantity).toBe(15);
      expect(adjInRes.version).toBe(2);

      let threwAdjInZero = false;
      try {
        await inventoryService.adjustIn(invItem.id, { quantity: 0, reason: 'Test', expectedVersion: 2, actedById: validActorId });
      } catch (e: any) {
        threwAdjInZero = true;
        expect(e.status).toBe(400);
      }
      expect(threwAdjInZero).toBe(true);

      const adjOutRes = await inventoryService.adjustOut(invItem.id, {
        quantity: 4,
        reason: 'Kiểm kê phát hiện thiếu Spec',
        referenceCode: 'KK-2026-OUT-SPEC',
        expectedVersion: 2,
        actedById: validActorId,
      });
      expect(adjOutRes.quantity).toBe(11);
      expect(adjOutRes.version).toBe(3);

      const latestTx = await prisma.inventoryTransaction.findFirst({
        where: { inventoryItemId: invItem.id, transactionType: 'ADJUST_OUT' },
        orderBy: { createdAt: 'desc' },
      });
      expect(latestTx?.quantityBefore).toBe(15);
      expect(latestTx?.quantityAfter).toBe(11);
    });
  });

  describe('CONCURRENT TESTS', () => {
    it('should adjust stock concurrently keeping consistency', async () => {
      const validActorId = 'inv-tech-user';
      const itemConcIn = await prisma.inventoryItem.create({
        data: { itemCode: `SPEC-CONC-IN-${Date.now()}`, name: 'Conc In Item', category: 'Cơ khí', quantity: 10, unit: 'Cái', unitPrice: 100, version: 1 },
      });

      const inPromises = [];
      for (let i = 0; i < 10; i++) {
        inPromises.push(inventoryService.adjustIn(itemConcIn.id, { quantity: 5, reason: `Conc in ${i}`, expectedVersion: 1, actedById: validActorId }).catch(err => err));
      }
      const inResults = await Promise.all(inPromises);
      const inSuccesses = inResults.filter((res) => res.id && res.quantity === 15);
      const inFailures = inResults.filter((res) => res.status === 409);

      expect(inSuccesses.length).toBe(1);
      expect(inFailures.length).toBe(9);
    });
  });
});
