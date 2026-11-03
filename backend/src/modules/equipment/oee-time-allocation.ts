import { businessDateKey, dayMinute, duration, intersectIntervals, Interval, mergeIntervals,
  minuteDateKey, OeeTimeRow, rowIntervals, standardShiftWindow, subtractIntervals, validateTimeRows } from './oee-calculations';

export type OeeMethod = 'PA1' | 'PA2' | 'PA3';

export interface AllocationRecord {
  id: string;
  equipmentId: string;
  recordDate: Date | string;
  shift: string;
  shiftDurationMinutes: number;
  plannedProductionMinutes: number;
  plannedDowntimeMinutes: number;
  unplannedDowntimeMinutes: number;
  runTimeMinutes: number;
  pa2PlanTimeMinutes?: number | null;
  downtimeBreakdown?: string | null;
  totalOutput: number;
  goodOutput: number;
  standardSpeedPerHour: number;
  batchOeeId?: string | null;
  isVoided?: boolean;
}

export interface RecordTimeline {
  record: AllocationRecord;
  date: string;
  run: Interval[];
  plan: Interval[];
  observed: Interval[];
  pa2: Interval[];
  plannedDowntime: Interval[];
  unplannedDowntime: Interval[];
  estimated: boolean;
  timedRun: boolean;
  runtimeReconciled: boolean;
}

export function buildRecordTimeline(record: AllocationRecord): RecordTimeline {
  const date = businessDateKey(record.recordDate);
  const base = dayMinute(date);
  const [shiftStart, shiftEnd] = standardShiftWindow(record.shift);
  let rows: OeeTimeRow[] = [];
  try {
    const value = JSON.parse(record.downtimeBreakdown || '{}').fieldSheetVer2?.timeRows;
    if (Array.isArray(value) && !validateTimeRows(value)) rows = value;
  } catch { /* Legacy records use scalar durations. */ }
  const absolute = (intervals: Interval[]): Interval[] => intervals.map(([start, end]) => [base + start, base + end]);
  const all = mergeIntervals(rows.flatMap((row) => rowIntervals(row, record.shift)));
  const runningRow = rows.find((row) => row.key === 'running');
  const running = runningRow ? rowIntervals(runningRow, record.shift) : [];
  const breaks = rows.filter((row) => row.key === 'breakShift').flatMap((row) => rowIntervals(row, record.shift));
  const planned = rows.filter((row) => ['cleaning', 'breakShift'].includes(row.key)).flatMap((row) => rowIntervals(row, record.shift));
  const unplanned = rows.filter((row) => !['cleaning', 'breakShift', 'running'].includes(row.key)).flatMap((row) => rowIntervals(row, record.shift));
  const hasManual = rows.some((row) => !rowIntervals(row, record.shift).length && Number(row.manualMinutes) > 0);
  const observed: Interval = all.length
    ? [all[0][0], all[all.length - 1][1]] : [shiftStart, shiftStart + record.shiftDurationMinutes];
  // Legacy/manual records have no positions. Use a visibly estimated shift-based placement.
  const run = running.length ? subtractIntervals(running, breaks)
    : record.runTimeMinutes > 0 ? [[observed[0], observed[0] + record.runTimeMinutes] as Interval] : [];
  const plan = all.length && !hasManual ? subtractIntervals([observed], planned)
    : record.plannedProductionMinutes > 0 ? [[observed[0], observed[0] + record.plannedProductionMinutes] as Interval] : [];
  const pa2: Interval = all.length && !hasManual
    ? [Math.min(shiftStart, observed[0]), Math.max(shiftEnd, observed[1])]
    : [Math.min(shiftStart, observed[0]), Math.min(shiftStart, observed[0]) + Math.max(shiftEnd - shiftStart, record.pa2PlanTimeMinutes || record.shiftDurationMinutes)];
  const downtime = (intervals: Interval[], minutes: number): Interval[] => intervals.length ? absolute(intervals)
    : minutes > 0 ? absolute([[observed[0], observed[0] + minutes]]) : [];
  return { record, date, run: absolute(run), plan: absolute(plan), observed: absolute([observed]), pa2: absolute([pa2]),
    plannedDowntime: downtime(planned, record.plannedDowntimeMinutes),
    unplannedDowntime: downtime(unplanned, record.unplannedDowntimeMinutes),
    estimated: hasManual || !running.length, timedRun: running.length > 0,
    runtimeReconciled: running.length > 0 && Math.abs(duration(run) - record.runTimeMinutes) > 0.01 };
}

