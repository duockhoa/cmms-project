import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { 
  Sliders, Plus, Edit2, Trash2, Search, RefreshCw, 
  CheckSquare, Square, CheckCircle2, QrCode, 
  MapPin, BookOpen, Gauge, CheckCheck, FileText, Activity
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { useToast, useConfirmDialog } from '../common/Toast';
import { useNavigate } from 'react-router-dom';

type SubTab = 'TECHNICAL_SPECS' | 'OPERATING_PARAMS';

export const EquipmentParameterAssignTab: React.FC = () => {
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedEqId, setSelectedEqId] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('TECHNICAL_SPECS');

  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filters for Equipment List
  const [eqSearch, setEqSearch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('ALL');

  // ===================== TAB 1: TECHNICAL SPECS STATE =====================
  const [techSpecs, setTechSpecs] = useState<any[]>([]);
  const [standardTechSpecs, setStandardTechSpecs] = useState<any[]>([]);
  const [isTechLibraryModalOpen, setIsTechLibraryModalOpen] = useState(false);
  const [techLibrarySearch, setTechLibrarySearch] = useState('');
  const [selectedTechSpecIds, setSelectedTechSpecIds] = useState<string[]>([]);

  // Edit / Add Custom Tech Spec
  const [isEditTechModalOpen, setIsEditTechModalOpen] = useState(false);
  const [editingTechSpec, setEditingTechSpec] = useState<any | null>(null);
  const [techForm, setTechForm] = useState({
    name: '',
    value: '',
    unit: '',
    category: '',
    notes: '',
  });

  // ===================== TAB 2: OPERATING PARAMS STATE =====================
  const [operatingParams, setOperatingParams] = useState<any[]>([]);
  const [standardOperatingParams, setStandardOperatingParams] = useState<any[]>([]);
  const [isOpLibraryModalOpen, setIsOpLibraryModalOpen] = useState(false);
  const [opLibrarySearch, setOpLibrarySearch] = useState('');
  const [selectedOpParamIds, setSelectedOpParamIds] = useState<string[]>([]);

  // Edit / Add Custom Operating Param
  const [isEditOpModalOpen, setIsEditOpModalOpen] = useState(false);
  const [editingOpParam, setEditingOpParam] = useState<any | null>(null);
  const [opForm, setOpForm] = useState({
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

  // Initial Load
  useEffect(() => {
    loadInitial();
  }, []);

  const loadInitial = async () => {
    setLoading(true);
    try {
      const [eqs, locs, stdTech, stdOp] = await Promise.all([
        api.getEquipment().catch(() => []),
        api.getLocations().catch(() => []),
        api.getStandardTechnicalSpecs().catch(() => []),
        api.getStandardParameters().catch(() => []),
      ]);
      const eqArray = Array.isArray(eqs) ? eqs : eqs.items || [];
      setEquipmentList(eqArray);
      setLocations(Array.isArray(locs) ? locs : []);
      setStandardTechSpecs(Array.isArray(stdTech) ? stdTech : []);
      setStandardOperatingParams(Array.isArray(stdOp) ? stdOp : []);

      if (eqArray.length > 0 && !selectedEqId) {
        setSelectedEqId(eqArray[0].id);
      }
    } catch (e: any) {
      toast.error('Lỗi tải dữ liệu', e.message);
    } finally {
      setLoading(false);
    }
  };

  // Load equipment's specs & params whenever selectedEqId changes
  useEffect(() => {
    if (selectedEqId) {
      loadEquipmentData(selectedEqId);
    } else {
      setTechSpecs([]);
      setOperatingParams([]);
    }
  }, [selectedEqId]);

  const loadEquipmentData = async (eqId: string) => {
    setDataLoading(true);
    try {
      const [tsData, opData] = await Promise.all([
        api.getEquipmentTechnicalSpecs(eqId).catch(() => []),
        api.getEquipmentParameters(eqId).catch(() => []),
      ]);
      setTechSpecs(Array.isArray(tsData) ? tsData : []);
      setOperatingParams(Array.isArray(opData) ? opData : []);
    } catch (e: any) {
      toast.error('Lỗi tải thông số', e.message);
    } finally {
      setDataLoading(false);
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

  // ===================== TAB 1: TECHNICAL SPECS HANDLERS =====================
  const filteredStdTechSpecs = useMemo(() => {
    const existingNames = new Set(techSpecs.map((s) => s.name.trim().toLowerCase()));
    return standardTechSpecs
      .filter((s) => {
        const matchSearch =
          !techLibrarySearch.trim() ||
          s.name?.toLowerCase().includes(techLibrarySearch.toLowerCase()) ||
          (s.unit && s.unit.toLowerCase().includes(techLibrarySearch.toLowerCase())) ||
          (s.category && s.category.toLowerCase().includes(techLibrarySearch.toLowerCase()));
        return matchSearch;
      })
      .map((s) => ({
        ...s,
        isAlreadyAdded: existingNames.has(s.name.trim().toLowerCase()),
      }));
  }, [standardTechSpecs, techLibrarySearch, techSpecs]);

  const handleOpenTechLibrary = () => {
    setTechLibrarySearch('');
    setSelectedTechSpecIds([]);
    setIsTechLibraryModalOpen(true);
  };

  const toggleSelectTechSpec = (id: string) => {
    setSelectedTechSpecIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllTechSpecs = () => {
    const available = filteredStdTechSpecs.filter((s) => !s.isAlreadyAdded).map((s) => s.id);
    if (selectedTechSpecIds.length === available.length && available.length > 0) {
      setSelectedTechSpecIds([]);
    } else {
      setSelectedTechSpecIds(available);
    }
  };

  const handleApplyTechSpecs = async () => {
    if (selectedTechSpecIds.length === 0) {
      toast.error('Chưa chọn', 'Vui lòng tích chọn ít nhất 1 thông số kỹ thuật.');
      return;
    }
    setSaving(true);
    try {
      await api.bulkAssignEquipmentTechnicalSpecs(selectedEqId, selectedTechSpecIds);
      toast.success('Thành công', `Đã gán ${selectedTechSpecIds.length} thông số kỹ thuật vào máy.`);
      setIsTechLibraryModalOpen(false);
      loadEquipmentData(selectedEqId);
    } catch (e: any) {
      toast.error('Lỗi', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenAddCustomTech = () => {
    setEditingTechSpec(null);
    setTechForm({ name: '', value: '', unit: '', category: 'Cơ khí', notes: '' });
    setIsEditTechModalOpen(true);
  };

  const handleOpenEditTech = (item: any) => {
    setEditingTechSpec(item);
    setTechForm({
      name: item.name || '',
      value: item.value || '',
      unit: item.unit || '',
      category: item.category || '',
      notes: item.notes || '',
    });
    setIsEditTechModalOpen(true);
  };

  const handleSaveTechForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!techForm.name.trim()) {
      toast.error('Thiếu thông tin', 'Vui lòng nhập tên thông số kỹ thuật.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: techForm.name.trim(),
        value: techForm.value.trim(),
        unit: techForm.unit.trim() || null,
        category: techForm.category.trim() || null,
        notes: techForm.notes.trim() || null,
      };

      if (editingTechSpec) {
        await api.updateEquipmentTechnicalSpec(selectedEqId, editingTechSpec.id, payload);
        toast.success('Thành công', 'Đã cập nhật thông số kỹ thuật.');
      } else {
        await api.createEquipmentTechnicalSpec(selectedEqId, payload);
        toast.success('Thành công', 'Đã thêm thông số kỹ thuật mới.');
      }
      setIsEditTechModalOpen(false);
      loadEquipmentData(selectedEqId);
    } catch (e: any) {
      toast.error('Lỗi', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTechSpec = async (item: any) => {
    const ok = await confirm('Xóa thông số KT', `Bạn có chắc muốn xóa "${item.name}" khỏi máy?`);
    if (ok) {
      try {
        await api.deleteEquipmentTechnicalSpec(selectedEqId, item.id);
        toast.success('Đã xóa', 'Đã gỡ thông số khỏi thiết bị.');
        loadEquipmentData(selectedEqId);
      } catch (e: any) {
        toast.error('Lỗi', e.message);
      }
    }
  };

  // ===================== TAB 2: OPERATING PARAMS HANDLERS =====================
  const filteredStdOpParams = useMemo(() => {
    const existingNames = new Set(operatingParams.map((p) => p.name.trim().toLowerCase()));
    return standardOperatingParams
      .filter((p) => {
        const matchSearch =
          !opLibrarySearch.trim() ||
          p.name?.toLowerCase().includes(opLibrarySearch.toLowerCase()) ||
          (p.unit && p.unit.toLowerCase().includes(opLibrarySearch.toLowerCase())) ||
          (p.description && p.description.toLowerCase().includes(opLibrarySearch.toLowerCase()));
        return matchSearch;
      })
      .map((p) => ({
        ...p,
        isAlreadyAdded: existingNames.has(p.name.trim().toLowerCase()),
      }));
  }, [standardOperatingParams, opLibrarySearch, operatingParams]);

  const handleOpenOpLibrary = () => {
    setOpLibrarySearch('');
    setSelectedOpParamIds([]);
    setIsOpLibraryModalOpen(true);
  };

  const toggleSelectOpParam = (id: string) => {
    setSelectedOpParamIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllOpParams = () => {
    const available = filteredStdOpParams.filter((p) => !p.isAlreadyAdded).map((p) => p.id);
    if (selectedOpParamIds.length === available.length && available.length > 0) {
      setSelectedOpParamIds([]);
    } else {
      setSelectedOpParamIds(available);
    }
  };

  const handleApplyOpParams = async () => {
    if (selectedOpParamIds.length === 0) {
      toast.error('Chưa chọn', 'Vui lòng tích chọn ít nhất 1 tham số vận hành.');
      return;
    }
    setSaving(true);
    try {
      await api.bulkAssignEquipmentParameters(selectedEqId, selectedOpParamIds);
      toast.success('Thành công', `Đã gán ${selectedOpParamIds.length} tham số vận hành vào máy.`);
      setIsOpLibraryModalOpen(false);
      loadEquipmentData(selectedEqId);
    } catch (e: any) {
      toast.error('Lỗi', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenAddCustomOp = () => {
    setEditingOpParam(null);
    setOpForm({ name: '', unit: '', minSpec: '', maxSpec: '', standardValue: '', isActive: true });
    setIsEditOpModalOpen(true);
  };

  const handleOpenEditOp = (item: any) => {
    setEditingOpParam(item);
    setOpForm({
      name: item.name || '',
      unit: item.unit || '',
      minSpec: item.minSpec !== null && item.minSpec !== undefined ? String(item.minSpec) : '',
      maxSpec: item.maxSpec !== null && item.maxSpec !== undefined ? String(item.maxSpec) : '',
      standardValue: item.standardValue !== null && item.standardValue !== undefined ? String(item.standardValue) : '',
      isActive: item.isActive !== undefined ? item.isActive : true,
    });
    setIsEditOpModalOpen(true);
  };

  const handleSaveOpForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opForm.name.trim()) {
      toast.error('Thiếu thông tin', 'Vui lòng nhập tên tham số vận hành.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: opForm.name.trim(),
        unit: opForm.unit.trim() || null,
        minSpec: opForm.minSpec !== '' ? parseFloat(opForm.minSpec) : null,
        maxSpec: opForm.maxSpec !== '' ? parseFloat(opForm.maxSpec) : null,
        standardValue: opForm.standardValue !== '' ? parseFloat(opForm.standardValue) : null,
        isActive: opForm.isActive,
      };

      if (editingOpParam) {
        await api.updateEquipmentParameter(selectedEqId, editingOpParam.id, payload);
        toast.success('Thành công', 'Đã cập nhật tham số vận hành.');
      } else {
        await api.createEquipmentParameter(selectedEqId, payload);
        toast.success('Thành công', 'Đã thêm tham số vận hành mới.');
      }
      setIsEditOpModalOpen(false);
      loadEquipmentData(selectedEqId);
    } catch (e: any) {
      toast.error('Lỗi', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOpParam = async (item: any) => {
    const ok = await confirm('Xóa tham số vận hành', `Bạn có chắc muốn xóa "${item.name}" khỏi máy?`);
    if (ok) {
      try {
        await api.deleteEquipmentParameter(selectedEqId, item.id);
        toast.success('Đã xóa', 'Đã gỡ tham số vận hành khỏi máy.');
        loadEquipmentData(selectedEqId);
      } catch (e: any) {
        toast.error('Lỗi', e.message);
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
            Thiết lập Thông số Kỹ thuật & Tham số Vận hành theo máy
          </h3>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
            Tích chọn từ Thư viện Thông số KT (Hồ sơ NSX) và Thư viện Tham số Vận hành (Sổ vận hành / Quét QR).
          </p>
        </div>

        <button
          className="btn btn-secondary"
          onClick={loadInitial}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Làm mới
        </button>
      </div>

      {/* Main Split View */}
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
            maxHeight: '700px',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
            Chọn thiết bị ({filteredEquipment.length})
          </div>

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
                Không tìm thấy thiết bị.
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
                      <span style={{ fontWeight: 700, fontSize: '12px', color: isSelected ? '#2563eb' : 'var(--text-primary)' }}>
                        {eq.code}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{eq.category}</span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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

        {/* Right: Workspace for Selected Equipment */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {selectedEquipment ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Selected Equipment Info Banner */}
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
                    Xưởng: <strong>{selectedEquipment.location}</strong> &bull; Phân loại: <strong>{selectedEquipment.category}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => navigate(`/equipment/${selectedEquipment.id}/operation-log-form`)}
                    title="Mở form ghi sổ vận hành theo máy"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <QrCode size={14} /> Thử nhập Sổ vận hành (QR)
                  </button>
                </div>
              </div>

              {/* Two Distinct Sub-Tabs */}
              <div style={{ display: 'flex', borderBottom: '2px solid var(--border-color, #e2e8f0)', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('TECHNICAL_SPECS')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 18px',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: activeSubTab === 'TECHNICAL_SPECS' ? 'var(--accent-blue, #2563eb)' : 'var(--text-secondary, #64748b)',
                    borderBottom: activeSubTab === 'TECHNICAL_SPECS' ? '2px solid var(--accent-blue, #2563eb)' : '2px solid transparent',
                    marginBottom: '-2px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <BookOpen size={16} />
                  1. Thông số Kỹ thuật (Hồ sơ NSX)
                  <span
                    style={{
                      padding: '1px 6px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      backgroundColor: activeSubTab === 'TECHNICAL_SPECS' ? 'rgba(37, 99, 235, 0.1)' : 'var(--bg-hover, #f1f5f9)',
                      color: activeSubTab === 'TECHNICAL_SPECS' ? '#2563eb' : 'var(--text-secondary)',
                    }}
                  >
                    {techSpecs.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSubTab('OPERATING_PARAMS')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 18px',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: activeSubTab === 'OPERATING_PARAMS' ? 'var(--accent-blue, #2563eb)' : 'var(--text-secondary, #64748b)',
                    borderBottom: activeSubTab === 'OPERATING_PARAMS' ? '2px solid var(--accent-blue, #2563eb)' : '2px solid transparent',
                    marginBottom: '-2px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Gauge size={16} />
                  2. Tham số Vận hành (Sổ vận hành / Theo dõi theo ca)
                  <span
                    style={{
                      padding: '1px 6px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      backgroundColor: activeSubTab === 'OPERATING_PARAMS' ? 'rgba(37, 99, 235, 0.1)' : 'var(--bg-hover, #f1f5f9)',
                      color: activeSubTab === 'OPERATING_PARAMS' ? '#2563eb' : 'var(--text-secondary)',
                    }}
                  >
                    {operatingParams.length}
                  </span>
                </button>
              </div>

              {/* ===================== TAB 1 CONTENT: TECHNICAL SPECS ===================== */}
              {activeSubTab === 'TECHNICAL_SPECS' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                      Các thông số kỹ thuật danh định của máy theo hồ sơ/catalogue từ Nhà sản xuất (Công suất, Điện áp, Dung tích, Trọng lượng...).
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-primary btn-sm" onClick={handleOpenTechLibrary}>
                        <CheckSquare size={14} /> + Tích chọn từ thư viện thông số KT
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={handleOpenAddCustomTech}>
                        <Plus size={14} /> Thêm thông số KT riêng
                      </button>
                    </div>
                  </div>

                  {dataLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                      <RefreshCw size={22} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
                      Đang tải thông số kỹ thuật...
                    </div>
                  ) : (
                    <div style={{ border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
                      <table className="custom-table" style={{ margin: 0, width: '100%' }}>
                        <thead>
                          <tr>
                            <th style={{ width: '50px', textAlign: 'center' }}>STT</th>
                            <th style={{ minWidth: '180px' }}>Tên thông số kỹ thuật</th>
                            <th style={{ minWidth: '160px' }}>Giá trị danh định (NSX)</th>
                            <th style={{ width: '100px', textAlign: 'center' }}>Đơn vị</th>
                            <th style={{ width: '120px', textAlign: 'center' }}>Phân nhóm</th>
                            <th>Ghi chú</th>
                            <th style={{ width: '80px', textAlign: 'center' }}>Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {techSpecs.length > 0 ? (
                            techSpecs.map((spec, idx) => (
                              <tr key={spec.id}>
                                <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>{idx + 1}</td>
                                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{spec.name}</td>
                                <td>
                                  <span style={{ fontWeight: 700, color: 'var(--accent-blue, #2563eb)' }}>
                                    {spec.value || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontWeight: 400 }}>Chưa điền</span>}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  {spec.unit ? (
                                    <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#f1f5f9', fontSize: '11.5px', fontWeight: 600 }}>
                                      {spec.unit}
                                    </span>
                                  ) : '—'}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  {spec.category ? (
                                    <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(37, 99, 235, 0.08)', color: '#2563eb', fontSize: '11px', fontWeight: 600 }}>
                                      {spec.category}
                                    </span>
                                  ) : '—'}
                                </td>
                                <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{spec.notes || '—'}</td>
                                <td style={{ textAlign: 'center' }}>
                                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                    <button
                                      className="btn-icon"
                                      onClick={() => handleOpenEditTech(spec)}
                                      title="Sửa giá trị"
                                      style={{ padding: '5px', borderRadius: '4px', border: '1px solid #e2e8f0', background: 'transparent', color: '#2563eb', cursor: 'pointer' }}
                                    >
                                      <Edit2 size={13} />
                                    </button>
                                    <button
                                      className="btn-icon"
                                      onClick={() => handleDeleteTechSpec(spec)}
                                      title="Xóa"
                                      style={{ padding: '5px', borderRadius: '4px', border: '1px solid #e2e8f0', background: 'transparent', color: '#dc2626', cursor: 'pointer' }}
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                Máy này chưa được gán thông số kỹ thuật nào từ NSX. Hãy bấm <strong>"Tích chọn từ thư viện thông số KT"</strong> để gán.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ===================== TAB 2 CONTENT: OPERATING PARAMS ===================== */}
              {activeSubTab === 'OPERATING_PARAMS' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                      Các chỉ tiêu theo dõi động khi máy đang chạy thực tế (Nhiệt độ, Áp suất, Rung, Dòng điện...). Form Sổ vận hành & Quét QR sẽ tự động lấy các chỉ tiêu này.
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-primary btn-sm" onClick={handleOpenOpLibrary}>
                        <CheckSquare size={14} /> + Tích chọn từ thư viện tham số vận hành
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={handleOpenAddCustomOp}>
                        <Plus size={14} /> Thêm tham số vận hành riêng
                      </button>
                    </div>
                  </div>

                  {dataLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                      <RefreshCw size={22} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
                      Đang tải tham số vận hành...
                    </div>
                  ) : (
                    <div style={{ border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
                      <table className="custom-table" style={{ margin: 0, width: '100%' }}>
                        <thead>
                          <tr>
                            <th style={{ width: '50px', textAlign: 'center' }}>STT</th>
                            <th style={{ minWidth: '180px' }}>Tên tham số vận hành</th>
                            <th style={{ width: '90px', textAlign: 'center' }}>Đơn vị</th>
                            <th style={{ width: '150px', textAlign: 'center' }}>Tiêu chuẩn Min ~ Max</th>
                            <th style={{ width: '110px', textAlign: 'center' }}>Giá trị chuẩn</th>
                            <th style={{ width: '110px', textAlign: 'center' }}>Trạng thái</th>
                            <th style={{ width: '80px', textAlign: 'center' }}>Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {operatingParams.length > 0 ? (
                            operatingParams.map((param, idx) => (
                              <tr key={param.id}>
                                <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>{idx + 1}</td>
                                <td><div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>{param.name}</div></td>
                                <td style={{ textAlign: 'center' }}>
                                  {param.unit ? (
                                    <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#f1f5f9', fontSize: '11.5px', fontWeight: 600 }}>
                                      {param.unit}
                                    </span>
                                  ) : '—'}
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
                                  {param.standardValue !== null && param.standardValue !== undefined ? param.standardValue : '—'}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, backgroundColor: param.isActive ? '#dcfce7' : '#f1f5f9', color: param.isActive ? '#16a34a' : '#64748b' }}>
                                    {param.isActive ? 'Theo dõi' : 'Tạm dừng'}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                    <button
                                      className="btn-icon"
                                      onClick={() => handleOpenEditOp(param)}
                                      title="Sửa ngưỡng"
                                      style={{ padding: '5px', borderRadius: '4px', border: '1px solid #e2e8f0', background: 'transparent', color: '#2563eb', cursor: 'pointer' }}
                                    >
                                      <Edit2 size={13} />
                                    </button>
                                    <button
                                      className="btn-icon"
                                      onClick={() => handleDeleteOpParam(param)}
                                      title="Xóa"
                                      style={{ padding: '5px', borderRadius: '4px', border: '1px solid #e2e8f0', background: 'transparent', color: '#dc2626', cursor: 'pointer' }}
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                Máy này chưa được gán tham số vận hành nào. Hãy bấm <strong>"Tích chọn từ thư viện tham số vận hành"</strong> để bắt đầu ghi Sổ vận hành.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
              Vui lòng chọn một thiết bị ở danh sách bên trái.
            </div>
          )}
        </div>
      </div>

      {/* ===================== MODAL 1: PICK FROM TECH SPECS LIBRARY ===================== */}
      <Modal
        isOpen={isTechLibraryModalOpen}
        onClose={() => setIsTechLibraryModalOpen(false)}
        title="Tích chọn Thông số Kỹ thuật từ Thư viện chuẩn (NSX)"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Chọn các thông số kỹ thuật chuẩn của máy <strong>{selectedEquipment?.name}</strong>:
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                className="form-input"
                placeholder="Tìm thông số KT (Công suất, Điện áp, Dung tích...)..."
                value={techLibrarySearch}
                onChange={(e) => setTechLibrarySearch(e.target.value)}
                style={{ paddingLeft: '32px', height: '36px', fontSize: '13px' }}
              />
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleSelectAllTechSpecs}>
              <CheckCheck size={14} /> Chọn tất cả
            </button>
          </div>

          <div style={{ maxHeight: '340px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#ffffff' }}>
            {filteredStdTechSpecs.map((s) => {
              const isSelected = selectedTechSpecIds.includes(s.id);
              return (
                <div
                  key={s.id}
                  onClick={() => { if (!s.isAlreadyAdded) toggleSelectTechSpec(s.id); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderBottom: '1px solid #e2e8f0',
                    cursor: s.isAlreadyAdded ? 'not-allowed' : 'pointer',
                    backgroundColor: s.isAlreadyAdded ? '#f8fafc' : isSelected ? 'rgba(37, 99, 235, 0.06)' : 'transparent',
                    opacity: s.isAlreadyAdded ? 0.6 : 1,
                  }}
                >
                  {s.isAlreadyAdded ? <CheckCircle2 size={18} style={{ color: '#10b981' }} /> : isSelected ? <CheckSquare size={18} style={{ color: '#2563eb' }} /> : <Square size={18} style={{ color: '#94a3b8' }} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-primary)' }}>{s.name}</span>
                      {s.unit && <span style={{ padding: '1px 6px', borderRadius: '4px', backgroundColor: '#f1f5f9', fontSize: '11px', fontWeight: 600 }}>{s.unit}</span>}
                      {s.category && <span style={{ padding: '1px 6px', borderRadius: '4px', backgroundColor: 'rgba(37,99,235,0.08)', color: '#2563eb', fontSize: '11px', fontWeight: 600 }}>{s.category}</span>}
                      {s.isAlreadyAdded && <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>(Đã có trong máy)</span>}
                    </div>
                    {s.description && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{s.description}</div>}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="modal-footer" style={{ padding: '14px 0 0 0', marginTop: '10px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsTechLibraryModalOpen(false)} disabled={saving}>Hủy</button>
            <button type="button" className="btn btn-primary" onClick={handleApplyTechSpecs} disabled={saving || selectedTechSpecIds.length === 0} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {saving && <RefreshCw size={14} className="animate-spin" />}
              Gán {selectedTechSpecIds.length} thông số KT vào máy
            </button>
          </div>
        </div>
      </Modal>

      {/* ===================== MODAL 2: PICK FROM OPERATING PARAMS LIBRARY ===================== */}
      <Modal
        isOpen={isOpLibraryModalOpen}
        onClose={() => setIsOpLibraryModalOpen(false)}
        title="Tích chọn Tham số Vận hành từ Thư viện chuẩn (Sổ vận hành)"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Chọn các chỉ tiêu cần theo dõi khi máy <strong>{selectedEquipment?.name}</strong> đang hoạt động:
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                className="form-input"
                placeholder="Tìm tham số vận hành (Nhiệt độ, Áp suất, Rung, Dòng điện...)..."
                value={opLibrarySearch}
                onChange={(e) => setOpLibrarySearch(e.target.value)}
                style={{ paddingLeft: '32px', height: '36px', fontSize: '13px' }}
              />
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleSelectAllOpParams}>
              <CheckCheck size={14} /> Chọn tất cả
            </button>
          </div>

          <div style={{ maxHeight: '340px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#ffffff' }}>
            {filteredStdOpParams.map((p) => {
              const isSelected = selectedOpParamIds.includes(p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => { if (!p.isAlreadyAdded) toggleSelectOpParam(p.id); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderBottom: '1px solid #e2e8f0',
                    cursor: p.isAlreadyAdded ? 'not-allowed' : 'pointer',
                    backgroundColor: p.isAlreadyAdded ? '#f8fafc' : isSelected ? 'rgba(37, 99, 235, 0.06)' : 'transparent',
                    opacity: p.isAlreadyAdded ? 0.6 : 1,
                  }}
                >
                  {p.isAlreadyAdded ? <CheckCircle2 size={18} style={{ color: '#10b981' }} /> : isSelected ? <CheckSquare size={18} style={{ color: '#2563eb' }} /> : <Square size={18} style={{ color: '#94a3b8' }} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-primary)' }}>{p.name}</span>
                      {p.unit && <span style={{ padding: '1px 6px', borderRadius: '4px', backgroundColor: '#f1f5f9', fontSize: '11px', fontWeight: 600 }}>{p.unit}</span>}
                      {p.isAlreadyAdded && <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>(Đã có trong máy)</span>}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Tiêu chuẩn chuẩn:{' '}
                      <strong>{p.minSpec !== null && p.maxSpec !== null ? `${p.minSpec} ~ ${p.maxSpec}` : p.minSpec !== null ? `≥ ${p.minSpec}` : p.maxSpec !== null ? `≤ ${p.maxSpec}` : 'Chưa đặt'}</strong>
                      {p.description && ` — ${p.description}`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="modal-footer" style={{ padding: '14px 0 0 0', marginTop: '10px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsOpLibraryModalOpen(false)} disabled={saving}>Hủy</button>
            <button type="button" className="btn btn-primary" onClick={handleApplyOpParams} disabled={saving || selectedOpParamIds.length === 0} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {saving && <RefreshCw size={14} className="animate-spin" />}
              Gán {selectedOpParamIds.length} tham số vận hành vào máy
            </button>
          </div>
        </div>
      </Modal>

      {/* ===================== MODAL 3: EDIT TECH SPEC ===================== */}
      <Modal isOpen={isEditTechModalOpen} onClose={() => setIsEditTechModalOpen(false)} title={editingTechSpec ? "Sửa thông số kỹ thuật" : "Thêm thông số kỹ thuật riêng"}>
        <form onSubmit={handleSaveTechForm}>
          <div className="form-group">
            <label className="form-label">Tên thông số KT <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input type="text" className="form-input" required placeholder="VD: Công suất động cơ, Điện áp nguồn..." value={techForm.name} onChange={e => setTechForm({ ...techForm, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Giá trị danh định (từ catalogue NSX) <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input type="text" className="form-input" required placeholder="VD: 7.5, 380, 1000L, 1500 x 800 x 1800..." value={techForm.value} onChange={e => setTechForm({ ...techForm, value: e.target.value })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Đơn vị đo</label>
              <input type="text" className="form-input" placeholder="VD: kW, V, Lít, mm, kg..." value={techForm.unit} onChange={e => setTechForm({ ...techForm, unit: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Phân nhóm</label>
              <input type="text" className="form-input" placeholder="VD: Điện, Cơ khí, Dung tích..." value={techForm.category} onChange={e => setTechForm({ ...techForm, category: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Ghi chú</label>
            <input type="text" className="form-input" placeholder="Ghi chú thêm..." value={techForm.notes} onChange={e => setTechForm({ ...techForm, notes: e.target.value })} />
          </div>
          <div className="modal-footer" style={{ padding: '16px 0 0 0', marginTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsEditTechModalOpen(false)}>Hủy</button>
            <button type="submit" className="btn btn-primary">{editingTechSpec ? 'Cập nhật' : 'Thêm mới'}</button>
          </div>
        </form>
      </Modal>

      {/* ===================== MODAL 4: EDIT OP PARAM ===================== */}
      <Modal isOpen={isEditOpModalOpen} onClose={() => setIsEditOpModalOpen(false)} title={editingOpParam ? "Sửa tham số vận hành" : "Thêm tham số vận hành riêng"}>
        <form onSubmit={handleSaveOpForm}>
          <div className="form-group">
            <label className="form-label">Tên tham số vận hành <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input type="text" className="form-input" required placeholder="VD: Nhiệt độ tiệt trùng, Áp suất..." value={opForm.name} onChange={e => setOpForm({ ...opForm, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Đơn vị đo</label>
            <input type="text" className="form-input" placeholder="VD: °C, Bar, RPM, A, µS/cm..." value={opForm.unit} onChange={e => setOpForm({ ...opForm, unit: e.target.value })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Tiêu chuẩn dưới (Min Spec)</label>
              <input type="number" step="any" className="form-input" placeholder="VD: 121" value={opForm.minSpec} onChange={e => setOpForm({ ...opForm, minSpec: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Tiêu chuẩn trên (Max Spec)</label>
              <input type="number" step="any" className="form-input" placeholder="VD: 125" value={opForm.maxSpec} onChange={e => setOpForm({ ...opForm, maxSpec: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Giá trị chuẩn (Standard Value)</label>
            <input type="number" step="any" className="form-input" placeholder="VD: 121" value={opForm.standardValue} onChange={e => setOpForm({ ...opForm, standardValue: e.target.value })} />
          </div>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              <input type="checkbox" checked={opForm.isActive} onChange={e => setOpForm({ ...opForm, isActive: e.target.checked })} style={{ width: '16px', height: '16px' }} />
              Đang theo dõi chỉ tiêu này trên máy
            </label>
          </div>
          <div className="modal-footer" style={{ padding: '16px 0 0 0', marginTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsEditOpModalOpen(false)}>Hủy</button>
            <button type="submit" className="btn btn-primary">{editingOpParam ? 'Cập nhật' : 'Thêm mới'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
