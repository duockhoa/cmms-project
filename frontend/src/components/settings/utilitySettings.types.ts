export interface PeriodMeterItem {
  pointId: string;
  code: string;
  name: string;
  type: 'ELECTRICITY' | 'WATER';
  location: string;
  unit: string;
  multiplier: number;
  isSupplyMeter: boolean;
  isRecycledWater?: boolean;
  isExcludedFromTotal?: boolean;
  cycleDescription: string;
  cycleStartDate: string;
  cycleEndDate: string;
  startDayLabel: string;
  baselineValue: number;
  hasExistingBaseline: boolean;
  lastReadingValue: number | null;
  lastReadingAt: string | null;
}

export interface UtilityMeterEditValue {
  value: string;
  currentValue: string;
  notes: string;
}

export type UtilityMeterFilter = 'ALL' | 'ELECTRICITY' | 'WATER' | 'SUPPLY';

export function calculateMeterConsumption(
  edit: UtilityMeterEditValue,
  multiplier: number,
) {
  const baselineValue = parseFloat(edit.value);
  const currentValue = parseFloat(edit.currentValue);

  if (Number.isNaN(baselineValue) || Number.isNaN(currentValue) || currentValue < baselineValue) {
    return 0;
  }

  return (currentValue - baselineValue) * (multiplier || 1);
}
