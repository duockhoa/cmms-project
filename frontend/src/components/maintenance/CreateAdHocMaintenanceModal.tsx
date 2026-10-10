import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, Cpu, Wrench, Calendar, CheckSquare, User, AlertCircle, Loader2, Check } from 'lucide-react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { useToast } from '../common/Toast';

interface CreateAdHocMaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  equipmentList: any[];
  technicians: any[];
  checklistTemplates?: any[];
  defaultDate?: string;
}

export const CreateAdHocMaintenanceModal: React.FC<CreateAdHocMaintenanceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  equipmentList,
  technicians,
  checklistTemplates = [],
  defaultDate,
}) => {
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [equipmentId, setEquipmentId] = useState('');
  const [plannedDate, setPlannedDate] = useState(defaultDate || new Date().toISOString().split('T')[0]);
  const [priority, setPriority] = useState('MEDIUM');
  const [assignedTechnicianIds, setAssignedTechnicianIds] = useState<string[]>([]);

  // Equipment search dropdown state
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Technician search dropdown state
  const [techSearchQuery, setTechSearchQuery] = useState('');
  const [isTechDropdownOpen, setIsTechDropdownOpen] = useState(false);
  const techDropdownRef = useRef<HTMLDivElement>(null);
  const techSearchInputRef = useRef<HTMLInputElement>(null);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (techDropdownRef.current && !techDropdownRef.current.contains(e.target as Node)) {
        setIsTechDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset fields when opened
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setEquipmentId(equipmentList[0]?.id || '');
      setPlannedDate(defaultDate || new Date().toISOString().split('T')[0]);
      setPriority('MEDIUM');
      setAssignedTechnicianIds([]);
      setSearchQuery('');
      setIsDropdownOpen(false);
      setTechSearchQuery('');
      setIsTechDropdownOpen(false);
    }
  }, [isOpen, defaultDate, equipmentList]);

  const removeAccents = (str: string) =>
    str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const selectedEquipment = useMemo(() => {
    return equipmentList.find((eq) => eq.id === equipmentId);
  }, [equipmentList, equipmentId]);

  const filteredEquipment = useMemo(() => {
    if (!searchQuery.trim()) return equipmentList;
    const q = removeAccents(searchQuery.trim());
    return equipmentList.filter((eq) => {
      const name = removeAccents(eq.name || '');
      const code = removeAccents(eq.code || '');
      const loc = removeAccents(eq.location || '');
      return name.includes(q) || code.includes(q) || loc.includes(q);
    });
  }, [equipmentList, searchQuery]);

  const selectedTechnicians = useMemo(() => {
    return technicians.filter((t) => assignedTechnicianIds.includes(t.id));
  }, [technicians, assignedTechnicianIds]);

  const handleToggleTech = (techId: string) => {
    setAssignedTechnicianIds((prev) =>
      prev.includes(techId) ? prev.filter((id) => id !== techId) : [...prev, techId]
    );
  };

  const filteredTechnicians = useMemo(() => {
    if (!techSearchQuery.trim()) return technicians.slice(0, 80);
    const q = removeAccents(techSearchQuery.trim());
    return technicians.filter((t) => {
      const name = removeAccents(t.name || '');
      const dept = removeAccents(t.department || '');
      const specialty = removeAccents(t.specialty || '');
      const role = removeAccents(t.role || '');
      const email = removeAccents(t.email || '');
      return name.includes(q) || dept.includes(q) || specialty.includes(q) || role.includes(q) || email.includes(q);
    });
  }, [technicians, techSearchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipmentId) {
      toast.warning('Thiếu thông tin', 'Vui lòng chọn thiết bị cần bảo trì');
      return;
    }
    if (!title.trim()) {
      toast.warning('Thiếu thông tin', 'Vui lòng nhập tên công việc bảo trì');
      return;
    }

    setSaving(true);
    try {
      await api.createWorkOrder({
        title: title.trim(),
        description: description.trim() || `Công việc bảo trì đột xuất / phát sinh cho ${selectedEquipment?.name || 'thiết bị'}`,
        equipmentId,
        plannedStartDate: new Date(plannedDate).toISOString(),
        priority,
        assignedTechnicianId: assignedTechnicianIds[0] || undefined,
        assignedTechnicianIds: assignedTechnicianIds.length > 0 ? assignedTechnicianIds : undefined,
        technicianName: selectedTechnicians.map((t) => t.name).join(', ') || undefined,
        handlingRoute: 'TECHNICAL_MAINTENANCE_SUPPORT',
        classificationResult: 'MAINTENANCE_REQUIRED',
        status: assignedTechnicianIds.length > 0 ? 'ASSIGNED' : 'PENDING',
      });

      toast.success('Thành công', 'Tạo lịch bảo trì thành công!');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error('Lỗi tạo lịch bảo trì', err.message || 'Không thể tạo công việc');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tạo lịch bảo trì"
      maxWidth="620px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Thiết bị cần bảo trì */}
        <div className="form-group" ref={dropdownRef} style={{ position: 'relative' }}>
          <label className="form-label" style={{ fontWeight: 600 }}>
            Thiết bị cần bảo trì <span style={{ color: 'var(--danger, #ef4444)' }}>*</span>
          </label>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              border: isDropdownOpen ? '2px solid var(--primary, #2563eb)' : '1px solid var(--border-color, #cbd5e1)',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-card, #ffffff)',
              cursor: 'pointer',
              minHeight: '40px',
              transition: 'border-color 0.15s ease',
            }}
            onClick={() => {
              setIsDropdownOpen(!isDropdownOpen);
              setTimeout(() => searchInputRef.current?.focus(), 50);
            }}
          >
            {selectedEquipment ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                <span
                  style={{
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {selectedEquipment.code}
                </span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13.5px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {selectedEquipment.name}
                </span>
                {selectedEquipment.location && (
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    ({selectedEquipment.location})
                  </span>
                )}
              </div>
            ) : (
              <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '13.5px' }}>
                -- Bấm để tìm & chọn thiết bị --
              </span>
            )}

            <Search size={16} style={{ color: '#94a3b8', flexShrink: 0, marginLeft: '8px' }} />
          </div>

          {/* Dropdown list */}
          {isDropdownOpen && (
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
                zIndex: 9999,
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '8px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f8fafc' }}>
                <Search size={15} color="#64748b" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Nhập tên máy, mã thiết bị, khu vực để lọc..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    border: 'none',
                    outline: 'none',
                    width: '100%',
                    fontSize: '13px',
                    backgroundColor: 'transparent',
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '2px', color: '#94a3b8' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {filteredEquipment.length === 0 ? (
                  <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '12.5px' }}>
                    Không tìm thấy thiết bị phù hợp
                  </div>
                ) : (
                  filteredEquipment.map((eq) => {
                    const isSelected = eq.id === equipmentId;
                    return (
                      <div
                        key={eq.id}
                        onClick={() => {
                          setEquipmentId(eq.id);
                          setIsDropdownOpen(false);
                        }}
                        style={{
                          padding: '8px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background-color 0.1s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isSelected ? '#eff6ff' : '#f8fafc')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isSelected ? '#eff6ff' : '#ffffff')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                          <span
                            style={{
                              backgroundColor: isSelected ? '#2563eb' : '#e2e8f0',
                              color: isSelected ? '#ffffff' : '#334155',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                            }}
                          >
                            {eq.code}
                          </span>
                          <span style={{ fontSize: '13px', fontWeight: isSelected ? 700 : 500, color: isSelected ? '#1d4ed8' : '#1e293b' }}>
                            {eq.name}
                          </span>
                        </div>
                        {eq.location && (
                          <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                            {eq.location}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tiêu đề công việc bảo trì */}
        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 600 }}>
            Tên công việc bảo trì <span style={{ color: 'var(--danger, #ef4444)' }}>*</span>
          </label>
          <input
            type="text"
            className="form-input"
            required
            placeholder="Ví dụ: Bảo dưỡng đột xuất cụm nén khí, Siết bu-lông và tra mỡ gối đỡ..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* Ngày dự kiến & Mức ưu tiên */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>
              Ngày thực hiện dự kiến <span style={{ color: 'var(--danger, #ef4444)' }}>*</span>
            </label>
            <input
              type="date"
              className="form-input"
              required
              value={plannedDate}
              onChange={(e) => setPlannedDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Mức độ ưu tiên</label>
            <select
              className="form-select"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="LOW">Thấp (LOW)</option>
              <option value="MEDIUM">Bình thường (MEDIUM)</option>
              <option value="HIGH">Ưu tiên cao (HIGH)</option>
              <option value="URGENT">Khẩn cấp (URGENT)</option>
            </select>
          </div>
        </div>

        {/* Kỹ thuật viên phụ trách (Chọn nhiều người) */}
        <div className="form-group" ref={techDropdownRef} style={{ position: 'relative' }}>
          <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={15} color="#2563eb" />
              <span>Kỹ thuật viên phụ trách</span>
              <span style={{ fontSize: '12px', fontWeight: 400, color: '#64748b' }}>
                (có thể chọn nhiều người)
              </span>
            </span>
            {assignedTechnicianIds.length > 0 && (
              <button
                type="button"
                onClick={() => setAssignedTechnicianIds([])}
                style={{
                  border: 'none',
                  background: 'none',
                  color: '#ef4444',
                  fontSize: '11.5px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                  fontWeight: 500,
                }}
              >
                Bỏ chọn tất cả ({assignedTechnicianIds.length})
              </button>
            )}
          </label>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 12px',
              border: isTechDropdownOpen ? '2px solid var(--primary, #2563eb)' : '1px solid var(--border-color, #cbd5e1)',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-card, #ffffff)',
              cursor: 'pointer',
              minHeight: '42px',
              transition: 'border-color 0.15s ease',
            }}
            onClick={() => {
              setIsTechDropdownOpen(!isTechDropdownOpen);
              setTimeout(() => techSearchInputRef.current?.focus(), 50);
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', flex: 1, padding: '2px 0' }}>
              {selectedTechnicians.length > 0 ? (
                selectedTechnicians.map((t) => (
                  <span
                    key={t.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      backgroundColor: '#eff6ff',
                      color: '#1d4ed8',
                      border: '1px solid #bfdbfe',
                      fontWeight: 600,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span
                      style={{
                        backgroundColor: '#dbeafe',
                        color: '#1e40af',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        fontSize: '10.5px',
                      }}
                    >
                      {t.department || t.specialty || t.role || 'Cơ Điện'}
                    </span>
                    <span>{t.name}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleTech(t.id);
                      }}
                      style={{
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        color: '#1d4ed8',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Bỏ chọn"
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))
              ) : (
                <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '13.5px' }}>
                  -- Nhấn để chọn kỹ thuật viên phụ trách (chọn được nhiều người) --
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: '8px' }}>
              <Search size={16} style={{ color: '#94a3b8' }} />
            </div>
          </div>

          {/* Dropdown list for Technicians */}
          {isTechDropdownOpen && (
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
                zIndex: 9999,
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '8px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f8fafc' }}>
                <Search size={15} color="#64748b" />
                <input
                  ref={techSearchInputRef}
                  type="text"
                  placeholder="Gõ tên hoặc chuyên môn để lọc nhanh..."
                  value={techSearchQuery}
                  onChange={(e) => setTechSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    border: 'none',
                    outline: 'none',
                    width: '100%',
                    fontSize: '13px',
                    backgroundColor: 'transparent',
                  }}
                />
                {techSearchQuery && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTechSearchQuery('');
                      techSearchInputRef.current?.focus();
                    }}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '2px', color: '#94a3b8' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                {filteredTechnicians.length === 0 ? (
                  <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '12.5px' }}>
                    Không tìm thấy kỹ thuật viên phù hợp
                  </div>
                ) : (
                  filteredTechnicians.map((t) => {
                    const isSelected = assignedTechnicianIds.includes(t.id);
                    return (
                      <div
                        key={t.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleTech(t.id);
                        }}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                          borderBottom: '1px solid #f1f5f9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'background-color 0.1s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span
                            style={{
                              backgroundColor: '#eff6ff',
                              color: '#2563eb',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                              border: '1px solid #bfdbfe',
                            }}
                          >
                            {t.department || t.specialty || t.role || 'Cơ Điện'}
                          </span>
                          <span style={{ fontWeight: isSelected ? 700 : 500, fontSize: '13px', color: '#1e293b' }}>
                            {t.name}
                          </span>
                        </div>
                        {isSelected && (
                          <span style={{ fontSize: '11.5px', color: '#2563eb', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Check size={14} /> Đã chọn
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#f8fafc',
                  borderTop: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Đã chọn: <strong style={{ color: '#2563eb' }}>{assignedTechnicianIds.length}</strong> người
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsTechDropdownOpen(false);
                  }}
                  style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                    padding: '3px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: '#1e293b',
                  }}
                >
                  Xong
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mô tả chi tiết */}
        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 600 }}>
            Nội dung công việc chi tiết / Yêu cầu kỹ thuật
          </label>
          <textarea
            className="form-input"
            rows={3}
            placeholder="Mô tả các hạng mục kiểm tra, linh kiện cần thay thế hoặc lưu ý an toàn..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ padding: 0, marginTop: '8px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Hủy
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : 'Tạo lịch bảo trì'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
