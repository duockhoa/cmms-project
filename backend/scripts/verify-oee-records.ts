import { strict as assert } from 'assert';
import { PrismaClient } from '@prisma/client';
import { OeeRecordsService } from '../src/modules/equipment/oee-records.service';
import { businessDateKey, dayMinute, minuteDateKey } from '../src/modules/equipment/oee-calculations';

const prisma = new PrismaClient();

async function main() {
  if (!/^(localhost|127\.0\.0\.1|\[::1\])$/.test(new URL(process.env.DATABASE_URL!).hostname)) {
    throw new Error('This verification is restricted to a local database.');
  }
  const user = await prisma.user.findFirst({ select: { id: true } });
  if (!user) throw new Error('A local user is required for verification.');
  const before = await prisma.equipmentOeeRecord.count();
  const beforeEquipmentCount = await prisma.equipment.count();
  const beforeConfigs = await prisma.productSpeedConfig.count();
  const fixtureCode = `OEE_VERIFY_${Date.now()}`;
  const today = businessDateKey(new Date());
  const testDate = minuteDateKey(dayMinute(today) - 2880);
  const rollback = new Error('ROLLBACK_OEE_VERIFICATION');
  try {
    await prisma.$transaction(async (tx) => {
      const equipment = await tx.equipment.create({ data: { code: fixtureCode, name: 'OEE verification fixture',
        category: 'TEST', location: 'TEST', isCritical: true, standardSpeedPerHour: 1200, outputUnit: 'SP' } });
      // Config writes share this outer transaction so every verification write rolls back.
      const scoped = new Proxy(tx, { get(target, key) {
        if (key === '$transaction') return (callback: any) => callback(tx);
        return Reflect.get(target, key);
      } });
      const service = new OeeRecordsService(scoped as any);
      const group = `OEE_VERIFY_${Date.now()}`;
      await service.updateEquipmentOeeConfig(equipment.id, { isCritical: equipment.isCritical,
        productSpeedConfigs: [{ productGroup: group, speedPerHour: 1200 }] });
      const result = await service.submitOeeRecord(equipment.id, user.id, {
        recordDate: testDate, shift: 'CA_1', batchNumber: group, productCode: 'VERIFY_PRODUCT', productGroup: group,
        shiftDurationMinutes: 540, plannedDowntimeMinutes: 60, unplannedDowntimeMinutes: 0,
        runTimeMinutesOverride: 480, totalOutput: 9000, defectOutput: 100,
        downtimeBreakdown: { fieldSheetVer2: { timeRows: [
          { key: 'running', start1: '05:30', end1: '14:30' },
          { key: 'breakShift', start1: '12:00', end1: '13:00' },
        ] } },
      });
      assert.equal(result.record.runTimeMinutes, 480);
      assert.equal(result.record.pa2PlanTimeMinutes, 540);
      assert.equal(result.record.standardSpeedPerHour, 1200);
      assert.equal(result.record.oee, 92.71);
      const query = { equipmentId: equipment.id, criticalOnly: 'false', batchOeeId: result.record.batchOeeId,
        startDate: testDate, endDate: testDate };
      const pa1 = await service.getOeeAnalyticsSummary(query);
      const pa2 = await service.getOeeAnalyticsSummary({ ...query, calculationMethod: 'PA2' });
      assert.equal(pa1.summary.avgOee, 92.71);
      assert.equal(pa1.summary.totalShiftsRecorded, 1);
      assert.equal(pa2.summary.avgAvailability, 88.89);
      assert.equal(pa2.summary.avgOee, 82.41);
      assert.equal(pa2.batchSummary.length, 1);
      assert.equal(pa2.recentRecords[0].planTimeMinutes, 540);
      const firstPa3 = await service.getOeeAnalyticsSummary({ ...query, calculationMethod: 'PA3' });
      assert.equal(firstPa3.summary.totalRunTimeHours, 7.5);
      assert.equal(firstPa3.summary.totalOutputQty, 8437.5);
      assert.equal(firstPa3.summary.totalPlanTimeHours, 16);
      assert.equal(firstPa3.dataQuality.estimatedOutputRecords, 1);
      const countBeforeRejection = await tx.equipmentOeeRecord.count();
      const hoursBeforeRejection = (await tx.equipment.findUnique({ where: { id: equipment.id } }))!.currentOperatingHours;
      await assert.rejects(service.submitOeeRecord(equipment.id, user.id, {
        recordDate: testDate, shift: 'CA_1', shiftDurationMinutes: 60, plannedDowntimeMinutes: 0,
        unplannedDowntimeMinutes: 0, totalOutput: 100, defectOutput: 0,
        downtimeBreakdown: { fieldSheetVer2: { timeRows: [{ key: 'running', start1: '08:00', end1: '09:00' }] } },
      }), /Khoảng chạy máy trùng phiếu/);
      assert.equal(await tx.equipmentOeeRecord.count(), countBeforeRejection);
      assert.equal((await tx.equipment.findUnique({ where: { id: equipment.id } }))!.currentOperatingHours, hoursBeforeRejection);
      // Changing current settings must not change historical performance.
      await service.updateEquipmentOeeConfig(equipment.id, { isCritical: equipment.isCritical,
        standardSpeedPerHour: 99999, productSpeedConfigs: [] });
      assert.equal((await service.getOeeAnalyticsSummary(query)).summary.avgPerformance, 93.75);
      const second = await service.submitOeeRecord(equipment.id, user.id, {
        recordDate: testDate, shift: 'CA_1', batchNumber: `${group}_B`, productCode: 'VERIFY_PRODUCT_B',
        shiftDurationMinutes: 90, plannedDowntimeMinutes: 0, unplannedDowntimeMinutes: 0,
        standardSpeedPerHour: 1200, totalOutput: 1800, defectOutput: 0,
        downtimeBreakdown: { fieldSheetVer2: { timeRows: [{ key: 'running', start1: '14:30', end1: '16:00' }] } },
      });
      const wholeDayQuery = { equipmentId: equipment.id, criticalOnly: 'false', startDate: testDate, endDate: testDate };
      const sharedPa2 = await service.getOeeAnalyticsSummary({ ...wholeDayQuery, calculationMethod: 'PA2' });
      assert.equal(sharedPa2.summary.totalPlanTimeHours, 10.5);
      assert.equal(sharedPa2.summary.totalShiftsRecorded, 1);
      assert.equal(sharedPa2.summary.totalRecordsRecorded, 2);
      const sharedPa3 = await service.getOeeAnalyticsSummary({ ...wholeDayQuery, calculationMethod: 'PA3' });
      assert.equal(sharedPa3.summary.totalPlanTimeHours, 16);
      assert.equal(sharedPa3.summary.totalRunTimeHours, 9);
      assert.equal(sharedPa3.batchSummary.find((batch) => batch.batchOeeId === result.record.batchOeeId)!.planTimeMinutes, 800);
      const secondLot = await service.getOeeAnalyticsSummary({ ...wholeDayQuery, calculationMethod: 'PA3', batchOeeId: second.record.batchOeeId });
      assert.equal(secondLot.batchSummary[0].planTimeMinutes, 160);
      const missingDays = await service.getOeeAnalyticsSummary({ ...wholeDayQuery, endDate: today, calculationMethod: 'PA3' });
      assert.equal(missingDays.summary.trackedEquipmentDays, 3);
      assert.equal(missingDays.summary.noRecordDays, 2);
      assert.equal(missingDays.summary.totalPlanTimeHours, 48);
      assert.equal(missingDays.summary.unassignedPlanMinutes, 1920);
      const zero = await service.submitOeeRecord(equipment.id, user.id, {
        recordDate: testDate, shift: 'CA_1', shiftDurationMinutes: 480,
        plannedDowntimeMinutes: 0, unplannedDowntimeMinutes: 0,
        runTimeMinutesOverride: 0, totalOutput: 0, defectOutput: 0,
      });
      assert.equal(zero.record.runTimeMinutes, 0);
      assert.equal(zero.record.quality, 100);
      assert.equal(zero.record.oee, 0);
      throw rollback;
    }, { timeout: 15000 });
  } catch (error) { if (error !== rollback) throw error; }
  assert.equal(await prisma.equipmentOeeRecord.count(), before);
  assert.equal(await prisma.equipment.count(), beforeEquipmentCount);
  assert.equal(await prisma.equipment.findUnique({ where: { code: fixtureCode } }), null);
  assert.equal(await prisma.productSpeedConfig.count(), beforeConfigs);
  console.log('OEE database verification passed; all verification writes rolled back.');
}

main().catch((error) => { console.error('OEE verification failed:', error.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
