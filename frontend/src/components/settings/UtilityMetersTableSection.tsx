import React from 'react';
import { Droplets, Layers, RefreshCw, Save, Zap } from 'lucide-react';
import { formatVN } from '../../utils/formatters';
import { SearchInput } from '../common';
import { calculateMeterConsumption, PeriodMeterItem, UtilityMeterEditValue, UtilityMeterFilter } from './utilitySettings.types';

interface UtilityMetersTableSectionProps {
  selectedMonth: number;
  selectedYear: number;
  loading: boolean;
  savingId: string | null;
  batchSaving: boolean;
  filteredMeters: PeriodMeterItem[];
  editValues: Record<string, UtilityMeterEditValue>;
  search: string;
  filterType: UtilityMeterFilter;
  setSearch: (value: string) => void;
  setFilterType: (value: UtilityMeterFilter) => void;
  handleValueChange: (pointId: string, value: string) => void;
  handleCurrentValueChange: (pointId: string, value: string) => void;
  handleNotesChange: (pointId: string, value: string) => void;
  handleSaveSingle: (meter: PeriodMeterItem) => Promise<void>;
}

export const UtilityMetersTableSection: React.FC<UtilityMetersTableSectionProps> = ({
  selectedMonth, selectedYear, loading, savingId, batchSaving, filteredMeters,
  editValues, search, filterType, setSearch, setFilterType, handleValueChange,
  handleCurrentValueChange, handleNotesChange, handleSaveSingle,
}) => (
  <>
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
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Tìm mã hoặc tên đồng hồ..."
              width="220px"
            />

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

                  const diffUnits = calculateMeterConsumption(edit, meter.multiplier);

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
  </>
);
