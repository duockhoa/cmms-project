import React from 'react';
import { Plus } from 'lucide-react';
import { Modal } from '../common/Modal';

interface CreateWorkOrderModalProps {
  isOpen: boolean;
  formData: any;
  equipmentList: any[];
  technicians: any[];
  onChange: React.Dispatch<React.SetStateAction<any>>;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
}

export const CreateWorkOrderModal: React.FC<CreateWorkOrderModalProps> = ({
  isOpen,
  formData,
  equipmentList,
  technicians,
  onChange,
  onClose,
  onSubmit,
}) => {
  const update = (field: string, value: string) => onChange((current: any) => ({ ...current, [field]: value }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tạo phiếu sửa chữa (Work Order)">
      <form onSubmit={onSubmit}>
        <div className="form-group">
          <label className="form-label">Tiêu đề công việc *</label>
          <input
            type="text"
            className="form-input"
            required
            placeholder="Mô tả ngắn gọn công việc (VD: Thay vòng bi trục chính, Sửa rò rỉ khí nén...)"
            value={formData.title}
            onChange={(event) => update('title', event.target.value)}
          />
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Thiết bị *</label>
            <select className="form-select" required value={formData.equipmentId} onChange={(event) => update('equipmentId', event.target.value)}>
              {equipmentList.map((equipment) => <option key={equipment.id} value={equipment.id}>[{equipment.code}] {equipment.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Loại công việc</label>
            <select className="form-select" value={formData.workOrderType} onChange={(event) => update('workOrderType', event.target.value)}>
              <option value="Sửa chữa">Sửa chữa</option><option value="Bảo trì phòng ngừa">Bảo trì phòng ngừa</option><option value="Kiểm tra">Kiểm tra</option>
            </select>
          </div>
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Mức ưu tiên</label>
            <select className="form-select" value={formData.priority} onChange={(event) => update('priority', event.target.value)}>
              <option value="LOW">Thấp</option><option value="MEDIUM">Trung bình</option><option value="HIGH">Cao</option><option value="URGENT">Khẩn cấp</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Kỹ thuật viên phụ trách</label>
            <select className="form-select" value={formData.technicianName} onChange={(event) => update('technicianName', event.target.value)}>
              <option value="">-- Chưa phân công --</option>
              {technicians.map((technician) => (
                <option key={technician.id} value={technician.name}>
                  {technician.name} ({technician.specialty || technician.role || 'KTV'}) - {technician.department || 'Chưa rõ'}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Mô tả sự cố / nội dung công việc *</label>
          <textarea
            className="form-textarea"
            rows={3}
            required
            placeholder="Mô tả chi tiết vấn đề hoặc các hạng mục cần thao tác xử lý..."
            value={formData.description}
            onChange={(event) => update('description', event.target.value)}
          />
        </div>
        <div className="modal-footer" style={{ padding: 0, marginTop: '20px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
          <button type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={15} /> Tạo phiếu sửa chữa
          </button>
        </div>
      </form>
    </Modal>
  );
};
