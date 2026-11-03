import { businessDateKey, calculateOeeTimeMetrics, duration, OeeTimeRow } from './oee-calculations';
import { AllocationRecord, allocateIntervalUnion, allocateOeeTime, buildRecordTimeline } from './oee-time-allocation';

const make = (id: string, start: string, end: string, changes: Partial<AllocationRecord> = {}, extraRows: OeeTimeRow[] = []): AllocationRecord => {
  const shift = changes.shift || 'CA_1';
  const rows = [{ key: 'running', start1: start, end1: end }, ...extraRows];
  const times = calculateOeeTimeMetrics(rows, shift);
  return { id, equipmentId: 'eq1', recordDate: '2026-11-01', shift,
    shiftDurationMinutes: times.shiftDurationMinutes, plannedProductionMinutes: times.plannedProductionMinutes,
    plannedDowntimeMinutes: times.plannedDowntimeMinutes, unplannedDowntimeMinutes: times.unplannedDowntimeMinutes,
    runTimeMinutes: times.runTimeMinutes, pa2PlanTimeMinutes: times.pa2PlanTimeMinutes,
    downtimeBreakdown: JSON.stringify({ fieldSheetVer2: { timeRows: rows } }),
    standardSpeedPerHour: 600, totalOutput: times.runTimeMinutes * 10, goodOutput: times.runTimeMinutes * 10,
    ...changes };
};
const options = { startDate: '2026-11-01', endDate: '2026-11-01', firstRecordDates: new Map([['eq1', '2026-11-01']]) };
const sum = (items: Array<any>, key: string) => items.reduce((total, item) => total + item[key], 0);

