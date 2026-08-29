import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { RefreshCw, Clock, CheckCircle2, AlertTriangle, QrCode, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface EquipmentOperationLogsTabProps {
  equipmentId: string;
}

interface GroupedLogSession {
  key: string;
  recordedAt: string;
  recordedByName: string;
  notes: string;
  paramValues: Record<string, { value: number; isOutlier: boolean; unit?: string }>;
  outlierCount: number;
}

export const EquipmentOperationLogsTab: React.FC<EquipmentOperationLogsTabProps> = ({ equipmentId }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [parameters, setParameters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
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
      return matchTime || matchUser || matchNotes;
    });
  }, [groupedSessions, search]);

  return (
    <div style={{ padding: '16px 0' }}>
      {/* Header */}
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
              placeholder="Tìm giờ, người ghi..."
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
          >
            <QrCode size={13} /> Nhập số liệu mới
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
        <div style={{ border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px', overflowX: 'auto', backgroundColor: '#ffffff' }}>
          <table className="custom-table" style={{ margin: 0, width: '100%', whiteSpace: 'nowrap' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-primary, #f8fafc)' }}>
                <th style={{ width: '45px', textAlign: 'center' }}>STT</th>
                <th style={{ minWidth: '160px' }}>Thời gian ghi nhận</th>
                <th style={{ minWidth: '140px' }}>Người ghi nhận</th>
                {parameters.map((p) => (
                  <th key={p.id} style={{ textAlign: 'center', minWidth: '130px' }}>
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
                <th style={{ minWidth: '150px' }}>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.map((session, idx) => {
                const hasOutlier = session.outlierCount > 0;
                const timeStr = new Date(session.recordedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const dateStr = new Date(session.recordedAt).toLocaleDateString('vi-VN');

                return (
                  <tr key={session.key} style={{ backgroundColor: hasOutlier ? 'rgba(239, 68, 68, 0.03)' : 'transparent' }}>
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>{idx + 1}</td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>{timeStr}</div>
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

                      return (
                        <td key={p.id} style={{ textAlign: 'center' }}>
                          {valObj.isOutlier ? (
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
                      {hasOutlier ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, backgroundColor: '#fee2e2', color: '#dc2626' }}>
                          <AlertTriangle size={12} /> {session.outlierCount} vượt ngưỡng
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, backgroundColor: '#dcfce7', color: '#16a34a' }}>
                          <CheckCircle2 size={12} /> Đạt chuẩn
                        </span>
                      )}
                    </td>

                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{session.notes || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
