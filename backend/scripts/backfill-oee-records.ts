import { PrismaClient } from '@prisma/client';
import { buildBatchOeeId, calculateOeeTimeMetrics, standardShiftWindow, validateTimeRows } from '../src/modules/equipment/oee-calculations';

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

async function main() {
  const report = { mode: apply ? 'apply' : 'dry-run', scanned: 0, candidates: 0, missingProductCode: 0,
    invalidTimeRows: 0, missingPlanTime: 0, runtimeDiscrepancies: 0 };
  let cursor: string | undefined;
  while (true) {
    const records = await prisma.equipmentOeeRecord.findMany({
      orderBy: { id: 'asc' }, take: 200,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { equipment: { select: { code: true } } },
    });
    if (!records.length) break;
    for (const record of records) {
      report.scanned++;
      let sheet: any;
      try { sheet = JSON.parse(record.downtimeBreakdown || '{}').fieldSheetVer2; } catch { /* Audit below. */ }
      // Only the explicit field-sheet code is safe to infer. A product name is not a product code.
      const productCode = record.productCode || (typeof sheet?.productCode === 'string' ? sheet.productCode.trim() : null);
      if (!productCode) report.missingProductCode++;
      if (record.plannedProductionMinutes == null) report.missingPlanTime++;
      const rows = sheet?.timeRows;
      const validRows = Array.isArray(rows) && rows.length && !validateTimeRows(rows);
      if (rows && !validRows) report.invalidTimeRows++;
      const times = validRows ? calculateOeeTimeMetrics(rows, record.shift, record.shiftDurationMinutes) : null;
      if (times && Math.abs(times.runTimeMinutes - record.runTimeMinutes) > 0.01) report.runtimeDiscrepancies++;
      const [start, end] = standardShiftWindow(record.shift);
      const data = {
        productCode: productCode || null,
        batchOeeId: record.batchOeeId || buildBatchOeeId(record.equipment.code, productCode, record.batchNumber),
        pa2PlanTimeMinutes: record.pa2PlanTimeMinutes ?? times?.pa2PlanTimeMinutes ?? Math.max(end - start, record.shiftDurationMinutes),
      };
      if (data.productCode !== record.productCode || data.batchOeeId !== record.batchOeeId || data.pa2PlanTimeMinutes !== record.pa2PlanTimeMinutes) {
        report.candidates++;
        if (apply) await prisma.equipmentOeeRecord.update({ where: { id: record.id }, data });
      }
    }
    cursor = records[records.length - 1].id;
  }
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => { console.error('OEE backfill failed:', error.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
