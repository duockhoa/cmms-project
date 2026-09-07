import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { RefreshCw, Clock, CheckCircle2, AlertTriangle, QrCode, Search, Camera, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface EquipmentOperationLogsTabProps {
  equipmentId: string;
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
  isVoided: boolean;
  voidReason?: string;
  voidedByName?: string;
  voidedAt?: string;
  logIds: string[];
}

export const EquipmentOperationLogsTab: React.FC<EquipmentOperationLogsTabProps> = ({ equipmentId }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [parameters, setParameters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [voidTargetSession, setVoidTargetSession] = useState<GroupedLogSession | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidSubmitting, setVoidSubmitting] = useState(false);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [logsData, paramsData] = await Promise.all([
        api.getEquipmentLogs(equipmentId),
        api.getEquipmentParameters(equipmentId),
      ]);
      setLogs(Array.isArray(logsData) ? logsData : []);
      setParameters(Array.isArray(paramsData) ? paramsData : []);
    } catch (error) {
      console.error('Lỗi khi tải lịch sử sổ vận hành:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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

  // Group raw logs into Matrix by Timestamp
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

      if (log.notes && !session.notes) {
        session.notes = log.notes;
      }
    });

    return Array.from(sessionMap.values());
  }, [logs]);

  const filteredSessions = useMemo(() => {
    if (!search.trim()) return groupedSessions;
    const term = search.toLowerCase();
    return groupedSessions.filter((s) => {
      const matchTime = new Date(s.recordedAt).toLocaleString('vi-VN').toLowerCase().includes(term);
      const matchUser = s.recordedByName.toLowerCase().includes(term);
      const matchNotes = s.notes.toLowerCase().includes(term);
      const matchReason = (s.voidReason || '').toLowerCase().includes(term);
      return matchTime || matchUser || matchNotes || matchReason;
    });
  }, [groupedSessions, search]);

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} style={{ color: 'var(--accent-blue, #2563eb)' }} />
            Sổ Vận Hành & Nhật Ký Giám Sát Theo Giờ
          </h3>
          <p style={{ fontSize: '12.5px', margin: 0, color: 'var(--text-secondary)' }}>
            Xem lại toàn bộ bảng số liệu đo theo từng phiên ghi nhận / ca làm việc của thiết bị.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '220px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Tìm giờ, người ghi, lý do..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '30px', height: '32px', fontSize: '12px' }}
            />
            <Search size={13} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>

          <button className="btn btn-secondary btn-sm" onClick={fetchData} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Làm mới
          </button>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate(`/equipment/${equipmentId}/operation-log-form`)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
            title="Bắt buộc quét mã QR tại máy để ghi ca"
          >
            <Camera size={13} /> Quét QR ghi ca
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          <RefreshCw size={22} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
          Đang tải nhật ký sổ vận hành...
        </div>
      ) : filteredSessions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', backgroundColor: 'var(--bg-secondary, #ffffff)', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)' }}>
          Chưa có dữ liệu vận hành nào được ghi nhận cho thiết bị này.
        </div>
      ) : (
        <div style={{ overflowX: 'auto', backgroundColor: 'var(--bg-secondary, #ffffff)', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)' }}>
          <table className="custom-table" style={{ width: '100%', whiteSpace: 'nowrap' }}>
            <thead>
              <tr>
                <th style={{ width: '50px', textAlign: 'center' }}>STT</th>
                <th style={{ width: '160px' }}>Thời gian ghi</th>
                <th style={{ width: '150px' }}>Người ghi</th>
                {parameters.map((p) => (
                  <th key={p.id} style={{ textAlign: 'center', minWidth: '110px' }}>
                    <div>{p.name}</div>
                    <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)' }}>
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
                <th style={{ width: '120px', textAlign: 'center' }}>Đánh giá</th>
                <th style={{ minWidth: '150px' }}>Ghi chú / Lý do hủy</th>
                <th style={{ width: '110px', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.map((session, idx) => {
                const hasOutlier = session.outlierCount > 0;
                const dateObj = new Date(session.recordedAt);
                const timeStr = dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const dateStr = dateObj.toLocaleDateString('vi-VN');

                return (
                  <tr
                    key={session.key}
                    style={{
                      backgroundColor: session.isVoided
                        ? '#f8fafc'
                        : hasOutlier
                        ? 'rgba(239, 68, 68, 0.03)'
                        : 'transparent',
                      opacity: session.isVoided ? 0.8 : 1,
                    }}
                  >
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>{idx + 1}</td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: session.isVoided ? '#64748b' : 'var(--text-primary)' }}>{timeStr}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>{dateStr}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--text-primary)' }}>{session.recordedByName}</div>
                    </td>

                    {parameters.map((p) => {
                      const valObj = session.paramValues[p.id];
                      if (!valObj) {
                        return <td key={p.id} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>—</td>;
                      }

                      const isItemVoided = session.isVoided || valObj.isVoided;
                      return (
                        <td key={p.id} style={{ textAlign: 'center' }}>
                          {isItemVoided ? (
                            <span style={{ fontSize: '12.5px', color: '#94a3b8', textDecoration: 'line-through' }} title="Giá trị đã đánh dấu hủy">
                              {valObj.value}
                            </span>
                          ) : valObj.isOutlier ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                backgroundColor: '#fee2e2',
                                color: '#dc2626',
                                fontWeight: 700,
                                fontSize: '12.5px',
                                border: '1px solid #fca5a5',
                              }}
                            >
                              ⚠️ {valObj.value}
                            </span>
                          ) : (
                            <span style={{ fontWeight: 600, fontSize: '13px', color: '#16a34a' }}>
                              {valObj.value}
                            </span>
                          )}
                        </td>
                      );
                    })}

                    <td style={{ textAlign: 'center' }}>
                      {session.isVoided ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, backgroundColor: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1' }}>
                          🚫 Đã hủy
                        </span>
                      ) : hasOutlier ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, backgroundColor: '#fee2e2', color: '#dc2626' }}>
                          <AlertTriangle size={12} /> {session.outlierCount} vượt ngưỡng
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, backgroundColor: '#dcfce7', color: '#16a34a' }}>
                          <CheckCircle2 size={12} /> Đạt chuẩn
                        </span>
                      )}
                    </td>

                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {session.notes && <div>{session.notes}</div>}
                      {session.isVoided && (
                        <div style={{ color: '#be123c', fontSize: '11px', marginTop: '2px', fontWeight: 600 }}>
                          🚫 Hủy bởi {session.voidedByName}: {session.voidReason}
                        </div>
                      )}
                      {!session.notes && !session.isVoided && '—'}
                    </td>

                    <td style={{ textAlign: 'center' }}>
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

      {/* Modal: Xác nhận đánh dấu hủy kết quả sai (GxP Data Integrity Compliant) */}
      {voidTargetSession && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '16px',
          }}
          onClick={() => !voidSubmitting && setVoidTargetSession(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '480px',
              width: '100%',
              padding: '22px 24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ padding: '8px', borderRadius: '50%', backgroundColor: '#ffe4e6', color: '#e11d48' }}>
                <XCircle size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                  Đánh dấu Hủy kết quả sai
                </h3>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Phiên ghi lúc: {new Date(voidTargetSession.recordedAt).toLocaleString('vi-VN')} ({voidTargetSession.recordedByName})
                </div>
              </div>
            </div>

            <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#fffbeb', border: '1px solid #fef3c7', color: '#b45309', fontSize: '12px', lineHeight: 1.5, marginBottom: '16px' }}>
              🛡️ <strong>Lưu ý:</strong> Kết quả sai này sẽ được đánh dấu hủy và lưu lại lịch sử kèm họ tên và lý do bạn nhập.
            </div>

            <form onSubmit={handleVoidSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
                  Lý do hủy kết quả sai <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  className="form-input"
                  rows={3}
                  required
                  placeholder="Ví dụ: Nhập nhầm thang đo áp suất, đọc nhầm đồng hồ, thao tác nhầm thiết bị..."
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  style={{ width: '100%', fontSize: '13px', resize: 'vertical' }}
                />
              </div>

              {/* Quick Reason Suggestion Chips */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginBottom: '6px' }}>Gợi ý nhanh:</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    'Nhập nhầm số liệu',
                    'Đọc nhầm thang đo',
                    'Thiết bị vừa bảo trì chưa reset',
                    'Thao tác nhầm phiên ghi',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setVoidReason(preset)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        backgroundColor: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        color: '#334155',
                        cursor: 'pointer',
                      }}
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={voidSubmitting}
                  onClick={() => setVoidTargetSession(null)}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="btn btn-danger btn-sm"
                  disabled={voidSubmitting || !voidReason.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#e11d48', borderColor: '#e11d48', color: '#ffffff' }}
                >
                  {voidSubmitting ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" /> Đang đánh dấu...
                    </>
                  ) : (
                    <>
                      <XCircle size={14} /> Xác nhận Đánh dấu Hủy
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
