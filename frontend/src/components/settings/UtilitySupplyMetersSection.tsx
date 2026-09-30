import React from 'react';
import { Droplets, RefreshCw, Save, Zap } from 'lucide-react';
import { formatVN } from '../../utils/formatters';
import { calculateMeterConsumption, PeriodMeterItem, UtilityMeterEditValue } from './utilitySettings.types';

interface UtilitySupplyMetersSectionProps {
  selectedMonth: number;
  selectedYear: number;
  loading: boolean;
  savingId: string | null;
  batchSaving: boolean;
  supplyMeters: PeriodMeterItem[];
  editValues: Record<string, UtilityMeterEditValue>;
  onValueChange: (pointId: string, value: string) => void;
  onCurrentValueChange: (pointId: string, value: string) => void;
  onNotesChange: (pointId: string, value: string) => void;
  onSave: (meter: PeriodMeterItem) => Promise<void>;
}

export const UtilitySupplyMetersSection: React.FC<UtilitySupplyMetersSectionProps> = ({
  selectedMonth,
  selectedYear,
  loading,
  savingId,
  batchSaving,
  supplyMeters,
  editValues,
  onValueChange: handleValueChange,
  onCurrentValueChange: handleCurrentValueChange,
  onNotesChange: handleNotesChange,
  onSave: handleSaveSingle,
}) => (
  <>
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
                        const diffUnits = calculateMeterConsumption(edit, meter.multiplier);
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

  </>
);
