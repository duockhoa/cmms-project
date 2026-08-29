import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { 
  Sliders, Plus, Edit2, Trash2, Search, RefreshCw, 
  CheckSquare, Square, CheckCircle2, XCircle, QrCode, 
  ExternalLink, Layers, MapPin, Tag, ArrowRight, Gauge, CheckCheck
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { useToast, useConfirmDialog } from '../common/Toast';
import { useNavigate } from 'react-router-dom';

export const EquipmentParameterAssignTab: React.FC = () => {
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [standardParams, setStandardParams] = useState<any[]>([]);
  
  const [selectedEqId, setSelectedEqId] = useState<string>('');
  const [currentParams, setCurrentParams] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [paramsLoading, setParamsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Search & Filters for Equipment
  const [eqSearch, setEqSearch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('ALL');
  
  // Modal: Pick from Standard Library
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [selectedStandardIds, setSelectedStandardIds] = useState<string[]>([]);
  
  // Modal: Add / Edit Single Custom Parameter
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingParam, setEditingParam] = useState<any | null>(null);
  const [paramForm, setParamForm] = useState({
    name: '',
    unit: '',
    minSpec: '',
    maxSpec: '',
    standardValue: '',
    isActive: true,
  });

  const toast = useToast();
  const { confirm } = useConfirmDialog();
  const navigate = useNavigate();

  // 1. Initial Load
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [eqs, locs, standards] = await Promise.all([
        api.getEquipment().catch(() => []),
        api.getLocations().catch(() => []),
        api.getStandardParameters().catch(() => []),
      ]);
      const eqArray = Array.isArray(eqs) ? eqs : eqs.items || [];
      setEquipmentList(eqArray);
      setLocations(Array.isArray(locs) ? locs : []);
      setStandardParams(Array.isArray(standards) ? standards : []);

      if (eqArray.length > 0 && !selectedEqId) {
        setSelectedEqId(eqArray[0].id);
      }
    } catch (e: any) {
      toast.error('Lỗi tải dữ liệu', e.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Load parameters whenever selectedEqId changes
  useEffect(() => {
    if (selectedEqId) {
      loadEquipmentParameters(selectedEqId);
    } else {
      setCurrentParams([]);
    }
  }, [selectedEqId]);

  const loadEquipmentParameters = async (eqId: string) => {
    setParamsLoading(true);
    try {
      const data = await api.getEquipmentParameters(eqId);
      setCurrentParams(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast.error('Lỗi tải thông số', e.message);
    } finally {
      setParamsLoading(false);
    }
  };

  // Filtered Equipment List
  const filteredEquipment = useMemo(() => {
    return equipmentList.filter((eq) => {
      const matchLoc = selectedLocation === 'ALL' || eq.location === selectedLocation;
      const matchSearch =
        !eqSearch.trim() ||
        eq.code?.toLowerCase().includes(eqSearch.toLowerCase()) ||
        eq.name?.toLowerCase().includes(eqSearch.toLowerCase()) ||
        eq.category?.toLowerCase().includes(eqSearch.toLowerCase());
      return matchLoc && matchSearch;
    });
  }, [equipmentList, eqSearch, selectedLocation]);

  const selectedEquipment = useMemo(() => {
    return equipmentList.find((eq) => eq.id === selectedEqId);
  }, [equipmentList, selectedEqId]);

  // Filtered Standard Parameters for modal
  const filteredStandards = useMemo(() => {
    const existingNames = new Set(currentParams.map((p) => p.name.trim().toLowerCase()));
    return standardParams.filter((sp) => {
      const matchSearch =
        !librarySearch.trim() ||
        sp.name?.toLowerCase().includes(librarySearch.toLowerCase()) ||
        (sp.unit && sp.unit.toLowerCase().includes(librarySearch.toLowerCase())) ||
        (sp.description && sp.description.toLowerCase().includes(librarySearch.toLowerCase()));
      return matchSearch;
    }).map((sp) => ({
      ...sp,
      isAlreadyAdded: existingNames.has(sp.name.trim().toLowerCase()),
    }));
  }, [standardParams, librarySearch, currentParams]);

  // Open Standard Library Modal
  const handleOpenLibraryModal = () => {
    setLibrarySearch('');
    // Pre-select nothing or only not-yet-added items
    setSelectedStandardIds([]);
    setIsLibraryModalOpen(true);
  };

  // Toggle Standard Parameter Checkbox
  const toggleStandardSelect = (id: string) => {
    setSelectedStandardIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Select / Deselect All available standards
  const handleToggleSelectAll = () => {
    const available = filteredStandards.filter((s) => !s.isAlreadyAdded).map((s) => s.id);
    if (selectedStandardIds.length === available.length && available.length > 0) {
      setSelectedStandardIds([]);
    } else {
      setSelectedStandardIds(available);
    }
  };

  // Apply Selected Standard Parameters
  const handleApplySelectedStandards = async () => {
    if (selectedStandardIds.length === 0) {
      toast.error('Chưa chọn thông số', 'Vui lòng tích chọn ít nhất 1 thông số từ thư viện.');
      return;
    }

    setSaving(true);
    try {
      await api.bulkAssignEquipmentParameters(selectedEqId, selectedStandardIds);
      toast.success('Thành công', `Đã gán ${selectedStandardIds.length} thông số vào thiết bị.`);
      setIsLibraryModalOpen(false);
      loadEquipmentParameters(selectedEqId);
    } catch (e: any) {
      toast.error('Lỗi gán thông số', e.message);
    } finally {
      setSaving(false);
    }
  };

  // Open Add / Edit Single Parameter
  const handleOpenAddCustom = () => {
    setEditingParam(null);
    setParamForm({
      name: '',
      unit: '',
      minSpec: '',
      maxSpec: '',
      standardValue: '',
      isActive: true,
    });
    setIsEditModalOpen(true);
  };

  const handleOpenEditParam = (param: any) => {
    setEditingParam(param);
    setParamForm({
      name: param.name || '',
      unit: param.unit || '',
      minSpec: param.minSpec !== null && param.minSpec !== undefined ? String(param.minSpec) : '',
      maxSpec: param.maxSpec !== null && param.maxSpec !== undefined ? String(param.maxSpec) : '',
      standardValue: param.standardValue !== null && param.standardValue !== undefined ? String(param.standardValue) : '',
      isActive: param.isActive !== undefined ? param.isActive : true,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveParamForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paramForm.name.trim()) {
      toast.error('Thiếu thông tin', 'Vui lòng nhập tên thông số.');
      return;
    }

    const payload = {
      name: paramForm.name.trim(),
      unit: paramForm.unit.trim() || null,
      minSpec: paramForm.minSpec !== '' ? parseFloat(paramForm.minSpec) : null,
      maxSpec: paramForm.maxSpec !== '' ? parseFloat(paramForm.maxSpec) : null,
      standardValue: paramForm.standardValue !== '' ? parseFloat(paramForm.standardValue) : null,
      isActive: paramForm.isActive,
    };

    setSaving(true);
    try {
      if (editingParam) {
        await api.updateEquipmentParameter(selectedEqId, editingParam.id, payload);
        toast.success('Thành công', 'Đã cập nhật thông số.');
      } else {
        await api.createEquipmentParameter(selectedEqId, payload);
        toast.success('Thành công', 'Đã thêm thông số mới cho thiết bị.');
      }
      setIsEditModalOpen(false);
      loadEquipmentParameters(selectedEqId);
    } catch (e: any) {
      toast.error('Lỗi lưu thông số', e.message);
    } finally {
      setSaving(false);
    }
  };

  // Delete Parameter
  const handleDeleteParam = async (param: any) => {
    const ok = await confirm(
      'Xóa thông số theo dõi',
      `Bạn có chắc muốn xóa thông số "${param.name}" khỏi thiết bị này không?`
    );
    if (ok) {
      try {
        await api.deleteEquipmentParameter(selectedEqId, param.id);
        toast.success('Đã xóa', 'Đã gỡ thông số khỏi thiết bị.');
        loadEquipmentParameters(selectedEqId);
      } catch (e: any) {
        toast.error('Lỗi xóa thông số', e.message);
      }
    }
  };

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={20} style={{ color: 'var(--accent-blue, #2563eb)' }} />
            Thiết lập thông số kỹ thuật theo từng thiết bị
          </h3>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
            Tích chọn nhanh các thông số từ thư viện chuẩn để áp dụng cho thiết bị khi ghi Sổ vận hành & Quét mã QR.
          </p>
        </div>

        <button
          className="btn btn-secondary"
          onClick={loadInitialData}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Làm mới
        </button>
      </div>

      {/* Main Split View: Left Equipment List + Right Parameters Config */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        {/* Left: Equipment Selector */}
        <div
          style={{
            width: '320px',
            flexShrink: 0,
            backgroundColor: 'var(--bg-primary, #f8fafc)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            maxHeight: '680px',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
            Chọn thiết bị ({filteredEquipment.length})
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Tìm mã hoặc tên máy..."
              value={eqSearch}
              onChange={(e) => setEqSearch(e.target.value)}
              style={{ paddingLeft: '32px', height: '34px', fontSize: '12.5px' }}
            />
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
          </div>

          {/* Location Filter */}
          <select
            className="form-input"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            style={{ height: '34px', fontSize: '12px' }}
          >
            <option value="ALL">Tất cả phân xưởng</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.name}>
                {loc.name}
              </option>
            ))}
          </select>

          {/* List of Equipment */}
          <div
            style={{
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              paddingRight: '2px',
              maxHeight: '520px',
            }}
          >
            {filteredEquipment.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                Không tìm thấy thiết bị phù hợp.
              </div>
            ) : (
              filteredEquipment.map((eq) => {
                const isSelected = eq.id === selectedEqId;
                return (
                  <div
                    key={eq.id}
                    onClick={() => setSelectedEqId(eq.id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      border: isSelected
                        ? '1.5px solid var(--accent-blue, #2563eb)'
                        : '1px solid var(--border-color, #e2e8f0)',
                      backgroundColor: isSelected ? '#ffffff' : 'var(--bg-secondary, #ffffff)',
                      boxShadow: isSelected ? '0 2px 6px rgba(37, 99, 235, 0.12)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '12px',
                          color: isSelected ? '#2563eb' : 'var(--text-primary)',
                        }}
                      >
                        {eq.code}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {eq.category}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        lineHeight: 1.3,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {eq.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={11} /> {eq.location}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Parameters Workspace for Selected Equipment */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {selectedEquipment ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Selected Equipment Banner */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 18px',
                  backgroundColor: 'var(--bg-primary, #f8fafc)',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: '8px',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        color: '#2563eb',
                        fontWeight: 700,
                        fontSize: '12px',
                      }}
                    >
                      {selectedEquipment.code}
                    </span>
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {selectedEquipment.name}
                    </h4>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Vị trí: <strong>{selectedEquipment.location}</strong> &bull; Phân loại: <strong>{selectedEquipment.category}</strong>
                  </div>
                </div>

                {/* Quick actions for this machine */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => navigate(`/equipment/${selectedEquipment.id}/operation-log-form`)}
                    title="Mở form nhập sổ vận hành (giả lập quét QR)"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <QrCode size={14} /> Thử nhập Sổ vận hành
                  </button>

                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleOpenLibraryModal}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <CheckSquare size={14} /> + Tích chọn từ thư viện
                  </button>

                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleOpenAddCustom}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Plus size={14} /> Thông số riêng
                  </button>
                </div>
              </div>

              {/* Table of parameters for selected equipment */}
              {paramsLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  <RefreshCw size={22} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
                  Đang tải thông số của thiết bị...
                </div>
              ) : (
                <div
                  style={{
                    border: '1px solid var(--border-color, #e2e8f0)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    backgroundColor: 'var(--bg-secondary, #ffffff)',
                  }}
                >
                  <div style={{ overflowX: 'auto' }}>
                    <table className="custom-table" style={{ margin: 0, width: '100%' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '50px', textAlign: 'center' }}>STT</th>
                          <th style={{ minWidth: '180px' }}>Tên thông số</th>
                          <th style={{ width: '90px', textAlign: 'center' }}>Đơn vị</th>
                          <th style={{ width: '150px', textAlign: 'center' }}>Tiêu chuẩn Min / Max</th>
                          <th style={{ width: '120px', textAlign: 'center' }}>Giá trị chuẩn</th>
                          <th style={{ width: '110px', textAlign: 'center' }}>Trạng thái</th>
                          <th style={{ width: '90px', textAlign: 'center' }}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentParams.length > 0 ? (
                          currentParams.map((param, idx) => (
                            <tr key={param.id}>
                              <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                                {idx + 1}
                              </td>
                              <td>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>
                                  {param.name}
                                </div>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {param.unit ? (
                                  <span
                                    style={{
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      backgroundColor: 'var(--bg-hover, #f1f5f9)',
                                      fontSize: '11.5px',
                                      fontWeight: 600,
                                      border: '1px solid var(--border-color, #e2e8f0)',
                                    }}
                                  >
                                    {param.unit}
                                  </span>
                                ) : (
                                  '—'
                                )}
                              </td>
                              <td style={{ textAlign: 'center', fontSize: '12.5px', fontWeight: 600 }}>
                                {param.minSpec !== null && param.maxSpec !== null
                                  ? `${param.minSpec} ~ ${param.maxSpec}`
                                  : param.minSpec !== null
                                  ? `≥ ${param.minSpec}`
                                  : param.maxSpec !== null
                                  ? `≤ ${param.maxSpec}`
                                  : '—'}
                              </td>
                              <td style={{ textAlign: 'center', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                                {param.standardValue !== null && param.standardValue !== undefined
                                  ? param.standardValue
                                  : '—'}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '2px 8px',
                                    borderRadius: '10px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    backgroundColor: param.isActive ? 'rgba(22, 163, 74, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                                    color: param.isActive ? '#16a34a' : '#64748b',
                                  }}
                                >
                                  {param.isActive ? 'Đang theo dõi' : 'Tạm dừng'}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                  <button
                                    className="btn-icon"
                                    onClick={() => handleOpenEditParam(param)}
                                    title="Sửa ngưỡng / đơn vị"
                                    style={{
                                      padding: '5px',
                                      borderRadius: '4px',
                                      border: '1px solid var(--border-color, #e2e8f0)',
                                      backgroundColor: 'transparent',
                                      color: 'var(--accent-blue, #2563eb)',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                  <button
                                    className="btn-icon"
                                    onClick={() => handleDeleteParam(param)}
                                    title="Xóa thông số này"
                                    style={{
                                      padding: '5px',
                                      borderRadius: '4px',
                                      border: '1px solid var(--border-color, #e2e8f0)',
                                      backgroundColor: 'transparent',
                                      color: 'var(--danger, #dc2626)',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} style={{ padding: 0 }}>
                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  padding: '48px 24px',
                                  textAlign: 'center',
                                }}
                              >
                                <div
                                  style={{
                                    width: '52px',
                                    height: '52px',
                                    borderRadius: '50%',
                                    backgroundColor: 'rgba(37, 99, 235, 0.08)',
                                    color: '#2563eb',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '12px',
                                  }}
                                >
                                  <Sliders size={26} />
                                </div>
                                <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                                  Thiết bị này chưa có thông số nào được gán
                                </h4>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '420px', marginBottom: '18px' }}>
                                  Hãy bấm nút <strong>"Tích chọn từ thư viện"</strong> để chọn nhanh các thông số (Nhiệt độ, Áp suất, Rung...) áp dụng cho thiết bị.
                                </p>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button className="btn btn-primary" onClick={handleOpenLibraryModal}>
                                    <CheckSquare size={15} /> Tích chọn từ Thư viện chuẩn
                                  </button>
                                  <button className="btn btn-secondary" onClick={handleOpenAddCustom}>
                                    <Plus size={15} /> Tự tạo thông số riêng
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
              Vui lòng chọn một thiết bị ở danh sách bên trái để cấu hình thông số.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Pick multiple parameters from Standard Library */}
      <Modal
        isOpen={isLibraryModalOpen}
        onClose={() => setIsLibraryModalOpen(false)}
        title="Tích chọn thông số từ Thư viện chuẩn"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Chọn các thông số muốn theo dõi cho thiết bị <strong>{selectedEquipment?.name}</strong> ({selectedEquipment?.code}):
          </div>

          {/* Search bar inside modal */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                className="form-input"
                placeholder="Tìm kiếm thông số chuẩn..."
                value={librarySearch}
                onChange={(e) => setLibrarySearch(e.target.value)}
                style={{ paddingLeft: '32px', height: '36px', fontSize: '13px' }}
              />
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleToggleSelectAll}
              style={{ whiteSpace: 'nowrap' }}
            >
              <CheckCheck size={14} /> Chọn tất cả
            </button>
          </div>

          {/* Multi-select List */}
          <div
            style={{
              maxHeight: '340px',
              overflowY: 'auto',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-secondary, #ffffff)',
            }}
          >
            {filteredStandards.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '13px' }}>
                Không có thông số nào trong thư viện chuẩn.
              </div>
            ) : (
              filteredStandards.map((sp) => {
                const isSelected = selectedStandardIds.includes(sp.id);
                return (
                  <div
                    key={sp.id}
                    onClick={() => {
                      if (!sp.isAlreadyAdded) toggleStandardSelect(sp.id);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 14px',
                      borderBottom: '1px solid var(--border-color, #e2e8f0)',
                      cursor: sp.isAlreadyAdded ? 'not-allowed' : 'pointer',
                      backgroundColor: sp.isAlreadyAdded
                        ? 'var(--bg-primary, #f8fafc)'
                        : isSelected
                        ? 'rgba(37, 99, 235, 0.06)'
                        : 'transparent',
                      opacity: sp.isAlreadyAdded ? 0.6 : 1,
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <div>
                      {sp.isAlreadyAdded ? (
                        <CheckCircle2 size={18} style={{ color: '#10b981' }} />
                      ) : isSelected ? (
                        <CheckSquare size={18} style={{ color: '#2563eb' }} />
                      ) : (
                        <Square size={18} style={{ color: '#94a3b8' }} />
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-primary)' }}>
                          {sp.name}
                        </span>
                        {sp.unit && (
                          <span
                            style={{
                              padding: '1px 6px',
                              borderRadius: '4px',
                              backgroundColor: 'var(--bg-hover, #f1f5f9)',
                              fontSize: '11px',
                              fontWeight: 600,
                              color: 'var(--text-secondary)',
                            }}
                          >
                            {sp.unit}
                          </span>
                        )}
                        {sp.isAlreadyAdded && (
                          <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                            (Đã có trong máy)
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Ngưỡng chuẩn:{' '}
                        <strong>
                          {sp.minSpec !== null && sp.maxSpec !== null
                            ? `${sp.minSpec} ~ ${sp.maxSpec}`
                            : sp.minSpec !== null
                            ? `≥ ${sp.minSpec}`
                            : sp.maxSpec !== null
                            ? `≤ ${sp.maxSpec}`
                            : 'Chưa đặt'}
                        </strong>
                        {sp.description && ` — ${sp.description}`}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div
            style={{
              fontSize: '12.5px',
              color: 'var(--text-secondary)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>Đã chọn: <strong style={{ color: '#2563eb' }}>{selectedStandardIds.length}</strong> thông số</span>
          </div>

          <div
            className="modal-footer"
            style={{
              padding: '14px 0 0 0',
              marginTop: '10px',
              borderTop: '1px solid var(--border-color, #e2e8f0)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px',
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsLibraryModalOpen(false)}
              disabled={saving}
            >
              Hủy
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleApplySelectedStandards}
              disabled={saving || selectedStandardIds.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {saving && <RefreshCw size={14} className="animate-spin" />}
              Gán {selectedStandardIds.length} thông số vào máy
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Add/Edit Single Custom Parameter */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={editingParam ? 'Sửa thông số thiết bị' : 'Thêm thông số riêng cho thiết bị'}
      >
        <form onSubmit={handleSaveParamForm}>
          <div className="form-group">
            <label className="form-label">
              Tên thông số <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="VD: Nhiệt độ tiệt trùng, Áp suất buồng..."
              value={paramForm.name}
              onChange={(e) => setParamForm({ ...paramForm, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Đơn vị đo (Unit)</label>
            <input
              type="text"
              className="form-input"
              placeholder="VD: °C, Bar, RPM, A, V..."
              value={paramForm.unit}
              onChange={(e) => setParamForm({ ...paramForm, unit: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Tiêu chuẩn dưới (Min Spec)</label>
              <input
                type="number"
                step="any"
                className="form-input"
                placeholder="VD: 120"
                value={paramForm.minSpec}
                onChange={(e) => setParamForm({ ...paramForm, minSpec: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Tiêu chuẩn trên (Max Spec)</label>
              <input
                type="number"
                step="any"
                className="form-input"
                placeholder="VD: 125"
                value={paramForm.maxSpec}
                onChange={(e) => setParamForm({ ...paramForm, maxSpec: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Giá trị chuẩn (Standard Value - tùy chọn)</label>
            <input
              type="number"
              step="any"
              className="form-input"
              placeholder="VD: 121"
              value={paramForm.standardValue}
              onChange={(e) => setParamForm({ ...paramForm, standardValue: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={paramForm.isActive}
                onChange={(e) => setParamForm({ ...paramForm, isActive: e.target.checked })}
                style={{ width: '16px', height: '16px' }}
              />
              Đang theo dõi thông số này trên máy
            </label>
          </div>

          <div
            className="modal-footer"
            style={{
              padding: '16px 0 0 0',
              marginTop: '16px',
              borderTop: '1px solid var(--border-color, #e2e8f0)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px',
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsEditModalOpen(false)}
              disabled={saving}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {saving && <RefreshCw size={14} className="animate-spin" />}
              {editingParam ? 'Cập nhật' : 'Thêm vào máy'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
