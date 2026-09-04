import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/Badge';
import { FeedbackModal } from '../components/feedback/FeedbackModal';
import { FeedbackDetailModal } from '../components/feedback/FeedbackDetailModal';
import { 
  MessageSquarePlus, Search, RefreshCw, Filter, 
  Bug, Sparkles, CheckCircle2, Clock, Eye, Image as ImageIcon 
} from 'lucide-react';

export const FeedbacksPage: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<any | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const data = await api.getFeedbacks({
        status: statusFilter || undefined,
        type: typeFilter || undefined,
        search: searchTerm.trim() || undefined,
      });
      setFeedbacks(Array.isArray(data) ? data : (data?.items || []));
    } catch (err) {
      console.error('Lỗi khi tải danh sách góp ý/báo lỗi:', err);
      setFeedbacks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, [statusFilter, typeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFeedbacks();
  };

  // Status stats
  const totalCount = feedbacks.length;
  const pendingCount = feedbacks.filter(f => f.status === 'PENDING').length;
  const inProgressCount = feedbacks.filter(f => f.status === 'IN_PROGRESS').length;
  const resolvedCount = feedbacks.filter(f => f.status === 'RESOLVED' || f.status === 'CLOSED').length;

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Yêu cầu Chỉnh sửa & Báo lỗi App</h1>
          <p className="page-subtitle">Theo dõi, phản hồi và cập nhật tiến độ xử lý các góp ý và lỗi hệ thống DK.QLTB</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setIsCreateModalOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <MessageSquarePlus size={16} /> Gửi Góp ý / Báo lỗi
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="kpi-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '20px' }}>
        <div className="kpi-card" onClick={() => setStatusFilter('')} style={{ cursor: 'pointer' }}>
          <div className="flex-between">
            <span className="kpi-card-title">Tổng yêu cầu</span>
            <Filter size={16} color="var(--text-muted)" />
          </div>
          <div className="kpi-card-value">{totalCount}</div>
          <div className="kpi-card-footer">Tất cả các loại</div>
        </div>

        <div className="kpi-card" onClick={() => setStatusFilter('PENDING')} style={{ cursor: 'pointer' }}>
          <div className="flex-between">
            <span className="kpi-card-title">Mới tiếp nhận / Chờ xử lý</span>
            <Clock size={16} color="var(--warning)" />
          </div>
          <div className="kpi-card-value" style={{ color: 'var(--warning)' }}>{pendingCount}</div>
          <div className="kpi-card-footer">Chưa được xử lý</div>
        </div>

        <div className="kpi-card" onClick={() => setStatusFilter('IN_PROGRESS')} style={{ cursor: 'pointer' }}>
          <div className="flex-between">
            <span className="kpi-card-title">Đang xử lý</span>
            <RefreshCw size={16} color="var(--info)" />
          </div>
          <div className="kpi-card-value" style={{ color: 'var(--info)' }}>{inProgressCount}</div>
          <div className="kpi-card-footer">Đang trong tiến trình</div>
        </div>

        <div className="kpi-card" onClick={() => setStatusFilter('RESOLVED')} style={{ cursor: 'pointer' }}>
          <div className="flex-between">
            <span className="kpi-card-title">Đã hoàn thành</span>
            <CheckCircle2 size={16} color="var(--success)" />
          </div>
          <div className="kpi-card-value" style={{ color: 'var(--success)' }}>{resolvedCount}</div>
          <div className="kpi-card-footer">Đã khắc phục / phát hành</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card mb-4" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          
          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto' }}>
            {[
              { id: '', label: 'Tất cả' },
              { id: 'PENDING', label: 'Chờ xử lý' },
              { id: 'IN_PROGRESS', label: 'Đang xử lý' },
              { id: 'RESOLVED', label: 'Đã hoàn thành' },
              { id: 'REJECTED', label: 'Từ chối' },
              { id: 'CLOSED', label: 'Đã đóng' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`btn btn-sm ${statusFilter === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search and Type filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select
              className="form-input"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{ width: '140px', height: '34px', fontSize: '12.5px' }}
            >
              <option value="">Tất cả loại</option>
              <option value="BUG">Báo lỗi (BUG)</option>
              <option value="FEATURE">Tính năng mới</option>
              <option value="IMPROVEMENT">Cải tiến</option>
              <option value="OTHER">Khác</option>
            </select>

            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '6px' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Tìm mã, nội dung, người gửi..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ width: '220px', height: '34px', fontSize: '12.5px', paddingRight: '30px' }}
                />
                <button type="submit" style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <Search size={14} />
                </button>
              </div>
            </form>

            <button className="btn btn-secondary btn-sm" onClick={fetchFeedbacks} title="Làm mới">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
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
                <tr>
                  <td colSpan={16} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Đang tải dữ liệu báo cáo & góp ý...
                  </td>
                </tr>
              ) : feedbacks.length === 0 ? (
                <tr>
                  <td colSpan={16} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Chưa có yêu cầu hoặc góp ý nào
                  </td>
                </tr>
              ) : (
                feedbacks.map((fb, index) => {
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
                                onClick={() => setPreviewImage(img)}
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
                          onClick={() => setSelectedFeedback(fb)}
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

      {/* Modal create */}
      <FeedbackModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchFeedbacks}
      />

      {/* Modal detail & update */}
      <FeedbackDetailModal
        feedback={selectedFeedback}
        isOpen={!!selectedFeedback}
        onClose={() => setSelectedFeedback(null)}
        onUpdated={fetchFeedbacks}
      />

      {/* Image Preview Overlay */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
          }}
        >
          <img src={previewImage} alt="Preview" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '8px', objectFit: 'contain' }} />
        </div>
      )}
    </div>
  );
};