describe('OEE equipment/shift/day allocation', () => {
  it('shares a PA2 shift between consecutive lots by their running time', () => {
    const result = allocateOeeTime([make('a', '08:00', '10:00'), make('b', '10:00', '14:00')], 'PA2', options);
    expect(result.contributions.map((item) => item.planTimeMinutes)).toEqual([160, 320]);
    expect(sum(result.contributions, 'runTimeMinutes')).toBe(360);
    expect(sum(result.contributions, 'planTimeMinutes')).toBe(480);
  });

  it('allocates exactly one 960-minute PA3 day across consecutive lots', () => {
    const result = allocateOeeTime([make('a', '08:00', '10:00'), make('b', '10:00', '14:00')], 'PA3', options);
    expect(result.contributions.map((item) => item.planTimeMinutes)).toEqual([320, 640]);
    expect(sum(result.contributions, 'planTimeMinutes')).toBe(960);
    expect(sum(result.contributions, 'runTimeMinutes')).toBe(360);
  });

  it('merges two shifts into one PA3 day', () => {
    const result = allocateOeeTime([make('a', '06:00', '14:00'), make('b', '14:00', '22:00', { shift: 'CA_2' })], 'PA3', options);
    expect(sum(result.contributions, 'planTimeMinutes')).toBe(960);
    expect(sum(result.contributions, 'runTimeMinutes')).toBe(960);
    expect(sum(result.contributions, 'totalOutput')).toBe(9600);
    expect(result.calendar).toHaveLength(1);
    expect(result.calendar[0].recordsCount).toBe(2);
  });

  it('deduplicates overlapping runtime and preserves declared quantities for reconciliation', () => {
    const result = allocateOeeTime([make('a', '08:00', '12:00'), make('b', '10:00', '14:00')], 'PA1', options);
    expect(result.overlappingRunMinutes).toBe(120);
    expect(result.contributions.map((item) => item.runTimeMinutes)).toEqual([180, 180]);
    expect(sum(result.contributions, 'planTimeMinutes')).toBe(360);
    expect(sum(result.contributions, 'totalOutput')).toBe(4800);
  });

  it('subtracts breaks before sharing any overlapping run', () => {
    const record = make('a', '08:00', '14:00', {}, [{ key: 'breakShift', start1: '12:00', end1: '13:00' }]);
    const result = allocateOeeTime([record, make('b', '12:00', '13:00')], 'PA2', options);
    expect(result.overlappingRunMinutes).toBe(0);
    expect(sum(result.contributions, 'runTimeMinutes')).toBe(360);
    expect(sum(result.contributions, 'plannedDowntimeMinutes')).toBe(60);
  });

  it('deduplicates expanded windows across different shift names', () => {
    const result = allocateOeeTime([make('a', '06:00', '15:00'), make('b', '15:00', '22:00', { shift: 'CA_2' })], 'PA2', options);
    expect(sum(result.contributions, 'planTimeMinutes')).toBe(960);
    expect(result.deduplicatedPlanMinutes).toBe(60);
  });

  it('clips PA3 runtime and estimates only the corresponding output fraction', () => {
    const record = make('a', '05:00', '23:00');
    const result = allocateOeeTime([record], 'PA3', options);
    expect(result.contributions[0]).toMatchObject({ runTimeMinutes: 960, planTimeMinutes: 960,
      totalOutput: 9600, goodOutput: 9600, outputEstimated: true });
    expect(record.totalOutput).toBe(10800);
  });

  it('places early-morning events on the next day of an overnight shift', () => {
    const record = make('a', '21:00', '07:00', { shift: 'CA_3' });
    const result = allocateOeeTime([record], 'PA3', { ...options, endDate: '2026-11-02' });
    expect(result.contributions.map((item) => [item.date, item.runTimeMinutes, item.totalOutput]))
      .toEqual([['2026-11-01', 60, 600], ['2026-11-02', 60, 600]]);
    expect(sum(result.contributions, 'planTimeMinutes')).toBe(1920);
    expect(result.calendar[1].status).toBe('RUNNING');
  });

  it('uses the previous production date when only the next day is requested', () => {
    const result = allocateOeeTime([make('a', '21:00', '07:00', { shift: 'CA_3' })], 'PA3',
      { ...options, startDate: '2026-11-02', endDate: '2026-11-02' });
    expect(result.contributions).toHaveLength(1);
    expect(result.contributions[0]).toMatchObject({ date: '2026-11-02', runTimeMinutes: 60, totalOutput: 600 });
  });

  it('retains days without records from the first valid record onward', () => {
    const result = allocateOeeTime([make('a', '08:00', '09:00')], 'PA3',
      { ...options, startDate: '2026-10-28', endDate: '2026-11-03' });
    expect(result.calendar.map((day) => [day.date, day.status])).toEqual([
      ['2026-11-01', 'RUNNING'], ['2026-11-02', 'NO_RECORD'], ['2026-11-03', 'NO_RECORD'],
    ]);
    expect(sum(result.unassignedPlan, 'minutes')).toBe(1920);
    expect(sum(result.contributions, 'planTimeMinutes') + sum(result.unassignedPlan, 'minutes')).toBe(2880);
  });

  it('distinguishes a recorded stop from a day without a record', () => {
    const zero = make('zero', '08:00', '08:00', { runTimeMinutes: 0, totalOutput: 0, goodOutput: 0 });
    const result = allocateOeeTime([zero], 'PA3', { ...options, endDate: '2026-11-02' });
    expect(result.calendar.map((day) => day.status)).toEqual(['RECORDED_STOP', 'NO_RECORD']);
    expect(result.contributions[0]).toMatchObject({ runTimeMinutes: 0, planTimeMinutes: 960, totalOutput: 0 });
  });

  it('does not invent a tracking start for an equipment with no valid records', () => {
    const result = allocateOeeTime([], 'PA3', { ...options, firstRecordDates: new Map() });
    expect(result.calendar).toEqual([]);
    expect(result.unassignedPlan).toEqual([]);
  });

  it('uses observed duration when all lots have zero runtime', () => {
    const result = allocateOeeTime([
      make('a', '08:00', '08:00', { runTimeMinutes: 0, totalOutput: 0 }, [{ key: 'breakdown', start1: '08:00', end1: '10:00' }]),
      make('b', '10:00', '10:00', { runTimeMinutes: 0, totalOutput: 0 }, [{ key: 'breakdown', start1: '10:00', end1: '14:00' }]),
    ], 'PA3', options);
    expect(result.contributions.map((item) => item.planTimeMinutes)).toEqual([320, 640]);
  });

  it('marks manual timing as estimated and retains an explicit zero', () => {
    const timeline = buildRecordTimeline(make('a', '08:00', '10:00', { runTimeMinutes: 0, downtimeBreakdown: null }));
    expect(timeline.estimated).toBe(true);
    expect(timeline.run).toEqual([]);
  });

  it('ignores voided records in runtime and lot allocation', () => {
    const result = allocateOeeTime([make('a', '08:00', '10:00'), make('b', '08:00', '14:00', { isVoided: true })], 'PA3', options);
    expect(result.contributions).toHaveLength(1);
    expect(result.overlappingRunMinutes).toBe(0);
    expect(result.contributions[0].planTimeMinutes).toBe(960);
  });

  it('does not mix different equipment timelines', () => {
    const result = allocateOeeTime([make('a', '06:00', '14:00'), make('b', '06:00', '14:00', { equipmentId: 'eq2' })], 'PA3',
      { ...options, firstRecordDates: new Map([['eq1', '2026-11-01'], ['eq2', '2026-11-01']]) });
    expect(sum(result.contributions, 'planTimeMinutes')).toBe(1920);
    expect(sum(result.contributions, 'runTimeMinutes')).toBe(960);
    expect(result.overlappingRunMinutes).toBe(0);
  });

  it('conserves union minutes independent of record order without rounding fractional shares', () => {
    const owners = [1, 2, 3].map((id) => ({ id: String(id), intervals: [[0, 100]] as [number, number][], weight: id }));
    const left = allocateIntervalUnion(owners);
    const right = allocateIntervalUnion(owners.slice().reverse());
    expect(left.totals.get('1')).toBeCloseTo(100 / 6);
    expect(left.unionMinutes).toBeCloseTo(100);
    for (const owner of owners) expect(right.totals.get(owner.id)).toBe(left.totals.get(owner.id));
  });

  it('uses the plant calendar regardless of server timezone', () => {
    expect(businessDateKey('2026-11-01T22:00:00Z')).toBe('2026-11-02');
    expect(duration(buildRecordTimeline(make('a', '22:00', '06:00', { shift: 'CA_3' })).run)).toBe(480);
  });

  it('preserves manual running minutes instead of assuming identical shift starts overlap', () => {
    const records = [make('a', '08:00', '10:00', { downtimeBreakdown: null }), make('b', '10:00', '14:00', { downtimeBreakdown: null })];
    for (const method of ['PA1', 'PA2', 'PA3'] as const) {
      const result = allocateOeeTime(records, method, options);
      expect(sum(result.contributions, 'runTimeMinutes')).toBe(360);
      expect(result.estimatedRuntimeReductionMinutes).toBe(0);
      expect(result.contributions.every((item) => item.estimated)).toBe(true);
    }
    expect(sum(allocateOeeTime(records, 'PA1', options).contributions, 'planTimeMinutes')).toBe(360);
  });

  it('caps untimed runs proportionally only when their combined demand exceeds shift capacity', () => {
    const records = [make('a', '06:00', '14:00', { runTimeMinutes: 360, downtimeBreakdown: null }),
      make('b', '06:00', '14:00', { runTimeMinutes: 360, downtimeBreakdown: null })];
    const result = allocateOeeTime(records, 'PA2', options);
    expect(result.contributions.map((item) => item.runTimeMinutes)).toEqual([240, 240]);
    expect(result.estimatedRuntimeReductionMinutes).toBe(240);
    expect(sum(result.contributions, 'planTimeMinutes')).toBe(480);
  });

  it('counts the night-shift record on the following calendar morning outside the PA3 frame', () => {
    const result = allocateOeeTime([make('night', '22:00', '06:00', { shift: 'CA_3' })], 'PA3',
      { ...options, endDate: '2026-11-02' });
    expect(result.calendar[1]).toMatchObject({ status: 'RUNNING', recordsCount: 1, runTimeMinutes: 360, frameRunTimeMinutes: 0 });
  });
});
