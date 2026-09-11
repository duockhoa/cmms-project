import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { api, fetchWithAuth } from '../../services/api';

const API_BASE = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

interface EquipmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    category: string;
    department?: string;
    status: string;
    location: string;
    serialNumber: string;
    specs: string;
    code: string;
    accountingCode?: string;
  }) => void;
  initialData?: any;
}

export const EquipmentFormModal: React.FC<EquipmentFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [locationsList, setLocationsList] = useState<any[]>([]);
  const [departmentsList, setDepartmentsList] = useState<string[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    department: '',
    status: 'OPERATIONAL',
    location: '',
    serialNumber: '',
    specs: '',
    code: '',
    accountingCode: '',
  });

  // Fetch categories, locations, and departments from HRM/DB
  const loadOptions = async () => {
    try {
      setLoadingOptions(true);
      const [categories, locations, depts] = await Promise.all([
        fetchWithAuth(`${API_BASE}/api/v1/equipment-categories`).then(r => r.ok ? r.json() : []).catch(() => []),
        fetchWithAuth(`${API_BASE}/api/v1/locations`).then(r => r.ok ? r.json() : []).catch(() => []),
        api.getDepartments().catch(() => []),
      ]);
      
      setCategoriesList(categories || []);
      setLocationsList(locations || []);
      setDepartmentsList(depts || []);
      
      // Set default dynamic values if creating new equipment
      if (!initialData) {
        setFormData(prev => ({
          ...prev,
          category: prev.category || categories?.[0]?.name || '',
          location: prev.location || locations?.[0]?.name || '',
        }));
      }
    } catch (err) {
      console.error('Failed to load settings options', err);
    } finally {
      setLoadingOptions(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadOptions().then(() => {
        if (initialData) {
          setFormData({
            name: initialData.name || '',
            category: initialData.category || '',
            department: initialData.department || '',
            status: initialData.status || 'OPERATIONAL',
            location: initialData.location || '',
            serialNumber: initialData.serialNumber || '',
            specs: initialData.specs || '',
            code: initialData.code || '',
            accountingCode: initialData.accountingCode || '',
          });
        }
      });
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: formData.name.trim(),
      category: formData.category,
      department: formData.department.trim() || undefined,
      status: formData.status,
      location: formData.location,
      serialNumber: formData.serialNumber.trim(),
      specs: formData.specs.trim(),
      code: formData.code.trim(),
      accountingCode: formData.accountingCode.trim() || undefined,
    });
    // Reset state after submit
    setFormData({
      name: '',
      category: categoriesList[0]?.name || '',
      department: '',
      status: 'OPERATIONAL',
      location: locationsList[0]?.name || '',
      serialNumber: '',
      specs: '',
      code: '',
      accountingCode: '',
    });
  };

  const isEdit = !!initialData;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? "Chỉnh sửa thiết bị" : "Thêm thiết bị mới"}>
      <form onSubmit={handleSubmit}>
        <div className="grid-2">
          {isEdit ? (
            <div className="form-group">
              <label className="form-label">Mã thiết bị (Không thể sửa)</label>
              <input 
                type="text" 
                className="form-input" 
                disabled 
                value={formData.code} 
              />
            </div>
          ) : (
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
            <label className="form-label">Mã phụ (Kế toán)</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Nhập mã kế toán (Tùy chọn)" 
              value={formData.accountingCode || ''} 
              onChange={(e) => setFormData({ ...formData, accountingCode: e.target.value })} 
            />
          </div>
        </div>

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
            <label className="form-label">Loại thiết bị</label>
            <select 
              className="form-select" 
              value={formData.category} 
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              <option value="">-- Chọn loại thiết bị --</option>
              {categoriesList.map((cat: any) => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Trạng thái hoạt động</label>
            <select 
              className="form-select" 
              value={formData.status} 
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="OPERATIONAL">Hoạt động tốt</option>
              <option value="UNDER_MAINTENANCE">Đang bảo trì</option>
              <option value="INCIDENT">Sự cố hỏng hóc</option>
            </select>
          </div>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Vị trí lắp đặt</label>
            <select 
              className="form-select" 
              value={formData.location} 
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            >
              <option value="">-- Chọn vị trí lắp đặt --</option>
              {locationsList.map((loc: any) => (
                <option key={loc.id} value={loc.name}>{loc.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Bộ phận quản lý (HRM)</label>
            <select 
              className="form-select" 
              value={formData.department} 
              onChange={(e) => setFormData({ ...formData, department: e.target.value })} 
            >
              <option value="">-- Chọn bộ phận (HRM) --</option>
              {departmentsList.map((dept: string) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Số serial</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Nhập số serial thiết bị" 
            value={formData.serialNumber} 
            onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })} 
          />
        </div>

        <div className="form-group">
          <label className="form-label">Mô tả thiết bị / Thông số kỹ thuật</label>
          <textarea 
            className="form-textarea" 
            rows={3} 
            placeholder="Nhập ghi chú hoặc thông số thiết bị" 
            value={formData.specs} 
            onChange={(e) => setFormData({ ...formData, specs: e.target.value })} 
          />
        </div>

        <div className="modal-footer" style={{ padding: 0, marginTop: '20px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
          <button type="submit" className="btn btn-primary" disabled={loadingOptions}>
            {isEdit ? "Lưu thay đổi" : "Thêm mới"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
