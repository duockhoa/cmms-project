import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Paperclip, Download, Trash2, Upload, AlertCircle, RefreshCw, FileText, Image } from 'lucide-react';
import { useToast, useConfirmDialog } from './Toast';

interface AttachmentManagerProps {
  entityType: string;
  entityId: string;
  uploadedById?: string;
  onUploadSuccess?: () => void;
  disabled?: boolean;
}

export const AttachmentManager: React.FC<AttachmentManagerProps> = ({
  entityType,
  entityId,
  uploadedById,
  onUploadSuccess,
  disabled = false,
}) => {
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const toast = useToast();
  const { confirm } = useConfirmDialog();

  const loadAttachments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAttachments(entityType, entityId);
      setAttachments(data);
    } catch (err: any) {
      console.error(err);
      setError('Không thể tải danh sách tệp đính kèm');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttachments();
  }, [entityType, entityId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        toast.warning('Tệp quá lớn', 'Kích thước tệp vượt quá giới hạn 10MB!');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || disabled) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('entityType', entityType);
    formData.append('entityId', entityId);
    if (uploadedById) {
      formData.append('uploadedById', uploadedById);
    }
    if (description) {
      formData.append('description', description);
    }

    try {
      await api.uploadAttachment(formData);
      setSelectedFile(null);
      setDescription('');
      loadAttachments();
      toast.success('Thành công', 'Đã tải lên tệp đính kèm.');
      if (onUploadSuccess) onUploadSuccess();
    } catch (err: any) {
      console.error(err);
      toast.error('Tải lên thất bại', err.message || 'Lỗi không xác định');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (disabled) return;
    const ok = await confirm('Xóa tệp đính kèm', 'Bạn có chắc chắn muốn xóa tệp đính kèm này?', { confirmText: 'Xóa', type: 'danger' });
    if (!ok) return;

    try {
      await api.deleteAttachment(id);
      toast.success('Thành công', 'Đã xóa tệp đính kèm.');
      loadAttachments();
    } catch (err: any) {
      console.error(err);
      toast.error('Xóa thất bại', err.message || 'Lỗi không xác định');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Upload Form */}
      {!disabled && (
        <form onSubmit={handleUpload} className="card" style={{ padding: '16px', backgroundColor: 'var(--bg-secondary)', border: '1px dashed var(--border-color)' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Paperclip size={14} /> Thêm tài liệu / Hình ảnh đính kèm
          </h4>
          
          <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                type="file"
                id={`file-upload-${entityId}`}
                style={{ display: 'none' }}
                onChange={handleFileChange}
                accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx"
              />
              <label
                htmlFor={`file-upload-${entityId}`}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: 0 }}
              >
                <Upload size={14} /> Chọn tệp...
              </label>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {selectedFile ? `${selectedFile.name} (${formatSize(selectedFile.size)})` : 'Chưa chọn tệp nào (Tối đa 10MB)'}
              </span>
            </div>

            {selectedFile && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nhập mô tả tệp đính kèm (không bắt buộc)..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ flex: 1, padding: '6px 12px', fontSize: '13px' }}
                />
                <button type="submit" className="btn btn-primary" disabled={uploading}>
                  {uploading ? <RefreshCw size={14} className="animate-spin" /> : 'Tải lên'}
                </button>
              </div>
            )}
          </div>
        </form>
      )}

      {/* Attachment List */}
      {loading ? (
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <RefreshCw size={12} className="animate-spin" /> Đang tải danh sách tệp đính kèm...
        </p>
      ) : error ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)', fontSize: '12px' }}>
          <AlertCircle size={14} /> {error}
        </div>
      ) : attachments.length === 0 ? (
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>
          Chưa có tệp tài liệu hay hình ảnh đính kèm.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {attachments.map((att) => {
            const isImage = att.fileType.startsWith('image/');
            return (
              <div
                key={att.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-card)',
                  fontSize: '13px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                  {isImage ? (
                    <Image size={16} style={{ color: 'var(--info)', flexShrink: 0 }} />
                  ) : (
                    <FileText size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {att.originalName}
                    </div>
                    {att.description && (
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{att.description}</div>
                    )}
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      Kích thước: {formatSize(att.fileSize)} | Checksum: {att.checksum.substring(0, 8)}...
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '4px', marginLeft: '12px' }}>
                  <a
                    href={`http://localhost:3001/api/v1/attachments/${att.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 8px', display: 'flex', alignItems: 'center' }}
                    title="Tải về"
                  >
                    <Download size={12} />
                  </a>
                  {!disabled && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '4px 8px', color: 'var(--danger)' }}
                      onClick={() => handleDelete(att.id)}
                      title="Xóa"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
