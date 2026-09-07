import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import {
  Zap,
  Droplets,
  Gauge,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Search,
  Filter,
  Info,
  Calendar,
  Layers,
  ArrowUpRight,
  Clock
} from 'lucide-react';
import { formatVN } from '../../utils/formatters';
import { useToast } from '../common/Toast';

interface PeriodMeterItem {
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

export const UtilitySettingsTab: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  // Chọn Tháng & Năm của Kỳ tính toán
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [batchSaving, setBatchSaving] = useState(false);

  // Dữ liệu chu kỳ và danh sách điểm đo
  const [elecCycle, setElecCycle] = useState<any>(null);
  const [waterCycle, setWaterCycle] = useState<any>(null);
  const [supplyMeters, setSupplyMeters] = useState<PeriodMeterItem[]>([]);
  const [allMeters, setAllMeters] = useState<PeriodMeterItem[]>([]);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'ELECTRICITY' | 'WATER' | 'SUPPLY'>('ALL');

  // Giá trị chỉnh sửa tạm thời { [pointId]: { value: string, currentValue: string, notes: string } }
  const [editValues, setEditValues] = useState<Record<string, { value: string; currentValue: string; notes: string }>>({});

  useEffect(() => {
    loadPeriodData();
  }, [selectedMonth, selectedYear]);

