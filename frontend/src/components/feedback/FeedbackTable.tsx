import React from 'react';
import { Eye } from 'lucide-react';
import { StatusBadge } from '../common/Badge';
import { TableSkeleton } from '../common/Skeleton';
import { EmptyState } from '../common';

interface FeedbackTableProps {
  feedbacks: any[];
  loading: boolean;
  onSelectFeedback: (fb: any) => void;
  onPreviewImage: (url: string) => void;
}

export const FeedbackTable: React.FC<FeedbackTableProps> = ({
  feedbacks,
  loading,
  onSelectFeedback,
  onPreviewImage,
}) => {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="table-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              <th style={{ width: '90px' }}>STT (Mã)</th>
              <th style={{ minWidth: '150px' }}>Nội dung</th>
              <th style={{ minWidth: '220px' }}>Mô tả yêu cầu / Lỗi</th>
              <th style={{ width: '130px' }}>Người yêu cầu</th>
              <th style={{ width: '120px' }}>Bộ phận</th>
              <th style={{ width: '110px' }}>SĐT liên hệ</th>
              <th style={{ width: '100px' }}>Ngày đề xuất</th>
              <th style={{ minWidth: '160px' }}>Phản hồi</th>
              <th style={{ minWidth: '140px' }}>Nguyên nhân (nếu lỗi)</th>
              <th style={{ width: '120px' }}>Người xử lý</th>
              <th style={{ width: '100px' }}>Ngày dự kiến</th>
              <th style={{ width: '110px' }}>Trạng thái</th>
              <th style={{ width: '100px' }}>Ngày thực tế</th>
              <th style={{ width: '100px' }}>Hình ảnh</th>
              <th style={{ minWidth: '120px' }}>Ghi chú</th>
              <th style={{ width: '90px', textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton columns={16} rows={6} />
            ) : feedbacks.length === 0 ? (
              <EmptyState colSpan={16} compact minHeight={160} title="Chưa có yêu cầu hoặc góp ý" />
            ) : (
              feedbacks.map((fb) => {
                let compImgs: string[] = [];
                try {
                  compImgs = fb.completionImages ? JSON.parse(fb.completionImages) : [];
                } catch {
                  compImgs = [];
                }

                return (
                  <tr 
                    key={fb.id}
                    style={{ transition: 'background-color 0.15s ease' }}
                  >
                    {/* 1. STT / Code */}
                    <td>
                      <strong style={{ color: 'var(--primary)', fontSize: '13px' }}>{fb.code}</strong>
                    </td>

                    {/* 2. Title & Type */}
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                        {fb.title}
                      </div>
                      <StatusBadge status={fb.type || 'BUG'} />
                    </td>

                    {/* 3. Description */}
                    <td>
                      <div style={{
                        fontSize: '12.5px', color: 'var(--text-secondary)',
                        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                      }} title={fb.description}>
                        {fb.description}
                      </div>
                    </td>

                    {/* 4. Requester */}
                    <td>
                      <strong style={{ fontSize: '12.5px' }}>{fb.requesterName}</strong>
                    </td>

                    {/* 5. Department */}
                    <td style={{ fontSize: '12px' }}>
                      {fb.department || '---'}
                    </td>

                    {/* 6. Phone */}
                    <td style={{ fontSize: '12px' }}>
                      {fb.phone || '---'}
                    </td>

                    {/* 7. Created Date */}
                    <td style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      {new Date(fb.createdAt).toLocaleDateString('vi-VN')}
                    </td>

                    {/* 8. Response */}
                    <td>
                      {fb.response ? (
                        <div style={{
                          fontSize: '12.5px', color: 'var(--text-primary)',
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                        }} title={fb.response}>
                          {fb.response}
                        </div>
                      ) : (
                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Chưa có phản hồi</span>
                      )}
                    </td>

                    {/* 9. Root cause */}
                    <td>
                      {fb.rootCause ? (
                        <div style={{
                          fontSize: '12px', color: 'var(--text-secondary)',
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                        }} title={fb.rootCause}>
                          {fb.rootCause}
                        </div>
                      ) : (
                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>---</span>
                      )}
                    </td>

                    {/* 10. Handler */}
                    <td style={{ fontSize: '12.5px' }}>
                      {fb.handlerName ? <strong>{fb.handlerName}</strong> : <span style={{ color: 'var(--text-muted)' }}>Chưa gán</span>}
                    </td>

                    {/* 11. Expected Completion Date */}
                    <td style={{ fontSize: '11.5px' }}>
                      {fb.expectedCompletionDate ? (
                        <span style={{ color: 'var(--info)', fontWeight: 600 }}>
                          {new Date(fb.expectedCompletionDate).toLocaleDateString('vi-VN')}
                        </span>
                      ) : '---'}
                    </td>

                    {/* 12. Status */}
                    <td>
                      <StatusBadge status={fb.status} />
                    </td>

                    {/* 13. Actual Completion Date */}
                    <td style={{ fontSize: '11.5px' }}>
                      {fb.actualCompletionDate ? (
                        <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                          {new Date(fb.actualCompletionDate).toLocaleDateString('vi-VN')}
                        </span>
                      ) : '---'}
                    </td>

                    {/* 14. Completion Images */}
                    <td>
                      {compImgs.length > 0 ? (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {compImgs.slice(0, 2).map((img, i) => (
                            <img
                              key={i}
                              src={img}
                              alt="comp"
                              onClick={() => onPreviewImage(img)}
                              style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)', cursor: 'pointer' }}
                            />
                          ))}
                          {compImgs.length > 2 && (
                            <span style={{ fontSize: '10px', alignSelf: 'center', color: 'var(--text-muted)' }}>+{compImgs.length - 2}</span>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>---</span>
                      )}
                    </td>

                    {/* 15. Notes */}
                    <td>
                      <div style={{
                        fontSize: '12px', color: 'var(--text-muted)',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                      }} title={fb.notes || ''}>
                        {fb.notes || '---'}
                      </div>
                    </td>

                    {/* 16. Action */}
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onSelectFeedback(fb)}
                        style={{ fontSize: '11.5px', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        title="Xem & Phản hồi"
                      >
                        <Eye size={13} /> Xử lý
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
