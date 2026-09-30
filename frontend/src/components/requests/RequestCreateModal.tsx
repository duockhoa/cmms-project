import React from 'react';
import { QrCode, Cpu } from 'lucide-react';
import { Modal } from '../common/Modal';
import { QRScanner } from '../common/QRScanner';

interface RequestCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: {
    equipmentId: string;
    functionalUnitId: string;
    title: string;
    description: string;
    priority: string;
    reporterName: string;
    department: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<RequestCreateModalProps['formData']>>;
  equipmentList: any[];
  functionalUnits: any[];
  loadingUnits: boolean;
  showScanner: boolean;
  setShowScanner: (open: boolean) => void;
  onQRScan: (decodedText: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const RequestCreateModal: React.FC<RequestCreateModalProps> = ({
  isOpen,
  onClose,
  formData,
  setFormData,
  equipmentList,
  functionalUnits,
  loadingUnits,
  showScanner,
  setShowScanner,
  onQRScan,
  onSubmit,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tạo Yêu cầu Sửa chữa / Báo sự cố">
      <form onSubmit={onSubmit}>
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label className="form-label" style={{ margin: 0 }}>Chọn Thiết bị gặp sự cố *</label>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 8px', fontSize: '12px', borderColor: 'var(--border-color)' }}
              onClick={() => setShowScanner(true)}
            >
              <QrCode size={14} /> Quét mã QR
            </button>
          </div>
          {showScanner ? (
            <div style={{ marginBottom: '12px' }}>
              <QRScanner onScanSuccess={onQRScan} onClose={() => setShowScanner(false)} />
            </div>
          ) : (
            <select 
              className="form-select" 
              required 
              value={formData.equipmentId} 
              onChange={(e) => setFormData({ ...formData, equipmentId: e.target.value, functionalUnitId: '' })}
            >
              {equipmentList.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  [{eq.code}] {eq.name} - {eq.location}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Cụm chức năng gặp lỗi (Load theo thiết bị đã chọn) */}
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cpu size={15} style={{ color: '#2563eb' }} />
              <span>Cụm chức năng lỗi (Tùy chọn)</span>
            </label>
            {loadingUnits && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Đang tải danh sách cụm...
              </span>
            )}
          </div>
          <select
            className="form-select"
            value={formData.functionalUnitId}
            onChange={(e) => setFormData({ ...formData, functionalUnitId: e.target.value })}
            disabled={loadingUnits}
          >
            <option value="">-- Toàn bộ thiết bị / Chưa phân loại cụm --</option>
            {functionalUnits.map((fu) => (
              <option key={fu.id} value={fu.id}>
                {fu.code ? `[${fu.code}] ` : ''}{fu.name} {fu.libraryItem?.category ? `(${fu.libraryItem.category})` : ''}
              </option>
            ))}
          </select>
          {formData.equipmentId && functionalUnits.length === 0 && !loadingUnits && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              💡 Thiết bị này chưa được cấu hình cụm chức năng riêng lẻ (sự cố sẽ áp dụng cho toàn bộ máy).
            </div>
          )}
          {formData.functionalUnitId && (
            <div style={{ fontSize: '11px', color: '#2563eb', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              ✓ Đã chọn cụm sự cố: <strong>{functionalUnits.find(u => u.id === formData.functionalUnitId)?.name}</strong>
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Tên sự cố / Tiêu đề ngắn *</label>
          <input type="text" className="form-input" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Băng tải kêu rít, Máy dừng đột ngột..." />
        </div>

        <div className="form-group">
          <label className="form-label">Mức độ ưu tiên</label>
          <select className="form-select" value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}>
            <option value="URGENT">Khẩn cấp (Dừng sản xuất)</option>
            <option value="HIGH">Cao</option>
            <option value="MEDIUM">Trung bình</option>
            <option value="LOW">Thấp</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Mô tả chi tiết hiện trạng hư hỏng *</label>
          <textarea className="form-textarea" required rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Hiện tượng, thời điểm xảy ra..." />
        </div>

        <div className="modal-footer" style={{ padding: 0, marginTop: '20px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
          <button type="submit" className="btn btn-primary">Gửi Yêu cầu</button>
        </div>
      </form>
    </Modal>
  );
};
