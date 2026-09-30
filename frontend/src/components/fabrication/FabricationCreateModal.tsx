import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  X, Plus, Trash2, Hammer, Calendar, Clock, User, 
  MapPin, Cpu, Building2, FileText, Wrench, Package, Flag, Search, Check
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../common/Toast';

interface FabricationCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  technicians: any[];
  equipments: any[];
  departments?: string[];
  onDepartmentChange?: (department: string) => void;
}

export const FabricationCreateModal: React.FC<FabricationCreateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  technicians,
  equipments,
  departments = [],
  onDepartmentChange,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('FABRICATION');
  const [priority, setPriority] = useState('MEDIUM');
  const [description, setDescription] = useState('');
  const [specifications, setSpecifications] = useState('');
  const [location, setLocation] = useState('');
  const [targetDepartment, setTargetDepartment] = useState('');
  const [selectedDept, setSelectedDept] = useState('xưởng cơ điện');

  // Thiết bị liên quan - tìm kiếm & lọc theo dữ liệu nhập
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [equipmentSearchQuery, setEquipmentSearchQuery] = useState('');
  const [isEquipmentDropdownOpen, setIsEquipmentDropdownOpen] = useState(false);
  const equipmentDropdownRef = useRef<HTMLDivElement>(null);

  // Kỹ thuật viên - Chọn nhiều người (chỉ nhân viên cơ điện)
  const [selectedTechIds, setSelectedTechIds] = useState<string[]>([]);

  const [plannedStartDate, setPlannedStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [plannedEndDate, setPlannedEndDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState<number | string>(4);
  const [submitting, setSubmitting] = useState(false);

  const [materials, setMaterials] = useState<Array<{ materialName: string; quantity: number | string; unit: string; unitPrice: number | string }>>([
    { materialName: '', quantity: 1, unit: 'cái', unitPrice: '' },
  ]);

  const toast = useToast();

  // Lọc thiết bị theo từ khóa người dùng nhập vào
  const filteredEquipments = useMemo(() => {
    if (!equipmentSearchQuery.trim()) return equipments.slice(0, 30);
    const q = equipmentSearchQuery.toLowerCase().trim();
    return equipments.filter((eq) => {
      const code = (eq.code || '').toLowerCase();
      const name = (eq.name || '').toLowerCase();
      const loc = (eq.location || '').toLowerCase();
      return code.includes(q) || name.includes(q) || loc.includes(q);
    });
  }, [equipments, equipmentSearchQuery]);

  const selectedEquipment = useMemo(() => {
    return equipments.find((eq) => eq.id === selectedEquipmentId);
  }, [equipments, selectedEquipmentId]);

  // Click outside to close equipment search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (equipmentDropdownRef.current && !equipmentDropdownRef.current.contains(e.target as Node)) {
        setIsEquipmentDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const handleToggleTech = (techId: string) => {
    if (selectedTechIds.includes(techId)) {
      setSelectedTechIds(selectedTechIds.filter((id) => id !== techId));
    } else {
      setSelectedTechIds([...selectedTechIds, techId]);
    }
  };

  const handleAddMaterial = () => {
    setMaterials([...materials, { materialName: '', quantity: 1, unit: 'cái', unitPrice: '' }]);
  };

  const handleRemoveMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const handleMaterialChange = (index: number, field: string, value: any) => {
    const updated = [...materials];
    (updated[index] as any)[field] = value;
    setMaterials(updated);
  };

  const estimatedMaterialTotal = materials.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    return sum + (qty * price);
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.warning('Thiếu thông tin', 'Vui lòng nhập tên công việc');
      return;
    }
    if (!description.trim()) {
      toast.warning('Thiếu thông tin', 'Vui lòng nhập mô tả công việc');
      return;
    }

    setSubmitting(true);
    try {
      const validMaterials = materials
        .filter((m) => m.materialName.trim() !== '')
        .map((m) => ({
          materialName: m.materialName.trim(),
          quantity: Number(m.quantity) || 1,
          unit: m.unit.trim() || 'cái',
          unitPrice: Number(m.unitPrice) || 0,
        }));

      await api.createFabricationOrder({
        title: title.trim(),
        category,
        priority,
        description: description.trim(),
        specifications: specifications.trim() || undefined,
        location: location.trim() || undefined,
        targetDepartment: targetDepartment.trim() || undefined,
        equipmentId: selectedEquipmentId || undefined,
        assignedTechnicianId: selectedTechIds[0] || undefined,
        supporterIds: selectedTechIds.length > 1 ? selectedTechIds.slice(1) : undefined,
        plannedStartDate: plannedStartDate || undefined,
        plannedEndDate: plannedEndDate || undefined,
        estimatedHours: Number(estimatedHours) || 0,
        materials: validMaterials,
      });

      onSuccess();
    } catch (err: any) {
      console.error(err);
      toast.error('Lỗi', err.message || 'Không thể tạo công việc');
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'URGENT':
        return { label: 'Khẩn cấp', bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' };
      case 'HIGH':
        return { label: 'Cao', bg: '#ffedd5', color: '#c2410c', border: '#fdba74' };
      case 'MEDIUM':
        return { label: 'Bình thường', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
      default:
        return { label: 'Thấp', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
    }
  };

  const currentPriorityBadge = getPriorityBadge(priority);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '860px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          backgroundColor: '#ffffff',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Hammer size={19} />
            </div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
              Tạo công việc gia công & chế tạo
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body Form */}
        <form
          onSubmit={handleSubmit}
          style={{
            overflowY: 'auto',
            padding: '18px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {/* KHỐI 1: THÔNG TIN CHUNG */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '8px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#1e40af',
                  textTransform: 'uppercase',
                }}
              >
                <FileText size={14} /> 1. Thông tin chung
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: currentPriorityBadge.bg,
                  color: currentPriorityBadge.color,
                  border: `1px solid ${currentPriorityBadge.border}`,
                }}
              >
                {currentPriorityBadge.label}
              </span>
            </div>

            {/* Tên công việc (Full width) */}
            <div>
              <label style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px', display: 'block', color: '#1e293b' }}>
                Tên công việc <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="VD: Gia công bàn inox, xe đẩy khay, tiện chốt..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                style={{ width: '100%', fontSize: '13.5px', padding: '8px 12px', backgroundColor: '#ffffff' }}
              />
            </div>

            {/* Phân loại & Độ ưu tiên */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontWeight: 600, fontSize: '12.5px', marginBottom: '4px', display: 'block', color: '#475569' }}>
                  Phân loại
                </label>
                <select
                  className="form-input"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ width: '100%', fontSize: '13px', padding: '7.5px 10px', backgroundColor: '#ffffff' }}
                >
                  <option value="FABRICATION">Gia công cơ khí</option>
                  <option value="NEW_MAKING">Chế tạo mới</option>
                  <option value="MODIFICATION">Cải tiến kỹ thuật</option>
                  <option value="INSTALLATION">Lắp đặt / Di dời</option>
                  <option value="INFRASTRUCTURE">Cơ sở hạ tầng</option>
                  <option value="OTHER">Khác</option>
                </select>
              </div>

              <div>
                <label style={{ fontWeight: 600, fontSize: '12.5px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px', color: '#475569' }}>
                  <Flag size={13} /> Độ ưu tiên
                </label>
                <select
                  className="form-input"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  style={{ width: '100%', fontSize: '13px', padding: '7.5px 10px', backgroundColor: '#ffffff' }}
                >
                  <option value="LOW">Thấp</option>
                  <option value="MEDIUM">Bình thường</option>
                  <option value="HIGH">Cao</option>
                  <option value="URGENT">Khẩn cấp</option>
                </select>
              </div>
            </div>

            {/* Bộ phận yêu cầu, Vị trí, Thiết bị liên quan (Lọc theo dữ liệu nhập) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.3fr', gap: '12px' }}>
              <div>
                <label style={{ fontWeight: 600, fontSize: '12.5px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px', color: '#475569' }}>
                  <Building2 size={13} /> Bộ phận yêu cầu
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="VD: Đóng gói, QC, Kho..."
                  value={targetDepartment}
                  onChange={(e) => setTargetDepartment(e.target.value)}
                  style={{ width: '100%', fontSize: '13px', padding: '7.5px 10px', backgroundColor: '#ffffff' }}
                />
              </div>

              <div>
                <label style={{ fontWeight: 600, fontSize: '12.5px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px', color: '#475569' }}>
                  <MapPin size={13} /> Vị trí
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="VD: Phòng sạch A1, Xưởng B..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  style={{ width: '100%', fontSize: '13px', padding: '7.5px 10px', backgroundColor: '#ffffff' }}
                />
              </div>

              {/* Ô TÌM KIẾM & LỌC THIẾT BỊ LIÊN QUAN */}
              <div ref={equipmentDropdownRef} style={{ position: 'relative' }}>
                <label style={{ fontWeight: 600, fontSize: '12.5px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px', color: '#475569' }}>
                  <Cpu size={13} /> Thiết bị liên quan
                </label>

                {selectedEquipment ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '6px',
                      fontSize: '12.5px',
                    }}
                  >
                    <span style={{ fontWeight: 600, color: '#1d4ed8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      [{selectedEquipment.code}] {selectedEquipment.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEquipmentId('');
                        setEquipmentSearchQuery('');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#64748b',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Bỏ chọn"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}>
                      <Search size={13} />
                    </div>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Nhập mã hoặc tên thiết bị..."
                      value={equipmentSearchQuery}
                      onChange={(e) => {
                        setEquipmentSearchQuery(e.target.value);
                        setIsEquipmentDropdownOpen(true);
                      }}
                      onFocus={() => setIsEquipmentDropdownOpen(true)}
                      style={{ width: '100%', fontSize: '13px', padding: '7.5px 10px 7.5px 28px', backgroundColor: '#ffffff' }}
                    />
                  </div>
                )}

                {/* Danh sách kết quả lọc thiết bị */}
                {isEquipmentDropdownOpen && !selectedEquipmentId && (
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
                      maxHeight: '190px',
                      overflowY: 'auto',
                      zIndex: 1100,
                    }}
                  >
                    <div
                      onClick={() => {
                        setSelectedEquipmentId('');
                        setEquipmentSearchQuery('');
                        setIsEquipmentDropdownOpen(false);
                      }}
                      style={{
                        padding: '7px 10px',
                        fontSize: '12px',
                        color: '#64748b',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f1f5f9',
                        fontStyle: 'italic',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                    >
                      -- Không gắn thiết bị --
                    </div>
                    {filteredEquipments.length > 0 ? (
                      filteredEquipments.map((eq) => (
                        <div
                          key={eq.id}
                          onClick={() => {
                            setSelectedEquipmentId(eq.id);
                            setEquipmentSearchQuery('');
                            setIsEquipmentDropdownOpen(false);
                          }}
                          style={{
                            padding: '7px 10px',
                            fontSize: '12.5px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f8fafc',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1px',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#eff6ff')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                        >
                          <span style={{ fontWeight: 600, color: '#0f172a' }}>
                            [{eq.code}] {eq.name}
                          </span>
                          {eq.location && (
                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                              Vị trí: {eq.location}
                            </span>
                          )}
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '8px 10px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
                        Không có thiết bị phù hợp
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* KHỐI 2: PHÂN CÔNG & TIẾN ĐỘ */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '8px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#1e40af',
                textTransform: 'uppercase',
              }}
            >
              <User size={14} /> 2. Phân công & Tiến độ
            </div>

            {/* Hàng chọn nhiều nhân viên theo phòng ban */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontWeight: 600, fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '4px', color: '#475569', margin: 0 }}>
                    <User size={13} /> Nhân viên phụ trách (Bộ phận):
                  </label>
                  {departments && departments.length > 0 && (
                    <select
                      className="form-input"
                      value={selectedDept}
                      onChange={(e) => {
                        setSelectedDept(e.target.value);
                        onDepartmentChange?.(e.target.value);
                      }}
                      style={{
                        padding: '2px 8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#1d4ed8',
                        backgroundColor: '#eff6ff',
                        borderColor: '#bfdbfe',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        width: 'auto',
                      }}
                    >
                      <option value="xưởng cơ điện">xưởng cơ điện</option>
                      {departments
                        .filter((d) => d.toLowerCase() !== 'xưởng cơ điện')
                        .map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                    </select>
                  )}
                </div>
                {selectedTechIds.length > 0 && (
                  <span style={{ fontSize: '11.5px', color: '#2563eb', fontWeight: 600 }}>
                    Đã chọn {selectedTechIds.length} người
                  </span>
                )}
              </div>

              {/* Danh sách các nhân viên cơ điện dạng Check-tag dễ chọn */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  minHeight: '42px',
                  alignItems: 'center',
                }}
              >
                {technicians.map((tech) => {
                  const isSelected = selectedTechIds.includes(tech.id);
                  return (
                    <button
                      key={tech.id}
                      type="button"
                      onClick={() => handleToggleTech(tech.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: isSelected ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                        backgroundColor: isSelected ? '#eff6ff' : '#f8fafc',
                        color: isSelected ? '#1d4ed8' : '#475569',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isSelected ? <Check size={12} color="#2563eb" /> : <Plus size={12} color="#94a3b8" />}
                      <span>{tech.name}</span>
                      {tech.specialty && (
                        <span style={{ fontSize: '10.5px', opacity: 0.75 }}>
                          ({tech.specialty})
                        </span>
                      )}
                    </button>
                  );
                })}
                {technicians.length === 0 && (
                  <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                    Chưa có nhân viên cơ điện trong hệ thống
                  </span>
                )}
              </div>
            </div>

            {/* Hàng thời gian & giờ công */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontWeight: 600, fontSize: '12.5px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px', color: '#475569' }}>
                  <Calendar size={13} /> Ngày bắt đầu
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={plannedStartDate}
                  onChange={(e) => setPlannedStartDate(e.target.value)}
                  style={{ width: '100%', fontSize: '13px', padding: '7px 10px', backgroundColor: '#ffffff' }}
                />
              </div>

              <div>
                <label style={{ fontWeight: 600, fontSize: '12.5px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px', color: '#475569' }}>
                  <Calendar size={13} /> Hạn hoàn thành
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={plannedEndDate}
                  onChange={(e) => setPlannedEndDate(e.target.value)}
                  style={{ width: '100%', fontSize: '13px', padding: '7px 10px', backgroundColor: '#ffffff' }}
                />
              </div>

              <div>
                <label style={{ fontWeight: 600, fontSize: '12.5px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px', color: '#475569' }}>
                  <Clock size={13} /> Giờ công (h)
                </label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  className="form-input"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  style={{ width: '100%', fontSize: '13px', padding: '7px 10px', backgroundColor: '#ffffff', textAlign: 'center' }}
                />
              </div>
            </div>
          </div>

          {/* KHỐI 3: NỘI DUNG & QUY CÁCH */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '8px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#1e40af',
                textTransform: 'uppercase',
              }}
            >
              <Wrench size={14} /> 3. Nội dung & Quy cách
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontWeight: 600, fontSize: '12.5px', marginBottom: '4px', display: 'block', color: '#1e293b' }}>
                  Mô tả công việc <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Nội dung, mục tiêu công việc..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  style={{ width: '100%', fontSize: '13px', resize: 'vertical', minHeight: '75px', backgroundColor: '#ffffff' }}
                />
              </div>

              <div>
                <label style={{ fontWeight: 600, fontSize: '12.5px', marginBottom: '4px', display: 'block', color: '#1e293b' }}>
                  Quy cách / Kích thước / Vật liệu
                </label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="VD: Inox 304 tấm 1.5mm, hộp 40x40, Kích thước D1200xR800xC850mm..."
                  value={specifications}
                  onChange={(e) => setSpecifications(e.target.value)}
                  style={{ width: '100%', fontSize: '13px', resize: 'vertical', minHeight: '75px', backgroundColor: '#ffffff' }}
                />
              </div>
            </div>
          </div>

          {/* KHỐI 4: VẬT TƯ DỰ KIẾN */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#1e40af',
                  textTransform: 'uppercase',
                }}
              >
                <Package size={14} /> 4. Vật tư dự kiến
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAddMaterial}
                style={{
                  fontSize: '12px',
                  padding: '4px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: '#ffffff',
                }}
              >
                <Plus size={13} /> Thêm vật tư
              </button>
            </div>

            {/* Bảng danh sách vật tư */}
            <div
              style={{
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                backgroundColor: '#ffffff',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr
                    style={{
                      backgroundColor: '#f1f5f9',
                      borderBottom: '1px solid #e2e8f0',
                      textAlign: 'left',
                      color: '#475569',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    <th style={{ padding: '8px 12px' }}>Tên vật tư</th>
                    <th style={{ padding: '8px 8px', width: '80px', textAlign: 'center' }}>SL</th>
                    <th style={{ padding: '8px 8px', width: '80px', textAlign: 'center' }}>ĐVT</th>
                    <th style={{ padding: '8px 10px', width: '130px', textAlign: 'right' }}>Đơn giá (đ)</th>
                    <th style={{ padding: '8px 10px', width: '130px', textAlign: 'right' }}>Thành tiền</th>
                    <th style={{ padding: '8px 6px', width: '36px', textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((m, idx) => {
                    const rowTotal = (Number(m.quantity) || 0) * (Number(m.unitPrice) || 0);
                    return (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: idx < materials.length - 1 ? '1px solid #f1f5f9' : 'none',
                        }}
                      >
                        <td style={{ padding: '6px 10px' }}>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="VD: Inox hộp 40x40"
                            value={m.materialName}
                            onChange={(e) => handleMaterialChange(idx, 'materialName', e.target.value)}
                            style={{ width: '100%', fontSize: '12.5px', padding: '6px 8px' }}
                          />
                        </td>
                        <td style={{ padding: '6px 6px' }}>
                          <input
                            type="number"
                            min="0.1"
                            step="any"
                            className="form-input"
                            value={m.quantity}
                            onChange={(e) => handleMaterialChange(idx, 'quantity', e.target.value)}
                            style={{ width: '100%', fontSize: '12.5px', padding: '6px 8px', textAlign: 'center' }}
                          />
                        </td>
                        <td style={{ padding: '6px 6px' }}>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="cái"
                            value={m.unit}
                            onChange={(e) => handleMaterialChange(idx, 'unit', e.target.value)}
                            style={{ width: '100%', fontSize: '12.5px', padding: '6px 8px', textAlign: 'center' }}
                          />
                        </td>
                        <td style={{ padding: '6px 6px' }}>
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            className="form-input"
                            placeholder="0"
                            value={m.unitPrice}
                            onChange={(e) => handleMaterialChange(idx, 'unitPrice', e.target.value)}
                            style={{ width: '100%', fontSize: '12.5px', padding: '6px 8px', textAlign: 'right' }}
                          />
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600, color: '#0f172a', fontSize: '12.5px' }}>
                          {rowTotal > 0 ? `${rowTotal.toLocaleString('vi-VN')} đ` : '-'}
                        </td>
                        <td style={{ padding: '6px 6px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveMaterial(idx)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#94a3b8',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                            title="Xóa"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {estimatedMaterialTotal > 0 && (
                <div
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#f8fafc',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '12.5px',
                  }}
                >
                  <span style={{ color: '#64748b' }}>Tổng vật tư:</span>
                  <span style={{ fontWeight: 800, color: '#2563eb', fontSize: '14px' }}>
                    {estimatedMaterialTotal.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* FOOTER ACTIONS */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: '10px',
              borderTop: '1px solid #e2e8f0',
              paddingTop: '14px',
              marginTop: '4px',
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={submitting}
              style={{ padding: '8px 16px' }}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{
                minWidth: '140px',
                padding: '8px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontWeight: 600,
              }}
            >
              {submitting ? 'Đang tạo...' : 'Tạo công việc'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
