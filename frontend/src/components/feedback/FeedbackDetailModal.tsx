import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/Badge';
import { api } from '../../services/api';
import { useToast } from '../common/Toast';
import { 
  CheckCircle2, Clock, User, Phone, Building, Calendar, 
  FileText, MessageSquare, AlertCircle, Upload, X, Loader2, Save, Trash2 
} from 'lucide-react';

interface FeedbackDetailModalProps {
  feedback: any | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export const FeedbackDetailModal: React.FC<FeedbackDetailModalProps> = ({
  feedback,
  isOpen,
  onClose,
  onUpdated,
}) => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Editable fields
  const [status, setStatus] = useState('PENDING');
  const [response, setResponse] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [handlerName, setHandlerName] = useState('');
  const [expectedCompletionDate, setExpectedCompletionDate] = useState('');
  const [actualCompletionDate, setActualCompletionDate] = useState('');
  const [notes, setNotes] = useState('');
  const [completionImages, setCompletionImages] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (feedback) {
      setStatus(feedback.status || 'PENDING');
      setResponse(feedback.response || '');
      setRootCause(feedback.rootCause || '');
      setHandlerName(feedback.handlerName || '');
      setExpectedCompletionDate(
        feedback.expectedCompletionDate
          ? new Date(feedback.expectedCompletionDate).toISOString().split('T')[0]
          : ''
      );
      setActualCompletionDate(
        feedback.actualCompletionDate
          ? new Date(feedback.actualCompletionDate).toISOString().split('T')[0]
          : ''
      );
      setNotes(feedback.notes || '');
      try {
        setCompletionImages(feedback.completionImages ? JSON.parse(feedback.completionImages) : []);
      } catch {
        setCompletionImages([]);
      }
    }
  }, [feedback]);

  if (!feedback) return null;

  let parsedAttachments: string[] = [];
  try {
    parsedAttachments = feedback.attachments ? JSON.parse(feedback.attachments) : [];
  } catch {
    parsedAttachments = [];
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', 'FeedbackResolution');
      formData.append('entityId', feedback.id);
      formData.append('description', 'Ảnh hoàn thành');

      const res = await api.uploadAttachment(formData);
      const url = res.fileUrl || res.url || res.path || URL.createObjectURL(file);
      setCompletionImages(prev => [...prev, url]);
      toast.success('Thành công', 'Đã tải lên ảnh hoàn thành.');
    } catch (err: any) {
      toast.error('Lỗi', err.message || 'Không thể tải ảnh');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveCompletionImage = (index: number) => {
    setCompletionImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload: any = {
        status,
        response: response.trim() || null,
        rootCause: rootCause.trim() || null,
        handlerName: handlerName.trim() || null,
        expectedCompletionDate: expectedCompletionDate ? new Date(expectedCompletionDate).toISOString() : null,
        actualCompletionDate: actualCompletionDate ? new Date(actualCompletionDate).toISOString() : null,
        notes: notes.trim() || null,
        completionImages: completionImages.length > 0 ? JSON.stringify(completionImages) : null,
      };

      await api.updateFeedback(feedback.id, payload);
      toast.success('Thành công', 'Đã cập nhật tiến độ xử lý yêu cầu/lỗi.');
      onUpdated();
      onClose();
    } catch (err: any) {
      toast.error('Lỗi', err.message || 'Không thể cập nhật yêu cầu');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa yêu cầu mã [${feedback.code}] không?`)) return;
    try {
      await api.deleteFeedback(feedback.id);
      toast.success('Đã xóa', `Đã xóa yêu cầu [${feedback.code}]`);
      onUpdated();
      onClose();
    } catch (err: any) {
      toast.error('Lỗi', err.message || 'Không thể xóa');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Chi tiết Yêu cầu / Báo lỗi [${feedback.code}]`} maxWidth="760px">
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Section 1: Overview Info */}
        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--primary)' }}>{feedback.code}</span>
                <StatusBadge status={feedback.type || 'BUG'} />
                <StatusBadge status={feedback.status} />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{feedback.title}</h3>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right' }}>
              <div>Ngày gửi:</div>
              <strong>{new Date(feedback.createdAt).toLocaleString('vi-VN')}</strong>
            </div>
          </div>

          {/* Description */}
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Mô tả chi tiết yêu cầu / Lỗi:
            </div>
            <div style={{ fontSize: '13.5px', whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>
              {feedback.description}
            </div>
          </div>

          {/* Requester Details */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', fontSize: '12.5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={14} color="var(--text-muted)" />
              <span>Người yêu cầu: <strong>{feedback.requesterName}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building size={14} color="var(--text-muted)" />
              <span>Bộ phận: <strong>{feedback.department || '---'}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Phone size={14} color="var(--text-muted)" />
              <span>SĐT: <strong>{feedback.phone || '---'}</strong></span>
            </div>
          </div>

          {/* Attachments */}
          {parsedAttachments.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Hình ảnh / File lúc báo lỗi:
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {parsedAttachments.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`attachment-${idx}`}
                    onClick={() => setPreviewImage(url)}
                    style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)', cursor: 'pointer' }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Resolution & Response form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
            Cập nhật Phản hồi & Tiến độ xử lý
          </h4>

          {/* Row 1: Status, Assignee, Expected Date, Actual Date */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Trạng thái
              </label>
              <select
                className="form-input"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="PENDING">Chờ xử lý</option>
                <option value="IN_PROGRESS">Đang xử lý</option>
                <option value="RESOLVED">Đã xử lý / Hoàn thành</option>
                <option value="REJECTED">Từ chối</option>
                <option value="CLOSED">Đã đóng</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Người xử lý
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="VD: Lê Hoàng Cương"
                value={handlerName}
                onChange={(e) => setHandlerName(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Ngày dự kiến hoàn thành
              </label>
              <input
                type="date"
                className="form-input"
                value={expectedCompletionDate}
                onChange={(e) => setExpectedCompletionDate(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Ngày thực tế hoàn thành
              </label>
              <input
                type="date"
                className="form-input"
                value={actualCompletionDate}
                onChange={(e) => setActualCompletionDate(e.target.value)}
              />
            </div>
          </div>

          {/* Row 2: Response */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
              Phản hồi lại người yêu cầu
            </label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="Nhập nội dung phản hồi, hướng dẫn khắc phục hoặc kế hoạch cập nhật..."
              value={response}
              onChange={(e) => setResponse(e.target.value)}
            />
          </div>

          {/* Row 3: Root Cause (if Bug) */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
              Nguyên nhân (nếu là lỗi hệ thống)
            </label>
            <textarea
              className="form-input"
              rows={2}
              placeholder="VD: Xung đột dữ liệu token, lỗi logic frontend, thiếu index DB..."
              value={rootCause}
              onChange={(e) => setRootCause(e.target.value)}
            />
          </div>

          {/* Row 4: Completion Images */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
              Hình ảnh kết quả / Hoàn thành
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
              {completionImages.map((url, idx) => (
                <div key={idx} style={{ position: 'relative', width: '64px', height: '64px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                  <img src={url} alt={`complete-${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => handleRemoveCompletionImage(idx)}
                    style={{
                      position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', color: '#fff',
                      border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}

              <label style={{
                width: '64px', height: '64px', borderRadius: '6px', border: '1.5px dashed var(--border-color)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: uploading ? 'not-allowed' : 'pointer', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)'
              }}>
                {uploading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <Upload size={16} />
                    <span style={{ fontSize: '9px', marginTop: '2px' }}>Tải ảnh</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>

          {/* Row 5: Notes */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
              Ghi chú nội bộ
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="Ghi chú thêm về quy trình xử lý..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleDelete}
            style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Trash2 size={14} /> Xóa
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Đóng
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Lưu cập nhật
            </button>
          </div>
        </div>
      </form>

      {/* Image Zoom Preview */}
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
    </Modal>
  );
};
