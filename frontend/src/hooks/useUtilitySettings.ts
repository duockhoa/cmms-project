import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/common';
import { PeriodMeterItem, UtilityMeterEditValue, UtilityMeterFilter } from '../components/settings/utilitySettings.types';

export function useUtilitySettings() {
  const toast = useToast();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [batchSaving, setBatchSaving] = useState(false);
  const [elecCycle, setElecCycle] = useState<any>(null);
  const [waterCycle, setWaterCycle] = useState<any>(null);
  const [supplyMeters, setSupplyMeters] = useState<PeriodMeterItem[]>([]);
  const [allMeters, setAllMeters] = useState<PeriodMeterItem[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<UtilityMeterFilter>('ALL');
  const [editValues, setEditValues] = useState<Record<string, UtilityMeterEditValue>>({});

  const loadPeriodData = async () => {
    try {
      setLoading(true);
      const response = await api.getUtilityPeriodBaselines({ month: selectedMonth, year: selectedYear });
      setElecCycle(response.elecCycle);
      setWaterCycle(response.waterCycle);
      setSupplyMeters(response.supplyMeters || []);
      setAllMeters(response.allMeters || []);

      const initialEdits: Record<string, UtilityMeterEditValue> = {};
      (response.allMeters || []).forEach((meter: PeriodMeterItem) => {
        const baselineValue = meter.baselineValue?.toString() ?? '0';
        initialEdits[meter.pointId] = {
          value: baselineValue,
          currentValue: meter.lastReadingValue?.toString() ?? baselineValue,
          notes: 'Chỉ số chốt đầu kỳ tính toán Tháng ' + selectedMonth + '/' + selectedYear,
        };
      });
      setEditValues(initialEdits);
    } catch (error: any) {
      toast.error('Lỗi tải dữ liệu kỳ', error.message || 'Không thể tải thông tin kỳ tính toán tiện ích.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPeriodData();
  }, [selectedMonth, selectedYear]);

  return {
    selectedMonth, setSelectedMonth, selectedYear, setSelectedYear,
    loading, savingId, setSavingId, batchSaving, setBatchSaving,
    elecCycle, waterCycle, supplyMeters, setSupplyMeters,
    allMeters, setAllMeters, search, setSearch, filterType, setFilterType,
    editValues, setEditValues, loadPeriodData,
  };
}
