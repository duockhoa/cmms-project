import React from 'react';
import { 
  Plus, Clock, User, Trash2, Camera, RefreshCw, 
  CheckCircle2, ZoomIn, FileText, AlertCircle 
} from 'lucide-react';

const formatDateTimeDisplay = (isoStr?: string | null) => {
  if (!isoStr) return '---';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '---';
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch (e) {
    return '---';
  }
};

interface FabricationProgressLogTableProps {
  logs: any[];
  loading?: boolean;
  canEdit?: boolean;
  currentUserId?: string;
  isAdmin?: boolean;
  onOpenCreateModal: () => void;
  onRefresh: () => void;
  onDeleteLog: (logId: string) => void;
  onPreviewImage: (url: string) => void;
}

export const FabricationProgressLogTable: React.FC<FabricationProgressLogTableProps> = ({
  logs = [],
  loading = false,
  canEdit = true,
  currentUserId,
  isAdmin = false,
  onOpenCreateModal,
  onRefresh,
  onDeleteLog,
  onPreviewImage,
}) => {
  // Thống kê tổng giờ công và giờ theo từng nhân sự
  const totalHours = logs.reduce((sum, item) => sum + (Number(item.hoursSpent) || 0), 0);
  
  const userHoursMap = logs.reduce((acc: Record<string, { name: string; hours: number; count: number }>, item) => {
    const key = item.userId || item.userName || 'unknown';
    if (!acc[key]) {
      acc[key] = {
        name: item.userName || 'Kỹ thuật viên',
        hours: 0,
        count: 0,
      };
    }
    acc[key].hours += Number(item.hoursSpent) || 0;
    acc[key].count += 1;
    return acc;
  }, {});

  const contributorList: { name: string; hours: number; count: number }[] = Object.values(userHoursMap);

  return (
    <div
      className="card no-print fabrication-section-card"
      style={{
        padding: '24px',
        backgroundColor: 'var(--bg-card)',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileText size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Nhật ký tiến độ & Báo cáo công việc ({logs.length})
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Mỗi nhân sự tự đăng nhập và ghi nhận chi tiết phần việc đã thực hiện
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onRefresh}
            disabled={loading}
            title="Làm mới bảng tiến độ"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>

          {canEdit && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onOpenCreateModal}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
            >
              <Plus size={15} /> Ghi nhận phần việc của tôi
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div
        style={{
          padding: '12px 16px',
          borderRadius: '8px',
          backgroundColor: 'var(--bg-primary, #f8fafc)',
          border: '1px solid var(--border-color)',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Tổng giờ công ghi nhận: </span>
            <strong style={{ fontSize: '15px', color: '#2563eb' }}>{totalHours.toFixed(1)} giờ</strong>
          </div>
          <div style={{ height: '16px', width: '1px', backgroundColor: 'var(--border-color)' }} />
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Số lượt báo cáo: </span>
            <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{logs.length} lượt</strong>
          </div>
        </div>

        {/* Contributor Tags */}
        {contributorList.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Đóng góp:</span>
            {contributorList.map((c, idx) => (
              <span
                key={idx}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  fontSize: '11.5px',
                  color: '#334155',
                  fontWeight: 600,
                }}
              >
                <User size={11} color="#64748b" /> {c.name}: <span style={{ color: '#2563eb' }}>{c.hours.toFixed(1)}h</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Main Content: Table on desktop, Cards on mobile */}
      {loading ? (
        <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
          <div style={{ display: 'inline-block', width: '24px', height: '24px', border: '2px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          <div style={{ marginTop: '8px', fontSize: '13px' }}>Đang tải nhật ký công việc...</div>
        </div>
      ) : logs.length === 0 ? (
        <div
          style={{
            padding: '32px 16px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-primary, #f8fafc)',
            borderRadius: '8px',
            color: '#64748b',
            border: '1px dashed var(--border-color)',
          }}
        >
          <Clock size={28} style={{ color: '#94a3b8', margin: '0 auto 8px', display: 'block' }} />
          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>Chưa có lượt ghi nhận tiến độ nào</div>
          <div style={{ fontSize: '12.5px', marginTop: '4px', color: 'var(--text-muted)' }}>
            Mỗi người trong danh sách phụ trách có thể bấm nút <strong>"Ghi nhận phần việc của tôi"</strong> để cập nhật việc mình đã làm.
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hide-mobile table-wrapper" style={{ overflowX: 'auto' }}>
            <table className="custom-table" style={{ fontSize: '13px', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '45px', textAlign: 'center' }}>STT</th>
                  <th style={{ width: '130px' }}>Thời gian</th>
                  <th style={{ width: '160px' }}>Người thực hiện</th>
                  <th>Nội dung công việc đã làm</th>
                  <th style={{ width: '90px', textAlign: 'center' }}>Giờ công</th>
                  <th style={{ width: '90px', textAlign: 'center' }}>Tiến độ</th>
                  <th style={{ width: '110px', textAlign: 'center' }}>Minh chứng</th>
                  {canEdit && <th style={{ width: '50px', textAlign: 'center' }}></th>}
                </tr>
              </thead>
              <tbody>
                {logs.map((item, idx) => {
                  const photos = Array.isArray(item.photos)
                    ? item.photos
                    : typeof item.photos === 'string'
                    ? (() => { try { return JSON.parse(item.photos); } catch (e) { return []; } })()
                    : [];

                  const isOwner = item.userId === currentUserId;
                  const canDelete = isOwner || isAdmin;

                  return (
                    <tr key={item.id || idx}>
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {formatDateTimeDisplay(item.loggedAt || item.createdAt)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '50%',
                              backgroundColor: '#e0e7ff',
                              color: '#3730a3',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '11px',
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {(item.userName || 'NV').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.userName}</div>
                            {item.userCode && (
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Mã: {item.userCode}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.45', color: '#1e293b' }}>
                          {item.taskContent}
                        </div>
                        {item.notes && (
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', fontStyle: 'italic' }}>
                            Lưu ý: {item.notes}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {item.hoursSpent > 0 ? (
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              backgroundColor: '#ecfdf5',
                              color: '#065f46',
                              fontWeight: 700,
                              fontSize: '12px',
                            }}
                          >
                            {item.hoursSpent}h
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>---</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {item.progressText || (item.progressPercent !== null && item.progressPercent !== undefined) ? (
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              backgroundColor: '#eff6ff',
                              color: '#1d4ed8',
                              fontWeight: 600,
                              fontSize: '12px',
                              display: 'inline-block',
                              maxWidth: '180px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                            title={item.progressText || `${item.progressPercent}%`}
                          >
                            {item.progressText || `${item.progressPercent}%`}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>---</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {photos && photos.length > 0 ? (
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', flexWrap: 'wrap' }}>
                            {photos.slice(0, 3).map((p: any, pIdx: number) => {
                              const pUrl = typeof p === 'string' ? p : p.url;
                              return (
                                <img
                                  key={pIdx}
                                  src={pUrl}
                                  alt="minh chứng"
                                  onClick={() => onPreviewImage(pUrl)}
                                  style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '4px',
                                    objectFit: 'cover',
                                    cursor: 'pointer',
                                    border: '1px solid #cbd5e1',
                                  }}
                                  title="Bấm để xem phóng to"
                                />
                              );
                            })}
                            {photos.length > 3 && (
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', alignSelf: 'center' }}>
                                +{photos.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Không có</span>
                        )}
                      </td>
                      {canEdit && (
                        <td style={{ textAlign: 'center' }}>
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => onDeleteLog(item.id)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                              title="Xóa lượt ghi nhận này"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="show-mobile-only" style={{ display: 'none', flexDirection: 'column', gap: '10px' }}>
            {logs.map((item, idx) => {
              const photos = Array.isArray(item.photos)
                ? item.photos
                : typeof item.photos === 'string'
                ? (() => { try { return JSON.parse(item.photos); } catch (e) { return []; } })()
                : [];

              const isOwner = item.userId === currentUserId;
              const canDelete = isOwner || isAdmin;

              return (
                <div
                  key={item.id || idx}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-card, #ffffff)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: '#e0e7ff',
                          color: '#3730a3',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {(item.userName || 'NV').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-primary)' }}>
                          {item.userName}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {formatDateTimeDisplay(item.loggedAt || item.createdAt)}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {item.hoursSpent > 0 && (
                        <span
                          style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: '#ecfdf5',
                            color: '#065f46',
                            fontWeight: 700,
                            fontSize: '11.5px',
                          }}
                        >
                          +{item.hoursSpent}h
                        </span>
                      )}
                      {(item.progressText || (item.progressPercent !== null && item.progressPercent !== undefined)) && (
                        <span
                          style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: '#eff6ff',
                            color: '#1d4ed8',
                            fontWeight: 600,
                            fontSize: '11.5px',
                            maxWidth: '150px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: 'inline-block',
                          }}
                          title={item.progressText || `${item.progressPercent}%`}
                        >
                          {item.progressText || `${item.progressPercent}%`}
                        </span>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => onDeleteLog(item.id)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', padding: '2px 4px', cursor: 'pointer' }}
                          title="Xóa"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize: '13px', lineHeight: '1.45', color: '#1e293b' }}>
                    {item.taskContent}
                  </div>

                  {item.notes && (
                    <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                      Lưu ý: {item.notes}
                    </div>
                  )}

                  {photos && photos.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                      {photos.map((p: any, pIdx: number) => {
                        const pUrl = typeof p === 'string' ? p : p.url;
                        return (
                          <img
                            key={pIdx}
                            src={pUrl}
                            alt="minh chứng"
                            onClick={() => onPreviewImage(pUrl)}
                            style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '6px',
                              objectFit: 'cover',
                              cursor: 'pointer',
                              border: '1px solid #cbd5e1',
                            }}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
