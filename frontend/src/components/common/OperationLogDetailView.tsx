import React, { useState, useEffect, useMemo } from 'react';
import { 
  XOctagon, Plus, Activity, Clock, CheckCircle2, 
  Search, RefreshCw, QrCode, Maximize2, Minimize2, ChevronLeft, ChevronRight, Sliders
} from 'lucide-react';
import { api } from '../../services/api';
import { StatusBadge } from './Badge';
import { Modal } from './Modal';
import { useToast } from './Toast';
import { useNavigate } from 'react-router-dom';

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
      fetchData();
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Sleek Compact Header */}
      <div
        style={{
          padding: '12px 18px',
          borderBottom: '1px solid var(--border-color, #e2e8f0)',
          backgroundColor: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="btn btn-secondary btn-sm"
              title={isSidebarCollapsed ? "Hiện danh sách thiết bị" : "Thu gọn danh sách để mở rộng bảng"}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 8px', fontSize: '11.5px' }}
            >
              {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
              {isSidebarCollapsed ? 'Hiện danh sách máy' : 'Toàn màn hình'}
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontWeight: 700,
                fontSize: '12px',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                color: '#2563eb',
                padding: '2px 8px',
                borderRadius: '4px',
              }}
            >
              {equipment.code}
            </span>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {equipment.name}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <span>Xưởng: <strong style={{ color: 'var(--text-primary)' }}>{equipment.location}</strong></span>
            <span>Phân loại: <strong style={{ color: 'var(--text-primary)' }}>{equipment.category}</strong></span>
            <StatusBadge status={equipment.status} />
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate(`/equipment/${equipment.id}/operation-log-form`)}
            title="Mở form nhập số liệu (quét QR)"
            style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}
          >
            <QrCode size={13} /> Form Quét QR
          </button>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => setIsFormOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}
          >
            <Plus size={14} /> + Nhập ca mới
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, padding: '14px 18px', overflowY: 'auto' }}>
        {/* Compact Monitored Parameters Strip */}
        <div
          style={{
            padding: '8px 14px',
            backgroundColor: 'var(--bg-primary, #f8fafc)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
            <Activity size={14} style={{ color: 'var(--accent-blue, #2563eb)' }} />
            Chỉ tiêu theo dõi ({parameters.length}):
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', flex: 1 }}>
            {parameters.length === 0 ? (
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Chưa gán tham số vận hành. Vào <strong>Cài đặt &rarr; Thiết lập thông số máy</strong> để tích chọn.
              </span>
            ) : (
              parameters.map((p) => (
                <span
                  key={p.id}
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: '#ffffff',
                    border: '1px solid var(--border-color, #e2e8f0)',
                    fontSize: '11.5px',
                    color: 'var(--text-primary)',
                  }}
                >
                  <strong>{p.name}</strong>: <span style={{ color: '#2563eb', fontWeight: 600 }}>{p.minSpec !== null && p.maxSpec !== null ? `${p.minSpec}~${p.maxSpec}` : p.minSpec !== null ? `≥${p.minSpec}` : p.maxSpec !== null ? `≤${p.maxSpec}` : 'Chuẩn'}</span> {p.unit || ''}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Logbook Matrix Table Toolbar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
            marginTop: '2px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={15} style={{ color: 'var(--accent-blue, #2563eb)' }} />
            <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Nhật ký Sổ vận hành ({groupedSessions.length} phiên ghi)
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative', width: '200px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Tìm ngày, KTV ghi..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                style={{ paddingLeft: '28px', height: '30px', fontSize: '11.5px' }}
              />
              <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>

            {/* Quick Status Filter Tabs */}
            <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color, #e2e8f0)' }}>
              <button
                type="button"
                onClick={() => setFilterStatus('ALL')}
                style={{
                  padding: '4px 9px',
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
                  padding: '4px 9px',
                  border: 'none',
                  borderLeft: '1px solid var(--border-color, #e2e8f0)',
                  fontSize: '11px',
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
                  padding: '4px 9px',
                  border: 'none',
                  borderLeft: '1px solid var(--border-color, #e2e8f0)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: filterStatus === 'NORMAL' ? '#16a34a' : '#ffffff',
                  color: filterStatus === 'NORMAL' ? '#ffffff' : '#16a34a',
                }}
              >
                ✅ Đạt chuẩn
              </button>
            </div>

            <button
              className="btn btn-secondary btn-sm"
              onClick={fetchData}
              disabled={loading}
              style={{ padding: '4px 8px', fontSize: '11.5px' }}
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Full-Width Logbook Grid */}
        {filteredSessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: '12.5px' }}>
            Chưa có bản ghi nào. Hãy bấm <strong>"+ Nhập ca mới"</strong> hoặc quét QR để ghi số liệu vận hành.
          </div>
        ) : (
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
                  <th style={{ width: '40px', textAlign: 'center', padding: '8px 6px' }}>STT</th>
                  <th style={{ width: '130px', padding: '8px 10px' }}>Thời gian ghi nhận</th>
                  <th style={{ width: '120px', padding: '8px 10px' }}>Người ghi nhận</th>

                  {/* Dynamic parameter columns */}
                  {parameters.map((p) => (
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
                      style={{
                        backgroundColor: hasOutlier ? 'rgba(239, 68, 68, 0.03)' : 'transparent',
                      }}
                    >
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '11.5px', padding: '6px 4px' }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '6px 10px' }}>
                        <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-primary)' }}>
                          {timeFormatted}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {dayFormatted}
                        </div>
                      </td>
                      <td style={{ padding: '6px 10px' }}>
                        <div style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-primary)' }}>
                          {session.recordedByName}
                        </div>
                      </td>

                      {/* Parameter cells */}
                      {parameters.map((p) => {
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
                            }}
                          >
                            ⚠️ {session.outlierCount} vượt
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
                            }}
                          >
                            <CheckCircle2 size={11} /> Đạt chuẩn
                          </span>
                        )}
                      </td>

                      {/* Notes */}
                      <td style={{ fontSize: '11.5px', color: 'var(--text-secondary)', padding: '6px 10px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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

      {/* Input Modal */}
      {isFormOpen && (
        <Modal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          title={`Ghi nhận Thông số Vận hành - ${equipment.code}`}
        >
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '14px', color: 'var(--text-secondary)', fontSize: '13px' }}>
              Điền các giá trị thực tế đo được theo ca cho máy <strong>{equipment.name}</strong>:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
              {parameters.map((param) => (
                <div key={param.id} className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '12.5px' }}>
                    <span style={{ fontWeight: 600 }}>{param.name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>
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
                      style={{ height: '34px', fontSize: '13px' }}
                    />
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12.5px', width: '45px' }}>{param.unit}</span>
                  </div>
                </div>
              ))}

              <div className="form-group" style={{ marginTop: '6px' }}>
                <label className="form-label" style={{ fontSize: '12.5px' }}>Ghi chú / Giải trình (tùy chọn)</label>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="Ghi chú thêm tình trạng vận hành máy..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  style={{ fontSize: '12px' }}
                />
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '14px 0 0 0', marginTop: '14px', borderTop: '1px solid var(--border-color, #e2e8f0)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsFormOpen(false)}>Hủy</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                {submitting ? 'Đang lưu...' : 'Lưu bản ghi'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
