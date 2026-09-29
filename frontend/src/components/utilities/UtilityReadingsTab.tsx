import React from 'react';
import {
  Zap, Droplets, Cpu, QrCode, BarChart3, BarChart2, RefreshCw, Plus, Edit2, Trash2,
  Printer, Search, CheckCircle2, Clock, Settings, FileText, ArrowRight, Calendar, PieChart,
  AlertTriangle, Layers, Ban, XCircle, ShieldAlert, Activity, Filter, X, TrendingUp,
  TrendingDown, CalendarDays, ChevronLeft, ChevronRight, Play, Square, CheckSquare,
} from 'lucide-react';
import { ExportButton, KpiCard } from '../common';
import { formatVN } from '../../utils/formatters';
import { api } from '../../services/api';

interface UtilityTabProps {
  model: Record<string, any>;
}

export const UtilityReadingsTab: React.FC<UtilityTabProps> = ({ model }) => {
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
          {/* Bộ lọc đa năng */}
          <div className="card util-filter-bar">
            <div className="filter-search-box">
              <Search size={16} color="#94a3b8" />
              <input
                type="text"
                placeholder="Tìm mã hoặc tên điểm đo..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="filter-search-input"
              />
            </div>

            {/* Bộ lọc 1: Theo loại điện nước và tổng */}
            <select
              value={filterCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="filter-select"
              style={{ minWidth: '180px', fontWeight: 500 }}
              title="Bộ lọc 1: Phân loại tiện ích & nhóm nguồn"
            >
              <option value="ALL">Tất cả loại & nhóm</option>
              <option value="ELECTRICITY">⚡ Điện năng (kWh)</option>
              <option value="WATER">💧 Nước sạch (m³)</option>
              <option value="SUPPLY">🏢 Nguồn Tổng Cấp</option>
              <option value="CONSUMPTION">🏭 Đo Tiêu Thụ Nội Bộ</option>
              {points.some((p: any) => p.isRecycledWater) && (
                <option value="RECYCLED">♻️ Nước Tái Sử Dụng</option>
              )}
              {points.some((p: any) => p.isExcludedFromTotal) && (
                <option value="EXCLUDED">⚖️ Đo Đối Chứng</option>
              )}
            </select>

            {/* Bộ lọc 2: Chi tiết từng điểm đo theo bộ lọc thứ nhất */}
            <select
              value={filterPointId}
              onChange={(e) => setFilterPointId(e.target.value)}
              className="filter-select"
              style={{ minWidth: '220px', fontWeight: 500 }}
              title="Bộ lọc 2: Chi tiết từng điểm đo theo phân loại trên"
            >
              <option value="ALL">
                {filterCategory === 'ALL'
                  ? `Tất cả điểm đo (${filteredPointsForSelect.length})`
                  : `Tất cả điểm trong nhóm (${filteredPointsForSelect.length})`}
              </option>
              {filteredPointsForSelect.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name} {p.isSupplyMeter ? '★ (Tổng cấp)' : ''}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="filter-select"
              style={{ fontWeight: 600, color: filterStatus === 'VOIDED' ? '#dc2626' : filterStatus === 'ACTIVE' ? '#16a34a' : '#0f172a' }}
            >
              <option value="ACTIVE">Chỉ bản ghi hợp lệ</option>
              <option value="ALL">Tất cả (gồm đã hủy)</option>
              <option value="VOIDED">Chỉ bản ghi đã hủy</option>
            </select>

            {(filterCategory !== 'ALL' || filterPointId !== 'ALL' || filterSearch || filterStatus !== 'ACTIVE') && (
              <button
                onClick={() => {
                  setFilterCategory('ALL');
                  setFilterPointId('ALL');
                  setFilterSearch('');
                  setFilterStatus('ACTIVE');
                }}
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
                title="Đặt lại bộ lọc"
              >
                <X size={13} />
                <span>Đặt lại</span>
              </button>
            )}

            <button
              type="button"
              onClick={async () => {
                try {
                  const res = await api.getUtilityReadings({ limit: 500, includeEvn: true });
                  const list = Array.isArray(res) ? res : (res?.items || []);
                  setReadings(list);
                  toast.success('Đã làm mới', 'Đã tải lại danh sách bản ghi mới nhất.');
                } catch (e: any) {
                  toast.error('Lỗi', 'Không thể tải lại danh sách bản ghi.');
                }
              }}
              style={{
                padding: '7px 12px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s',
              }}
              title="Tải lại danh sách bản ghi mới nhất từ máy chủ"
            >
              <RefreshCw size={13} />
              <span>Làm mới</span>
            </button>

            {can('utilities:recalculate') && (
              <button
                type="button"
                onClick={handleRecalculateAll}
                disabled={recalculating}
                style={{
                  padding: '7px 12px',
                  borderRadius: '6px',
                  border: '1px solid #c7d2fe',
                  backgroundColor: recalculating ? '#e0e7ff' : '#eef2ff',
                  color: '#4338ca',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: recalculating ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.15s',
                }}
                title="Rà soát toàn bộ lịch sử và tự động tính lại chỉ số trước và sản lượng tiêu thụ chuẩn xác theo hệ số nhân"
              >
                <RefreshCw size={13} className={recalculating ? 'animate-spin' : ''} />
                <span>{recalculating ? 'Đang chuẩn hóa...' : 'Tính Lại Sản Lượng'}</span>
              </button>
            )}

            {can('utilities:export') && (
              <ExportButton
                onExport={handleExportReadingsCSV}
                className="btn-export-csv"
                label="Xuất Excel / CSV"
              />
            )}
          </div>

          {/* DUAL-VIEW: 1) DESKTOP TABLE VIEW */}
          <div className="desktop-view-container card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Điểm đo / Đồng hồ</th>
                    <th>Vị trí</th>
                    <th>Chỉ số trước</th>
                    <th>Chỉ số mới</th>
                    <th>Tiêu thụ (Δ)</th>
                    <th>Người ghi</th>
                    <th>Trạng thái & Ghi chú</th>
                    <th style={{ textAlign: 'center', width: '100px' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReadings.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                        Chưa có bản ghi số điện/nước nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredReadings.map((r) => {
                      const isVoided = Boolean(r.isVoided);
                      return (
                        <tr
                          key={r.id}
                          style={{
                            backgroundColor: isVoided ? '#fef2f2' : undefined,
                            opacity: isVoided ? 0.78 : 1,
                          }}
                        >
                          <td style={{ fontSize: '12.5px', whiteSpace: 'nowrap', textDecoration: isVoided ? 'line-through' : undefined }}>
                            {new Date(r.recordedAt).toLocaleString('vi-VN', {
                              hour: '2-digit', minute: '2-digit',
                              day: '2-digit', month: '2-digit', year: 'numeric',
                            })}
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {r.point?.type === 'ELECTRICITY' ? <Zap size={14} color="#eab308" /> : <Droplets size={14} color="#0ea5e9" />}
                              <span style={{ textDecoration: isVoided ? 'line-through' : undefined }}>{r.point?.name}</span>
                            </div>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>{r.point?.code}</span>
                          </td>
                          <td style={{ fontSize: '12px', color: '#475569' }}>{r.point?.location}</td>
                          <td style={{ fontSize: '12.5px', color: '#64748b', textDecoration: isVoided ? 'line-through' : undefined }}>
                            {r.previousValue?.toLocaleString()} {r.point?.unit}
                          </td>
                          <td style={{ fontSize: '13px', fontWeight: 700, color: isVoided ? '#dc2626' : '#0f172a', textDecoration: isVoided ? 'line-through' : undefined }}>
                            {r.readingValue?.toLocaleString()} {r.point?.unit}
                          </td>
                          <td>
                            {isVoided ? (
                              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#fee2e2', color: '#dc2626', fontWeight: 700 }}>
                                ĐÃ HỦY (KHÔNG TÍNH)
                              </span>
                            ) : (
                              <span className="delta-badge-table">
                                +{(r.consumption ?? r.consumptionDelta ?? ((r.readingValue || 0) - (r.previousValue || 0)))?.toLocaleString()} {r.point?.unit}
                              </span>
                            )}
                          </td>
                          <td style={{ fontSize: '12.5px' }}>{r.recordedByName || r.recordedByUser?.name || r.recordedBy?.name || '---'}</td>
                          <td style={{ fontSize: '12px', color: '#64748b', maxWidth: '220px' }}>
                            {isVoided ? (
                              <div>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontWeight: 700, fontSize: '11.5px' }}>
                                  <Ban size={12} /> Đã hủy kết quả
                                </span>
                                {r.voidReason && (
                                  <div style={{ color: '#991b1b', fontSize: '11px', marginTop: '2px' }}>
                                    Lý do: <em>{r.voidReason}</em>
                                  </div>
                                )}
                                {r.voidedByName && (
                                  <div style={{ color: '#6b7280', fontSize: '10.5px' }}>
                                    Bởi: {r.voidedByName}
                                  </div>
                                )}
                              </div>
                            ) : (
                              r.notes || '---'
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {!isVoided ? (
                              <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                                {can('utilities:edit_reading') && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditReading(r)}
                                    className="btn btn-sm"
                                    style={{
                                      padding: '4px 8px',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      color: '#2563eb',
                                      backgroundColor: '#eff6ff',
                                      border: '1px solid #bfdbfe',
                                      borderRadius: '4px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      cursor: 'pointer',
                                    }}
                                    title="Chỉnh sửa bản ghi chỉ số"
                                  >
                                    <Edit2 size={12} /> Sửa
                                  </button>
                                )}
                                {can('utilities:void_reading') && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setVoidModalReading(r);
                                      setVoidReason('');
                                    }}
                                    className="btn btn-sm"
                                    style={{
                                      padding: '4px 8px',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      color: '#dc2626',
                                      backgroundColor: '#fef2f2',
                                      border: '1px solid #fecaca',
                                      borderRadius: '4px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      cursor: 'pointer',
                                    }}
                                    title="Đánh dấu hủy kết quả ghi sai này (giữ nguyên nhật ký kiểm toán)"
                                  >
                                    <Ban size={12} /> Hủy số sai
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#9ca3af', fontStyle: 'italic' }}>
                                Đã lưu vết
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* DUAL-VIEW: 2) MOBILE CARD FEED VIEW */}
          <div className="mobile-cards-feed">
            {filteredReadings.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                Chưa có bản ghi số điện/nước nào.
              </div>
            ) : (
              filteredReadings.map((r) => {
                const isVoided = Boolean(r.isVoided);
                return (
                  <div
                    key={r.id}
                    className="card mobile-log-card"
                    style={{
                      backgroundColor: isVoided ? '#fef2f2' : undefined,
                      borderColor: isVoided ? '#fca5a5' : undefined,
                      opacity: isVoided ? 0.82 : 1,
                    }}
                  >
                    <div className="mobile-log-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
                        {r.point?.type === 'ELECTRICITY' ? <Zap size={16} color="#eab308" /> : <Droplets size={16} color="#0ea5e9" />}
                        <span className="mobile-log-point-name" style={{ textDecoration: isVoided ? 'line-through' : undefined }}>{r.point?.name}</span>
                      </div>
                      <span className="log-time-badge">
                        {new Date(r.recordedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                      </span>
                    </div>

                    <div className="mobile-log-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{r.point?.code} • {r.point?.location}</span>
                      {isVoided && (
                        <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#dc2626', backgroundColor: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>
                          ĐÃ HỦY
                        </span>
                      )}
                    </div>

                    <div className="mobile-log-values-row">
                      <div className="mobile-val-box">
                        <span className="val-lbl">Số cũ</span>
                        <span className="val-txt" style={{ textDecoration: isVoided ? 'line-through' : undefined }}>{r.previousValue?.toLocaleString()}</span>
                      </div>
                      <ArrowRight size={14} color="#94a3b8" />
                      <div className="mobile-val-box">
                        <span className="val-lbl">Số mới</span>
                        <span className="val-txt new" style={{ color: isVoided ? '#dc2626' : undefined, textDecoration: isVoided ? 'line-through' : undefined }}>{r.readingValue?.toLocaleString()}</span>
                      </div>
                      <div className="mobile-val-delta">
                        <span className="val-lbl">Tiêu thụ</span>
                        <span className="val-txt-delta" style={{ textDecoration: isVoided ? 'line-through' : undefined }}>
                          +{(r.consumption ?? r.consumptionDelta ?? ((r.readingValue || 0) - (r.previousValue || 0)))?.toLocaleString()} {r.point?.unit}
                        </span>
                      </div>
                    </div>

                    {isVoided && r.voidReason && (
                      <div style={{ padding: '6px 8px', borderRadius: '4px', backgroundColor: '#fee2e2', color: '#991b1b', fontSize: '11.5px', marginBottom: '8px' }}>
                        <strong>Lý do hủy:</strong> {r.voidReason} (bởi: {r.voidedByName || 'KTV'})
                      </div>
                    )}

                    <div className="mobile-log-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        {(r.recordedByName || r.recordedByUser?.name || r.recordedBy?.name) && (
                          <span>KTV: <strong>{r.recordedByName || r.recordedByUser?.name || r.recordedBy?.name}</strong></span>
                        )}
                        {r.notes && !isVoided && <span style={{ color: '#64748b' }}>• {r.notes}</span>}
                      </div>

                      {!isVoided && (
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          {can('utilities:edit_reading') && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditReading(r)}
                              style={{
                                padding: '4px 8px',
                                fontSize: '11px',
                                fontWeight: 600,
                                color: '#2563eb',
                                backgroundColor: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                borderRadius: '4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                cursor: 'pointer',
                              }}
                            >
                              <Edit2 size={12} /> Sửa
                            </button>
                          )}
                          {can('utilities:void_reading') && (
                            <button
                              type="button"
                              onClick={() => {
                                setVoidModalReading(r);
                                setVoidReason('');
                              }}
                              style={{
                                padding: '4px 8px',
                                fontSize: '11px',
                                fontWeight: 600,
                                color: '#dc2626',
                                backgroundColor: '#ffffff',
                                border: '1px solid #fecaca',
                                borderRadius: '4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                cursor: 'pointer',
                              }}
                            >
                              <Ban size={12} /> Hủy sai
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
  );
};
