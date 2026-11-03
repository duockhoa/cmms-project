import { readFileSync } from 'fs';
import { resolve } from 'path';
import { buildBatchOeeId, calculateOee, calculateOeeTimeMetrics, calcRowMinutes, emptyOeeTotals, OeeTimeRow, parseFlexibleTime, validateTimeRows } from './oee-calculations';

const row = (key: string, start1: string, end1: string, start2 = '', end2 = ''): OeeTimeRow =>
  ({ key, start1, end1, start2, end2 });

describe('OEE time calculations', () => {
  it('keeps browser and server calculations identical', () => {
    expect(readFileSync(resolve(__dirname, '../../../../frontend/src/utils/oee-calculations.ts'), 'utf8'))
      .toBe(readFileSync(resolve(__dirname, 'oee-calculations.ts'), 'utf8'));
  });

  it('subtracts only the union of breaks from the union of running intervals', () => {
    const result = calculateOeeTimeMetrics([
      row('running', '08:00', '12:00', '10:00', '14:00'),
      row('breakShift', '10:00', '11:00', '10:30', '11:30'),
      row('breakdown', '12:00', '12:30'),
    ], 'CA_1');
    expect(result.runTimeMinutes).toBe(270);
    expect(result.breakOverlapMinutes).toBe(90);
    expect(result.shiftDurationMinutes).toBe(360);
    expect(result.plannedProductionMinutes).toBe(270);
    expect(result.pa2PlanTimeMinutes).toBe(480);
  });

  it('calculates 08:00–17:00 minus 12:00–13:00 as 480 minutes', () => {
    const result = calculateOeeTimeMetrics([row('running', '8h', '17h'), row('breakShift', '12h', '13h')], 'HANH_CHINH');
    expect(result.runTimeMinutes).toBe(480);
    expect(result.shiftDurationMinutes).toBe(540);
    expect(result.pa2PlanTimeMinutes).toBe(570);
  });

  it('aligns post-midnight breaks with an overnight run', () => {
    const result = calculateOeeTimeMetrics([row('running', '22:00', '06:00'), row('breakShift', '02:00', '03:00')], 'CA_3');
    expect(result.runTimeMinutes).toBe(420);
    expect(result.plannedProductionMinutes).toBe(420);
    expect(result.pa2PlanTimeMinutes).toBe(480);
    expect(calcRowMinutes(row('running', '22:00', '02:00', '01:00', '06:00'), 'CA_3')).toBe(480);
  });

  it.each([
    ['CA_1', '05:30', '14:30', 540],
    ['CA_2', '13:00', '23:00', 600],
    ['CA_3', '21:00', '07:00', 600],
  ])('expands %s for early starts and late finishes', (shift, start, end, minutes) => {
    expect(calculateOeeTimeMetrics([row('running', start, end)], shift).pa2PlanTimeMinutes).toBe(minutes);
  });

  it('preserves an explicit zero runtime and a fully overlapping break', () => {
    expect(calculateOeeTimeMetrics([{ key: 'running', manualMinutes: '0' }], 'CA_1').runTimeMinutes).toBe(0);
    const times = calculateOeeTimeMetrics([row('running', '8', '9'), row('breakShift', '8', '9')], 'CA_1');
    expect(times.runTimeMinutes).toBe(0);
    expect(times.plannedProductionMinutes).toBe(0);
  });

  it('uses manual durations without assuming break overlap', () => {
    const times = calculateOeeTimeMetrics([{ key: 'running', manualMinutes: 120 }, { key: 'breakShift', manualMinutes: 30 }], 'CA_1');
    expect(times.runTimeMinutes).toBe(120);
    expect(times.plannedProductionMinutes).toBe(120);
    expect(times.pa2PlanTimeMinutes).toBe(480);
  });

  it('rejects partial and malformed times instead of ignoring them', () => {
    expect(validateTimeRows([row('running', '8:00', '')])).toBeTruthy();
    expect(validateTimeRows([row('running', '24:30', '25:00')])).toBeTruthy();
    expect(validateTimeRows([{ key: 'running', manualMinutes: -1 }])).toBeTruthy();
    expect(parseFlexibleTime('08x:30')).toBeNull();
    expect(parseFlexibleTime('24:00')).toBe(1440);
  });

  it('distinguishes no data from zero output and caps P for OEE', () => {
    expect(calculateOee(emptyOeeTotals())).toEqual({ availability: 0, performance: 0, quality: 0, oee: 0 });
    expect(calculateOee({ ...emptyOeeTotals(), count: 1 }).quality).toBe(100);
    expect(calculateOee({ count: 1, runTimeMinutes: 60, planTimeMinutes: 60, theoreticalOutput: 100, totalOutput: 150, goodOutput: 150 }))
      .toEqual({ availability: 100, performance: 120, quality: 100, oee: 100 });
  });

  it('identifies batches by equipment, product and lot without delimiter collisions', () => {
    expect(buildBatchOeeId('EQ1', 'SP1', 'LOT1')).toBe('EQ1_SP1_LOT1');
    expect(buildBatchOeeId('EQ1', 'SP1', 'LOT1')).not.toBe(buildBatchOeeId('EQ1', 'SP2', 'LOT1'));
    expect(buildBatchOeeId('EQ_A', 'B', 'C')).not.toBe(buildBatchOeeId('EQ', 'A_B', 'C'));
    expect(buildBatchOeeId('EQ1', '', 'LOT1')).toBeNull();
  });
});
