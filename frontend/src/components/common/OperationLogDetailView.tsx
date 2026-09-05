import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  XOctagon, Activity, Clock, CheckCircle2, 
  Search, RefreshCw, ChevronLeft, ChevronRight,
  PlusCircle, LayoutGrid, List, AlertTriangle, FileText, User
} from 'lucide-react';
import { api } from '../../services/api';
import { StatusBadge } from './Badge';

interface EquipmentOperationDetailViewProps {
  equipmentId: string;
  onClose: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

interface GroupedLogSession {
  key: string;
  recordedAt: string;
  recordedByName: string;
  notes: string;
  paramValues: Record<string, { value: number; isOutlier: boolean; unit?: string }>;
  outlierCount: number;
  totalRecorded: number;
}

export const EquipmentOperationDetailView: React.FC<EquipmentOperationDetailViewProps> = ({
  equipmentId,
  onClose,
  isSidebarCollapsed,
  onToggleSidebar,
}) => {
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState<any>(null);
  const [parameters, setParameters] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSearch, setFilterSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OUTLIER' | 'NORMAL'>('ALL');
  const [selectedParamFilter, setSelectedParamFilter] = useState<string>('ALL');
  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});
  
  // Default to cards on mobile, table on desktop
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    return typeof window !== 'undefined' && window.innerWidth <= 768 ? 'cards' : 'table';
  });

  const toggleSessionExpand = (sessionKey: string) => {
    setExpandedSessions((prev) => ({
      ...prev,
      [sessionKey]: !prev[sessionKey],
    }));
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [eqRes, paramRes, logsRes] = await Promise.all([
        api.getEquipmentById(equipmentId),
        api.getEquipmentParameters(equipmentId),
        api.getOperationLogs(equipmentId),
      ]);
      setEquipment(eqRes);
      setParameters(Array.isArray(paramRes) ? paramRes : []);
      setLogs(Array.isArray(logsRes) ? logsRes : []);
    } catch (err: any) {
      console.error('Error fetching operation details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (equipmentId) {
      fetchData();
    }
  }, [equipmentId]);

  // Group raw logs by session (Timestamp & User)
  const groupedSessions = useMemo<GroupedLogSession[]>(() => {
    const sessionMap = new Map<string, GroupedLogSession>();

    const sortedLogs = [...logs].sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    );

    sortedLogs.forEach((log) => {
      const dateObj = new Date(log.recordedAt);
      const timeKey = `${dateObj.toISOString().slice(0, 19)}_${log.recordedById || log.recordedBy?.name || 'unknown'}`;

      if (!sessionMap.has(timeKey)) {
        sessionMap.set(timeKey, {
          key: timeKey,
          recordedAt: log.recordedAt,
          recordedByName: log.recordedBy?.name || 'Kỹ thuật viên',
          notes: log.notes || '',
          paramValues: {},
          outlierCount: 0,
          totalRecorded: 0,
        });
      }

      const session = sessionMap.get(timeKey)!;
      session.paramValues[log.parameterId] = {
        value: log.value,
        isOutlier: log.isOutlier,
        unit: log.parameter?.unit,
      };
      if (log.isOutlier) {
        session.outlierCount += 1;
      }
      session.totalRecorded += 1;
      if (log.notes && !session.notes) {
        session.notes = log.notes;
      }
    });

    return Array.from(sessionMap.values());
  }, [logs]);

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    return groupedSessions.filter((s) => {
      if (filterStatus === 'OUTLIER' && s.outlierCount === 0) return false;
      if (filterStatus === 'NORMAL' && s.outlierCount > 0) return false;
      if (!filterSearch.trim()) return true;
      const term = filterSearch.toLowerCase();
      const matchTime = new Date(s.recordedAt).toLocaleString('vi-VN').toLowerCase().includes(term);
      const matchUser = s.recordedByName.toLowerCase().includes(term);
      const matchNotes = s.notes.toLowerCase().includes(term);
      return matchTime || matchUser || matchNotes;
    });
  }, [groupedSessions, filterSearch, filterStatus]);

  // Parameters to display in Table / Cards (either all or filtered single parameter)
  const displayParameters = useMemo(() => {
    if (selectedParamFilter === 'ALL') {
      return parameters;
    }
    return parameters.filter((p) => p.id === selectedParamFilter);
  }, [parameters, selectedParamFilter]);

  if (loading || !equipment) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        <RefreshCw size={24} className="animate-spin" style={{ marginRight: '8px' }} /> Đang tải Sổ vận hành...
      </div>
    );
  }

  return (
    <div className="op-detail-container">
      {/* Scoped styles for detail view */}
      <style>{`
        .op-detail-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
          background-color: #ffffff;
        }

        /* Sticky Columns for Multi-Parameter Table */
        .sticky-col-stt {
          position: sticky;
          left: 0;
          z-index: 5;
          width: 44px;
          min-width: 44px;
        }

        .sticky-col-time {
          position: sticky;
          left: 44px;
          z-index: 5;
          width: 125px;
          min-width: 125px;
        }

        .sticky-col-user {
          position: sticky;
          left: 169px;
          z-index: 5;
          width: 120px;
          min-width: 120px;
          box-shadow: 3px 0 6px -2px rgba(0, 0, 0, 0.12);
        }

        thead th.sticky-col-stt,
        thead th.sticky-col-time,
        thead th.sticky-col-user {
          z-index: 15;
          background-color: var(--bg-primary, #f8fafc) !important;
        }

        tbody tr td.sticky-col-stt,
        tbody tr td.sticky-col-time,
        tbody tr td.sticky-col-user {
          background-color: #ffffff;
        }

        tbody tr.has-outlier td.sticky-col-stt,
        tbody tr.has-outlier td.sticky-col-time,
        tbody tr.has-outlier td.sticky-col-user {
          background-color: #fff8f8;
        }

        tbody tr:hover td.sticky-col-stt,
        tbody tr:hover td.sticky-col-time,
        tbody tr:hover td.sticky-col-user {
          background-color: #f1f5f9;
        }

        .op-detail-header {
          padding: 12px 18px;
          border-bottom: 1px solid var(--border-color, #e2e8f0);
          background-color: #ffffff;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }

        .op-detail-content {
          display: flex;
          flex-direction: column;
          gap: 10px;
          flex: 1;
          padding: 14px 18px;
          overflow-y: auto;
        }

        .op-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 2px;
        }

        .op-view-toggle {
          display: flex;
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 6px;
          overflow: hidden;
        }

        .op-view-toggle button {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 5px 8px;
          border: none;
          background-color: #ffffff;
          cursor: pointer;
          color: var(--text-secondary);
          transition: all 0.15s ease;
        }

        .op-view-toggle button.active {
          background-color: var(--accent-blue, #2563eb);
          color: #ffffff;
        }

        /* Mobile Card Feed */
        .op-mobile-feed {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .op-session-card {
          background-color: #ffffff;
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 8px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        }

        .op-session-card.has-outlier {
          border-left: 4px solid #ef4444;
          background-color: #fffbfb;
        }

        .op-session-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 8px;
          gap: 8px;
        }

        .op-session-param-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(135px, 1fr));
          gap: 8px;
        }

        .op-param-box {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 6px 8px;
          display: flex;
          flex-direction: column;
        }

        .op-param-box.outlier {
          background-color: #fee2e2;
          border-color: #fca5a5;
        }

        @media (max-width: 768px) {
          .op-detail-header {
            padding: 10px 12px;
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }

          .op-desktop-toggle {
            display: none !important;
          }

          .op-detail-content {
            padding: 10px 8px;
            gap: 8px;
          }

          .op-toolbar {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }

          .op-toolbar-search {
            width: 100% !important;
          }

          .op-toolbar-actions {
            display: flex;
            width: 100%;
            justify-content: space-between;
            align-items: center;
            gap: 6px;
          }

          .op-session-param-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>

      {/* Sleek Compact Header */}
      <div className="op-detail-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="btn btn-secondary btn-sm op-desktop-toggle"
              title={isSidebarCollapsed ? "Hiện danh sách thiết bị" : "Thu gọn danh sách để mở rộng bảng"}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 8px', fontSize: '11.5px' }}
            >
              {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
              {isSidebarCollapsed ? 'Hiện danh sách máy' : 'Toàn màn hình'}
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontWeight: 700,
                fontSize: '11.5px',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                color: '#2563eb',
                padding: '2px 8px',
                borderRadius: '4px',
              }}
            >
              {equipment.code}
            </span>
            <span style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {equipment.name}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '11.5px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
            <span>Xưởng: <strong style={{ color: 'var(--text-primary)' }}>{equipment.location}</strong></span>
            <span>Loại: <strong style={{ color: 'var(--text-primary)' }}>{equipment.category}</strong></span>
            <StatusBadge status={equipment.status} />
          </div>
        </div>

        {/* Quick Action: Ghi số liệu ca cho thiết bị này */}
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => navigate(`/equipment/${equipmentId}/operation-log-form`)}
          style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', padding: '6px 12px', whiteSpace: 'nowrap' }}
        >
          <PlusCircle size={14} /> Ghi số liệu ca
        </button>
      </div>

      {/* Main Content Area */}
      <div className="op-detail-content">
        {/* Logbook Matrix Table Toolbar */}
        <div className="op-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={15} style={{ color: 'var(--accent-blue, #2563eb)' }} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Nhật ký Sổ vận hành ({groupedSessions.length} phiên ghi)
            </span>
          </div>

          <div className="op-toolbar-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search */}
            <div className="op-toolbar-search" style={{ position: 'relative', width: '160px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Tìm ngày, KTV..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                style={{ paddingLeft: '28px', height: '30px', fontSize: '11.5px' }}
              />
              <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>

            {/* Isolate single parameter filter (for multi-parameter devices) */}
            {parameters.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <select
                  className="form-input"
                  value={selectedParamFilter}
                  onChange={(e) => setSelectedParamFilter(e.target.value)}
                  style={{
                    height: '30px',
                    fontSize: '11.5px',
                    padding: '2px 8px',
                    maxWidth: '175px',
                    backgroundColor: selectedParamFilter !== 'ALL' ? '#eff6ff' : '#ffffff',
                    borderColor: selectedParamFilter !== 'ALL' ? '#93c5fd' : 'var(--border-color, #e2e8f0)',
                    color: selectedParamFilter !== 'ALL' ? '#1e40af' : 'inherit',
                    fontWeight: selectedParamFilter !== 'ALL' ? 700 : 'normal',
                  }}
                  title="Lọc xem riêng một thông số hoặc xem tất cả"
                >
                  <option value="ALL">📊 Tất cả ({parameters.length} thông số)</option>
                  {parameters.map((p) => (
                    <option key={p.id} value={p.id}>
                      🔍 {p.name} {p.unit ? `(${p.unit})` : ''}
                    </option>
                  ))}
                </select>
                {selectedParamFilter !== 'ALL' && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setSelectedParamFilter('ALL')}
                    title="Bỏ lọc, hiện tất cả thông số"
                    style={{ padding: '4px 6px', fontSize: '11px', height: '30px' }}
                  >
                    ✕
                  </button>
                )}
              </div>
            )}

            {/* Quick Status Filter Tabs */}
            <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color, #e2e8f0)' }}>
              <button
                type="button"
                onClick={() => setFilterStatus('ALL')}
                style={{
                  padding: '4px 8px',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: filterStatus === 'ALL' ? 'var(--accent-blue, #2563eb)' : '#ffffff',
                  color: filterStatus === 'ALL' ? '#ffffff' : 'var(--text-primary)',
                }}
              >
                Tất cả ({groupedSessions.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('OUTLIER')}
                style={{
                  padding: '4px 8px',
                  border: 'none',
                  borderLeft: '1px solid var(--border-color, #e2e8f0)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: filterStatus === 'OUTLIER' ? '#dc2626' : '#ffffff',
                  color: filterStatus === 'OUTLIER' ? '#ffffff' : '#dc2626',
                }}
              >
                ⚠️ Vượt
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('NORMAL')}
                style={{
                  padding: '4px 8px',
                  border: 'none',
                  borderLeft: '1px solid var(--border-color, #e2e8f0)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: filterStatus === 'NORMAL' ? '#16a34a' : '#ffffff',
                  color: filterStatus === 'NORMAL' ? '#ffffff' : '#16a34a',
                }}
              >
                ✅ Đạt
              </button>
            </div>

            {/* View Mode Toggle: Cards vs Table */}
            <div className="op-view-toggle">
              <button
                type="button"
                className={viewMode === 'cards' ? 'active' : ''}
                onClick={() => setViewMode('cards')}
                title="Dạng thẻ (dễ đọc trên di động)"
              >
                <LayoutGrid size={13} />
              </button>
              <button
                type="button"
                className={viewMode === 'table' ? 'active' : ''}
                onClick={() => setViewMode('table')}
                title="Dạng bảng ma trận"
              >
                <List size={13} />
              </button>
            </div>

            <button
              className="btn btn-secondary btn-sm"
              onClick={fetchData}
              disabled={loading}
              style={{ padding: '4px 8px', fontSize: '11.5px' }}
              title="Làm mới"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Main Logbook Display */}
        {filteredSessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: '12.5px' }}>
            Chưa có bản ghi nào. Người vận hành chỉ cần quét mã QR trên thiết bị để ghi số liệu vận hành.
          </div>
        ) : viewMode === 'cards' ? (
          /* Mobile-Optimized Card Feed */
          <div className="op-mobile-feed">
            {filteredSessions.map((session, idx) => {
              const hasOutlier = session.outlierCount > 0;
              const dateObj = new Date(session.recordedAt);
              const timeFormatted = dateObj.toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });
              const dayFormatted = dateObj.toLocaleDateString('vi-VN');

              // For multi-parameter cards: Prioritize outliers first, then normal params
              const availableParams = displayParameters.filter((p) => session.paramValues[p.id]);
              const outlierList = availableParams.filter((p) => session.paramValues[p.id]?.isOutlier);
              const normalList = availableParams.filter((p) => !session.paramValues[p.id]?.isOutlier);
              const sortedParams = [...outlierList, ...normalList];

              const isExpanded = expandedSessions[session.key];
              const displayList = (isExpanded || sortedParams.length <= 6)
                ? sortedParams
                : sortedParams.slice(0, 6);

              return (
                <div
                  key={session.key}
                  className={`op-session-card ${hasOutlier ? 'has-outlier' : ''}`}
                >
                  <div className="op-session-card-header">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>#{idx + 1}</span>
                        <span style={{ fontWeight: 800, fontSize: '13px', color: '#0f172a' }}>
                          {timeFormatted}
                        </span>
                        <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                          {dayFormatted}
                        </span>
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <User size={11} /> {session.recordedByName}
                      </div>
                    </div>

                    <div>
                      {hasOutlier ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '3px 8px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: '#fee2e2',
                            color: '#dc2626',
                            border: '1px solid #fca5a5',
                          }}
                        >
                          ⚠️ {session.outlierCount} lệch chuẩn
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '3px 8px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: '#dcfce7',
                            color: '#16a34a',
                            border: '1px solid #86efac',
                          }}
                        >
                          <CheckCircle2 size={11} /> Đạt chuẩn
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Parameter Values Grid */}
                  <div className="op-session-param-grid">
                    {displayList.map((p) => {
                      const valObj = session.paramValues[p.id];
                      if (!valObj) return null;
                      return (
                        <div
                          key={p.id}
                          className={`op-param-box ${valObj.isOutlier ? 'outlier' : ''}`}
                        >
                          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {p.name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '2px' }}>
                            <span style={{ fontSize: '15px', fontWeight: 800, color: valObj.isOutlier ? '#dc2626' : '#0f172a' }}>
                              {valObj.value}
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                              {p.unit || ''}
                            </span>
                          </div>
                          <div style={{ fontSize: '10px', color: valObj.isOutlier ? '#b91c1c' : '#64748b', marginTop: '1px' }}>
                            {p.minSpec !== null && p.maxSpec !== null
                              ? `[${p.minSpec}~${p.maxSpec}]`
                              : p.minSpec !== null
                              ? `[≥${p.minSpec}]`
                              : p.maxSpec !== null
                              ? `[≤${p.maxSpec}]`
                              : 'Chuẩn'}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Expand/Collapse Button for sessions with > 6 parameters */}
                  {sortedParams.length > 6 && (
                    <button
                      type="button"
                      onClick={() => toggleSessionExpand(session.key)}
                      style={{
                        padding: '5px 8px',
                        fontSize: '11px',
                        color: '#2563eb',
                        backgroundColor: '#eff6ff',
                        border: '1px dashed #bfdbfe',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        fontWeight: 600,
                        marginTop: '2px',
                      }}
                    >
                      {isExpanded
                        ? '▲ Thu gọn thông số'
                        : `▼ Xem thêm ${sortedParams.length - 6} thông số khác (tổng ${sortedParams.length})`}
                    </button>
                  )}

                  {/* Notes if any */}
                  {session.notes && (
                    <div style={{ fontSize: '11.5px', color: '#475569', backgroundColor: '#f8fafc', padding: '6px 8px', borderRadius: '4px', display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                      <FileText size={12} style={{ marginTop: '2px', flexShrink: 0, color: '#64748b' }} />
                      <span>{session.notes}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Desktop Matrix Table View with Freeze / Sticky Columns */
          <div
            style={{
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '6px',
              overflowX: 'auto',
              backgroundColor: '#ffffff',
            }}
          >
            <table className="custom-table" style={{ margin: 0, width: '100%', whiteSpace: 'nowrap' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-primary, #f8fafc)' }}>
                  <th className="sticky-col-stt" style={{ textAlign: 'center', padding: '8px 6px' }}>STT</th>
                  <th className="sticky-col-time" style={{ padding: '8px 10px' }}>Thời gian ghi</th>
                  <th className="sticky-col-user" style={{ padding: '8px 10px' }}>Người ghi</th>

                  {/* Dynamic parameter columns (filterable) */}
                  {displayParameters.map((p) => (
                    <th key={p.id} style={{ textAlign: 'center', minWidth: '105px', padding: '8px 8px' }}>
                      <div style={{ fontWeight: 700 }}>{p.name}</div>
                      <div style={{ fontSize: '10.5px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                        {p.unit ? `(${p.unit})` : ''}{' '}
                        {p.minSpec !== null && p.maxSpec !== null
                          ? `[${p.minSpec}~${p.maxSpec}]`
                          : p.minSpec !== null
                          ? `[≥${p.minSpec}]`
                          : p.maxSpec !== null
                          ? `[≤${p.maxSpec}]`
                          : ''}
                      </div>
                    </th>
                  ))}

                  <th style={{ width: '105px', textAlign: 'center', padding: '8px 8px' }}>Đánh giá</th>
                  <th style={{ minWidth: '130px', padding: '8px 10px' }}>Ghi chú / Giải trình</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((session, idx) => {
                  const hasOutlier = session.outlierCount > 0;
                  const timeFormatted = new Date(session.recordedAt).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });
                  const dayFormatted = new Date(session.recordedAt).toLocaleDateString('vi-VN');

                  return (
                    <tr
                      key={session.key}
                      className={hasOutlier ? 'has-outlier' : ''}
                      style={{
                        backgroundColor: hasOutlier ? 'rgba(239, 68, 68, 0.03)' : 'transparent',
                      }}
                    >
                      <td className="sticky-col-stt" style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '11.5px', padding: '6px 4px' }}>
                        {idx + 1}
                      </td>
                      <td className="sticky-col-time" style={{ padding: '6px 10px' }}>
                        <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-primary)' }}>
                          {timeFormatted}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {dayFormatted}
                        </div>
                      </td>
                      <td className="sticky-col-user" style={{ padding: '6px 10px' }}>
                        <div style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-primary)' }}>
                          {session.recordedByName}
                        </div>
                      </td>

                      {/* Parameter cells */}
                      {displayParameters.map((p) => {
                        const valObj = session.paramValues[p.id];
                        if (!valObj) {
                          return (
                            <td key={p.id} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '6px 8px' }}>
                              —
                            </td>
                          );
                        }

                        return (
                          <td key={p.id} style={{ textAlign: 'center', padding: '6px 8px' }}>
                            {valObj.isOutlier ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: '#fee2e2',
                                  color: '#dc2626',
                                  fontWeight: 700,
                                  fontSize: '12px',
                                  border: '1px solid #fca5a5',
                                }}
                                title="Giá trị đo vượt ngưỡng tiêu chuẩn!"
                              >
                                ⚠️ {valObj.value}
                              </span>
                            ) : (
                              <span style={{ fontWeight: 600, fontSize: '12px', color: '#16a34a' }}>
                                {valObj.value}
                              </span>
                            )}
                          </td>
                        );
                      })}

                      {/* Evaluation badge */}
                      <td style={{ textAlign: 'center', padding: '6px 8px' }}>
                        {hasOutlier ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                              padding: '2px 6px',
                              borderRadius: '10px',
                              fontSize: '10.5px',
                              fontWeight: 700,
                              backgroundColor: '#fee2e2',
                              color: '#dc2626',
                              border: '1px solid #fca5a5',
                            }}
                          >
                            ⚠️ Lệch chuẩn
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                              padding: '2px 6px',
                              borderRadius: '10px',
                              fontSize: '10.5px',
                              fontWeight: 600,
                              backgroundColor: '#dcfce7',
                              color: '#16a34a',
                              border: '1px solid #86efac',
                            }}
                          >
                            <CheckCircle2 size={11} /> Đạt chuẩn
                          </span>
                        )}
                      </td>

                      {/* Notes / Explanation */}
                      <td style={{ fontSize: '11.5px', color: 'var(--text-secondary)', padding: '6px 10px' }}>
                        {session.notes || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
