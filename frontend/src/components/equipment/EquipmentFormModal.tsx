import React, { useState } from 'react';
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
}

export const EquipmentFormModal: React.FC<EquipmentFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Thêm thiết bị mới">
      <form onSubmit={handleSubmit}>
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
          <button type="submit" className="btn btn-primary">Thêm mới</button>
        </div>
      </form>
    </Modal>
  );
};
