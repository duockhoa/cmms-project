import React from 'react';
import { useUtilitySettings } from '../../hooks/useUtilitySettings';
import {
  Zap,
  Droplets,
  Save,
  RefreshCw,
  Layers,
} from 'lucide-react';
import { formatVN } from '../../utils/formatters';
import { SearchInput } from '../common';
import { calculateMeterConsumption } from './utilitySettings.types';
import { UtilitySettingsControls } from './UtilitySettingsControls';

export const UtilitySettingsTab: React.FC = () => {
  const {
    selectedMonth, setSelectedMonth, selectedYear, setSelectedYear,
    loading, savingId, batchSaving, elecCycle, waterCycle, supplyMeters,
    search, setSearch, filterType, setFilterType, editValues, filteredMeters,
    loadPeriodData, handleValueChange, handleCurrentValueChange, handleNotesChange,
    handleSaveSingle, handleSaveAll, handleAutoFillFromHistory,
  } = useUtilitySettings();

  return (
    <div>
      <UtilitySettingsControls
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        loading={loading}
        batchSaving={batchSaving}
        elecCycle={elecCycle}
        waterCycle={waterCycle}
        onMonthChange={setSelectedMonth}
        onYearChange={setSelectedYear}
        onAutoFill={handleAutoFillFromHistory}
        onReload={loadPeriodData}
        onSaveAll={handleSaveAll}
      />

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
    </div>
  );
};
