import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, Cpu } from 'lucide-react';
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

  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Click outside to close equipment search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset search when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setIsDropdownOpen(false);
    }
  }, [isOpen]);

  const removeAccents = (str: string) =>
    str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const selectedEquipment = useMemo(() => {
    return equipmentList.find((eq) => eq.id === formData.equipmentId);
  }, [equipmentList, formData.equipmentId]);

  const filteredEquipments = useMemo(() => {
    if (!searchQuery.trim()) return equipmentList.slice(0, 30);
    const q = removeAccents(searchQuery.trim());
    return equipmentList
      .filter((eq) => {
        const code = eq.code ? removeAccents(eq.code) : '';
        const name = eq.name ? removeAccents(eq.name) : '';
        const loc = eq.location ? removeAccents(eq.location) : '';
        const dept = eq.department ? removeAccents(eq.department) : '';
        const acc = eq.accountingCode ? removeAccents(eq.accountingCode) : '';
        return code.includes(q) || name.includes(q) || loc.includes(q) || dept.includes(q) || acc.includes(q);
      })
      .slice(0, 40);
  }, [equipmentList, searchQuery]);

  const isEquipmentDisabled = Boolean(editTarget && editTarget.status !== 'DRAFT');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.equipmentId) {
      setIsDropdownOpen(true);
      searchInputRef.current?.focus();
      return;
    }
    if (editTarget) {
      onUpdate(event);
    } else {
      onCreate(event);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editTarget ? `Chỉnh sửa kế hoạch: ${editTarget.scheduleCode}` : 'Lập Kế hoạch Bảo trì Định kỳ mới'}
    >
      <form onSubmit={handleSubmit}>
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
          <div className="form-group" ref={dropdownRef} style={{ position: 'relative' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cpu size={14} /> Thiết bị áp dụng *
            </label>

            {/* Hidden input to enforce HTML form validation if no equipment selected */}
            <input
              type="text"
              required
              value={formData.equipmentId || ''}
              onChange={() => {}}
              style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0, width: 0 }}
              tabIndex={-1}
              onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Vui lòng chọn thiết bị áp dụng')}
              onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
            />

            {isEquipmentDisabled ? (
              <div
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#475569',
                  fontWeight: 500,
                }}
              >
                {selectedEquipment ? `[${selectedEquipment.code}] ${selectedEquipment.name}` : '(Chưa chọn thiết bị)'}
              </div>
            ) : selectedEquipment ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 12px',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '6px',
                  fontSize: '13px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                  <span style={{ fontWeight: 600, color: '#1d4ed8', whiteSpace: 'nowrap' }}>
                    [{selectedEquipment.code}]
                  </span>
                  <span
                    style={{ color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={selectedEquipment.name}
                  >
                    {selectedEquipment.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    update('equipmentId', '');
                    setSearchQuery('');
                    setIsDropdownOpen(true);
                    setTimeout(() => searchInputRef.current?.focus(), 50);
                  }}
                  style={{
                    background: '#dbeafe',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    color: '#1d4ed8',
                    padding: '3px 8px',
                    fontSize: '12px',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    flexShrink: 0,
                    marginLeft: '8px',
                  }}
                  title="Thay đổi thiết bị khác"
                >
                  <X size={13} /> Thay đổi
                </button>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    pointerEvents: 'none',
                    display: 'flex',
                  }}
                >
                  <Search size={14} />
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  className="form-input"
                  placeholder="Gõ mã hoặc tên thiết bị để tìm nhanh..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  style={{ paddingLeft: '32px', width: '100%', fontSize: '13px' }}
                />
              </div>
            )}

            {/* Dropdown danh sách kết quả tìm kiếm */}
            {isDropdownOpen && !selectedEquipment && !isEquipmentDisabled && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '4px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  zIndex: 1100,
                }}
              >
                {filteredEquipments.length > 0 ? (
                  filteredEquipments.map((eq) => (
                    <div
                      key={eq.id}
                      onClick={() => {
                        update('equipmentId', eq.id);
                        setSearchQuery('');
                        setIsDropdownOpen(false);
                      }}
                      style={{
                        padding: '8px 12px',
                        fontSize: '13px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f1f5f9',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        transition: 'background-color 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#eff6ff')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 600, color: '#1d4ed8' }}>[{eq.code}]</span>
                        <span style={{ color: '#0f172a' }}>{eq.name}</span>
                      </div>
                      {(eq.location || eq.department) && (
                        <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                          {eq.department ? `Bộ phận: ${eq.department}` : ''}
                          {eq.department && eq.location ? ' • ' : ''}
                          {eq.location ? `Vị trí: ${eq.location}` : ''}
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '12px', fontSize: '13px', color: '#94a3b8', textAlign: 'center' }}>
                    Không tìm thấy thiết bị phù hợp
                  </div>
                )}
              </div>
            )}
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
