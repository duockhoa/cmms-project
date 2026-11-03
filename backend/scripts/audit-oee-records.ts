import { PrismaClient } from '@prisma/client';
import { calculateOeeTimeMetrics, validateTimeRows } from '../src/modules/equipment/oee-calculations';

const prisma = new PrismaClient();

async function main() {
  // Select legacy columns explicitly so the audit also works before the additive migration.
  const columns = await prisma.$queryRaw<Array<{ COLUMN_NAME: string }>>`
    SELECT COLUMN_NAME FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'EquipmentOeeRecord'`;
  const names = new Set(columns.map((column) => column.COLUMN_NAME));
  if (!names.size) { console.log(JSON.stringify({ oeeTableExists: false })); return; }
  const report = { oeeTableExists: true,
    localDatabase: /^(localhost|127\.0\.0\.1|\[::1\])$/.test(new URL(process.env.DATABASE_URL!).hostname),
    newRecordColumnsReady: ['productCode', 'productGroup', 'batchOeeId', 'pa2PlanTimeMinutes'].every((column) => names.has(column)),
    records: 0, missingPlanTime: 0, missingRecordSpeed: 0, fieldSheets: 0, invalidTimeRows: 0,
    runtimeDiscrepancies: 0, missingProductCode: 0 };
  let cursor: string | undefined;
  while (true) {
    const records = await prisma.equipmentOeeRecord.findMany({
      orderBy: { id: 'asc' }, take: 200, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, shift: true, shiftDurationMinutes: true, plannedProductionMinutes: true,
        runTimeMinutes: true, standardSpeedPerHour: true, downtimeBreakdown: true },
    });
    if (!records.length) break;
    for (const record of records) {
      report.records++;
      if (record.plannedProductionMinutes == null) report.missingPlanTime++;
      if (!(record.standardSpeedPerHour > 0)) report.missingRecordSpeed++;
      let sheet: any;
      try { sheet = JSON.parse(record.downtimeBreakdown || '{}').fieldSheetVer2; } catch { /* Legacy notes. */ }
      if (!sheet?.productCode) report.missingProductCode++;
      if (sheet) report.fieldSheets++;
      if (Array.isArray(sheet?.timeRows) && sheet.timeRows.length) {
        if (validateTimeRows(sheet.timeRows)) report.invalidTimeRows++;
        else if (Math.abs(calculateOeeTimeMetrics(sheet.timeRows, record.shift, record.shiftDurationMinutes).runTimeMinutes - record.runTimeMinutes) > 0.01) {
          report.runtimeDiscrepancies++;
        }
      }
    }
    cursor = records[records.length - 1].id;
  }
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => { console.error('OEE audit failed:', error.code || error.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