interface IntervalOwner { id: string; intervals: Interval[]; weight: number }

function takeMinutes(pool: Interval[], requested: number): Interval[] {
  const result: Interval[] = [];
  let remaining = requested;
  while (pool.length && remaining > 1e-9) {
    const [start, end] = pool[0];
    const used = Math.min(remaining, end - start);
    if (used > 0) result.push([start, start + used]);
    remaining -= used;
    if (used >= end - start) pool.shift();
    else pool[0] = [start + used, end];
  }
  return result;
}

// Missing timestamps are not evidence of overlapping runs. Place their requested
// durations in the remaining shift capacity, preserving minutes whenever possible.
function placeUntimedRecords(equipment: RecordTimeline[]): number {
  let occupied = mergeIntervals(equipment.filter((item) => item.timedRun).flatMap((item) => item.run));
  const groups = new Map<string, RecordTimeline[]>();
  for (const item of equipment.filter((item) => !item.timedRun)) {
    const key = `${item.date}:${item.record.shift}`;
    groups.set(key, [...(groups.get(key) || []), item]);
  }
  let reducedMinutes = 0;
  for (const [, group] of Array.from(groups.entries()).sort(([left], [right]) => left.localeCompare(right))) {
    group.sort((left, right) => left.record.id.localeCompare(right.record.id));
    const free = subtractIntervals(group.flatMap((item) => item.pa2), occupied);
    const wanted = group.reduce((sum, item) => sum + item.record.runTimeMinutes, 0);
    const ratio = wanted > 0 ? Math.min(1, duration(free) / wanted) : 0;
    const planDemand = group.reduce((sum, item) => sum + duration(item.plan), 0);
    const planPool = free.map(([start, end]): Interval => [start, end]);
    const canPlacePlans = planDemand <= duration(free) && group.every((item) => item.record.runTimeMinutes <= duration(item.plan));
    for (const item of group) {
      const demand = item.record.runTimeMinutes * ratio;
      if (canPlacePlans) {
        item.plan = takeMinutes(planPool, duration(item.plan));
        item.run = takeMinutes(item.plan.map(([start, end]): Interval => [start, end]), demand);
      } else item.run = takeMinutes(free, demand);
      reducedMinutes += Math.max(0, item.record.runTimeMinutes - duration(item.run));
      occupied = mergeIntervals([...occupied, ...item.run]);
    }
  }
  return reducedMinutes;
}

// Split every atomic interval once. Return fractional minutes without intermediate rounding.
export function allocateIntervalUnion(owners: IntervalOwner[]) {
  const totals = new Map<string, number>();
  const normalized = owners.map((owner) => ({ ...owner, intervals: mergeIntervals(owner.intervals) }));
  const points = Array.from(new Set(normalized.flatMap((owner) => owner.intervals.flat()))).sort((a, b) => a - b);
  let overlapMinutes = 0;
  for (let index = 1; index < points.length; index++) {
    const start = points[index - 1], end = points[index];
    if (end <= start) continue;
    const active = normalized.filter((owner) => owner.intervals.some(([left, right]) => left < end && right > start));
    if (!active.length) continue;
    if (active.length > 1) overlapMinutes += end - start;
    const sum = active.reduce((total, owner) => total + Math.max(0, owner.weight), 0);
    for (const owner of active) {
      const weight = sum > 0 ? Math.max(0, owner.weight) / sum : 1 / active.length;
      totals.set(owner.id, (totals.get(owner.id) || 0) + (end - start) * weight);
    }
  }
  return { totals, overlapMinutes, unionMinutes: Array.from(totals.values()).reduce((sum, value) => sum + value, 0) };
}