  const loadPeriodData = async () => {
    try {
      setLoading(true);
      const res = await api.getUtilityPeriodBaselines({
        month: selectedMonth,
        year: selectedYear,
      });

      setElecCycle(res.elecCycle);
      setWaterCycle(res.waterCycle);
      setSupplyMeters(res.supplyMeters || []);
      setAllMeters(res.allMeters || []);

      // Khởi tạo state edit
      const initialEdits: Record<string, { value: string; currentValue: string; notes: string }> = {};
      (res.allMeters || []).forEach((m: PeriodMeterItem) => {
        initialEdits[m.pointId] = {
          value: m.baselineValue !== null && m.baselineValue !== undefined ? m.baselineValue.toString() : '0',
          currentValue: m.lastReadingValue !== null && m.lastReadingValue !== undefined ? m.lastReadingValue.toString() : (m.baselineValue !== null && m.baselineValue !== undefined ? m.baselineValue.toString() : '0'),
          notes: `Chỉ số chốt đầu kỳ tính toán Tháng ${selectedMonth}/${selectedYear}`,
        };
      });
      setEditValues(initialEdits);
    } catch (err: any) {
      toast.error('Lỗi tải dữ liệu kỳ', err.message || 'Không thể tải thông tin kỳ tính toán tiện ích.');
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (pointId: string, value: string) => {
    setEditValues((prev) => ({
      ...prev,
      [pointId]: {
        ...prev[pointId],
        value,
      },
    }));
  };

  const handleCurrentValueChange = (pointId: string, currentValue: string) => {
    setEditValues((prev) => ({
      ...prev,
      [pointId]: {
        ...prev[pointId],
        currentValue,
      },
    }));
  };

  const handleNotesChange = (pointId: string, notes: string) => {
    setEditValues((prev) => ({
      ...prev,
      [pointId]: {
        ...prev[pointId],
        notes,
      },
    }));
  };

  // Lưu chỉ số đầu kỳ & hiện tại cho 1 điểm đo
  const handleSaveSingle = async (meter: PeriodMeterItem) => {
    const edit = editValues[meter.pointId];
    if (!edit || edit.value === '') {
      toast.error('Thiếu thông tin', 'Vui lòng nhập chỉ số đầu kỳ hợp lệ.');
      return;
    }
    const num = parseFloat(edit.value);
    if (isNaN(num) || num < 0) {
      toast.error('Giá trị không hợp lệ', 'Chỉ số đầu kỳ phải là số dương (≥ 0).');
      return;
    }

    const currNum = edit.currentValue !== '' && !isNaN(parseFloat(edit.currentValue)) ? parseFloat(edit.currentValue) : undefined;
    if (currNum !== undefined && currNum < num) {
      toast.error('Giá trị không hợp lệ', `Chỉ số hiện tại (${currNum}) không được nhỏ hơn chỉ số đầu kỳ (${num})!`);
      return;
    }

    try {
      setSavingId(meter.pointId);
      await api.setUtilityPeriodBaselines({
        month: selectedMonth,
        year: selectedYear,
        items: [
          {
            pointId: meter.pointId,
            baselineValue: num,
            currentValue: currNum,
            notes: edit.notes || `Chỉ số chốt đầu kỳ tính toán Tháng ${selectedMonth}/${selectedYear}`,
          },
        ],
      });

      const diff = currNum !== undefined && currNum >= num ? (currNum - num) * (meter.multiplier || 1) : 0;
      toast.success(
        'Đã lưu thành công',
        `Đã chốt đầu kỳ: ${formatVN(num)} ${meter.unit} | Hiện tại: ${formatVN(currNum ?? num)} ${meter.unit} (Sản lượng: +${formatVN(diff)} ${meter.unit}).`
      );

      // Cập nhật lại local state
      setSupplyMeters((prev) =>
        prev.map((m) =>
          m.pointId === meter.pointId
            ? { ...m, baselineValue: num, lastReadingValue: currNum ?? m.lastReadingValue, hasExistingBaseline: true }
            : m
        )
      );
      setAllMeters((prev) =>
        prev.map((m) =>
          m.pointId === meter.pointId
            ? { ...m, baselineValue: num, lastReadingValue: currNum ?? m.lastReadingValue, hasExistingBaseline: true }
            : m
        )
      );
    } catch (err: any) {
      toast.error('Lỗi lưu chỉ số', err.message || 'Không thể lưu chỉ số.');
    } finally {
      setSavingId(null);
    }
  };

  // Lưu tất cả các điểm đo có thay đổi
  const handleSaveAll = async () => {
    const itemsToUpdate = allMeters
      .filter((m) => {
        const edit = editValues[m.pointId];
        if (!edit) return false;
        const num = parseFloat(edit.value);
        const currNum = parseFloat(edit.currentValue);
        const baselineChanged = !isNaN(num) && num !== m.baselineValue;
        const currentChanged = !isNaN(currNum) && currNum !== m.lastReadingValue;
        return baselineChanged || currentChanged;
      })
      .map((m) => ({
        pointId: m.pointId,
        baselineValue: parseFloat(editValues[m.pointId].value),
        currentValue: !isNaN(parseFloat(editValues[m.pointId].currentValue)) ? parseFloat(editValues[m.pointId].currentValue) : undefined,
        notes: editValues[m.pointId].notes || `Chỉ số chốt đầu kỳ tính toán Tháng ${selectedMonth}/${selectedYear}`,
      }));

    if (itemsToUpdate.length === 0) {
      toast.info('Thông báo', 'Không có chỉ số nào thay đổi cần lưu.');
      return;
    }

    try {
      setBatchSaving(true);
      await api.setUtilityPeriodBaselines({
        month: selectedMonth,
        year: selectedYear,
        items: itemsToUpdate,
      });

      toast.success(
        'Thành công',
        `Đã lưu chỉ số tính toán Tháng ${selectedMonth}/${selectedYear} cho ${itemsToUpdate.length} đồng hồ.`
      );
      await loadPeriodData();
    } catch (err: any) {
      toast.error('Lỗi cập nhật', err.message || 'Không thể cập nhật danh sách chỉ số.');
    } finally {
      setBatchSaving(false);
    }
  };

  const handleAutoFillFromHistory = () => {
    const newEdits = { ...editValues };
    let filledCount = 0;
    allMeters.forEach((m) => {
      const currentVal = newEdits[m.pointId]?.value;
      if (!currentVal || parseFloat(currentVal) === 0) {
        const fillVal = m.baselineValue && m.baselineValue > 0 ? m.baselineValue : (m.lastReadingValue || 0);
        newEdits[m.pointId] = {
          ...newEdits[m.pointId],
          value: String(fillVal),
          currentValue: String(m.lastReadingValue || fillVal),
        };
        filledCount++;
      }
    });
    setEditValues(newEdits);
    toast.success('Đồng bộ mốc', `Đã điền chỉ số mốc gợi ý cho ${filledCount} đồng hồ từ dữ liệu ghi nhận.`);
  };

  const filteredMeters = allMeters.filter((m) => {
    const matchSearch =
      !search ||
      m.code.toLowerCase().includes(search.toLowerCase()) ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.location.toLowerCase().includes(search.toLowerCase());

    if (!matchSearch) return false;

    if (filterType === 'ELECTRICITY') return m.type === 'ELECTRICITY';
    if (filterType === 'WATER') return m.type === 'WATER';
    if (filterType === 'SUPPLY') return m.isSupplyMeter;
    return true;
  });

  return (
    <div>
      {/* Header & Period Selector Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
            Chỉ Số Chốt Đầu Kỳ (Điện & Nước)
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary, #64748b)', marginTop: '4px', margin: 0 }}>
            Khởi tạo mặt số ban đầu cho từng chu kỳ tính toán điện & nước theo đúng logic kỳ đối soát nhà máy.
          </p>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate(`/utilities?tab=cumulative&month=${selectedMonth}&year=${selectedYear}`)}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: '#2563eb' }}
          >
            <span>Xem Báo Cáo Kỳ {selectedMonth}/{selectedYear}</span>
            <ArrowUpRight size={15} />
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleAutoFillFromHistory}
            disabled={loading || batchSaving}
            title="Tự động điền mốc đầu kỳ cho các đồng hồ chưa có số chốt"
            style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: '#047857' }}
          >
            <Zap size={14} color="#059669" />
            <span>Điền mốc từ lịch sử</span>
          </button>
          <button
            className="btn btn-secondary"
            onClick={loadPeriodData}
            disabled={loading || batchSaving}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Tải lại
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSaveAll}
            disabled={loading || batchSaving}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', backgroundColor: '#2563eb' }}
          >
            {batchSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            Lưu tất cả chỉ số kỳ này
          </button>
        </div>
      </div>

      {/* CHỌN KỲ TÍNH TOÁN & HIỂN THỊ LOGIC CHU KỲ */}
      <div
        style={{
          backgroundColor: '#f8fafc',
          border: '1.5px solid #e2e8f0',
          borderRadius: '10px',
          padding: '16px 20px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          {/* Dropdown Chọn Kỳ Tháng / Năm */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b' }}>
              Chọn Kỳ Tính Toán:
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <select
                className="form-input"
                style={{ width: '130px', height: '36px', fontSize: '13px', fontWeight: 600 }}
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    Tháng {m < 10 ? `0${m}` : m}
                  </option>
                ))}
              </select>

