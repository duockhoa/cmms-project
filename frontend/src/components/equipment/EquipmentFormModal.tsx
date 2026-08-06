import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';

interface EquipmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    category: string;
    status: string;
    location: string;
    serialNumber: string;
    specs: string;
    code: string;
  }) => void;
  initialData?: any;
}

export const EquipmentFormModal: React.FC<EquipmentFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    category: 'Cơ khí',
    status: 'OPERATIONAL',
    location: '',
    serialNumber: '',
    specs: '',
    code: '',
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          name: initialData.name || '',
          category: initialData.category || 'Cơ khí',
          status: initialData.status || 'OPERATIONAL',
          location: initialData.location || '',
          serialNumber: initialData.serialNumber || '',
          specs: initialData.specs || '',
          code: initialData.code || '',
        });
      } else {
        setFormData({
          name: '',
          category: 'Cơ khí',
          status: 'OPERATIONAL',
          location: '',
          serialNumber: '',
          specs: '',
          code: '',
        });
      }
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      code: formData.code.trim() || `EQ-${Date.now().toString().slice(-4)}`
    });
    // Reset state after submit
    setFormData({
      name: '',
      category: 'Cơ khí',
      status: 'OPERATIONAL',
      location: '',
      serialNumber: '',
      specs: '',
      code: '',
    });
  };

  const isEdit = !!initialData;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? "Chỉnh sửa thiết bị" : "Thêm thiết bị mới"}>
      <form onSubmit={handleSubmit}>
        {isEdit && (
          <div className="form-group">
            <label className="form-label">Mã thiết bị (Không thể sửa)</label>
            <input 
              type="text" 
              className="form-input" 
              disabled 
              value={formData.code} 
            />
          </div>
        )}
        
        {!isEdit && (
          <div className="form-group">
            <label className="form-label">Mã thiết bị (Để trống tự sinh)</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Nhập mã thiết bị (ví dụ: EQ-0001)" 
              value={formData.code} 
              onChange={(e) => setFormData({ ...formData, code: e.target.value })} 
            />
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Tên thiết bị *</label>
          <input 
            type="text" 
            className="form-input" 
            required 
            placeholder="Nhập tên thiết bị" 
            value={formData.name} 
            onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
          />
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Loại</label>
            <select 
              className="form-select" 
              value={formData.category} 
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              <option value="Cơ khí">Cơ khí</option>
              <option value="Điện">Điện</option>
              <option value="Sản xuất">Sản xuất</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Trạng thái</label>
            <select 
              className="form-select" 
              value={formData.status} 
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="OPERATIONAL">Hoạt động</option>
              <option value="UNDER_MAINTENANCE">Cảnh báo</option>
              <option value="INCIDENT">Nguy hiểm</option>
            </select>
          </div>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Vị trí</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Vị trí lắp đặt" 
              value={formData.location} 
              onChange={(e) => setFormData({ ...formData, location: e.target.value })} 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Số serial</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Số serial" 
              value={formData.serialNumber} 
              onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })} 
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Mô tả thiết bị</label>
          <textarea 
            className="form-textarea" 
            rows={3} 
            placeholder="Mô tả thiết bị" 
            value={formData.specs} 
            onChange={(e) => setFormData({ ...formData, specs: e.target.value })} 
          />
        </div>

        <div className="modal-footer" style={{ padding: 0, marginTop: '20px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
          <button type="submit" className="btn btn-primary">{isEdit ? "Lưu thay đổi" : "Thêm mới"}</button>
        </div>
      </form>
    </Modal>
  );
};
