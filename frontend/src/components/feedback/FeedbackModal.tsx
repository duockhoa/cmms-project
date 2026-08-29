import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { useToast } from '../common/Toast';
import { MessageSquarePlus, Upload, X, Loader2, Bug, Lightbulb, Sparkles, HelpCircle } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [title, setTitle] = useState('');
  const [type, setType] = useState('BUG');
  const [description, setDescription] = useState('');
  const [requesterName, setRequesterName] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      api.getMe()
        .then((res: any) => {
          const u = res?.user || res;
          if (u) {
            setCurrentUser(u);
            setRequesterName(u.name || '');
            setDepartment(u.department || '');
          }
        })
        .catch(() => null);
    }
  }, [isOpen]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', 'Feedback');
      formData.append('entityId', 'temp-feedback');
      formData.append('description', 'Ảnh đính kèm góp ý/lỗi');

      const res = await api.uploadAttachment(formData);
      const url = res.fileUrl || res.url || res.path || URL.createObjectURL(file);
      setAttachments(prev => [...prev, url]);
      toast.success('Thành công', 'Đã tải lên hình ảnh đính kèm.');
    } catch (err: any) {
      toast.error('Lỗi tải ảnh', err.message || 'Không thể tải ảnh lên');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error('Thiếu thông tin', 'Vui lòng nhập nội dung và mô tả chi tiết.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        type,
        description: description.trim(),
        requesterName: requesterName.trim() || currentUser?.name || 'Người dùng',
        department: department.trim() || currentUser?.department || null,
        phone: phone.trim() || null,
        attachments: attachments.length > 0 ? JSON.stringify(attachments) : null,
      };

      const res = await api.createFeedback(payload);
      toast.success('Gửi thành công', `Đã ghi nhận yêu cầu mã [${res.code}]. Chúng tôi sẽ phản hồi sớm nhất!`);
      
      // Reset form
      setTitle('');
      setDescription('');
      setType('BUG');
      setPhone('');
      setAttachments([]);

      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error('Lỗi', err.message || 'Không thể gửi yêu cầu góp ý');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Góp ý & Báo lỗi Ứng dụng DK.QLTB" maxWidth="580px">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Type selector */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Phân loại yêu cầu <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {[
              { id: 'BUG', label: 'Báo lỗi', icon: Bug, color: '#dc2626', bg: '#fee2e2' },
              { id: 'FEATURE', label: 'Tính năng mới', icon: Sparkles, color: '#2563eb', bg: '#dbeafe' },
              { id: 'IMPROVEMENT', label: 'Cải tiến', icon: Lightbulb, color: '#d97706', bg: '#fef3c7' },
              { id: 'OTHER', label: 'Khác', icon: HelpCircle, color: '#4b5563', bg: '#f3f4f6' },
            ].map(item => {
              const Icon = item.icon;
              const isSelected = type === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setType(item.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '8px 4px',
                    borderRadius: '8px',
                    border: isSelected ? `2px solid ${item.color}` : '1px solid var(--border-color)',
                    backgroundColor: isSelected ? item.bg : 'var(--bg-card)',
                    color: isSelected ? item.color : 'var(--text-primary)',
                    cursor: 'pointer',
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: '12px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Title */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
            Nội dung tóm tắt <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <input
            type="text"
            className="form-input"
            placeholder="VD: Không xuất được báo cáo PDF, lỗi nút lưu..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        {/* Description */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
            Mô tả chi tiết yêu cầu / Lỗi gặp phải <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <textarea
            className="form-input"
            rows={4}
            placeholder="Mô tả cụ thể các bước dẫn tới lỗi hoặc mong muốn điều chỉnh hệ thống..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            style={{ resize: 'vertical' }}
          />
        </div>

        {/* Two-column: Requester & Department */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
              Người yêu cầu
            </label>
            <input
              type="text"
              className="form-input"
              value={requesterName}
              onChange={(e) => setRequesterName(e.target.value)}
              placeholder="Tên người gửi"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
              Bộ phận / Phòng ban
            </label>
            <input
              type="text"
              className="form-input"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="VD: Xưởng Hoàn thiện"
            />
          </div>
        </div>

        {/* Phone */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
            Số điện thoại liên hệ (nếu có)
          </label>
          <input
            type="text"
            className="form-input"
            placeholder="VD: 0988xxxxxx"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        {/* Image Attachments */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Hình ảnh minh họa / Đính kèm
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            {attachments.map((url, idx) => (
              <div key={idx} style={{ position: 'relative', width: '64px', height: '64px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                <img src={url} alt={`attach-${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(idx)}
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

        {/* Submit Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Hủy
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading || !title.trim() || !description.trim()} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {loading ? <Loader2 size={15} className="animate-spin" /> : <MessageSquarePlus size={15} />}
            Gửi yêu cầu
          </button>
        </div>
      </form>
    </Modal>
  );
};
