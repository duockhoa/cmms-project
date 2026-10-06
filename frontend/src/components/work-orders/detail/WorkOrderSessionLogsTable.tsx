import React, { useState } from 'react';
import { Clock, User as UserIcon, Calendar, Image as ImageIcon, CheckCircle, AlertCircle, X } from 'lucide-react';

interface WorkOrderSessionLogsTableProps {
  sessions: any[];
  totalHours?: number;
  userSummary: Array<{ userName: string; sessionCount: number; totalHours: number }>;
}

export const WorkOrderSessionLogsTable: React.FC<WorkOrderSessionLogsTableProps> = ({
  sessions = [],
  userSummary = [],
}) => {
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '---';
    const d = new Date(dateStr);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
  };

  const safeSessions = Array.isArray(sessions) ? sessions : [];
  const safeUserSummary = Array.isArray(userSummary) ? userSummary : [];

  return (
    <div className="card" style={{ padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', marginTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#1e3a8a' }}>
          <Clock size={18} /> Nhật ký tiến độ & Các phiên làm việc ({safeSessions.length})
        </h3>
      </div>

      {/* Thống kê theo kỹ thuật viên */}
      {safeUserSummary.length > 0 && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {safeUserSummary.map((u, i) => (
            <div
              key={i}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-secondary, #f8fafc)',
                border: '1px solid var(--border-color)',
                fontSize: '13px',
              }}
            >
              <UserIcon size={14} style={{ color: '#3b82f6' }} />
              <strong>{u.userName}:</strong>
              <span>{u.sessionCount} phiên • <strong>{u.totalHours} giờ</strong></span>
            </div>
          ))}
        </div>
      )}

      {/* Bảng danh sách các phiên */}
      {safeSessions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
          Chưa có phiên làm việc nào được ghi nhận. Bấm "Bắt đầu làm việc" để khởi tạo phiên đầu tiên.
        </div>
      ) : (
        <div className="table-wrapper" style={{ overflowX: 'auto' }}>
          <table className="custom-table" style={{ fontSize: '13px' }}>
            <thead>
              <tr>
                <th style={{ width: '80px', textAlign: 'center' }}>Phiên</th>
                <th style={{ width: '150px' }}>Kỹ thuật viên</th>
                <th style={{ width: '160px' }}>Thời gian</th>
                <th style={{ width: '110px', textAlign: 'center' }}>Thời lượng</th>
                <th>Nội dung công việc</th>
                <th>Kết quả / Đánh giá</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Ảnh</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {safeSessions.map((s) => {
                let photosArr: string[] = [];
                try {
                  if (Array.isArray(s.photos)) {
                    photosArr = s.photos;
                  } else if (typeof s.photos === 'string' && s.photos.trim() && s.photos !== 'null') {
                    const parsed = JSON.parse(s.photos);
                    if (Array.isArray(parsed)) {
                      photosArr = parsed;
                    }
                  }
                } catch { }

                return (
                  <tr key={s.id}>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>
                      #{s.sessionIndex}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{s.user?.name || '---'}</div>
                      {s.user?.specialty && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.user.specialty}</div>
                      )}
                    </td>
                    <td style={{ fontSize: '12px' }}>
                      <div>{formatDateTime(s.startedAt)}</div>
                      <div style={{ color: 'var(--text-muted)' }}>
                        đến {s.endedAt ? formatDateTime(s.endedAt) : 'Đang chạy...'}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>
                      {s.status === 'IN_PROGRESS' ? (
                        <span style={{ color: '#2563eb' }}>Đang đếm...</span>
                      ) : (
                        <span>{s.durationMinutes || 0}m <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>({s.durationHours || 0}h)</span></span>
                      )}
                    </td>
                    <td>
                      <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{s.taskContent || '---'}</div>
                    </td>
                    <td>
                      <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: s.resultNotes ? 'inherit' : 'var(--text-muted)' }}>
                        {s.resultNotes || '---'}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {Array.isArray(photosArr) && photosArr.length > 0 ? (
                        <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => setLightboxPhoto(photosArr[0])}
                            style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
                            title="Xem ảnh"
                          >
                            <img
                              src={photosArr[0]}
                              alt="Thumbnail"
                              style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                            />
                          </button>
                          {photosArr.length > 1 && (
                            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
                              +{photosArr.length - 1}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>---</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {s.status === 'IN_PROGRESS' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2563eb', animation: 'pulse 1.5s infinite' }}></span>
                          Đang làm
                        </span>
                      ) : s.status === 'AUTO_CLOSED' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, backgroundColor: '#fffbeb', color: '#b45309' }}>
                          <AlertCircle size={12} /> Chốt 17h
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, backgroundColor: '#ecfdf5', color: '#047857' }}>
                          <CheckCircle size={12} /> Hoàn tất
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Lightbox Preview */}
      {lightboxPhoto && (
        <div
          onClick={() => setLightboxPhoto(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <button
              onClick={() => setLightboxPhoto(null)}
              style={{
                position: 'absolute',
                top: '-14px',
                right: '-14px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#fff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
              }}
            >
              <X size={18} />
            </button>
            <img
              src={lightboxPhoto}
              alt="Enlarged view"
              style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '8px', objectFit: 'contain' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
