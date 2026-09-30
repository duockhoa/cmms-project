import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { formatVN } from '../utils/formatters';
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

  const updateEditValue = (pointId: string, changes: Partial<UtilityMeterEditValue>) => {
    setEditValues((previous) => ({
      ...previous,
      [pointId]: { ...previous[pointId], ...changes },
    }));
  };

  const handleValueChange = (pointId: string, value: string) => updateEditValue(pointId, { value });
  const handleCurrentValueChange = (pointId: string, currentValue: string) => updateEditValue(pointId, { currentValue });
  const handleNotesChange = (pointId: string, notes: string) => updateEditValue(pointId, { notes });

  const handleSaveSingle = async (meter: PeriodMeterItem) => {
    const edit = editValues[meter.pointId];
    if (!edit || edit.value === '') {
      toast.error('Thiếu thông tin', 'Vui lòng nhập chỉ số đầu kỳ hợp lệ.');
      return;
    }

    const baselineValue = parseFloat(edit.value);
    if (Number.isNaN(baselineValue) || baselineValue < 0) {
      toast.error('Giá trị không hợp lệ', 'Chỉ số đầu kỳ phải là số dương (≥ 0).');
      return;
    }

    const parsedCurrentValue = parseFloat(edit.currentValue);
    const currentValue = edit.currentValue !== '' && !Number.isNaN(parsedCurrentValue)
      ? parsedCurrentValue
      : undefined;
    if (currentValue !== undefined && currentValue < baselineValue) {
      toast.error(
        'Giá trị không hợp lệ',
        'Chỉ số hiện tại (' + currentValue + ') không được nhỏ hơn chỉ số đầu kỳ (' + baselineValue + ')!',
      );
      return;
    }

    try {
      setSavingId(meter.pointId);
      await api.setUtilityPeriodBaselines({
        month: selectedMonth,
        year: selectedYear,
        items: [{
          pointId: meter.pointId,
          baselineValue,
          currentValue,
          notes: edit.notes || 'Chỉ số chốt đầu kỳ tính toán Tháng ' + selectedMonth + '/' + selectedYear,
        }],
      });

      const difference = currentValue === undefined
        ? 0
        : (currentValue - baselineValue) * (meter.multiplier || 1);
      toast.success(
        'Đã lưu thành công',
        'Đã chốt đầu kỳ: ' + formatVN(baselineValue) + ' ' + meter.unit
          + ' | Hiện tại: ' + formatVN(currentValue ?? baselineValue) + ' ' + meter.unit
          + ' (Sản lượng: +' + formatVN(difference) + ' ' + meter.unit + ').',
      );

      const updateMeter = (item: PeriodMeterItem) => item.pointId === meter.pointId
        ? {
            ...item,
            baselineValue,
            lastReadingValue: currentValue ?? item.lastReadingValue,
            hasExistingBaseline: true,
          }
        : item;
      setSupplyMeters((previous) => previous.map(updateMeter));
      setAllMeters((previous) => previous.map(updateMeter));
    } catch (error: any) {
      toast.error('Lỗi lưu chỉ số', error.message || 'Không thể lưu chỉ số.');
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveAll = async () => {
    const items = allMeters.flatMap((meter) => {
      const edit = editValues[meter.pointId];
      if (!edit) return [];
      const baselineValue = parseFloat(edit.value);
      const currentValue = parseFloat(edit.currentValue);
      const hasChanged = (!Number.isNaN(baselineValue) && baselineValue !== meter.baselineValue)
        || (!Number.isNaN(currentValue) && currentValue !== meter.lastReadingValue);
      if (!hasChanged) return [];
      return [{
        pointId: meter.pointId,
        baselineValue,
        currentValue: Number.isNaN(currentValue) ? undefined : currentValue,
        notes: edit.notes || 'Chỉ số chốt đầu kỳ tính toán Tháng ' + selectedMonth + '/' + selectedYear,
      }];
    });

    if (items.length === 0) {
      toast.info('Thông báo', 'Không có chỉ số nào thay đổi cần lưu.');
      return;
    }

    try {
      setBatchSaving(true);
      await api.setUtilityPeriodBaselines({ month: selectedMonth, year: selectedYear, items });
      toast.success(
        'Thành công',
        'Đã lưu chỉ số tính toán Tháng ' + selectedMonth + '/' + selectedYear
          + ' cho ' + items.length + ' đồng hồ.',
      );
      await loadPeriodData();
    } catch (error: any) {
      toast.error('Lỗi cập nhật', error.message || 'Không thể cập nhật danh sách chỉ số.');
    } finally {
      setBatchSaving(false);
    }
  };

  const handleAutoFillFromHistory = () => {
    const nextEdits = { ...editValues };
    let filledCount = 0;
    allMeters.forEach((meter) => {
      const currentBaseline = nextEdits[meter.pointId]?.value;
      if (!currentBaseline || parseFloat(currentBaseline) === 0) {
        const suggestedValue = meter.baselineValue > 0 ? meter.baselineValue : (meter.lastReadingValue || 0);
        nextEdits[meter.pointId] = {
          ...nextEdits[meter.pointId],
          value: String(suggestedValue),
          currentValue: String(meter.lastReadingValue || suggestedValue),
        };
        filledCount += 1;
      }
    });
    setEditValues(nextEdits);
    toast.success(
      'Đồng bộ mốc',
      'Đã điền chỉ số mốc gợi ý cho ' + filledCount + ' đồng hồ từ dữ liệu ghi nhận.',
    );
  };

  const normalizedSearch = search.toLowerCase();
  const filteredMeters = allMeters.filter((meter) => {
    const matchesSearch = !normalizedSearch
      || meter.code.toLowerCase().includes(normalizedSearch)
      || meter.name.toLowerCase().includes(normalizedSearch)
      || meter.location.toLowerCase().includes(normalizedSearch);
    if (!matchesSearch) return false;
    if (filterType === 'ELECTRICITY') return meter.type === 'ELECTRICITY';
    if (filterType === 'WATER') return meter.type === 'WATER';
    if (filterType === 'SUPPLY') return meter.isSupplyMeter;
    return true;
  });

  return {
    selectedMonth, setSelectedMonth, selectedYear, setSelectedYear,
    loading, savingId, setSavingId, batchSaving, setBatchSaving,
    elecCycle, waterCycle, supplyMeters, setSupplyMeters,
    allMeters, setAllMeters, search, setSearch, filterType, setFilterType,
    editValues, filteredMeters, loadPeriodData,
    handleValueChange, handleCurrentValueChange, handleNotesChange,
    handleSaveSingle, handleSaveAll, handleAutoFillFromHistory,
  };
}