              <select
                className="form-input"
                style={{ width: '100px', height: '36px', fontSize: '13px', fontWeight: 600 }}
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              >
                {[2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Logic Chu kỳ hiển thị cụ thể */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div
              style={{
                backgroundColor: '#fefce8',
                border: '1px solid #fde047',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#854d0e',
              }}
            >
              <Zap size={15} color="#ca8a04" />
              <span>
                <strong>Logic Kỳ Điện:</strong> {elecCycle?.cycleDescription || `Từ 01 đến ngày cuối tháng`} (Chốt lúc <strong>{elecCycle?.startDayLabel}</strong>)
              </span>
            </div>

            <div
              style={{
                backgroundColor: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#0369a1',
              }}
            >
              <Droplets size={15} color="#0284c7" />
              <span>
                <strong>Logic Kỳ Nước:</strong> {waterCycle?.cycleDescription || `Từ 21 tháng trước đến 20 tháng này`} (Chốt lúc <strong>{waterCycle?.startDayLabel}</strong>)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KHU VỰC ĐẶC BIỆT: CHỈ SỐ ĐẦU KỲ CHO TỔNG CẤP ĐIỆN & NƯỚC */}
      <div style={{ marginBottom: '28px' }}>
        <h4
          style={{
            fontSize: '14px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: '#334155',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Zap size={16} color="#d97706" />
          Chỉ số Đầu kỳ Nguồn Tổng Cấp — Kỳ Tháng {selectedMonth}/{selectedYear}
        </h4>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
            <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
            <div>Đang tải chỉ số đầu kỳ nguồn tổng cấp...</div>
          </div>
        ) : supplyMeters.length === 0 ? (
          <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
            Chưa có đồng hồ nào được đánh dấu là nguồn tổng cấp.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
            {supplyMeters.map((meter) => {
              const isElectric = meter.type === 'ELECTRICITY';
              const edit = editValues[meter.pointId] || { value: '', currentValue: '', notes: '' };
              const isSaving = savingId === meter.pointId;

              return (
                <div
                  key={meter.pointId}
                  style={{
                    backgroundColor: '#ffffff',
                    border: `1.5px solid ${isElectric ? '#fde68a' : '#bfdbfe'}`,
                    borderLeft: `5px solid ${isElectric ? '#f59e0b' : '#3b82f6'}`,
                    borderRadius: '10px',
                    padding: '18px 20px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: isElectric ? '#fef3c7' : '#dbeafe',
                          color: isElectric ? '#b45309' : '#1d4ed8',
                        }}
                      >
                        {isElectric ? <Zap size={13} /> : <Droplets size={13} />}
                        {isElectric ? 'TỔNG CẤP ĐIỆN' : 'TỔNG CẤP NƯỚC'}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>
                        Mã: <strong style={{ color: '#0f172a' }}>{meter.code}</strong>
                      </span>
                    </div>

                    <h5 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px 0', color: '#0f172a' }}>
                      {meter.name}
                    </h5>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>
                      📍 {meter.location} {meter.multiplier > 1 && `• Hệ số CT: ×${meter.multiplier}`}
                    </div>

                    {/* Hộp Thông tin mốc chu kỳ tính toán */}
                    <div
                      style={{
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        padding: '10px 12px',
                        marginBottom: '14px',
                        fontSize: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: '#64748b' }}>Mốc bắt đầu kỳ:</span>
                        <strong style={{ color: isElectric ? '#b45309' : '#1d4ed8' }}>
                          {meter.startDayLabel}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: '#64748b' }}>Chỉ số đầu kỳ đã chốt:</span>
                        <strong style={{ color: '#0f172a' }}>
                          {meter.baselineValue ? `${formatVN(meter.baselineValue)} ${meter.unit}` : 'Chưa có mốc'}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Chỉ số hiện tại (mặt đồng hồ):</span>
                        <strong style={{ color: '#047857' }}>
                          {meter.lastReadingValue ? `${formatVN(meter.lastReadingValue)} ${meter.unit}` : 'Chưa có dữ liệu'}
                        </strong>
                      </div>
                    </div>

                    {/* Form nhập 2 chỉ số: Đầu kỳ & Hiện tại */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                          1. Chỉ số Đầu kỳ ({meter.unit}) <span style={{ color: '#dc2626' }}>*</span>
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          className="form-input"
                          placeholder={`Ví dụ: ${meter.baselineValue || 1000}`}
                          value={edit.value}
                          onChange={(e) => handleValueChange(meter.pointId, e.target.value)}
                          style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', borderColor: '#cbd5e1' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#047857', marginBottom: '4px' }}>
                          2. Chỉ số Hiện tại ({meter.unit}) <span style={{ color: '#dc2626' }}>*</span>
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          className="form-input"
                          placeholder={`Ví dụ: ${meter.lastReadingValue || meter.baselineValue || 1000}`}
                          value={edit.currentValue}
                          onChange={(e) => handleCurrentValueChange(meter.pointId, e.target.value)}
                          style={{ fontSize: '14px', fontWeight: 700, color: '#047857', borderColor: '#86efac' }}
                        />
                      </div>
                    </div>

                    {/* Hiển thị sản lượng phát sinh tức thì */}
                    {(() => {
                      const bVal = parseFloat(edit.value);
                      const cVal = parseFloat(edit.currentValue);
                      if (!isNaN(bVal) && !isNaN(cVal) && cVal >= bVal) {
                        const diffUnits = (cVal - bVal) * (meter.multiplier || 1.0);
                        return (
                          <div
                            style={{
                              backgroundColor: '#ecfdf5',
                              border: '1px solid #a7f3d0',
                              borderRadius: '6px',
                              padding: '8px 12px',
                              marginBottom: '12px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <span style={{ fontSize: '12px', color: '#065f46', fontWeight: 600 }}>
                              Sản lượng từ đầu kỳ đến nay:
                            </span>
                            <strong style={{ fontSize: '14px', color: '#047857' }}>
                              +{formatVN(diffUnits)} {meter.unit}
                            </strong>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '11.5px', color: '#64748b', marginBottom: '4px' }}>
                        Ghi chú mốc chốt kỳ
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="VD: Chỉ số chốt bàn giao đầu kỳ..."
                        value={edit.notes}
                        onChange={(e) => handleNotesChange(meter.pointId, e.target.value)}
                        style={{ fontSize: '12px' }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleSaveSingle(meter)}
                    disabled={isSaving || batchSaving || !edit.value}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      backgroundColor: isElectric ? '#d97706' : '#2563eb',
                      borderColor: isElectric ? '#d97706' : '#2563eb',
                    }}
                  >
                    {isSaving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
                    <span>Lưu Chỉ số Đầu kỳ {selectedMonth}/{selectedYear}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BẢNG TOÀN BỘ ĐỒNG HỒ ĐIỆN & NƯỚC THEO KỲ TÍNH TOÁN */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '14px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <h4
            style={{
              fontSize: '14px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: '#334155',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Layers size={16} color="#64748b" />
            Chỉ số Đầu kỳ Toàn bộ Đồng hồ Nhà máy — Kỳ Tháng {selectedMonth}/{selectedYear} ({filteredMeters.length})
          </h4>

          {/* Search & Role Filter */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '9px', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Tìm mã hoặc tên đồng hồ..."
                className="form-input"
                style={{ paddingLeft: '32px', fontSize: '12.5px', height: '34px' }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
              <button
                type="button"
                style={{
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: 'none',
                  backgroundColor: filterType === 'ALL' ? '#2563eb' : '#ffffff',
                  color: filterType === 'ALL' ? '#ffffff' : '#475569',
                  cursor: 'pointer',
                }}
                onClick={() => setFilterType('ALL')}
              >
                Tất cả
              </button>
              <button
                type="button"
                style={{
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: 'none',
                  borderLeft: '1px solid #cbd5e1',
                  backgroundColor: filterType === 'ELECTRICITY' ? '#d97706' : '#ffffff',
                  color: filterType === 'ELECTRICITY' ? '#ffffff' : '#475569',
                  cursor: 'pointer',
                }}
                onClick={() => setFilterType('ELECTRICITY')}
              >
                ⚡ Điện
              </button>
              <button
                type="button"
                style={{
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: 'none',
                  borderLeft: '1px solid #cbd5e1',
                  backgroundColor: filterType === 'WATER' ? '#0284c7' : '#ffffff',
                  color: filterType === 'WATER' ? '#ffffff' : '#475569',
                  cursor: 'pointer',
                }}
                onClick={() => setFilterType('WATER')}
              >
                💧 Nước
              </button>
              <button
                type="button"
                style={{
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: 'none',
                  borderLeft: '1px solid #cbd5e1',
                  backgroundColor: filterType === 'SUPPLY' ? '#7c3aed' : '#ffffff',
                  color: filterType === 'SUPPLY' ? '#ffffff' : '#475569',
                  cursor: 'pointer',
                }}
                onClick={() => setFilterType('SUPPLY')}
              >
                ⭐ Tổng cấp
              </button>
            </div>
          </div>
        </div>

        {/* Bảng danh sách */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflowX: 'auto' }}>
          <table className="table" style={{ margin: 0, width: '100%', fontSize: '12.5px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', color: '#475569', textAlign: 'left' }}>
                <th style={{ width: '120px', padding: '10px 12px' }}>Mã đồng hồ</th>
                <th style={{ minWidth: '170px', padding: '10px 12px' }}>Tên điểm đo & Vị trí</th>
                <th style={{ width: '110px', padding: '10px 12px' }}>Loại & Đơn vị</th>
                <th style={{ width: '150px', padding: '10px 12px' }}>Mốc bắt đầu kỳ</th>
                <th style={{ width: '130px', padding: '10px 12px' }}>1. Số Đầu Kỳ</th>
                <th style={{ width: '130px', padding: '10px 12px' }}>2. Số Hiện Tại</th>
                <th style={{ width: '130px', padding: '10px 12px', textAlign: 'right' }}>Sản lượng đến nay</th>
                <th style={{ minWidth: '150px', padding: '10px 12px' }}>Ghi chú</th>
                <th style={{ width: '85px', padding: '10px 12px', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
                    <div>Đang tải chỉ số đầu kỳ Tháng {selectedMonth}/{selectedYear}...</div>
                  </td>
                </tr>
              ) : filteredMeters.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                    Không tìm thấy điểm đo nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredMeters.map((meter) => {
                  const isElectric = meter.type === 'ELECTRICITY';
                  const edit = editValues[meter.pointId] || { value: '', currentValue: '', notes: '' };
                  const isSaving = savingId === meter.pointId;
                  const bNum = parseFloat(edit.value);
                  const cNum = parseFloat(edit.currentValue);
                  const isChanged =
                    (!isNaN(bNum) && bNum !== meter.baselineValue) ||
                    (!isNaN(cNum) && cNum !== meter.lastReadingValue);

                  const diffUnits = !isNaN(bNum) && !isNaN(cNum) && cNum >= bNum
                    ? (cNum - bNum) * (meter.multiplier || 1.0)
                    : 0;

                  return (
                    <tr
                      key={meter.pointId}
                      style={{
                        backgroundColor: isChanged ? '#fffbeb' : undefined,
                        transition: 'background-color 0.2s ease',
                      }}
                    >
                      {/* Code */}
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0f172a' }}>
                        <div>{meter.code}</div>
                        {meter.isSupplyMeter && (
                          <span
                            style={{
                              display: 'inline-block',
                              fontSize: '10px',
                              fontWeight: 700,
                              color: '#7c3aed',
                              backgroundColor: '#f3e8ff',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              marginTop: '2px',
                            }}
                          >
                            ⭐ TỔNG CẤP
                          </span>
                        )}
                        {meter.isExcludedFromTotal && (
                          <span
                            style={{
                              display: 'inline-block',
                              fontSize: '10px',
                              fontWeight: 700,
                              color: '#b45309',
                              backgroundColor: '#fef3c7',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              marginTop: '2px',
                              marginLeft: meter.isSupplyMeter ? '4px' : '0px',
                            }}
                            title="Đồng hồ đo đối chứng - Không tính vào Tổng cấp & Không tính vào Tổng dùng"
                          >
                            ⚖️ ĐO ĐỐI CHỨNG
                          </span>
                        )}
                      </td>

                      {/* Name & Location */}
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{meter.name}</div>
                        <div style={{ fontSize: '11.5px', color: '#64748b' }}>📍 {meter.location}</div>
                      </td>

                      {/* Type & Unit */}
                      <td style={{ padding: '10px 12px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: isElectric ? '#fef3c7' : '#e0f2fe',
                            color: isElectric ? '#92400e' : '#0369a1',
                          }}
                        >
                          {isElectric ? <Zap size={11} /> : <Droplets size={11} />}
                          {isElectric ? 'Điện' : 'Nước'} ({meter.unit})
                        </span>
                      </td>

                      {/* Cycle start date */}
                      <td style={{ padding: '10px 12px', fontSize: '11.5px', color: '#475569' }}>
                        <div style={{ fontWeight: 600, color: isElectric ? '#b45309' : '#0369a1' }}>
                          {meter.startDayLabel}
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>{meter.cycleDescription}</div>
                      </td>

                      {/* 1. Edit Baseline Input */}
                      <td style={{ padding: '8px 12px' }}>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          className="form-input"
                          style={{
                            height: '32px',
                            fontSize: '13px',
                            fontWeight: 700,
                            borderColor: !isNaN(bNum) && bNum !== meter.baselineValue ? '#f59e0b' : '#cbd5e1',
                            backgroundColor: !isNaN(bNum) && bNum !== meter.baselineValue ? '#ffffff' : '#f8fafc',
                          }}
                          value={edit.value}
                          onChange={(e) => handleValueChange(meter.pointId, e.target.value)}
                        />
                      </td>

                      {/* 2. Edit Current Value Input */}
                      <td style={{ padding: '8px 12px' }}>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          className="form-input"
                          style={{
                            height: '32px',
                            fontSize: '13px',
                            fontWeight: 700,
                            color: '#047857',
                            borderColor: !isNaN(cNum) && cNum !== meter.lastReadingValue ? '#10b981' : '#bbf7d0',
                            backgroundColor: '#ffffff',
                          }}
                          value={edit.currentValue}
                          onChange={(e) => handleCurrentValueChange(meter.pointId, e.target.value)}
                        />
                      </td>

                      {/* Calculated Consumption to date */}
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#047857' }}>
                        +{formatVN(diffUnits)} {meter.unit}
                      </td>

                      {/* Notes */}
                      <td style={{ padding: '8px 12px' }}>
                        <input
                          type="text"
                          className="form-input"
                          style={{ height: '32px', fontSize: '12px' }}
                          value={edit.notes}
                          placeholder="Ghi chú mốc..."
                          onChange={(e) => handleNotesChange(meter.pointId, e.target.value)}
                        />
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => handleSaveSingle(meter)}
                          disabled={isSaving || batchSaving || !edit.value}
                          title="Lưu chỉ số đầu kỳ & hiện tại"
                          style={{
                            padding: '4px 8px',
                            fontSize: '11.5px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: isChanged ? '#2563eb' : '#64748b',
                            borderColor: isChanged ? '#2563eb' : '#64748b',
                          }}
                        >
                          {isSaving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
                          Lưu
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
