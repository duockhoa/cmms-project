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

export const UtilityStatusLogsTab: React.FC<UtilityTabProps> = ({ model }) => {
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
          {/* Desktop Table View */}
          <div className="desktop-view-container card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Hệ thống</th>
                    <th>Vị trí</th>
                    <th>Trạng thái mới</th>
                    <th>Đồng hồ giờ chạy</th>
                    <th>Giờ tăng thêm (Δ)</th>
                    <th>Lý do / Mô tả</th>
                    <th>Kỹ thuật viên</th>
                  </tr>
                </thead>
                <tbody>
                  {statusLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                        Chưa có lịch sử chuyển đổi trạng thái nào.
                      </td>
                    </tr>
                  ) : (
                    statusLogs.map((log) => {
                      const color =
                        log.status === 'RUNNING' ? '#16a34a' : log.status === 'OFF' ? '#64748b' : log.status === 'STANDBY' ? '#ea580c' : '#dc2626';
                      const bg =
                        log.status === 'RUNNING' ? '#f0fdf4' : log.status === 'OFF' ? '#f8fafc' : log.status === 'STANDBY' ? '#fff7ed' : '#fef2f2';

                      return (
                        <tr key={log.id}>
                          <td style={{ fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                            {new Date(log.recordedAt).toLocaleString('vi-VN')}
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, fontSize: '13px' }}>{log.point?.name}</div>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>{log.point?.code}</span>
                          </td>
                          <td style={{ fontSize: '12px', color: '#475569' }}>{log.point?.location}</td>
                          <td>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                backgroundColor: bg,
                                color: color,
                                border: `1px solid ${color}`,
                              }}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td style={{ fontSize: '13px', fontWeight: 600 }}>
                            {log.runningHours ? `${log.runningHours.toLocaleString()} h` : '---'}
                          </td>
                          <td>
                            {log.runningDelta ? (
                              <span style={{ fontWeight: 700, color: '#16a34a', fontSize: '12.5px' }}>
                                +{log.runningDelta.toLocaleString()} h
                              </span>
                            ) : (
                              '---'
                            )}
                          </td>
                          <td style={{ fontSize: '12.5px', color: '#475569', maxWidth: '240px' }}>
                            {log.reason || '---'}
                          </td>
                          <td style={{ fontSize: '12.5px' }}>{log.recordedByName || log.recordedByUser?.name || log.recordedBy?.name || '---'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Feed View */}
          <div className="mobile-cards-feed">
            {statusLogs.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                Chưa có lịch sử bật/tắt nào.
              </div>
            ) : (
              statusLogs.map((log) => {
                const color =
                  log.status === 'RUNNING' ? '#16a34a' : log.status === 'OFF' ? '#64748b' : log.status === 'STANDBY' ? '#ea580c' : '#dc2626';
                const bg =
                  log.status === 'RUNNING' ? '#f0fdf4' : log.status === 'OFF' ? '#f8fafc' : log.status === 'STANDBY' ? '#fff7ed' : '#fef2f2';

                return (
                  <div key={log.id} className="card mobile-log-card">
                    <div className="mobile-log-header">
                      <span className="mobile-log-point-name">{log.point?.name}</span>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: bg,
                          color: color,
                          border: `1px solid ${color}`,
                        }}
                      >
                        {log.status}
                      </span>
                    </div>

                    <div className="mobile-log-meta">
                      <span>{log.point?.code} • {log.point?.location}</span>
                      <span>{new Date(log.recordedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: '#f8fafc', borderRadius: '6px', margin: '8px 0' }}>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>Đồng hồ: <strong>{log.runningHours ? `${log.runningHours.toLocaleString()} h` : '---'}</strong></span>
                      {log.runningDelta && (
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a' }}>
                          Tăng: +{log.runningDelta} h
                        </span>
                      )}
                    </div>

                    {log.reason && (
                      <div style={{ fontSize: '12px', color: '#334155', marginTop: '4px' }}>
                        Lý do: <em>"{log.reason}"</em>
                      </div>
                    )}

                    <div className="mobile-log-footer" style={{ marginTop: '8px' }}>
                      <span>KTV: <strong>{log.recordedByName || log.recordedByUser?.name || log.recordedBy?.name || '---'}</strong></span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
  );
};
