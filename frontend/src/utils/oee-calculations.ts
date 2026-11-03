// Keep the browser copy in frontend/src/utils/oee-calculations.ts in sync.
export interface OeeTimeRow {
  key: string;
  categoryType?: string;
  start1?: string;
  end1?: string;
  start2?: string;
  end2?: string;
  manualMinutes?: string | number;
}

export type Interval = [number, number];
const PLANNED_KEYS = new Set(['cleaning', 'breakShift']);
const ROW_KEYS = new Set(['cleaning', 'adjustment', 'running', 'breakShift', 'breakdown', 'noOperator', 'qualityProcess', 'otherWaiting']);

export function parseFlexibleTime(value: string): number | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const text = value.trim().toLowerCase().replace(/['’p\s]/g, '');
  const parts = text.match(/^(\d{1,2})[h:](\d{1,2})?$/);
  if (parts) {
    const hours = Number(parts[1]);
    const minutes = Number(parts[2] || 0);
    return hours <= 24 && minutes < 60 && (hours < 24 || minutes === 0)
      ? hours * 60 + minutes : null;
  }
  if (!/^\d{1,2}(\.\d+)?$/.test(text)) return null;
  const hours = Number(text);
  return hours <= 24 ? Math.round(hours * 60) : null;
}

export function standardShiftWindow(shift: string): Interval {
  if (shift === 'CA_1') return [360, 840];
  if (shift === 'CA_2') return [840, 1320];
  if (shift === 'CA_3') return [1320, 1800];
  return [450, 1020];
}

export function mergeIntervals(intervals: Interval[]): Interval[] {
  const result: Interval[] = [];
  for (const [start, end] of intervals.slice().sort((a, b) => a[0] - b[0])) {
    const previous = result[result.length - 1];
    if (previous && start <= previous[1]) previous[1] = Math.max(previous[1], end);
    else result.push([start, end]);
  }
  return result;
}

export function duration(intervals: Interval[]): number {
  return mergeIntervals(intervals).reduce((sum, [start, end]) => sum + end - start, 0);
}

export function subtractIntervals(source: Interval[], exclusions: Interval[]): Interval[] {
  let result = mergeIntervals(source);
  for (const [start, end] of mergeIntervals(exclusions)) {
    result = result.flatMap(([left, right]): Interval[] => {
      if (end <= left || start >= right) return [[left, right]];
      const pieces: Interval[] = [];
      if (left < start) pieces.push([left, start]);
      if (end < right) pieces.push([end, right]);
      return pieces;
    });
  }
  return result.filter(([start, end]) => end > start);
}

export function intersectIntervals(source: Interval[], frame: Interval): Interval[] {
  return mergeIntervals(source.map(([start, end]): Interval => [Math.max(start, frame[0]), Math.min(end, frame[1])])
    .filter(([start, end]) => end > start));
}

export function businessDateKey(value: Date | string): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date(value));
  return ['year', 'month', 'day'].map((type) => parts.find((part) => part.type === type)!.value).join('-');
}

export const dayMinute = (date: string): number => Date.parse(`${date}T00:00:00Z`) / 60000;
export const minuteDateKey = (minute: number): string => new Date(minute * 60000).toISOString().slice(0, 10);

export function rowIntervals(row: OeeTimeRow, shift = 'CA_1'): Interval[] {
  const [shiftStart, shiftEnd] = standardShiftWindow(shift);
  const shiftCenter = (shiftStart + shiftEnd) / 2;
  const intervals: Interval[] = [];
  for (const [startText, endText] of [[row.start1, row.end1], [row.start2, row.end2]]) {
    const start = parseFlexibleTime(startText || '');
    const end = parseFlexibleTime(endText || '');
    if (start === null || end === null) continue;
    const length = end >= start ? end - start : 1440 - start + end;
    // Place post-midnight events on the same timeline as an overnight shift.
    const offset = Math.round((shiftCenter - (start + length / 2)) / 1440) * 1440;
    intervals.push([start + offset, start + offset + length]);
  }
  return mergeIntervals(intervals);
}

export function calcRowMinutes(row: OeeTimeRow, shift = 'CA_1'): number {
  const intervals = rowIntervals(row, shift);
  return intervals.length ? duration(intervals) : Math.max(0, Number(row.manualMinutes) || 0);
}

export function calcIntervalMinutes(start: string, end: string): number {
  return calcRowMinutes({ key: 'running', start1: start, end1: end });
}