export interface OeeContribution {
  recordId: string;
  equipmentId: string;
  date: string;
  runTimeMinutes: number;
  planTimeMinutes: number;
  theoreticalOutput: number;
  totalOutput: number;
  goodOutput: number;
  plannedDowntimeMinutes: number;
  unplannedDowntimeMinutes: number;
  estimated: boolean;
  outputEstimated: boolean;
  runtimeReconciled: boolean;
}

export interface EquipmentDay {
  equipmentId: string;
  date: string;
  status: 'RUNNING' | 'RECORDED_STOP' | 'NO_RECORD';
  recordsCount: number;
  runTimeMinutes: number;
  frameRunTimeMinutes: number;
  pa3PlanTimeMinutes: number;
}

export function allocateOeeTime(records: AllocationRecord[], method: OeeMethod, options: {
  startDate?: string; endDate: string; firstRecordDates: Map<string, string>;
}) {
  const timelines = records.filter((record) => !record.isVoided).map(buildRecordTimeline);
  const byEquipment = new Map<string, RecordTimeline[]>();
  for (const timeline of timelines) {
    const list = byEquipment.get(timeline.record.equipmentId) || [];
    list.push(timeline);
    byEquipment.set(timeline.record.equipmentId, list);
  }
  const contributions: OeeContribution[] = [];
  const calendar: EquipmentDay[] = [];
  const unassignedPlan: Array<{ equipmentId: string; date: string; minutes: number }> = [];
  let overlappingRunMinutes = 0;
  let deduplicatedPlanMinutes = 0;
  let estimatedRuntimeReductionMinutes = 0;
  for (const [equipmentId, firstDate] of options.firstRecordDates) {
    const equipment = byEquipment.get(equipmentId) || [];
    estimatedRuntimeReductionMinutes += placeUntimedRecords(equipment);
    const runAllocation = allocateIntervalUnion(equipment.map((timeline) => ({ id: timeline.record.id, intervals: timeline.run, weight: 1 })));
    const start = options.startDate && options.startDate > firstDate ? options.startDate : firstDate;
    const endMinute = dayMinute(options.endDate);
    if (method !== 'PA3') {
      const planOwners = equipment.map((timeline) => ({ id: timeline.record.id,
        intervals: method === 'PA1' ? timeline.plan : timeline.pa2,
        weight: runAllocation.unionMinutes > 0 ? runAllocation.totals.get(timeline.record.id) || 0 : duration(timeline.observed) }));
      const planAllocation = allocateIntervalUnion(planOwners);
      const plannedLoss = allocateIntervalUnion(equipment.map((timeline) => ({ id: timeline.record.id, intervals: timeline.plannedDowntime, weight: 1 })));
      const unplannedLoss = allocateIntervalUnion(equipment.map((timeline) => ({ id: timeline.record.id, intervals: timeline.unplannedDowntime, weight: 1 })));
      deduplicatedPlanMinutes += planOwners.reduce((sum, owner) => sum + duration(owner.intervals), 0) - planAllocation.unionMinutes;
      overlappingRunMinutes += runAllocation.overlapMinutes;
      for (const timeline of equipment) {
        if (timeline.date < start || timeline.date > options.endDate) continue;
        const record = timeline.record;
        const runTimeMinutes = runAllocation.totals.get(record.id) || 0;
        contributions.push({ recordId: record.id, equipmentId, date: timeline.date,
          runTimeMinutes, planTimeMinutes: planAllocation.totals.get(record.id) || 0,
          theoreticalOutput: runTimeMinutes / 60 * record.standardSpeedPerHour,
          totalOutput: record.totalOutput, goodOutput: record.goodOutput,
          plannedDowntimeMinutes: plannedLoss.totals.get(record.id) || 0,
          unplannedDowntimeMinutes: unplannedLoss.totals.get(record.id) || 0,
          estimated: timeline.estimated, outputEstimated: false, runtimeReconciled: timeline.runtimeReconciled });
      }
    }
    for (let minute = dayMinute(start); minute <= endMinute; minute += 1440) {
      const date = minuteDateKey(minute);
      const frame: Interval = [minute + 360, minute + 1320];
      const frameOwners = equipment.map((timeline) => ({ id: timeline.record.id,
        intervals: intersectIntervals(timeline.run, frame), weight: 1 }));
      const frameAllocation = allocateIntervalUnion(frameOwners);
      const plannedLoss = allocateIntervalUnion(equipment.map((timeline) => ({ id: timeline.record.id,
        intervals: intersectIntervals(timeline.plannedDowntime, frame), weight: 1 })));
      const unplannedLoss = allocateIntervalUnion(equipment.map((timeline) => ({ id: timeline.record.id,
        intervals: intersectIntervals(timeline.unplannedDowntime, frame), weight: 1 })));
      const candidates = equipment.filter((timeline) => timeline.date === date ||
        duration(intersectIntervals(timeline.observed, frame)) > 0 || duration(intersectIntervals(timeline.run, frame)) > 0);
      const recordedOnDay = equipment.filter((timeline) => timeline.date === date);
      const fullDayRun = duration(equipment.flatMap((timeline) => intersectIntervals(timeline.run, [minute, minute + 1440])));
      calendar.push({ equipmentId, date, status: fullDayRun > 0 ? 'RUNNING' : recordedOnDay.length ? 'RECORDED_STOP' : 'NO_RECORD',
        recordsCount: new Set([...recordedOnDay, ...equipment.filter((timeline) => duration(intersectIntervals(timeline.run, [minute, minute + 1440])) > 0)]
          .map((timeline) => timeline.record.id)).size,
        runTimeMinutes: fullDayRun, frameRunTimeMinutes: frameAllocation.unionMinutes, pa3PlanTimeMinutes: 960 });
      if (method !== 'PA3') continue;
      overlappingRunMinutes += frameAllocation.overlapMinutes;
      if (!candidates.length) { unassignedPlan.push({ equipmentId, date, minutes: 960 }); continue; }
      const hasRun = candidates.some((timeline) => (frameAllocation.totals.get(timeline.record.id) || 0) > 0);
      const weights = candidates.map((timeline) => hasRun ? frameAllocation.totals.get(timeline.record.id) || 0 : duration(timeline.observed) || 1);
      const totalWeight = weights.reduce((sum, value) => sum + value, 0);
      deduplicatedPlanMinutes += (candidates.length - 1) * 960;
      candidates.forEach((timeline, index) => {
        const record = timeline.record;
        const runTimeMinutes = frameAllocation.totals.get(record.id) || 0;
        const rawRun = duration(timeline.run);
        const clipRatio = rawRun > 0 ? duration(intersectIntervals(timeline.run, frame)) / rawRun : 0;
        contributions.push({ recordId: record.id, equipmentId, date, runTimeMinutes,
          planTimeMinutes: 960 * weights[index] / totalWeight,
          theoreticalOutput: runTimeMinutes / 60 * record.standardSpeedPerHour,
          totalOutput: record.totalOutput * clipRatio, goodOutput: record.goodOutput * clipRatio,
          plannedDowntimeMinutes: plannedLoss.totals.get(record.id) || 0,
          unplannedDowntimeMinutes: unplannedLoss.totals.get(record.id) || 0,
          estimated: timeline.estimated, outputEstimated: clipRatio > 0 && clipRatio < 1,
          runtimeReconciled: timeline.runtimeReconciled });
      });
    }
  }
  return { contributions, calendar, unassignedPlan, overlappingRunMinutes, deduplicatedPlanMinutes, estimatedRuntimeReductionMinutes };
}
