import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateOeeRecordDto, UpdateEquipmentOeeConfigDto } from './dto/oee-record.dto';
import { OeeRecordsService } from './oee-records.service';

describe('OEE records service', () => {
  const equipment = { id: 'eq-1', code: 'EQ1', isCritical: true, standardSpeedPerHour: 9999,
    plannedShiftMinutes: 480, outputUnit: 'SP', oeeTarget: 85 };
  let db: any;
  let service: OeeRecordsService;
  const dto = (changes: Partial<CreateOeeRecordDto> = {}): CreateOeeRecordDto => ({
    recordDate: '2026-11-02', shift: 'CA_1', shiftDurationMinutes: 480,
    plannedDowntimeMinutes: 0, unplannedDowntimeMinutes: 0,
    standardSpeedPerHour: 600, totalOutput: 0, defectOutput: 0, ...changes,
  });
  const record = (changes: any = {}) => ({ id: 'r1', equipmentId: equipment.id, equipment,
    recordDate: new Date('2026-11-02T08:00:00+07:00'), shift: 'CA_1', productCode: 'SP1',
    batchNumber: 'LOT1', batchOeeId: 'EQ1_SP1_LOT1', shiftDurationMinutes: 360,
    plannedDowntimeMinutes: 0, unplannedDowntimeMinutes: 0, plannedProductionMinutes: 360,
    pa2PlanTimeMinutes: 480, runTimeMinutes: 324, standardSpeedPerHour: 600,
    totalOutput: 2700, goodOutput: 2600, defectOutput: 100, ...changes });

  beforeEach(() => {
    db = { equipment: { findFirst: jest.fn().mockResolvedValue(equipment), findMany: jest.fn().mockResolvedValue([equipment]), update: jest.fn().mockResolvedValue(equipment) },
      equipmentOeeRecord: { count: jest.fn().mockResolvedValue(0), findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve(data)), findMany: jest.fn().mockResolvedValue([]),
        groupBy: jest.fn().mockImplementation(({ where }) => Promise.resolve(where.equipmentId.in.length
          ? [{ equipmentId: 'eq-1', _min: { recordDate: new Date('2026-11-02T00:00:00Z') } }] : [])) },
      productSpeedConfig: { findUnique: jest.fn().mockResolvedValue(null), deleteMany: jest.fn(), createMany: jest.fn() },
      $queryRaw: jest.fn().mockResolvedValue([]), $transaction: jest.fn().mockImplementation((callback) => callback(db)) };
    service = new OeeRecordsService(db);
  });

  it('honors a zero runtime override, including zero production', async () => {
    const result = await service.submitOeeRecord('eq-1', 'user-1', dto({ runTimeMinutesOverride: 0 }));
    expect(result.record.runTimeMinutes).toBe(0);
    expect(result.record.quality).toBe(100);
    expect(result.record.oee).toBe(0);
    expect(db.equipment.update.mock.calls[0][0].data.currentOperatingHours.increment).toBe(0);
  });

  it('keeps the legacy downtime fallback when no override is sent', async () => {
    const result = await service.submitOeeRecord('eq-1', 'user-1', dto({ plannedDowntimeMinutes: 30, unplannedDowntimeMinutes: 60 }));
    expect(result.record.runTimeMinutes).toBe(390);
  });

  it('honors a zero override when the optional field sheet has no time entries', async () => {
    const result = await service.submitOeeRecord('eq-1', 'user-1', dto({ runTimeMinutesOverride: 0,
      downtimeBreakdown: { fieldSheetVer2: { timeRows: [{ key: 'running', manualMinutes: '' }] } } }));
    expect(result.record.runTimeMinutes).toBe(0);
  });

  it('rejects invalid overrides rather than silently changing them', async () => {
    for (const value of [-1, 481, Number.NaN]) {
      await expect(service.submitOeeRecord('eq-1', 'user-1', dto({ runTimeMinutesOverride: value }))).rejects.toBeInstanceOf(BadRequestException);
    }
  });

  it('persists interval runtime, product identity, group speed and the PA2 window', async () => {
    db.productSpeedConfig.findUnique.mockResolvedValue({ speedPerHour: 1200 });
    const result = await service.submitOeeRecord('eq-1', 'user-1', dto({
      productCode: 'SP1', productGroup: 'Nhóm 1', batchNumber: 'LOT1', runTimeMinutesOverride: 999,
      downtimeBreakdown: { fieldSheetVer2: { timeRows: [
        { key: 'running', start1: '05:30', end1: '14:30' },
        { key: 'breakShift', start1: '12:00', end1: '13:00' },
      ] } },
    }));
    expect(result.record).toMatchObject({ runTimeMinutes: 480, plannedProductionMinutes: 480,
      pa2PlanTimeMinutes: 540, standardSpeedPerHour: 1200, batchOeeId: 'EQ1_SP1_LOT1', productGroup: 'Nhóm 1' });
  });

  it('falls back to equipment speed for an unconfigured group', async () => {
    const result = await service.submitOeeRecord('eq-1', 'user-1', dto({ productGroup: 'New group', standardSpeedPerHour: 1 }));
    expect(result.record.standardSpeedPerHour).toBe(9999);
  });

  it('aggregates numerators and denominators using each record speed', async () => {
    db.equipmentOeeRecord.findMany.mockResolvedValue([record(), record({ id: 'r2', shift: 'CA_2', plannedProductionMinutes: 480,
      shiftDurationMinutes: 480, runTimeMinutes: 336, standardSpeedPerHour: 1200, totalOutput: 6000, goodOutput: 5900 })]);
    const result = await service.getOeeAnalyticsSummary();
    expect(result.summary).toMatchObject({ avgAvailability: 78.57, avgPerformance: 87.35, avgQuality: 97.7, avgOee: 67.05 });
    const expected = { availability: 78.57, performance: 87.35, quality: 97.7, oee: 67.05 };
    expect(result.equipmentLeaderboard[0]).toMatchObject(expected);
    expect(result.dailyTrend[0]).toMatchObject(expected);
    expect(result.batchSummary[0]).toMatchObject({ ...expected, shiftsCount: 2 });
    expect(db.equipmentOeeRecord.findMany.mock.calls[0][0].where.isVoided).toBe(false);
  });

  it('changes only the availability denominator for PA2', async () => {
    db.equipmentOeeRecord.findMany.mockResolvedValue([record()]);
    const result = await service.getOeeAnalyticsSummary({ calculationMethod: 'PA2' });
    expect(result.summary.avgAvailability).toBe(67.5);
    expect(result.summary.avgPerformance).toBe(83.33);
    expect(result.recentRecords[0]).toMatchObject({ planTimeMinutes: 480, availability: 67.5, calculationMethod: 'PA2' });
    expect(result.batchSummary[0].planTimeMinutes).toBe(480);
  });

  it('derives PA2 for historical field sheets without a stored PA2 value', async () => {
    db.equipmentOeeRecord.findMany.mockResolvedValue([record({ pa2PlanTimeMinutes: null,
      downtimeBreakdown: JSON.stringify({ fieldSheetVer2: { timeRows: [{ key: 'running', start1: '05:00', end1: '15:00' }] } }) })]);
    expect((await service.getOeeAnalyticsSummary({ calculationMethod: 'PA2' })).recentRecords[0].planTimeMinutes).toBe(600);
  });

  it('does not merge different products with the same lot number', async () => {
    db.equipmentOeeRecord.findMany.mockResolvedValue([record(), record({ id: 'r2', productCode: 'SP2', batchOeeId: 'EQ1_SP2_LOT1' })]);
    expect((await service.getOeeAnalyticsSummary()).batchSummary).toHaveLength(2);
  });

  it('limits analytics to the selected equipment set, even when empty', async () => {
    db.equipment.findMany.mockResolvedValue([]);
    const result = await service.getOeeAnalyticsSummary();
    expect(db.equipmentOeeRecord.findMany.mock.calls[0][0].where.equipmentId).toEqual({ in: [] });
    expect(result.summary.avgQuality).toBe(0);
    await expect(service.getOeeAnalyticsSummary({ calculationMethod: 'PA4' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('filters by batch identity', async () => {
    await service.getOeeAnalyticsSummary({ batchOeeId: 'EQ1_SP1_LOT1' });
    expect(db.equipmentOeeRecord.findMany.mock.calls[0][0].where.batchOeeId).toBeUndefined();
    await service.getAllRecords({ batchOeeId: 'EQ1_SP1_LOT1' });
    expect(db.equipmentOeeRecord.findMany.mock.calls[1][0].where.batchOeeId).toBe('EQ1_SP1_LOT1');
  });

  it('updates group speeds atomically and supports clearing the list', async () => {
    await service.updateEquipmentOeeConfig('eq-1', { isCritical: true, productSpeedConfigs: [] });
    expect(db.$transaction).toHaveBeenCalled();
    expect(db.productSpeedConfig.deleteMany).toHaveBeenCalledWith({ where: { equipmentId: 'eq-1' } });
    expect(db.productSpeedConfig.createMany).not.toHaveBeenCalled();
    await expect(service.updateEquipmentOeeConfig('eq-1', { isCritical: true, productSpeedConfigs: [
      { productGroup: ' A ', speedPerHour: 100 }, { productGroup: 'a', speedPerHour: 200 },
    ] })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('validates nested speed configs and nonnegative runtime at the API boundary', async () => {
    expect(await validate(plainToInstance(CreateOeeRecordDto, dto({ runTimeMinutesOverride: -1 })))).not.toHaveLength(0);
    expect(await validate(plainToInstance(UpdateEquipmentOeeConfigDto, { isCritical: true,
      productSpeedConfigs: [{ productGroup: '', speedPerHour: -1 }] }))).not.toHaveLength(0);
    expect(await validate(plainToInstance(CreateOeeRecordDto, dto({ runTimeMinutesOverride: 0 })))).toHaveLength(0);
  });

  const timedRecord = (id: string, start: string, end: string, changes: any = {}) => record({ id,
    runTimeMinutes: 120, totalOutput: 1200, goodOutput: 1200, defectOutput: 0,
    downtimeBreakdown: JSON.stringify({ fieldSheetVer2: { timeRows: [{ key: 'running', start1: start, end1: end }] } }), ...changes });

  it('allocates before filtering lots and counts one shared shift once', async () => {
    db.equipmentOeeRecord.findMany.mockResolvedValue([
      timedRecord('a', '08:00', '10:00'), timedRecord('b', '10:00', '14:00', {
        runTimeMinutes: 240, totalOutput: 2400, goodOutput: 2400, productCode: 'SP2', batchOeeId: 'EQ1_SP2_LOT1' }),
    ]);
    const all = await service.getOeeAnalyticsSummary({ calculationMethod: 'PA2' });
    const filtered = await service.getOeeAnalyticsSummary({ calculationMethod: 'PA2', batchOeeId: 'EQ1_SP1_LOT1' });
    expect(all.summary).toMatchObject({ totalShiftsRecorded: 1, totalRecordsRecorded: 2, avgAvailability: 75 });
    expect(all.batchSummary.map((batch) => batch.planTimeMinutes)).toEqual([160, 320]);
    expect(filtered.batchSummary[0]).toMatchObject({ planTimeMinutes: 160, runTimeMinutes: 120, availability: 75 });
    expect(filtered.batchOptions).toHaveLength(2);
  });

  it('includes missing PA3 days after the first record without assigning them to a filtered lot', async () => {
    db.equipmentOeeRecord.groupBy.mockResolvedValue([{ equipmentId: 'eq-1', _min: { recordDate: new Date('2026-11-01T00:00:00Z') } }]);
    db.equipmentOeeRecord.findMany.mockResolvedValue([timedRecord('a', '06:00', '14:00', {
      recordDate: new Date('2026-11-01T00:00:00Z'), runTimeMinutes: 480, totalOutput: 4800, goodOutput: 4800 })]);
    const query = { calculationMethod: 'PA3', startDate: '2026-11-01', endDate: '2026-11-02' };
    const all = await service.getOeeAnalyticsSummary(query);
    expect(all.summary).toMatchObject({ totalPlanTimeHours: 32, totalRunTimeHours: 8,
      avgAvailability: 25, avgOee: 25, noRecordDays: 1, unassignedPlanMinutes: 960 });
    expect(all.dailyTrend).toHaveLength(2);
    expect(all.dailyTrend[1]).toMatchObject({ date: '2026-11-02', oee: 0 });
    const filtered = await service.getOeeAnalyticsSummary({ ...query, batchOeeId: 'EQ1_SP1_LOT1' });
    expect(filtered.summary).toMatchObject({ totalPlanTimeHours: 16, avgAvailability: 50, noRecordDays: 1, unassignedPlanMinutes: 0 });
    expect(filtered.equipmentDays).toHaveLength(2);
  });

  it('reports a PA3 zero on a recorded machine with no records in the selected period', async () => {
    db.equipmentOeeRecord.groupBy.mockResolvedValue([{ equipmentId: 'eq-1', _min: { recordDate: new Date('2026-10-30T00:00:00Z') } }]);
    const result = await service.getOeeAnalyticsSummary({ calculationMethod: 'PA3', startDate: '2026-11-01', endDate: '2026-11-02' });
    expect(result.summary).toMatchObject({ totalShiftsRecorded: 0, totalPlanTimeHours: 32, avgOee: 0, noRecordDays: 2 });
    expect(result.equipmentLeaderboard[0]).toMatchObject({ trackedDays: 2, evaluation: 'WARNING', oee: 0 });
  });

  it('loads and clips a previous production date for a PA3 morning run', async () => {
    db.equipmentOeeRecord.groupBy.mockResolvedValue([{ equipmentId: 'eq-1', _min: { recordDate: new Date('2026-11-01T00:00:00Z') } }]);
    db.equipmentOeeRecord.findMany.mockResolvedValue([timedRecord('a', '21:00', '07:00', {
      recordDate: new Date('2026-11-01T00:00:00Z'), shift: 'CA_3', runTimeMinutes: 600, totalOutput: 6000, goodOutput: 6000 })]);
    const result = await service.getOeeAnalyticsSummary({ calculationMethod: 'PA3', startDate: '2026-11-02', endDate: '2026-11-02' });
    expect(result.summary).toMatchObject({ avgAvailability: 6.25, totalRunTimeHours: 1, totalOutputQty: 600 });
    expect(result.dataQuality.estimatedOutputRecords).toBe(1);
    expect(result.recentRecords[0]).toMatchObject({ runTimeMinutes: 60, recordedRunTimeMinutes: 600, allocationEstimated: true });
  });

  it('rejects new timed runs that overlap an existing valid record', async () => {
    db.equipmentOeeRecord.findMany.mockResolvedValue([timedRecord('a', '08:00', '10:00', { recordCode: 'OEE-EXISTING' })]);
    await expect(service.submitOeeRecord('eq-1', 'user-1', dto({ downtimeBreakdown: {
      fieldSheetVer2: { timeRows: [{ key: 'running', start1: '09:00', end1: '11:00' }] },
    } }))).rejects.toThrow('OEE-EXISTING');
    expect(db.equipmentOeeRecord.create).not.toHaveBeenCalled();
    expect(db.equipment.update).not.toHaveBeenCalled();
    expect(db.$transaction.mock.calls[0][1]).toEqual({ isolationLevel: 'ReadCommitted' });
    expect(db.$queryRaw).toHaveBeenCalled();
  });

  it('allows a run starting exactly when the preceding run ends', async () => {
    db.equipmentOeeRecord.findMany.mockResolvedValue([timedRecord('a', '08:00', '10:00')]);
    const result = await service.submitOeeRecord('eq-1', 'user-1', dto({ downtimeBreakdown: {
      fieldSheetVer2: { timeRows: [{ key: 'running', start1: '10:00', end1: '11:00' }] },
    } }));
    expect(result.record.runTimeMinutes).toBe(60);
  });

  it('detects an overlap with a preceding overnight shift', async () => {
    db.equipmentOeeRecord.findMany.mockResolvedValue([timedRecord('a', '22:00', '07:00', {
      recordDate: new Date('2026-11-01T00:00:00Z'), shift: 'CA_3', recordCode: 'OEE-NIGHT' })]);
    await expect(service.submitOeeRecord('eq-1', 'user-1', dto({ downtimeBreakdown: {
      fieldSheetVer2: { timeRows: [{ key: 'running', start1: '06:30', end1: '08:00' }] },
    } }))).rejects.toThrow('OEE-NIGHT');
  });

  it('uses a shift window fixed to UTC+7 independently of the host timezone', () => {
    const window = (service as any).getShiftTimeWindow('2026-11-02', 'CA_3');
    expect(window.start.toISOString()).toBe('2026-11-02T15:00:00.000Z');
    expect(window.end.toISOString()).toBe('2026-11-02T23:00:00.000Z');
  });

  it('rejects invalid date ranges and never tracks future days', async () => {
    await expect(service.getOeeAnalyticsSummary({ startDate: '2026-02-30' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.getOeeAnalyticsSummary({ startDate: '2026-11-02', endDate: '2026-11-01' })).rejects.toBeInstanceOf(BadRequestException);
    const result = await service.getOeeAnalyticsSummary({ calculationMethod: 'PA3', startDate: '2099-01-01', endDate: '2099-01-02' });
    expect(result.equipmentDays).toEqual([]);
    expect(result.summary.totalPlanTimeHours).toBe(0);
  });
});
