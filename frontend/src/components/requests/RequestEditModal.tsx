import React from 'react';
import { Cpu } from 'lucide-react';
import { Modal } from '../common/Modal';

interface RequestEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingReq: any | null;
  editFormData: {
    equipmentId: string;
    functionalUnitId: string;
    title: string;
    description: string;
    priority: string;
  };
  setEditFormData: React.Dispatch<React.SetStateAction<RequestEditModalProps['editFormData']>>;
  equipmentList: any[];
  editFunctionalUnits: any[];
  loadingEditUnits: boolean;
  isSubmittingEdit: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const RequestEditModal: React.FC<RequestEditModalProps> = ({
  isOpen,
  onClose,
  editingReq,
  editFormData,
  setEditFormData,
  equipmentList,
  editFunctionalUnits,
  loadingEditUnits,
  isSubmittingEdit,
  onSubmit,
}) => {
  if (!isOpen || !editingReq) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`Chỉnh sửa Yêu cầu: ${editingReq?.requestCode || ''}`}
    >
      <form onSubmit={onSubmit}>
        <div className="form-group">
          <label className="form-label">Thiết bị gặp sự cố *</label>
          <select 
            className="form-select" 
            required 
            value={editFormData.equipmentId} 
            onChange={(e) => setEditFormData({ ...editFormData, equipmentId: e.target.value, functionalUnitId: '' })}
          >
            {equipmentList.map((eq) => (
              <option key={eq.id} value={eq.id}>
                [{eq.code}] {eq.name} - {eq.location}
              </option>
            ))}
          </select>
        </div>

        {/* Cụm chức năng gặp lỗi */}
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cpu size={15} style={{ color: '#2563eb' }} />
              <span>Cụm chức năng lỗi (Tùy chọn)</span>
            </label>
            {loadingEditUnits && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Đang tải danh sách cụm...
              </span>
            )}
          </div>
          <select
            className="form-select"
            value={editFormData.functionalUnitId}
            onChange={(e) => setEditFormData({ ...editFormData, functionalUnitId: e.target.value })}
            disabled={loadingEditUnits}
          >
            <option value="">-- Toàn bộ thiết bị / Chưa phân loại cụm --</option>
            {editFunctionalUnits.map((fu) => (
              <option key={fu.id} value={fu.id}>
                {fu.code ? `[${fu.code}] ` : ''}{fu.name} {fu.libraryItem?.category ? `(${fu.libraryItem.category})` : ''}
              </option>
            ))}
          </select>
          {editFormData.functionalUnitId && (
            <div style={{ fontSize: '11px', color: '#2563eb', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              ✓ Cụm đã chọn: <strong>{editFunctionalUnits.find(u => u.id === editFormData.functionalUnitId)?.name || 'Cụm chức năng'}</strong>
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Tên sự cố / Tiêu đề ngắn *</label>
          <input 
            type="text" 
            className="form-input" 
            required 
            value={editFormData.title} 
            onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })} 
            placeholder="Băng tải kêu rít, Máy dừng đột ngột..." 
          />
        </div>

        <div className="form-group">
          <label className="form-label">Mức độ ưu tiên</label>
          <select 
            className="form-select" 
            value={editFormData.priority} 
            onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value })}
          >
            <option value="URGENT">Khẩn cấp (Dừng sản xuất)</option>
            <option value="HIGH">Cao</option>
            <option value="MEDIUM">Trung bình</option>
            <option value="LOW">Thấp</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Mô tả chi tiết hiện trạng hư hỏng</label>
          <textarea 
            className="form-textarea" 
            rows={3} 
            value={editFormData.description} 
            onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })} 
            placeholder="Hiện tượng, thời điểm xảy ra..." 
          />
        </div>

        <div className="modal-footer" style={{ padding: 0, marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onClose}
            disabled={isSubmittingEdit}
          >
            Hủy
          </button>
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={isSubmittingEdit}
          >
            {isSubmittingEdit ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
