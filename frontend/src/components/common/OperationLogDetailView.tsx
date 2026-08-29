import React, { useState, useEffect, useMemo } from 'react';
import { 
  XOctagon, FileText, AlertTriangle, Plus, Activity, 
  Clock, CheckCircle2, ShieldAlert, Search, RefreshCw, QrCode, ArrowRight
} from 'lucide-react';
import { api } from '../../services/api';
import { StatusBadge } from './Badge';
import { Modal } from './Modal';
import { useToast } from './Toast';
import { useNavigate } from 'react-router-dom';

interface EquipmentOperationDetailViewProps {
  equipmentId: string;
  onClose: () => void;
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
}) => {
  const [equipment, setEquipment] = useState<any>(null);
  const [parameters, setParameters] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSearch, setFilterSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OUTLIER' | 'NORMAL'>('ALL');
  
  const toast = useToast();
  const navigate = useNavigate();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [formNotes, setFormNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

    // Sort logs descending by recordedAt
    const sortedLogs = [...logs].sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    );

    sortedLogs.forEach((log) => {
      // Group key by exact ISO minute or second timestamp
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

  const handleInputChange = (paramId: string, value: string) => {
    setFormData((prev) => ({ ...prev, [paramId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const submitLogs = Object.keys(formData)
        .map((paramId) => ({
          parameterId: paramId,
          value: Number(formData[paramId]),
          notes: formNotes.trim() || undefined,
        }))
        .filter((log) => !isNaN(log.value));

      if (submitLogs.length === 0) {
        toast.warning('Thiếu dữ liệu', 'Vui lòng nhập ít nhất một thông số hợp lệ.');
        setSubmitting(false);
        return;
      }

      await api.submitOperationLogs(equipmentId, submitLogs);
      toast.success('Thành công', 'Đã lưu thông số vận hành thành công!');

      setFormData({});
      setFormNotes('');
      setIsFormOpen(false);
      fetchData(); // reload
    } catch (error: any) {
      toast.error('Lỗi', error.message || 'Lỗi khi lưu thông số vận hành.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !equipment) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        <RefreshCw size={24} className="animate-spin" style={{ marginRight: '8px' }} /> Đang tải Sổ vận hành...
      </div>
    );
  }

  return (
    <div
      className="request-detail-view"
      style={{
        flex: 1,
        backgroundColor: 'var(--bg-primary, #f8fafc)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Title Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-color, #e2e8f0)',
          backgroundColor: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Sổ Vận Hành & Lịch Sử Giám Sát: <span style={{ color: 'var(--accent-blue, #2563eb)' }}>{equipment.name}</span> ({equipment.code})
          </h2>
        </div>
        <button onClick={onClose} className="btn-icon" title="Đóng bảng">
          <XOctagon size={18} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, padding: '20px', overflowY: 'auto' }}>
        {/* Top Info Banner & Actions */}
        <div
          className="card"
          style={{
            padding: '16px 20px',
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid var(--border-color, #e2e8f0)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '13px' }}>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Mã máy:</span>{' '}
              <strong style={{ color: '#2563eb' }}>{equipment.code}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Vị trí:</span>{' '}
              <strong>{equipment.location}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Phân loại:</span>{' '}
              <strong>{equipment.category}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Trạng thái:</span>
              <StatusBadge status={equipment.status} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigate(`/equipment/${equipment.id}/operation-log-form`)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
            >
              <QrCode size={14} /> Mở Form Quét QR
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setIsFormOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
            >
              <Plus size={15} /> + Nhập thông số mới
            </button>
          </div>
        </div>

        {/* Parameters Reference Strip */}
        <div
          className="card"
          style={{
            padding: '14px 18px',
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid var(--border-color, #e2e8f0)',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={15} style={{ color: 'var(--accent-blue, #2563eb)' }} />
            Các chỉ tiêu vận hành đang theo dõi ({parameters.length})
          </div>

          {parameters.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '12.5px' }}>
              Thiết bị chưa được cấu hình thông số vận hành. Vào <strong>Cài đặt &rarr; Thiết lập thông số máy</strong> để tích chọn.
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {parameters.map((p) => (
                <div
                  key={p.id}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color, #e2e8f0)',
                    backgroundColor: 'var(--bg-primary, #f8fafc)',
                    fontSize: '12px',
                  }}
                >
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}: </span>
                  <span style={{ color: '#2563eb', fontWeight: 700 }}>
                    {p.minSpec !== null && p.maxSpec !== null
                      ? `${p.minSpec} ~ ${p.maxSpec}`
                      : p.minSpec !== null
                      ? `≥ ${p.minSpec}`
                      : p.maxSpec !== null
                      ? `≤ ${p.maxSpec}`
                      : 'Không giới hạn'}
                  </span>{' '}
                  <span style={{ color: 'var(--text-secondary)' }}>{p.unit || ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Logbook Matrix Table (Bảng Sổ Vận Hành theo Giờ ghi nhận) */}
        <div
          className="card"
          style={{
            padding: '18px 20px',
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid var(--border-color, #e2e8f0)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {/* Table Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} style={{ color: 'var(--accent-blue, #2563eb)' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Bảng Nhật Ký Sổ Vận Hành ({groupedSessions.length} phiên ghi)
              </h3>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Search */}
              <div style={{ position: 'relative', width: '220px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Tìm giờ, người ghi..."
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  style={{ paddingLeft: '30px', height: '32px', fontSize: '12px' }}
                />
                <Search size={13} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>

              {/* Status Filter */}
              <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color, #e2e8f0)' }}>
                <button
                  type="button"
                  onClick={() => setFilterStatus('ALL')}
                  style={{
                    padding: '5px 10px',
                    border: 'none',
                    fontSize: '11.5px',
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
                    padding: '5px 10px',
                    border: 'none',
                    borderLeft: '1px solid var(--border-color, #e2e8f0)',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: filterStatus === 'OUTLIER' ? '#dc2626' : '#ffffff',
                    color: filterStatus === 'OUTLIER' ? '#ffffff' : '#dc2626',
                  }}
                >
                  ⚠️ Vượt ngưỡng
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('NORMAL')}
                  style={{
                    padding: '5px 10px',
                    border: 'none',
                    borderLeft: '1px solid var(--border-color, #e2e8f0)',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: filterStatus === 'NORMAL' ? '#16a34a' : '#ffffff',
                    color: filterStatus === 'NORMAL' ? '#ffffff' : '#16a34a',
                  }}
                >
                  ✅ Bình thường
                </button>
              </div>

              <button
                className="btn btn-secondary btn-sm"
                onClick={fetchData}
                disabled={loading}
                style={{ fontSize: '12px' }}
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Matrix Grid Table */}
          {filteredSessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: '13px' }}>
              Chưa có dữ liệu vận hành nào phù hợp. Bấm <strong>"+ Nhập thông số mới"</strong> hoặc quét mã QR để ghi số liệu ca đầu tiên.
            </div>
          ) : (
            <div
              style={{
                border: '1px solid var(--border-color, #e2e8f0)',
                borderRadius: '8px',
                overflowX: 'auto',
                backgroundColor: '#ffffff',
              }}
            >
              <table className="custom-table" style={{ margin: 0, width: '100%', whiteSpace: 'nowrap' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-primary, #f8fafc)' }}>
                    <th style={{ width: '45px', textAlign: 'center' }}>STT</th>
                    <th style={{ minWidth: '160px' }}>Thời gian ghi nhận</th>
                    <th style={{ minWidth: '140px' }}>Người ghi nhận</th>
                    
                    {/* Dynamic Columns for each parameter */}
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

                    <th style={{ width: '130px', textAlign: 'center' }}>Đánh giá</th>
                    <th style={{ minWidth: '160px' }}>Ghi chú / Giải trình</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions.map((session, idx) => {
                    const hasOutlier = session.outlierCount > 0;
                    const dateFormatted = new Date(session.recordedAt).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    });
                    const dayFormatted = new Date(session.recordedAt).toLocaleDateString('vi-VN');

                    return (
                      <tr
                        key={session.key}
                        style={{
                          backgroundColor: hasOutlier ? 'rgba(239, 68, 68, 0.03)' : 'transparent',
                        }}
                      >
                        <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                          {idx + 1}
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
                            {dateFormatted}
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                            {dayFormatted}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--text-primary)' }}>
                            {session.recordedByName}
                          </div>
                        </td>

                        {/* Parameter Values Cells */}
                        {parameters.map((p) => {
                          const valObj = session.paramValues[p.id];
                          if (!valObj) {
                            return (
                              <td key={p.id} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                —
                              </td>
                            );
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
                                  title="Giá trị đo vượt ngưỡng tiêu chuẩn!"
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

                        {/* Status evaluation badge */}
                        <td style={{ textAlign: 'center' }}>
                          {hasOutlier ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 700,
                                backgroundColor: '#fee2e2',
                                color: '#dc2626',
                              }}
                            >
                              <AlertTriangle size={12} /> {session.outlierCount} vượt ngưỡng
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 600,
                                backgroundColor: '#dcfce7',
                                color: '#16a34a',
                              }}
                            >
                              <CheckCircle2 size={12} /> Đạt chuẩn
                            </span>
                          )}
                        </td>

                        {/* Notes */}
                        <td style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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

      {/* Input Form Modal */}
      {isFormOpen && (
        <Modal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          title={`Ghi nhận Thông số Vận hành - ${equipment.code}`}
        >
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '13px' }}>
              Điền các giá trị thực tế đo được theo ca cho máy <strong>{equipment.name}</strong>:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
              {parameters.map((param) => (
                <div key={param.id} className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600 }}>{param.name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                      Chuẩn: {param.minSpec ?? '-'} ~ {param.maxSpec ?? '-'} {param.unit}
                    </span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="number"
                      step="any"
                      className="form-input"
                      placeholder="Nhập giá trị đo..."
                      value={formData[param.id] || ''}
                      onChange={(e) => handleInputChange(param.id, e.target.value)}
                    />
                    <span style={{ color: 'var(--text-secondary)', fontSize: '13px', width: '50px' }}>{param.unit}</span>
                  </div>
                </div>
              ))}

              <div className="form-group" style={{ marginTop: '8px' }}>
                <label className="form-label">Ghi chú / Giải trình (tùy chọn)</label>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="Ghi chú thêm tình trạng vận hành máy..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '16px 0 0 0', marginTop: '16px', borderTop: '1px solid var(--border-color, #e2e8f0)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsFormOpen(false)}>Hủy</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Đang lưu...' : 'Lưu bản ghi'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
