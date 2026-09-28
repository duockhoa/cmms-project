import React from 'react';
import { Modal } from '../common/Modal';

interface CreateScheduleModalProps {
  isOpen: boolean;
  editTarget: any | null;
  formData: any;
  equipmentList: any[];
  checklistTemplates: any[];
  technicians: any[];
  onChange: React.Dispatch<React.SetStateAction<any>>;
  onClose: () => void;
  onCreate: (event: React.FormEvent) => void;
  onUpdate: (event: React.FormEvent) => void;
}

export const CreateScheduleModal: React.FC<CreateScheduleModalProps> = ({
  isOpen,
  editTarget,
  formData,
  equipmentList,
  checklistTemplates,
  technicians,
  onChange,
  onClose,
  onCreate,
  onUpdate,
}) => {
  const update = (field: string, value: unknown) => onChange((current: any) => ({ ...current, [field]: value }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editTarget ? `Chỉnh sửa kế hoạch: ${editTarget.scheduleCode}` : 'Lập Kế hoạch Bảo trì Định kỳ mới'}
    >
      <form onSubmit={editTarget ? onUpdate : onCreate}>
        <div className="form-group">
          <label className="form-label">Tên Kế hoạch Bảo trì *</label>
          <input
            type="text"
            className="form-input"
            required
            value={formData.title}
            onChange={(event) => update('title', event.target.value)}
            placeholder="Ví dụ: Bảo dưỡng định kỳ máy dập viên hàng tháng..."
          />
        </div>

        <div className="form-group">
          <label className="form-label">Mô tả quy trình bảo dưỡng</label>
          <textarea
            className="form-textarea"
            rows={2}
            value={formData.description}
            onChange={(event) => update('description', event.target.value)}
            placeholder="Mô tả các hạng mục kiểm tra, bôi trơn, siết ốc, vệ sinh..."
          />
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Thiết bị áp dụng *</label>
            <select
              className="form-select"
              required
              disabled={Boolean(editTarget && editTarget.status !== 'DRAFT')}
              value={formData.equipmentId}
              onChange={(event) => update('equipmentId', event.target.value)}
            >
              {equipmentList.map((equipment) => <option key={equipment.id} value={equipment.id}>[{equipment.code}] {equipment.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Loại Chu kỳ *</label>
            <select className="form-select" value={formData.frequencyType} onChange={(event) => update('frequencyType', event.target.value)}>
              <option value="DAILY">Hàng ngày</option>
              <option value="WEEKLY">Hàng tuần</option>
              <option value="MONTHLY">Hàng tháng</option>
              <option value="QUARTERLY">Hàng quý (3 tháng)</option>
              <option value="YEARLY">Hàng năm</option>
              <option value="OPERATING_HOURS">Theo giờ vận hành máy</option>
            </select>
          </div>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Khoảng lặp (Interval) *</label>
            <input type="number" min="1" className="form-input" required value={formData.frequencyInterval} onChange={(event) => update('frequencyInterval', Math.max(1, Number(event.target.value)))} />
          </div>
          <div className="form-group">
            <label className="form-label">Ngày bắt đầu áp dụng *</label>
            <input type="date" className="form-input" required value={formData.startDate} onChange={(event) => update('startDate', event.target.value)} />
          </div>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Mẫu Checklist đính kèm</label>
            <select className="form-select" value={formData.checklistJson} onChange={(event) => update('checklistJson', event.target.value)}>
              <option value="">-- Không đính kèm checklist --</option>
              {checklistTemplates.map((template) => <option key={template.id} value={template.id}>[{template.code}] {template.name} ({template.items?.length || 0} mục kiểm tra)</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Kỹ thuật viên phụ trách</label>
            <select className="form-select" value={formData.assignedTechnicianId} onChange={(event) => update('assignedTechnicianId', event.target.value)}>
              <option value="">-- Chưa phân công --</option>
              {technicians.map((technician) => <option key={technician.id} value={technician.id}>{technician.name} ({technician.role})</option>)}
            </select>
          </div>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Tự động sinh phiếu (Auto Generate)</label>
            <select className="form-select" value={formData.autoGenerate ? 'true' : 'false'} onChange={(event) => update('autoGenerate', event.target.value === 'true')}>
              <option value="true">Có (Tự động sinh Work Order khi đến hạn)</option>
              <option value="false">Không (Chỉ sinh Work Order khi bấm thủ công)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Báo trước ngày đến hạn (Lead Time - ngày)</label>
            <input type="number" min="0" className="form-input" value={formData.leadTimeDays} onChange={(event) => update('leadTimeDays', Math.max(0, Number(event.target.value)))} />
          </div>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Thời gian dự kiến (phút)</label>
            <input type="number" min="15" step="15" className="form-input" value={formData.estimatedDurationMinutes} onChange={(event) => update('estimatedDurationMinutes', Number(event.target.value))} />
          </div>
          <div className="form-group">
            <label className="form-label">Mức ưu tiên mặc định</label>
            <select className="form-select" value={formData.defaultPriority} onChange={(event) => update('defaultPriority', event.target.value)}>
              <option value="LOW">Thấp</option><option value="MEDIUM">Trung bình</option><option value="HIGH">Cao</option><option value="URGENT">Khẩn cấp</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Ghi chú lưu ý khi thực hiện</label>
          <input type="text" className="form-input" value={formData.notes} onChange={(event) => update('notes', event.target.value)} placeholder="Lưu ý an toàn điện, ngắt nguồn máy, mang bảo hộ lao động..." />
        </div>

        <div className="modal-footer" style={{ padding: 0, marginTop: '20px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
          <button type="submit" className="btn btn-primary">{editTarget ? 'Lưu thay đổi' : 'Tạo Kế hoạch'}</button>
        </div>
      </form>
    </Modal>
  );
};
