import React, { useState, useEffect, useMemo } from 'react';
import '../operation-logs/detail/OperationLogDetailView.css';
import { OperationLogVoidModal } from '../operation-logs/detail/OperationLogVoidModal';
import { useNavigate } from 'react-router-dom';
import { 
  XOctagon, Activity, Clock, CheckCircle2, 
  Search, RefreshCw, ChevronLeft, ChevronRight,
  PlusCircle, LayoutGrid, List, AlertTriangle, FileText, User,
  Camera, QrCode, XCircle, Ban
} from 'lucide-react';
import { api } from '../../services/api';
import { StatusBadge } from './Badge';
import { DetailViewSkeleton } from './Skeleton';

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
  paramValues: Record<string, {
    id: string;
    value: number;
    isOutlier: boolean;
    unit?: string;
    isVoided?: boolean;
    voidReason?: string;
    voidedByName?: string;
    voidedAt?: string;
  }>;
  outlierCount: number;
  totalRecorded: number;
  isVoided: boolean;
  voidReason?: string;
  voidedByName?: string;
  voidedAt?: string;
  logIds: string[];
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
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OUTLIER' | 'NORMAL' | 'VOIDED'>('ALL');
  const [selectedParamFilter, setSelectedParamFilter] = useState<string>('ALL');
  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});
  
  // Void modal state
  const [voidTargetSession, setVoidTargetSession] = useState<GroupedLogSession | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidSubmitting, setVoidSubmitting] = useState(false);
  
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

  const handleVoidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidTargetSession) return;
    if (!voidReason.trim() || voidReason.trim().length < 3) {
      alert('Vui lòng nhập lý do hủy kết quả sai (tối thiểu 3 ký tự).');
      return;
    }

    try {
      setVoidSubmitting(true);
      await api.voidOperationLogSession(equipmentId, {
        logIds: voidTargetSession.logIds,
        recordedAt: voidTargetSession.recordedAt,
        reason: voidReason.trim(),
      });
      await fetchData();
      setVoidTargetSession(null);
      setVoidReason('');
    } catch (error: any) {
      alert(error.message || 'Lỗi khi đánh dấu hủy kết quả.');
    } finally {
      setVoidSubmitting(false);
    }
  };

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
          isVoided: Boolean(log.isVoided),
          voidReason: log.voidReason || '',
          voidedByName: log.voidedBy?.name || '',
          voidedAt: log.voidedAt || '',
          logIds: [],
        });
      }

      const session = sessionMap.get(timeKey)!;
      session.logIds.push(log.id);
      session.paramValues[log.parameterId] = {
        id: log.id,
        value: log.value,
        isOutlier: log.isOutlier,
        unit: log.parameter?.unit,
        isVoided: Boolean(log.isVoided),
        voidReason: log.voidReason,
        voidedByName: log.voidedBy?.name,
        voidedAt: log.voidedAt,
      };

      if (log.isVoided) {
        session.isVoided = true;
        if (!session.voidReason && log.voidReason) session.voidReason = log.voidReason;
        if (!session.voidedByName && log.voidedBy?.name) session.voidedByName = log.voidedBy.name;
        if (!session.voidedAt && log.voidedAt) session.voidedAt = log.voidedAt;
      } else {
        if (log.isOutlier) {
          session.outlierCount += 1;
        }
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
      if (filterStatus === 'OUTLIER' && (s.isVoided || s.outlierCount === 0)) return false;
      if (filterStatus === 'NORMAL' && (s.isVoided || s.outlierCount > 0)) return false;
      if (filterStatus === 'VOIDED' && !s.isVoided) return false;
      if (!filterSearch.trim()) return true;
      const term = filterSearch.toLowerCase();
      const matchTime = new Date(s.recordedAt).toLocaleString('vi-VN').toLowerCase().includes(term);
      const matchUser = s.recordedByName.toLowerCase().includes(term);
      const matchNotes = s.notes.toLowerCase().includes(term);
      const matchReason = (s.voidReason || '').toLowerCase().includes(term);
      return matchTime || matchUser || matchNotes || matchReason;
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
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        <DetailViewSkeleton />
      </div>
    );
  }

  return (
    <div className="op-detail-container">

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
                ✅ Đạt ({groupedSessions.filter(s => !s.isVoided && s.outlierCount === 0).length})
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
                ⚠️ Vượt ({groupedSessions.filter(s => !s.isVoided && s.outlierCount > 0).length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('VOIDED')}
                style={{
                  padding: '4px 8px',
                  border: 'none',
                  borderLeft: '1px solid var(--border-color, #e2e8f0)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: filterStatus === 'VOIDED' ? '#e11d48' : '#ffffff',
                  color: filterStatus === 'VOIDED' ? '#ffffff' : '#e11d48',
                }}
              >
                🚫 Đã hủy ({groupedSessions.filter(s => s.isVoided).length})
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
                  className={`op-session-card ${session.isVoided ? 'is-voided' : hasOutlier ? 'has-outlier' : ''}`}
                >
                  <div className="op-session-card-header">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>#{idx + 1}</span>
                        <span style={{ fontWeight: 800, fontSize: '13px', color: session.isVoided ? '#64748b' : '#0f172a' }}>
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

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      {session.isVoided ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '3px 8px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: '#f1f5f9',
                            color: '#64748b',
                            border: '1px solid #cbd5e1',
                          }}
                        >
                          🚫 Đã hủy (Sai số liệu)
                        </span>
                      ) : hasOutlier ? (
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

                      {/* Action buttons: Báo sai / Hủy or Nhập lại */}
                      {session.isVoided ? (
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => navigate(`/equipment/${equipmentId}/operation-log-form`)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            fontSize: '11px',
                            borderRadius: '6px',
                            backgroundColor: '#eff6ff',
                            color: '#2563eb',
                            border: '1px solid #bfdbfe',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                          title="Quét QR tại máy để ghi nhận lại số liệu chuẩn xác thay thế"
                        >
                          <Camera size={12} /> + Nhập lại đúng
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => {
                            setVoidTargetSession(session);
                            setVoidReason('');
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            fontSize: '11px',
                            borderRadius: '6px',
                            backgroundColor: '#fff1f2',
                            color: '#e11d48',
                            border: '1px solid #fecdd3',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                          title="Đánh dấu hủy kết quả sai (dữ liệu được giữ nguyên và lưu vết lý do trong nhật ký kiểm toán)"
                        >
                          <XCircle size={12} /> Báo sai / Hủy
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Parameter Values Grid */}
                  <div className="op-session-param-grid">
                    {displayList.map((p) => {
                      const valObj = session.paramValues[p.id];
                      if (!valObj) return null;
                      const isItemVoided = session.isVoided || valObj.isVoided;
                      return (
                        <div
                          key={p.id}
                          className={`op-param-box ${isItemVoided ? 'voided' : valObj.isOutlier ? 'outlier' : ''}`}
                        >
                          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {p.name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '2px' }}>
                            <span
                              style={{
                                fontSize: '15px',
                                fontWeight: 800,
                                textDecoration: isItemVoided ? 'line-through' : 'none',
                                color: isItemVoided
                                  ? '#94a3b8'
                                  : valObj.isOutlier
                                  ? '#dc2626'
                                  : '#0f172a',
                              }}
                            >
                              {valObj.value}
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                              {p.unit || ''}
                            </span>
                          </div>
                          <div style={{ fontSize: '10px', color: isItemVoided ? '#94a3b8' : valObj.isOutlier ? '#b91c1c' : '#64748b', marginTop: '1px' }}>
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

                  {/* Audit Trail Banner for Voided Session */}
                  {session.isVoided && (
                    <div
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        backgroundColor: '#fff1f2',
                        border: '1px solid #fecdd3',
                        fontSize: '11.5px',
                        color: '#9f1239',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700 }}>
                        <XCircle size={13} />
                        <span>Kết quả đã đánh dấu hủy:</span>
                      </div>
                      <div style={{ marginTop: '2px' }}>
                        <strong>Lý do ghi sai:</strong> {session.voidReason || 'Kỹ thuật viên báo sai số liệu'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#be123c', marginTop: '1px' }}>
                        Hủy bởi: <strong>{session.voidedByName || 'Kỹ thuật viên'}</strong> • Lúc: {session.voidedAt ? new Date(session.voidedAt).toLocaleString('vi-VN') : 'Mới đây'}
                      </div>
                    </div>
                  )}

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

                  <th style={{ width: '115px', textAlign: 'center', padding: '8px 8px' }}>Đánh giá</th>
                  <th style={{ minWidth: '140px', padding: '8px 10px' }}>Ghi chú / Lý do hủy</th>
                  <th style={{ width: '120px', textAlign: 'center', padding: '8px 8px' }}>Thao tác</th>
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
                      className={session.isVoided ? 'is-voided' : hasOutlier ? 'has-outlier' : ''}
                      style={{
                        backgroundColor: session.isVoided
                          ? '#f8fafc'
                          : hasOutlier
                          ? 'rgba(239, 68, 68, 0.03)'
                          : 'transparent',
                        opacity: session.isVoided ? 0.8 : 1,
                      }}
                    >
                      <td className="sticky-col-stt" style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '11.5px', padding: '6px 4px' }}>
                        {idx + 1}
                      </td>
                      <td className="sticky-col-time" style={{ padding: '6px 10px' }}>
                        <div style={{ fontWeight: 700, fontSize: '12px', color: session.isVoided ? '#64748b' : 'var(--text-primary)' }}>
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

                        const isItemVoided = session.isVoided || valObj.isVoided;
                        return (
                          <td key={p.id} style={{ textAlign: 'center', padding: '6px 8px' }}>
                            {isItemVoided ? (
                              <span style={{ fontSize: '12px', color: '#94a3b8', textDecoration: 'line-through' }} title="Giá trị đã đánh dấu hủy">
                                {valObj.value}
                              </span>
                            ) : valObj.isOutlier ? (
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
                        {session.isVoided ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                              padding: '2px 6px',
                              borderRadius: '10px',
                              fontSize: '10.5px',
                              fontWeight: 700,
                              backgroundColor: '#f1f5f9',
                              color: '#64748b',
                              border: '1px solid #cbd5e1',
                            }}
                          >
                            🚫 Đã hủy
                          </span>
                        ) : hasOutlier ? (
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

                      {/* Notes / Explanation & Audit Trail */}
                      <td style={{ fontSize: '11.5px', color: 'var(--text-secondary)', padding: '6px 10px' }}>
                        {session.notes && <div>{session.notes}</div>}
                        {session.isVoided && (
                          <div style={{ color: '#be123c', fontSize: '11px', marginTop: '2px', fontWeight: 600 }}>
                            🚫 Hủy bởi {session.voidedByName}: {session.voidReason}
                          </div>
                        )}
                        {!session.notes && !session.isVoided && '—'}
                      </td>

                      {/* Actions Column */}
                      <td style={{ textAlign: 'center', padding: '6px 8px' }}>
                        {session.isVoided ? (
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => navigate(`/equipment/${equipmentId}/operation-log-form`)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '2px 6px',
                              fontSize: '11px',
                              borderRadius: '4px',
                              backgroundColor: '#eff6ff',
                              color: '#2563eb',
                              border: '1px solid #bfdbfe',
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                            title="Quét QR tại máy để ghi nhận lại số liệu đúng"
                          >
                            <Camera size={11} /> Nhập lại
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => {
                              setVoidTargetSession(session);
                              setVoidReason('');
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '2px 6px',
                              fontSize: '11px',
                              borderRadius: '4px',
                              backgroundColor: '#fff1f2',
                              color: '#e11d48',
                              border: '1px solid #fecdd3',
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                            title="Đánh dấu hủy kết quả sai (kết quả vẫn được lưu vết kiểm toán)"
                          >
                            <XCircle size={11} /> Báo sai
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <OperationLogVoidModal
        handleVoidSubmit={handleVoidSubmit}
        setVoidReason={setVoidReason}
        setVoidTargetSession={setVoidTargetSession}
        voidReason={voidReason}
        voidSubmitting={voidSubmitting}
        voidTargetSession={voidTargetSession}
      />
    </div>
  );
};
