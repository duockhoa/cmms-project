import { calculateWorkingHoursBetween, isExemptFrom4hSla, KPI_4H_SLA_CUTOFF_DATE } from './working-hours.helper';

describe('working-hours.helper', () => {
  it('calculates working hours accurately within the same day', () => {
    // 2026-11-16 is Monday
    const start = new Date('2026-11-16T10:00:00+07:00');
    const end = new Date('2026-11-16T12:30:00+07:00');
    expect(calculateWorkingHoursBetween(start, end)).toBe(2.5);
  });

  it('calculates overnight shift across 17:00 and 08:00 next day', () => {
    // Monday 16:00 to Tuesday 09:30
    // Monday: 16:00 -> 17:00 = 1h
    // Tuesday: 08:00 -> 09:30 = 1.5h
    // Total = 2.5h
    const start = new Date('2026-11-16T16:00:00+07:00');
    const end = new Date('2026-11-17T09:30:00+07:00');
    expect(calculateWorkingHoursBetween(start, end)).toBe(2.5);
  });

  it('ignores time outside 08:00 - 17:00', () => {
    // Assigned at Monday 19:00 (after 17:00), responded at Tuesday 11:00
    // Monday after 17:00: 0h
    // Tuesday: 08:00 -> 11:00 = 3h
    const start = new Date('2026-11-16T19:00:00+07:00');
    const end = new Date('2026-11-17T11:00:00+07:00');
    expect(calculateWorkingHoursBetween(start, end)).toBe(3);
  });

  it('skips Sunday completely', () => {
    // 2026-11-21 is Saturday, 2026-11-22 is Sunday, 2026-11-23 is Monday
    // Saturday 15:00 -> 17:00 = 2h
    // Sunday = 0h
    // Monday: 08:00 -> 09:00 = 1h
    // Total = 3h
    const start = new Date('2026-11-21T15:00:00+07:00');
    const end = new Date('2026-11-23T09:00:00+07:00');
    expect(calculateWorkingHoursBetween(start, end)).toBe(3);
  });

  it('returns 0 when end <= start or invalid inputs', () => {
    const d = new Date('2026-11-16T10:00:00+07:00');
    expect(calculateWorkingHoursBetween(d, d)).toBe(0);
    expect(calculateWorkingHoursBetween(new Date('2026-11-16T12:00:00+07:00'), d)).toBe(0);
    expect(calculateWorkingHoursBetween('invalid', d)).toBe(0);
  });

  it('exempts historical incidents before cutoff date', () => {
    const historical = new Date('2026-11-05T10:00:00+07:00');
    expect(isExemptFrom4hSla(historical)).toBe(true);
    expect(isExemptFrom4hSla(null)).toBe(true);

    const postPatch = new Date('2026-11-11T10:00:00+07:00');
    expect(isExemptFrom4hSla(postPatch)).toBe(false);
  });
});
