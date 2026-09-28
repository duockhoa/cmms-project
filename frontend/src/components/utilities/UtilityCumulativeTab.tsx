import React from 'react';
import {
  Zap, Droplets, Cpu, QrCode, BarChart3, BarChart2, RefreshCw, Plus, Edit2, Trash2,
  Printer, Search, CheckCircle2, Clock, Settings, FileText, ArrowRight, Calendar, PieChart,
  AlertTriangle, Layers, Ban, XCircle, ShieldAlert, Activity, Filter, X, TrendingUp,
  TrendingDown, CalendarDays, ChevronLeft, ChevronRight, Play, Square, CheckSquare,
} from 'lucide-react';
import { ExportButton, KpiCard } from '../common';
import { UtilityTrendChart } from './UtilityTrendChart';
import { formatVN } from '../../utils/formatters';

interface UtilityTabProps {
  model: Record<string, any>;
}

export const UtilityCumulativeTab: React.FC<UtilityTabProps> = ({ model }) => {
  const {
    navigate, toast, can, isAdmin, loading, points, readings, setReadings, statusLogs, analytics,
    cumulativeType, setCumulativeType, cumulativeMonth, setCumulativeMonth,
    cumulativeYear, setCumulativeYear, cumulativeData, cumulativeLoading,
    cumulativeFilter, setCumulativeFilter, trendViewMode, setTrendViewMode,
    trendDay, setTrendDay, trendMonth, setTrendMonth, trendYear, setTrendYear,
    trendStartYear, setTrendStartYear, trendEndYear, setTrendEndYear,
    trendFilter, setTrendFilter, trendData, trendLoading, trendDisplayType,
    setTrendDisplayType, trendTableContainerRef, dynamicYears, scrollTrendTable,
    scrollToPeriod, filterCategory, setFilterCategory, filterPointId, setFilterPointId, filterSearch,
    setFilterSearch, filterStatus, setFilterStatus, recalculating, setVoidModalReading,
    setVoidReason, setEditModalReading, setPrintPoint, selectedPointIds,
    toggleSelectOnePoint, isAllPointsSelected, toggleSelectAllPoints, isPrintingPoints,
    handlePrintBatchPoints, getLiveHourMeter, loadCumulativeReport, handleExportTrendCSV,
    handleExportCumulativeCSV, handleOpenAddPoint, handleOpenEditPoint,
    handleDeletePoint, handleQuickToggleStatus, handleRecalculateAll,
    handleExportReadingsCSV, filteredPointsForSelect, handleCategoryChange,
    filteredReadings, displayedCumulativeMeters, displayedTrendRows,
    handleOpenEditReading,
  } = model;

  return (
        <div className="util-tab-content">
          {/* 1. Header & Bộ lọc Chu kỳ */}
          <div className="card util-section-card" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
                {/* Chọn loại Điện / Nước */}
                <div style={{ display: 'inline-flex', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '8px', gap: '4px' }}>
                  <button
                    onClick={() => setCumulativeType('ELECTRICITY')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '8px 14px', border: 'none', borderRadius: '6px',
                      fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                      backgroundColor: cumulativeType === 'ELECTRICITY' ? '#ffffff' : 'transparent',
                      color: cumulativeType === 'ELECTRICITY' ? '#ca8a04' : '#64748b',
                      boxShadow: cumulativeType === 'ELECTRICITY' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Zap size={16} />
                    <span>Kỳ Điện (01 ➔ Cuối tháng)</span>
                  </button>

                  <button
                    onClick={() => setCumulativeType('WATER')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '8px 14px', border: 'none', borderRadius: '6px',
                      fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                      backgroundColor: cumulativeType === 'WATER' ? '#ffffff' : 'transparent',
                      color: cumulativeType === 'WATER' ? '#0284c7' : '#64748b',
                      boxShadow: cumulativeType === 'WATER' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Droplets size={16} />
                    <span>Kỳ Nước (21 ➔ 20)</span>
                  </button>
                </div>

                {/* Chọn Tháng */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Tháng:</span>
                  <select
                    value={cumulativeMonth}
                    onChange={(e) => setCumulativeMonth(parseInt(e.target.value, 10))}
                    className="modal-select"
                    style={{ width: '105px', height: '36px', padding: '0 8px', fontSize: '13px' }}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>Tháng {m < 10 ? `0${m}` : m}</option>
                    ))}
                  </select>
                </div>

                {/* Chọn Năm */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Năm:</span>
                  <select
                    value={cumulativeYear}
                    onChange={(e) => setCumulativeYear(parseInt(e.target.value, 10))}
                    className="modal-select"
                    style={{ width: '90px', height: '36px', padding: '0 8px', fontSize: '13px' }}
                  >
                    {dynamicYears.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Nút hành động */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={loadCumulativeReport}
                  className="btn-action-outline"
                  title="Tải lại số liệu"
                  disabled={cumulativeLoading}
                >
                  <RefreshCw size={15} className={cumulativeLoading ? 'animate-spin' : ''} />
                  <span>{cumulativeLoading ? 'Đang tính...' : 'Tính Lại'}</span>
                </button>

                <ExportButton
                  onExport={handleExportCumulativeCSV}
                  className="btn-action-outline"
                  style={{ backgroundColor: '#10b981', color: '#ffffff', borderColor: '#10b981' }}
                  label="Xuất Báo Cáo (CSV)"
                />
              </div>
            </div>

            {/* Banner Thông Tin Chu Kỳ */}
            <div style={{
              marginTop: '16px', padding: '12px 16px', borderRadius: '8px',
              backgroundColor: cumulativeType === 'ELECTRICITY' ? '#fefce8' : '#f0f9ff',
              border: `1px solid ${cumulativeType === 'ELECTRICITY' ? '#fde047' : '#bae6fd'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Calendar size={18} color={cumulativeType === 'ELECTRICITY' ? '#ca8a04' : '#0284c7'} />
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginRight: '8px' }}>
                    {cumulativeData?.cycleDescription || `Chu kỳ tính toán Tháng ${cumulativeMonth}/${cumulativeYear}`}
                  </span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    ({cumulativeType === 'ELECTRICITY' 
                      ? 'Kỳ điện tính từ ngày đầu tiên đến ngày cuối cùng của tháng' 
                      : 'Kỳ nước tính từ ngày 21 tháng trước đến ngày 20 tháng sau'})
                  </span>
                </div>
              </div>
              <span style={{ fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', backgroundColor: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1' }}>
                Đơn vị: {cumulativeData?.summary?.unit || (cumulativeType === 'ELECTRICITY' ? 'kWh' : 'm³')}
              </span>
            </div>
          </div>

          {/* 2. Thẻ KPI TỔNG KẾT ĐỐI SOÁT */}
          <div className={`cumulative-kpi-grid ${cumulativeType === 'WATER' ? 'five-cols' : ''}`} style={{ marginBottom: '16px' }}>
            <KpiCard
              title="1. TỔNG CẤP VÀO"
              value={`${cumulativeData?.summary?.totalSupply?.toLocaleString() || 0} ${cumulativeData?.summary?.unit || ''}`}
              icon={Layers}
              variant="primary"
              subtext={`Gồm ${cumulativeData?.supplyMeters?.length || 0} ĐH nguồn tổng`}
            />
            <KpiCard
              title="2. TỔNG SỬ DỤNG"
              value={`${cumulativeData?.summary?.totalConsumption?.toLocaleString() || 0} ${cumulativeData?.summary?.unit || ''}`}
              icon={cumulativeType === 'ELECTRICITY' ? Zap : Droplets}
              variant="success"
              subtext={
                cumulativeType === 'WATER' && (cumulativeData?.recycledMeters?.length || 0) > 0
                  ? `${cumulativeData?.consumptionMeters?.length || 0} ĐH (trừ ${cumulativeData?.recycledMeters?.length} ĐH tái SD)`
                  : `Tổng ${cumulativeData?.consumptionMeters?.length || 0} ĐH phân xưởng`
              }
            />
            <KpiCard
              title="3. CHÊNH LỆCH"
              value={`${(cumulativeData?.summary?.delta || 0) > 0 ? '+' : ''}${cumulativeData?.summary?.delta?.toLocaleString() || 0} ${cumulativeData?.summary?.unit || ''}`}
              icon={PieChart}
              variant={(cumulativeData?.summary?.delta || 0) < 0 ? 'danger' : (cumulativeData?.summary?.lossRate || 0) > 6 ? 'warning' : 'primary'}
              subtext={(cumulativeData?.summary?.delta || 0) >= 0 ? 'Lượng hao hụt / thất thoát' : 'Dùng vượt lượng cấp!'}
            />
            <KpiCard
              title="4. TỶ LỆ HAO HỤT"
              value={`${cumulativeData?.summary?.lossRate || 0}%`}
              icon={AlertTriangle}
              variant={(cumulativeData?.summary?.lossRate || 0) > 6 ? 'danger' : (cumulativeData?.summary?.lossRate || 0) > 3 ? 'warning' : 'success'}
              subtext={
                (cumulativeData?.summary?.lossRate || 0) <= 3
                  ? 'Mức an toàn (< 3%)'
                  : (cumulativeData?.summary?.lossRate || 0) <= 6
                  ? 'Tiêu chuẩn (3 - 6%)'
                  : 'Cảnh báo cao (> 6%)'
              }
            />
            {cumulativeType === 'WATER' && (
              <KpiCard
                title="5. NƯỚC TÁI SỬ DỤNG"
                value={`${cumulativeData?.summary?.totalRecycled?.toLocaleString() || 0} m³`}
                icon={RefreshCw}
                variant="purple"
                footer={<>Tái sinh: <strong>{cumulativeData?.summary?.recycleRate || 0}%</strong> (Không cộng tổng)</>}
              />
            )}
          </div>

          {/* Thanh Tiến Trình Đối Chiếu Trực Quan */}
          <div className="card util-section-card" style={{ marginBottom: '20px' }}>
            <h3 className="section-title" style={{ marginBottom: '14px' }}>
              <PieChart size={17} color="#2563eb" />
              <span>ĐỐI CHIẾU CÂN BẰNG TỔNG CẤP VÀ TIÊU THỤ (KỲ {cumulativeMonth}/{cumulativeYear})</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>
                    1. Nguồn Tổng Cấp Vào ({cumulativeData?.summary?.totalSupply?.toLocaleString() || 0} {cumulativeData?.summary?.unit})
                  </span>
                  <span style={{ fontWeight: 700, color: '#2563eb' }}>100%</span>
                </div>
                <div style={{ height: '14px', backgroundColor: '#e2e8f0', borderRadius: '7px', overflow: 'hidden' }}>
                  <div style={{ width: '100%', height: '100%', backgroundColor: '#3b82f6', borderRadius: '7px' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>
                    2. Tổng Tiêu Thụ Thực Tế ({cumulativeData?.summary?.totalConsumption?.toLocaleString() || 0} {cumulativeData?.summary?.unit})
                  </span>
                  <span style={{ fontWeight: 700, color: '#10b981' }}>
                    {cumulativeData?.summary?.totalSupply > 0 
                      ? Math.round((cumulativeData?.summary?.totalConsumption / cumulativeData?.summary?.totalSupply) * 100) 
                      : 0}%
                  </span>
                </div>
                <div style={{ height: '14px', backgroundColor: '#e2e8f0', borderRadius: '7px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min(100, cumulativeData?.summary?.totalSupply > 0 
                      ? (cumulativeData?.summary?.totalConsumption / cumulativeData?.summary?.totalSupply) * 100 
                      : 0)}%`,
                    height: '100%',
                    backgroundColor: '#10b981',
                    borderRadius: '7px',
                    transition: 'width 0.4s ease'
                  }} />
                </div>
              </div>

              {/* Nước tái sử dụng nếu có */}
              {cumulativeType === 'WATER' && (cumulativeData?.summary?.totalRecycled || 0) > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600, color: '#6b21a8' }}>
                      3. Nước Tái Sử Dụng / Tiết Kiệm ({cumulativeData?.summary?.totalRecycled?.toLocaleString()} m³) - Không cộng vào tổng dùng
                    </span>
                    <span style={{ fontWeight: 700, color: '#7c3aed' }}>
                      {cumulativeData?.summary?.recycleRate || 0}%
                    </span>
                  </div>
                  <div style={{ height: '14px', backgroundColor: '#e2e8f0', borderRadius: '7px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(100, cumulativeData?.summary?.recycleRate || 0)}%`,
                      height: '100%',
                      backgroundColor: '#8b5cf6',
                      borderRadius: '7px',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                </div>
              )}

              {/* Phân tích điện 3 giá nếu có */}
              {cumulativeType === 'ELECTRICITY' && cumulativeData?.summary?.threePhaseBreakdown && (
                <div style={{
                  marginTop: '10px', paddingTop: '14px', borderTop: '1px dashed #cbd5e1',
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px'
                }}>
                  <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Biểu giá T1 (Bình thường):</span>
                    <strong style={{ fontSize: '15px', color: '#0f172a' }}>
                      {cumulativeData.summary.threePhaseBreakdown.normal.toLocaleString()} kWh
                    </strong>
                  </div>
                  <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
                    <span style={{ fontSize: '12px', color: '#dc2626', display: 'block' }}>Biểu giá T2 (Cao điểm):</span>
                    <strong style={{ fontSize: '15px', color: '#dc2626' }}>
                      {cumulativeData.summary.threePhaseBreakdown.peak.toLocaleString()} kWh
                    </strong>
                  </div>
                  <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                    <span style={{ fontSize: '12px', color: '#16a34a', display: 'block' }}>Biểu giá T3 (Thấp điểm):</span>
                    <strong style={{ fontSize: '15px', color: '#16a34a' }}>
                      {cumulativeData.summary.threePhaseBreakdown.offPeak.toLocaleString()} kWh
                    </strong>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. BẢNG CHI TIẾT CÁC ĐỒNG HỒ ĐO TRONG KỲ */}
          <div className="card util-section-card">
            <div className="section-card-header" style={{ marginBottom: '16px' }}>
              <div>
                <h3 className="section-title">
                  <FileText size={18} color="#0284c7" />
                  <span>DANH SÁCH ĐỒNG HỒ & SẢN LƯỢNG TRONG KỲ</span>
                </h3>
                <p className="section-sub">
                  Chi tiết chỉ số đầu kỳ, cuối kỳ, sản lượng thực tế và tỷ trọng của từng điểm đo.
                </p>
              </div>

              {/* Bộ lọc gộp dạng Dropdown: Phân loại & Từng điểm đo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Filter size={14} style={{ position: 'absolute', left: '10px', color: '#64748b', pointerEvents: 'none' }} />
                  <select
                    value={cumulativeFilter}
                    onChange={(e) => setCumulativeFilter(e.target.value)}
                    style={{
                      padding: '7px 28px 7px 30px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#0f172a',
                      cursor: 'pointer',
                      outline: 'none',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      minWidth: '180px',
                      maxWidth: '100%',
                      boxSizing: 'border-box',
                    }}
                    title="Lọc theo phân loại hoặc chọn xem chi tiết từng điểm đo"
                  >
                    <option value="ALL">Tất cả đồng hồ ({cumulativeData?.allMeters?.length || 0})</option>
                    <option value="SUPPLY">Nguồn Tổng Cấp ({cumulativeData?.supplyMeters?.length || 0})</option>
                    <option value="CONSUMPTION">Đo Tiêu Thụ ({cumulativeData?.consumptionMeters?.length || 0})</option>
                    {cumulativeType === 'WATER' && (
                      <option value="RECYCLED">Nước Tái Sử Dụng ({cumulativeData?.recycledMeters?.length || 0})</option>
                    )}
                    {(cumulativeData?.excludedMeters?.length || 0) > 0 && (
                      <option value="EXCLUDED">Đo Đối Chứng ({cumulativeData.excludedMeters.length})</option>
                    )}
                    {(cumulativeData?.allMeters || []).map((m: any) => (
                      <option key={m.id} value={m.id}>
                        {m.code} - {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                {cumulativeFilter !== 'ALL' && (
                  <button
                    onClick={() => setCumulativeFilter('ALL')}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#f8fafc',
                      color: '#64748b',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s',
                    }}
                    title="Đặt lại về Tất cả đồng hồ"
                  >
                    <X size={13} />
                    <span>Đặt lại</span>
                  </button>
                )}
              </div>
            </div>

            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th style={{ width: '50px', textAlign: 'center' }}>STT</th>
                    <th>Mã Điểm Đo</th>
                    <th>Tên Đồng Hồ / Thiết Bị</th>
                    <th style={{ width: '170px' }}>Phân Loại</th>
                    <th>Vị Trí Lắp Đặt</th>
                    <th style={{ textAlign: 'center' }}>Lần Ghi</th>
                    <th style={{ textAlign: 'right' }}>Số Đầu Kỳ</th>
                    <th style={{ textAlign: 'right' }}>Số Cuối Kỳ</th>
                    <th style={{ textAlign: 'center' }}>Hệ Số CT</th>
                    <th style={{ textAlign: 'right', fontWeight: 800 }}>Sản Lượng ({cumulativeData?.summary?.unit})</th>
                    <th style={{ textAlign: 'right' }}>Tỷ Trọng (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {cumulativeLoading ? (
                    <tr>
                      <td colSpan={11} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                        Đang tính toán sản lượng kỳ...
                      </td>
                    </tr>
                  ) : !cumulativeData?.allMeters || cumulativeData.allMeters.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                        Chưa có điểm đo nào cho loại tiện ích này.
                      </td>
                    </tr>
                  ) : displayedCumulativeMeters.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8', fontSize: '13px' }}>
                        Không có đồng hồ nào khớp với bộ lọc đã chọn.
                      </td>
                    </tr>
                  ) : (
                    displayedCumulativeMeters.map((m: any, idx: number) => (
                      <tr key={m.id}>
                        <td style={{ textAlign: 'center', color: '#64748b', fontSize: '12px' }}>{idx + 1}</td>
                        <td>
                          <strong style={{ color: '#2563eb', fontSize: '13px' }}>{m.code}</strong>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '13px' }}>{m.name}</div>
                          {m.tariffType === 'THREE_PHASE' && (
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              <span title="Bình thường (T1)">T1: <strong style={{ color: '#0f172a' }}>{formatVN(m.normalConsumption)}</strong></span>
                              <span title="Cao điểm (T2)" style={{ color: '#dc2626' }}>T2: <strong>{formatVN(m.peakConsumption)}</strong></span>
                              <span title="Thấp điểm (T3)" style={{ color: '#16a34a' }}>T3: <strong>{formatVN(m.offPeakConsumption)}</strong></span>
                            </div>
                          )}
                        </td>
                        <td>
                          {m.isSupplyMeter ? (
                            <span style={{
                              padding: '4px 8px', borderRadius: '4px', fontSize: '11.5px', fontWeight: 700,
                              backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', display: 'inline-flex', alignItems: 'center', gap: '4px'
                            }}>
                              <Layers size={12} /> NGUỒN TỔNG CẤP
                            </span>
                          ) : m.isRecycledWater ? (
                            <span style={{
                              padding: '4px 8px', borderRadius: '4px', fontSize: '11.5px', fontWeight: 700,
                              backgroundColor: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', display: 'inline-flex', alignItems: 'center', gap: '4px'
                            }} title="Đồng hồ nước tái sử dụng - không cộng dồn vào tổng dùng để chống tính trùng">
                              <RefreshCw size={12} /> NƯỚC TÁI SỬ DỤNG
                            </span>
                          ) : m.isExcludedFromTotal ? (
                            <span style={{
                              padding: '4px 8px', borderRadius: '4px', fontSize: '11.5px', fontWeight: 700,
                              backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', display: 'inline-flex', alignItems: 'center', gap: '4px'
                            }} title="Đồng hồ đo đối chứng / trung gian - Không tính vào Tổng cấp và Không tính vào Tổng dùng">
                              <Ban size={12} /> ĐO ĐỐI CHỨNG (KHÔNG TÍNH TỔNG)
                            </span>
                          ) : (
                            <span style={{
                              padding: '4px 8px', borderRadius: '4px', fontSize: '11.5px', fontWeight: 600,
                              backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', display: 'inline-flex', alignItems: 'center', gap: '4px'
                            }}>
                              <CheckCircle2 size={12} /> TIÊU THỤ NỘI BỘ
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: '12.5px', color: '#475569' }}>{m.location}</td>
                        <td style={{ textAlign: 'center', fontSize: '12px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '10px', backgroundColor: '#f1f5f9', color: '#334155' }}>
                            {m.readingsCount} lần
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontSize: '12.5px', color: '#64748b' }}>
                          {m.startValue !== null && m.startValue !== undefined ? formatVN(m.startValue) : '-'}
                        </td>
                        <td style={{ textAlign: 'right', fontSize: '12.5px', color: '#0f172a', fontWeight: 600 }}>
                          {m.endValue !== null && m.endValue !== undefined ? formatVN(m.endValue) : '-'}
                        </td>
                        <td style={{ textAlign: 'center', fontSize: '12px' }}>
                          x{m.multiplier}
                        </td>
                        <td style={{ textAlign: 'right', fontSize: '13.5px', fontWeight: 800, color: m.isSupplyMeter ? '#1d4ed8' : m.isRecycledWater ? '#7c3aed' : m.isExcludedFromTotal ? '#b45309' : '#047857' }}>
                          {formatVN(m.periodConsumption)} {m.unit}
                        </td>
                        <td style={{ textAlign: 'right', fontSize: '12.5px', fontWeight: 600, color: '#334155' }}>
                          {m.isExcludedFromTotal ? <span style={{ color: '#94a3b8' }}>-</span> : `${m.sharePercent}%`}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. BẢNG TỔNG HỢP & XU HƯỚNG TIÊU THỤ THEO THỜI GIAN (MA TRẬN NGÀY / THÁNG / NĂM) */}
          <div className="card util-section-card trend-matrix-card" style={{ marginTop: '24px' }}>
            <div className="trend-card-header">
              <div className="trend-title-box">
                <h3 className="section-title">
                  <BarChart3 size={18} color="#059669" />
                  <span>BẢNG TỔNG HỢP & XU HƯỚNG TIÊU THỤ THEO THỜI GIAN</span>
                </h3>
                <p className="section-sub">
                  Chi tiết sản lượng tiêu thụ của từng vị trí / điểm đo qua các ngày trong tháng, các tháng trong năm hoặc so sánh giữa các năm.
                </p>
              </div>

              {/* Nút Chuyển Đổi Dạng Xem: Bảng Số Liệu <-> Biểu Đồ Trực Quan */}
              <div className="trend-view-type-pills">
                <button
                  type="button"
                  onClick={() => setTrendDisplayType('TABLE')}
                  className={`view-type-btn ${trendDisplayType === 'TABLE' ? 'active' : ''}`}
                  title="Xem dạng bảng ma trận số liệu chi tiết"
                >
                  <FileText size={13} />
                  <span>Dạng Bảng Số</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTrendDisplayType('CHART')}
                  className={`view-type-btn ${trendDisplayType === 'CHART' ? 'active' : ''}`}
                  title="Chuyển sang dạng biểu đồ đồ thị trực quan"
                >
                  <BarChart2 size={13} />
                  <span>Dạng Biểu Đồ</span>
                </button>
              </div>
            </div>

            {/* Thanh Công Cụ Điều Khiển & Bộ Lọc Tự Co Giãn Theo Màn Hình */}
            <div className="trend-toolbar">
              <div className="trend-toolbar-left">
                {/* 1. Nút chuyển chế độ: Giờ / Ngày / Tháng / Năm */}
                <div className="trend-mode-pills">
                  <button
                    type="button"
                    onClick={() => setTrendViewMode('HOURLY')}
                    className={`trend-mode-btn ${trendViewMode === 'HOURLY' ? 'active' : ''}`}
                    title="Xem chi tiết từng giờ trong ngày"
                  >
                    <Clock size={13} />
                    <span>Theo Giờ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrendViewMode('DAILY')}
                    className={`trend-mode-btn ${trendViewMode === 'DAILY' ? 'active' : ''}`}
                  >
                    <Calendar size={13} />
                    <span>Theo Ngày</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrendViewMode('MONTHLY')}
                    className={`trend-mode-btn ${trendViewMode === 'MONTHLY' ? 'active' : ''}`}
                  >
                    <CalendarDays size={13} />
                    <span>Theo Tháng</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrendViewMode('YEARLY')}
                    className={`trend-mode-btn ${trendViewMode === 'YEARLY' ? 'active' : ''}`}
                  >
                    <TrendingUp size={13} />
                    <span>Theo Năm</span>
                  </button>
                </div>

                {/* 2. Bộ chọn mốc thời gian */}
                {trendViewMode === 'HOURLY' && (
                  <div className="trend-date-selectors">
                    <select
                      value={trendDay}
                      onChange={(e) => setTrendDay(parseInt(e.target.value, 10))}
                      className="filter-select trend-select"
                      title="Chọn ngày"
                    >
                      {Array.from({ length: new Date(trendYear, trendMonth, 0).getDate() }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>Ngày {String(d).padStart(2, '0')}</option>
                      ))}
                    </select>
                    <select
                      value={trendMonth}
                      onChange={(e) => setTrendMonth(parseInt(e.target.value, 10))}
                      className="filter-select trend-select"
                      title="Chọn tháng"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>Tháng {String(m).padStart(2, '0')}</option>
                      ))}
                    </select>
                    <select
                      value={trendYear}
                      onChange={(e) => setTrendYear(parseInt(e.target.value, 10))}
                      className="filter-select trend-select"
                      title="Chọn năm"
                    >
                      {dynamicYears.map((y) => (
                        <option key={y} value={y}>Năm {y}</option>
                      ))}
                    </select>
                  </div>
                )}

                {trendViewMode === 'DAILY' && (
                  <div className="trend-date-selectors">
                    <select
                      value={trendMonth}
                      onChange={(e) => setTrendMonth(parseInt(e.target.value, 10))}
                      className="filter-select trend-select"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>Tháng {String(m).padStart(2, '0')}</option>
                      ))}
                    </select>
                    <select
                      value={trendYear}
                      onChange={(e) => setTrendYear(parseInt(e.target.value, 10))}
                      className="filter-select trend-select"
                    >
                      {dynamicYears.map((y) => (
                        <option key={y} value={y}>Năm {y}</option>
                      ))}
                    </select>
                  </div>
                )}

                {trendViewMode === 'MONTHLY' && (
                  <div className="trend-date-selectors">
                    <select
                      value={trendYear}
                      onChange={(e) => setTrendYear(parseInt(e.target.value, 10))}
                      className="filter-select trend-select"
                    >
                      {dynamicYears.map((y) => (
                        <option key={y} value={y}>Năm {y}</option>
                      ))}
                    </select>
                  </div>
                )}

                {trendViewMode === 'YEARLY' && (
                  <div className="trend-date-selectors">
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Từ:</span>
                    <select
                      value={trendStartYear}
                      onChange={(e) => setTrendStartYear(parseInt(e.target.value, 10))}
                      className="filter-select trend-select"
                    >
                      {dynamicYears.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>đến:</span>
                    <select
                      value={trendEndYear}
                      onChange={(e) => setTrendEndYear(parseInt(e.target.value, 10))}
                      className="filter-select trend-select"
                    >
                      {dynamicYears.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="trend-toolbar-right">
                {/* 3. Bộ lọc điểm đo (Flat, không hard code) */}
                <div className="trend-filter-box">
                  <Filter size={13} className="trend-filter-icon" />
                  <select
                    value={trendFilter}
                    onChange={(e) => setTrendFilter(e.target.value)}
                    className="filter-select trend-filter-select"
                    title="Lọc vị trí / điểm đo hiển thị"
                  >
                    <option value="ALL">Tất cả điểm đo ({trendData?.pointRows?.length || 0})</option>
                    <option value="SUPPLY">Nguồn Tổng Cấp</option>
                    <option value="CONSUMPTION">Đo Tiêu Thụ</option>
                    {trendData?.pointRows?.some((r: any) => r.isRecycledWater) && (
                      <option value="RECYCLED">Nước Tái Sử Dụng</option>
                    )}
                    {trendData?.pointRows?.some((r: any) => r.isExcludedFromTotal) && (
                      <option value="EXCLUDED">Đo Đối Chứng</option>
                    )}
                    {(trendData?.pointRows || []).map((r: any) => (
                      <option key={r.pointId} value={r.pointId}>
                        {r.code} - {r.name}
                      </option>
                    ))}
                  </select>
                  {trendFilter !== 'ALL' && (
                    <button
                      type="button"
                      onClick={() => setTrendFilter('ALL')}
                      className="btn-trend-reset"
                      title="Đặt lại bộ lọc"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>


                {/* 5. Nút xuất CSV cho ma trận */}
                <ExportButton
                  onExport={handleExportTrendCSV}
                  className="btn-export-csv trend-export-btn"
                  label="Xuất CSV"
                />
              </div>
            </div>

            {/* HIỂN THỊ DẠNG BIỂU ĐỒ HOẶC DẠNG BẢNG MA TRẬN (CHUYỂN ĐỔI THEO NÚT BẤM) */}
            {trendDisplayType === 'CHART' ? (
              <UtilityTrendChart
                trendData={trendData}
                trendViewMode={trendViewMode}
                trendFilter={trendFilter}
                unit={cumulativeType === 'ELECTRICITY' ? 'kWh' : 'm³'}
              />
            ) : (
              <>
                {/* Thanh Hỗ Trợ Điều Hướng Nhanh & Trạng Thái Cuộn Ngang */}
                <div className="trend-nav-strip">
                  <div className="trend-nav-info">
                    <Calendar size={13} color="#059669" />
                    <span className="trend-nav-period-text">
                      {trendViewMode === 'HOURLY' ? `Ngày ${String(trendDay).padStart(2, '0')}/${String(trendMonth).padStart(2, '0')}/${trendYear} (24 giờ)` :
                       trendViewMode === 'DAILY' ? `Kỳ Tháng ${trendMonth}/${trendYear} (${trendData?.timeColumns?.length || 0} ngày)` :
                       trendViewMode === 'MONTHLY' ? `Năm ${trendYear} (12 tháng)` :
                       `Giai đoạn ${trendStartYear} - ${trendEndYear} (${trendData?.timeColumns?.length || 0} năm)`}
                    </span>
                    <span className="trend-scroll-guide">
                      • Cuộn chuột ngang hoặc nhấn nút để nhảy nhanh:
                    </span>
                  </div>

                  <div className="trend-nav-actions">
                    {trendViewMode === 'HOURLY' && (
                      <div className="trend-jump-group">
                        <button type="button" onClick={() => scrollToPeriod(0)} className="btn-jump-pill" title="Xem từ 00h đến 07h">
                          00h-07h
                        </button>
                        <button type="button" onClick={() => scrollToPeriod(0.5)} className="btn-jump-pill" title="Xem từ 08h đến 15h">
                          08h-15h
                        </button>
                        <button type="button" onClick={() => scrollToPeriod(1)} className="btn-jump-pill" title="Xem từ 16h đến 23h & Tổng">
                          16h-23h
                        </button>
                      </div>
                    )}
                    {trendViewMode === 'DAILY' && (
                      <div className="trend-jump-group">
                        <button type="button" onClick={() => scrollToPeriod(0)} className="btn-jump-pill" title="Xem từ ngày 01 đến 10">
                          01-10
                        </button>
                        <button type="button" onClick={() => scrollToPeriod(0.5)} className="btn-jump-pill" title="Xem từ ngày 11 đến 20">
                          11-20
                        </button>
                        <button type="button" onClick={() => scrollToPeriod(1)} className="btn-jump-pill" title="Xem các ngày cuối & Tổng">
                          21-Cuối
                        </button>
                      </div>
                    )}
                    <div className="trend-arrows-group">
                      <button type="button" onClick={() => scrollTrendTable(-300)} className="btn-arrow-pill" title="Cuộn sang trái">
                        <ChevronLeft size={14} />
                      </button>
                      <button type="button" onClick={() => scrollTrendTable(300)} className="btn-arrow-pill" title="Cuộn sang phải">
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bảng Ma Trận Cuộn Ngang (Horizontal Scroll Container với Sticky Columns) */}
                <div 
                  ref={trendTableContainerRef}
                  className="trend-matrix-table-container"
                >
                  <table className="custom-table trend-matrix-table">
                    <thead>
                      <tr>
                        <th className="trend-th-sticky trend-col-stt">STT</th>
                        <th className="trend-th-sticky trend-col-code">Mã Điểm Đo</th>
                        <th className="trend-th-sticky trend-col-name">Tên Điểm Đo & Vị Trí</th>

                        {/* Các cột mốc thời gian động */}
                        {(trendData?.timeColumns || []).map((col: any) => (
                          <th
                            key={col.key}
                            className={`trend-th-day ${col.subLabel === 'CN' ? 'sunday' : col.subLabel === 'T7' ? 'saturday' : ''}`}
                            title={col.label}
                          >
                            <div>{col.shortLabel}</div>
                            {col.subLabel && (
                              <span className={`trend-day-sub ${col.subLabel === 'CN' ? 'sunday' : col.subLabel === 'T7' ? 'saturday' : ''}`}>
                                {col.subLabel}
                              </span>
                            )}
                          </th>
                        ))}

                        <th className="trend-th-total">
                          Tổng Cộng ({trendData?.unit || (cumulativeType === 'ELECTRICITY' ? 'kWh' : 'm³')})
                        </th>
                        <th className="trend-th-avg">
                          Trung Bình
                        </th>
                        <th className="trend-th-trend">
                          Xu Hướng
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {trendLoading ? (
                        <tr>
                          <td colSpan={(trendData?.timeColumns?.length || 0) + 6} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                            Đang tổng hợp dữ liệu ma trận theo {trendViewMode === 'HOURLY' ? 'giờ' : trendViewMode === 'DAILY' ? 'ngày' : trendViewMode === 'MONTHLY' ? 'tháng' : 'năm'}...
                          </td>
                        </tr>
                      ) : !trendData?.timeColumns || trendData.timeColumns.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                            Không có dữ liệu trong khoảng thời gian đã chọn.
                          </td>
                        </tr>
                      ) : (
                        <>
                          {/* 1. HÀNG TỔNG HỢP NGUỒN CẤP VÀO */}
                          {trendData?.summaryRows?.totalSupply && (
                            <tr className="trend-row-summary supply">
                              <td className="trend-td-sticky trend-col-stt supply">Σ</td>
                              <td className="trend-td-sticky trend-col-code supply">NGUỒN CẤP</td>
                              <td className="trend-td-sticky trend-col-name supply">
                                1. TỔNG CẤP VÀO
                              </td>
                              {(trendData.timeColumns || []).map((col: any) => {
                                const val = trendData.summaryRows.totalSupply.values?.[col.key] || 0;
                                return (
                                  <td key={col.key} className="trend-td-val supply">
                                    {val > 0 ? formatVN(val) : '-'}
                                  </td>
                                );
                              })}
                              <td className="trend-td-total supply">
                                {formatVN(trendData.summaryRows.totalSupply.total)}
                              </td>
                              <td className="trend-td-avg supply">
                                {formatVN(trendData.summaryRows.totalSupply.average)}
                              </td>
                              <td className="trend-td-trend supply">-</td>
                            </tr>
                          )}

                          {/* 2. HÀNG TỔNG HỢP SỬ DỤNG NỘI BỘ */}
                          {trendData?.summaryRows?.totalConsumption && (
                            <tr className="trend-row-summary consumption">
                              <td className="trend-td-sticky trend-col-stt consumption">Σ</td>
                              <td className="trend-td-sticky trend-col-code consumption">TIÊU THỤ</td>
                              <td className="trend-td-sticky trend-col-name consumption">
                                2. TỔNG SỬ DỤNG NỘI BỘ
                              </td>
                              {(trendData.timeColumns || []).map((col: any) => {
                                const val = trendData.summaryRows.totalConsumption.values?.[col.key] || 0;
                                return (
                                  <td key={col.key} className="trend-td-val consumption">
                                    {val > 0 ? formatVN(val) : '-'}
                                  </td>
                                );
                              })}
                              <td className="trend-td-total consumption">
                                {formatVN(trendData.summaryRows.totalConsumption.total)}
                              </td>
                              <td className="trend-td-avg consumption">
                                {formatVN(trendData.summaryRows.totalConsumption.average)}
                              </td>
                              <td className="trend-td-trend consumption">-</td>
                            </tr>
                          )}

                          {/* 3. HÀNG TÁI SỬ DỤNG NƯỚC (NẾU CÓ) */}
                          {trendData?.summaryRows?.totalRecycled && (
                            <tr className="trend-row-summary recycled">
                              <td className="trend-td-sticky trend-col-stt recycled">Σ</td>
                              <td className="trend-td-sticky trend-col-code recycled">TÁI SỬ DỤNG</td>
                              <td className="trend-td-sticky trend-col-name recycled">
                                NƯỚC TÁI SỬ DỤNG (TIẾT KIỆM)
                              </td>
                              {(trendData.timeColumns || []).map((col: any) => {
                                const val = trendData.summaryRows.totalRecycled.values?.[col.key] || 0;
                                return (
                                  <td key={col.key} className="trend-td-val recycled">
                                    {val > 0 ? formatVN(val) : '-'}
                                  </td>
                                );
                              })}
                              <td className="trend-td-total recycled">
                                {formatVN(trendData.summaryRows.totalRecycled.total)}
                              </td>
                              <td className="trend-td-avg recycled">
                                {formatVN(trendData.summaryRows.totalRecycled.average)}
                              </td>
                              <td className="trend-td-trend recycled">-</td>
                            </tr>
                          )}

                          {/* 4. HÀNG CHÊNH LỆCH / HAO HỤT */}
                          {trendData?.summaryRows?.delta && (
                            <tr className="trend-row-summary delta">
                              <td className="trend-td-sticky trend-col-stt delta">Δ</td>
                              <td className="trend-td-sticky trend-col-code delta">CHÊNH LỆCH</td>
                              <td className="trend-td-sticky trend-col-name delta">
                                3. HAO HỤT / THẤT THOÁT
                              </td>
                              {(trendData.timeColumns || []).map((col: any) => {
                                const val = trendData.summaryRows.delta.values?.[col.key] || 0;
                                return (
                                  <td key={col.key} className="trend-td-val delta">
                                    {val !== 0 ? formatVN(val) : '-'}
                                  </td>
                                );
                              })}
                              <td className="trend-td-total delta">
                                {formatVN(trendData.summaryRows.delta.total)}
                              </td>
                              <td className="trend-td-avg delta">
                                {formatVN(trendData.summaryRows.delta.average)}
                              </td>
                              <td className="trend-td-trend delta">-</td>
                            </tr>
                          )}

                          {/* 5. CÁC HÀNG CHI TIẾT TỪNG ĐIỂM ĐO */}
                          {displayedTrendRows.length === 0 ? (
                            <tr>
                              <td colSpan={(trendData?.timeColumns?.length || 0) + 6} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                                Không có điểm đo nào khớp với bộ lọc đã chọn.
                              </td>
                            </tr>
                          ) : (
                            displayedTrendRows.map((r: any, idx: number) => (
                              <tr key={r.pointId} className="trend-row-point">
                                <td className="trend-td-sticky trend-col-stt point">
                                  {idx + 1}
                                </td>
                                <td className="trend-td-sticky trend-col-code point">
                                  <strong className="trend-point-code">{r.code}</strong>
                                </td>
                                <td className="trend-td-sticky trend-col-name point">
                                  <div className="trend-point-name">{r.name}</div>
                                  <div className="trend-point-loc">{r.location}</div>
                                </td>

                                {(trendData.timeColumns || []).map((col: any) => {
                                  const val = r.values?.[col.key] || 0;
                                  const isNonZero = val > 0;
                                  return (
                                    <td
                                      key={col.key}
                                      className={`trend-td-cell ${isNonZero ? (r.isSupplyMeter ? 'has-val-supply' : 'has-val-cons') : 'empty'}`}
                                    >
                                      {isNonZero ? formatVN(val) : '-'}
                                    </td>
                                  );
                                })}

                                <td className={`trend-td-total point ${r.isSupplyMeter ? 'supply' : r.isRecycledWater ? 'recycled' : r.isExcludedFromTotal ? 'excluded' : 'cons'}`}>
                                  {formatVN(r.total)}
                                </td>
                                <td className="trend-td-avg point">
                                  {formatVN(r.average)}
                                </td>
                                <td className="trend-td-trend point">
                                  {r.trendPercent > 0 ? (
                                    <span className="trend-badge up" title="Tăng so với mốc trước">
                                      <TrendingUp size={11} /> +{r.trendPercent}%
                                    </span>
                                  ) : r.trendPercent < 0 ? (
                                    <span className="trend-badge down" title="Giảm so với mốc trước">
                                      <TrendingDown size={11} /> {r.trendPercent}%
                                    </span>
                                  ) : (
                                    <span className="trend-badge flat">-</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
  );
};