export function validateTimeRows(rows: OeeTimeRow[]): string | null {
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row || !ROW_KEYS.has(row.key) || seen.has(row.key)) return 'Đầu mục thời gian OEE không hợp lệ hoặc bị lặp.';
    seen.add(row.key);
    for (const [start, end] of [[row.start1, row.end1], [row.start2, row.end2]]) {
      if ((start || end) && (parseFlexibleTime(start || '') === null || parseFlexibleTime(end || '') === null)) {
        return 'Vui lòng nhập đủ giờ bắt đầu và kết thúc hợp lệ cho từng khoảng thời gian.';
      }
    }
    if (row.manualMinutes != null && row.manualMinutes !== '' &&
      (!Number.isFinite(Number(row.manualMinutes)) || Number(row.manualMinutes) < 0)) {
      return 'Số phút nhập trực tiếp phải là số không âm.';
    }
  }
  return null;
}

export function calculateOeeTimeMetrics(rows: OeeTimeRow[], shift: string, fallbackDuration = 480) {
  const all: Interval[] = [];
  const planned: Interval[] = [];
  const unplanned: Interval[] = [];
  const running: Interval[] = [];
  const breaks: Interval[] = [];
  let manualPlanned = 0;
  let manualUnplanned = 0;
  let manualRunning = 0;
  let hasRunEntry = false;
  const minutesByKey: Record<string, number> = {};
  for (const row of rows) {
    const intervals = rowIntervals(row, shift);
    const minutes = calcRowMinutes(row, shift);
    minutesByKey[row.key] = minutes;
    all.push(...intervals);
    if (row.key === 'running') {
      running.push(...intervals);
      hasRunEntry = intervals.length > 0 || (row.manualMinutes != null && row.manualMinutes !== '');
      if (!intervals.length) manualRunning += minutes;
    } else if (PLANNED_KEYS.has(row.key)) {
      planned.push(...intervals);
      if (!intervals.length) manualPlanned += minutes;
    } else {
      unplanned.push(...intervals);
      if (!intervals.length) manualUnplanned += minutes;
    }
    if (row.key === 'breakShift') breaks.push(...intervals);
  }
  let breakOverlapMinutes = 0;
  for (const [rs, re] of mergeIntervals(running)) {
    for (const [bs, be] of mergeIntervals(breaks)) {
      breakOverlapMinutes += Math.max(0, Math.min(re, be) - Math.max(rs, bs));
    }
  }
  const merged = mergeIntervals(all);
  const observedSpan = merged.length ? merged[merged.length - 1][1] - merged[0][0] : 0;
  const manualTotal = manualPlanned + manualUnplanned + manualRunning;
  const shiftDurationMinutes = Math.max(1, observedSpan + manualTotal || fallbackDuration);
  const plannedDowntimeMinutes = duration(planned) + manualPlanned;
  const unplannedDowntimeMinutes = duration(unplanned) + manualUnplanned;
  const plannedProductionMinutes = Math.max(0, shiftDurationMinutes - plannedDowntimeMinutes);
  const runTimeMinutes = hasRunEntry
    ? Math.max(0, duration(running) + manualRunning - breakOverlapMinutes)
    : Math.max(0, plannedProductionMinutes - unplannedDowntimeMinutes);
  const [standardStart, standardEnd] = standardShiftWindow(shift);
  const pa2PlanTimeMinutes = merged.length
    ? Math.max(standardEnd, merged[merged.length - 1][1]) - Math.min(standardStart, merged[0][0]) + manualTotal
    : Math.max(standardEnd - standardStart, shiftDurationMinutes);
  return { minutesByKey, shiftDurationMinutes, plannedDowntimeMinutes, unplannedDowntimeMinutes,
    plannedProductionMinutes, runTimeMinutes, pa2PlanTimeMinutes, breakOverlapMinutes };
}

export interface OeeTotals {
  runTimeMinutes: number;
  planTimeMinutes: number;
  theoreticalOutput: number;
  totalOutput: number;
  goodOutput: number;
  count: number;
}

export const emptyOeeTotals = (): OeeTotals => ({ runTimeMinutes: 0, planTimeMinutes: 0,
  theoreticalOutput: 0, totalOutput: 0, goodOutput: 0, count: 0 });

export function calculateOee(totals: OeeTotals) {
  const round = (value: number) => Math.round(value * 100) / 100;
  const availability = round(totals.planTimeMinutes > 0 ? Math.min(100, totals.runTimeMinutes / totals.planTimeMinutes * 100) : 0);
  const performance = round(totals.theoreticalOutput > 0 ? Math.min(120, totals.totalOutput / totals.theoreticalOutput * 100) : 0);
  const quality = round(totals.totalOutput > 0 ? Math.min(100, totals.goodOutput / totals.totalOutput * 100) : totals.count > 0 ? 100 : 0);
  return { availability, performance, quality,
    oee: round(availability * Math.min(100, performance) * quality / 10000) };
}

export function buildBatchOeeId(equipmentCode: string, productCode?: string, batchNumber?: string): string | null {
  if (!productCode?.trim() || !batchNumber?.trim()) return null;
  return [equipmentCode.trim(), productCode.trim(), batchNumber.trim()]
    .map((part) => part.replace(/%/g, '%25').replace(/_/g, '%5F')).join('_');
}
