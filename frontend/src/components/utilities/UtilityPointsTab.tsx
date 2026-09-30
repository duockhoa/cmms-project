import React from 'react';
import type { UtilitiesPageViewModel } from '../../hooks/useUtilitiesPage';
import {
  Zap, Droplets, Cpu, QrCode, BarChart3, BarChart2, RefreshCw, Plus, Edit2, Trash2,
  Printer, Search, CheckCircle2, Clock, Settings, FileText, ArrowRight, Calendar, PieChart,
  AlertTriangle, Layers, Ban, XCircle, ShieldAlert, Activity, Filter, X, TrendingUp,
  TrendingDown, CalendarDays, ChevronLeft, ChevronRight, Play, Square, CheckSquare,
} from 'lucide-react';
import { ExportButton, KpiCard } from '../common';
import { formatVN } from '../../utils/formatters';

interface UtilityTabProps {
  model: UtilitiesPageViewModel;
}

export const UtilityPointsTab: React.FC<UtilityTabProps> = ({ model }) => {
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
          <div className="card util-section-card">
            <div className="section-card-header">
              <div>
                <h3 className="section-title">
                  <Settings size={18} color="#2563eb" />
                  <span>DANH MỤC ĐIỂM ĐO ĐIỆN, NƯỚC & HỆ THỐNG PHỤ TRỢ</span>
                </h3>
                <p className="section-sub">
                  Quản lý danh sách đồng hồ, hệ số nhân (CT) và in tem QR dán tại hiện trường.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Nút in tem các điểm đo được chọn */}
                {selectedPointIds.size > 0 && (
                  <button
                    onClick={() => handlePrintBatchPoints(true)}
                    disabled={isPrintingPoints}
                    className="btn-secondary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '6px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid #2563eb',
                      backgroundColor: 'var(--bg-secondary)',
                      color: '#2563eb'
                    }}
                    title="Chỉ in tem cho các điểm đo đang được tick chọn"
                  >
                    <CheckSquare size={15} />
                    <span>In Đã Chọn ({selectedPointIds.size})</span>
                  </button>
                )}

                {/* Nút In Toàn Bộ Tất Cả Điểm Đo */}
                <button
                  onClick={() => handlePrintBatchPoints(false)}
                  disabled={isPrintingPoints || points.length === 0}
                  className="btn-secondary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)'
                  }}
                  title="In mã QR cho TOÀN BỘ các điểm đo điện, nước và phụ trợ trên khổ giấy A4"
                >
                  <Printer size={15} color="#2563eb" />
                  <span>
                    {isPrintingPoints ? 'Đang chuẩn bị tem...' : `In Tất Cả QR (${points.length} Điểm Đo)`}
                  </span>
                </button>

                {can('utilities:manage_points') && (
                  <button
                    onClick={handleOpenAddPoint}
                    className="btn-add-point"
                  >
                    <Plus size={16} />
                    <span>Thêm Điểm Đo</span>
                  </button>
                )}
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="desktop-view-container">
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          checked={isAllPointsSelected}
                          onChange={toggleSelectAllPoints}
                          style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                          title="Chọn tất cả điểm đo"
                        />
                      </th>
                      <th style={{ width: '120px' }}>Mã điểm đo</th>
                      <th>Tên đồng hồ / Hệ thống</th>
                      <th>Loại</th>
                      <th>Vị trí lắp đặt</th>
                      <th>Hệ số (CT)</th>
                      <th>Chỉ số gần nhất</th>
                      <th>Mã QR</th>
                      <th style={{ width: '130px', textAlign: 'center' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {points.map((p) => (
                      <tr key={p.id}>
                        <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            checked={selectedPointIds.has(p.id)}
                            onChange={(e) => toggleSelectOnePoint(p.id, e as any)}
                            style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                          />
                        </td>
                        <td style={{ fontWeight: 700, fontSize: '13px' }}>{p.code}</td>
                        <td style={{ fontWeight: 600, fontSize: '13px' }}>{p.name}</td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '4px',
                                backgroundColor: p.type === 'ELECTRICITY' ? '#fef9c3' : p.type === 'WATER' ? '#e0f2fe' : '#f3e8ff',
                                color: p.type === 'ELECTRICITY' ? '#854d0e' : p.type === 'WATER' ? '#0369a1' : '#6b21a8',
                              }}
                            >
                              {p.type === 'ELECTRICITY' ? 'Điện' : p.type === 'WATER' ? 'Nước' : 'Phụ trợ'}
                            </span>
                            {p.isSupplyMeter && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: '#f1f5f9',
                                  color: '#475569',
                                  border: '1px solid #cbd5e1',
                                }}
                              >
                                ĐH Tổng cấp
                              </span>
                            )}
                            {p.isRecycledWater && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: '#ccfbf1',
                                  color: '#0f766e',
                                  border: '1px solid #99f6e4',
                                }}
                              >
                                🔄 Tái sử dụng
                              </span>
                            )}
                            {p.isExcludedFromTotal && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: '#fffbeb',
                                  color: '#b45309',
                                  border: '1px solid #fde68a',
                                }}
                                title="Đồng hồ đo đối chứng / trung gian - Không tính vào Tổng cấp và Không tính vào Tổng dùng"
                              >
                                ⚖️ Đối chứng (Không tính tổng)
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ fontSize: '12.5px', color: '#475569' }}>{p.location}</td>
                        <td style={{ fontSize: '12.5px' }}>x{p.multiplier || 1}</td>
                        <td style={{ fontSize: '13px', fontWeight: 700 }}>
                          {p.type === 'SYSTEM_AUX'
                            ? `${getLiveHourMeter(p).total.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Giờ`
                            : `${p.lastReadingValue?.toLocaleString() || 0} ${p.unit}`}
                        </td>
                        <td>
                          <button
                            onClick={() => setPrintPoint(p)}
                            className="btn-qr-preview"
                          >
                            <QrCode size={13} />
                            <span>In Tem QR</span>
                          </button>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            {can('utilities:manage_points') && (
                              <button
                                onClick={() => handleOpenEditPoint(p)}
                                className="btn-icon-action"
                                title="Chỉnh sửa"
                              >
                                <Edit2 size={14} />
                              </button>
                            )}
                            {can('utilities:delete_point') && (
                              <button
                                onClick={() => handleDeletePoint(p)}
                                className="btn-icon-action danger"
                                title="Xóa điểm đo"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards List View */}
            <div className="mobile-cards-feed">
              {points.map((p) => (
                <div key={p.id} className="card mobile-point-card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 800, fontSize: '13.5px', color: '#0f172a' }}>{p.code}</span>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: p.type === 'ELECTRICITY' ? '#fef9c3' : p.type === 'WATER' ? '#e0f2fe' : '#f3e8ff',
                          color: p.type === 'ELECTRICITY' ? '#854d0e' : p.type === 'WATER' ? '#0369a1' : '#6b21a8',
                        }}
                      >
                        {p.type === 'ELECTRICITY' ? 'Điện' : p.type === 'WATER' ? 'Nước' : 'Phụ trợ'}
                      </span>
                      {p.isSupplyMeter && (
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
                          ĐH Tổng
                        </span>
                      )}
                      {p.isRecycledWater && (
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', backgroundColor: '#ccfbf1', color: '#0f766e', border: '1px solid #99f6e4' }}>
                          🔄 Tái SD
                        </span>
                      )}
                      {p.isExcludedFromTotal && (
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}>
                          ⚖️ Đối chứng
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b', marginBottom: '2px' }}>{p.name}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                    Vị trí: <strong>{p.location}</strong> {p.multiplier > 1 ? `• CT: x${p.multiplier}` : ''}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: '#f8fafc', borderRadius: '6px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '11.5px', color: '#64748b' }}>Chỉ số gần nhất:</span>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                      {p.type === 'SYSTEM_AUX'
                        ? `${getLiveHourMeter(p).total.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Giờ`
                        : `${p.lastReadingValue?.toLocaleString() || 0} ${p.unit}`}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setPrintPoint(p)}
                      className="btn-qr-preview"
                      style={{ flex: 1, justifyContent: 'center', padding: '8px' }}
                    >
                      <QrCode size={15} />
                      <span>In Tem QR</span>
                    </button>
                    <button
                      onClick={() => handleOpenEditPoint(p)}
                      className="btn-icon-action"
                      style={{ width: '36px', height: '36px' }}
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => handleDeletePoint(p)}
                      className="btn-icon-action danger"
                      style={{ width: '36px', height: '36px' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
  );
};
