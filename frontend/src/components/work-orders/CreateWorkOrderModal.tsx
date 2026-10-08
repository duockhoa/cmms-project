import React from 'react';
import { Plus, X, Check, Users } from 'lucide-react';
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
  const update = (field: string, value: any) => onChange((current: any) => ({ ...current, [field]: value }));

  const selectedIds: string[] = Array.isArray(formData.assignedTechnicianIds) ? formData.assignedTechnicianIds : [];

  const handleToggleTech = (techId: string) => {
    let newIds: string[];
    if (selectedIds.includes(techId)) {
      newIds = selectedIds.filter((id) => id !== techId);
    } else {
      newIds = [...selectedIds, techId];
    }
    const names = newIds.map((id) => technicians.find((t) => t.id === id)?.name).filter(Boolean);
    onChange((current: any) => ({
      ...current,
      assignedTechnicianIds: newIds,
      assignedTechnicianId: newIds[0] || '',
      technicianName: names.join(', '),
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tạo phiếu sửa chữa (Work Order)" maxWidth="680px">
      <form onSubmit={onSubmit}>
        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 600 }}>Tiêu đề công việc *</label>
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
            <label className="form-label" style={{ fontWeight: 600 }}>Thiết bị *</label>
            <select className="form-select" required value={formData.equipmentId} onChange={(event) => update('equipmentId', event.target.value)}>
              <option value="">-- Chọn thiết bị sự cố --</option>
              {equipmentList.map((equipment) => (
                <option key={equipment.id} value={equipment.id}>
                  [{equipment.code}] {equipment.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Loại công việc</label>
            <select className="form-select" value={formData.workOrderType} onChange={(event) => update('workOrderType', event.target.value)}>
              <option value="Sửa chữa">Sửa chữa đột xuất</option>
              <option value="Bảo trì phòng ngừa">Bảo trì phòng ngừa</option>
              <option value="Kiểm tra">Kiểm tra định kỳ</option>
            </select>
          </div>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Mức ưu tiên</label>
            <select className="form-select" value={formData.priority} onChange={(event) => update('priority', event.target.value)}>
              <option value="LOW">Thấp</option>
              <option value="MEDIUM">Trung bình</option>
              <option value="HIGH">Cao</option>
              <option value="URGENT">Khẩn cấp</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Hạn hoàn thành dự kiến</label>
            <input
              type="datetime-local"
              className="form-input"
              value={formData.plannedEndDate || ''}
              onChange={(event) => update('plannedEndDate', event.target.value)}
            />
          </div>
        </div>

        {/* Khối phân công nhiều nhân sự cùng làm */}
        <div
          className="form-group"
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '12px 14px',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label
              className="form-label"
              style={{
                marginBottom: 0,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#1e293b',
              }}
            >
              <Users size={15} color="#2563eb" /> Phân công nhân sự thực hiện (Có thể chọn nhiều người)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                Đã chọn: <strong style={{ color: '#2563eb' }}>{selectedIds.length}</strong> người
              </span>
              {selectedIds.length > 0 && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '2px 8px', fontSize: '11px' }}
                  onClick={() => {
                    onChange((current: any) => ({
                      ...current,
                      assignedTechnicianIds: [],
                      assignedTechnicianId: '',
                      technicianName: '',
                    }));
                  }}
                >
                  Bỏ chọn tất cả
                </button>
              )}
            </div>
          </div>

          {/* Badges danh sách người đã chọn */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              minHeight: '34px',
              padding: '6px 8px',
              backgroundColor: '#ffffff',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              marginBottom: '10px',
            }}
          >
            {selectedIds.length === 0 ? (
              <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', alignSelf: 'center' }}>
                Chưa phân công nhân sự (có thể phân công sau khi tạo phiếu)
              </span>
            ) : (
              selectedIds.map((techId) => {
                const tech = technicians.find((t) => t.id === techId);
                return (
                  <span
                    key={techId}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      backgroundColor: '#eff6ff',
                      color: '#1d4ed8',
                      border: '1px solid #bfdbfe',
                      fontWeight: 600,
                    }}
                  >
                    {tech ? tech.name : techId}
                    <button
                      type="button"
                      onClick={() => handleToggleTech(techId)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        color: '#1d4ed8',
                      }}
                      title="Bỏ chọn"
                    >
                      <X size={13} />
                    </button>
                  </span>
                );
              })
            )}
          </div>

          {/* Danh sách các nhân sự kỹ thuật dạng Check-tag */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              maxHeight: '120px',
              overflowY: 'auto',
              padding: '2px',
            }}
          >
            {technicians.map((t) => {
              const isSelected = selectedIds.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleToggleTech(t.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: isSelected ? '1px solid #3b82f6' : '1px solid #cbd5e1',
                    backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                    color: isSelected ? '#1d4ed8' : '#334155',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {isSelected ? <Check size={12} color="#2563eb" /> : <Plus size={12} color="#94a3b8" />}
                  <span>{t.name}</span>
                  {t.specialty && (
                    <span style={{ fontSize: '10.5px', opacity: 0.75 }}>
                      ({t.specialty})
                    </span>
                  )}
                </button>
              );
            })}
            {technicians.length === 0 && (
              <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                Đang tải danh sách nhân sự kỹ thuật...
              </span>
            )}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 600 }}>Mô tả sự cố / nội dung công việc *</label>
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
