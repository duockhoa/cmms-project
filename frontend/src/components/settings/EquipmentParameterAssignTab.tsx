import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { 
  Sliders, Search, RefreshCw, CheckSquare, Square, 
  Save, CheckCircle2, QrCode, MapPin, BookOpen, Gauge, 
  CheckCheck, XSquare, Filter, AlertCircle, Sparkles
} from 'lucide-react';
import { useToast } from '../common/Toast';
import { useNavigate } from 'react-router-dom';

type SubTab = 'TECHNICAL_SPECS' | 'OPERATING_PARAMS';
type FilterStatus = 'ALL' | 'SELECTED' | 'UNSELECTED';

interface TechSpecRow {
  standardId: string;
  name: string;
  unit: string;
  category: string;
  description?: string;
  isSelected: boolean;
  value: string;
  notes: string;
}

interface OpParamRow {
  standardId: string;
  name: string;
  unit: string;
  description?: string;
  isSelected: boolean;
  minSpec: string;
  maxSpec: string;
  standardValue: string;
}

export const EquipmentParameterAssignTab: React.FC = () => {
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedEqId, setSelectedEqId] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('TECHNICAL_SPECS');

  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Filters for Equipment List
  const [eqSearch, setEqSearch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('ALL');

  // Matrix State: Full library lists with selection status for selected equipment
  const [rawStandardTechSpecs, setRawStandardTechSpecs] = useState<any[]>([]);
  const [rawStandardOpParams, setRawStandardOpParams] = useState<any[]>([]);

  const [techSpecRows, setTechSpecRows] = useState<TechSpecRow[]>([]);
  const [opParamRows, setOpParamRows] = useState<OpParamRow[]>([]);

  // Search & Filter inside Tabs
  const [techSearch, setTechSearch] = useState('');
  const [techFilterStatus, setTechFilterStatus] = useState<FilterStatus>('ALL');

  const [opSearch, setOpSearch] = useState('');
  const [opFilterStatus, setOpFilterStatus] = useState<FilterStatus>('ALL');

  const toast = useToast();
  const navigate = useNavigate();

  // 1. Initial Load
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
      
      const techList = Array.isArray(stdTech) ? stdTech : [];
      const opList = Array.isArray(stdOp) ? stdOp : [];
      setRawStandardTechSpecs(techList);
      setRawStandardOpParams(opList);

      if (eqArray.length > 0 && !selectedEqId) {
        setSelectedEqId(eqArray[0].id);
      }
    } catch (e: any) {
      toast.error('Lỗi tải dữ liệu', e.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Load equipment's assigned specs & params whenever selectedEqId changes
  useEffect(() => {
    if (selectedEqId && rawStandardTechSpecs.length >= 0 && rawStandardOpParams.length >= 0) {
      loadEquipmentMatrix(selectedEqId);
    }
  }, [selectedEqId, rawStandardTechSpecs, rawStandardOpParams]);

  const loadEquipmentMatrix = async (eqId: string) => {
    setDataLoading(true);
    setHasChanges(false);
    try {
      const [assignedTech, assignedOp] = await Promise.all([
        api.getEquipmentTechnicalSpecs(eqId).catch(() => []),
        api.getEquipmentParameters(eqId).catch(() => []),
      ]);

      // Map assigned Tech Specs into Map
      const assignedTechMap = new Map<string, any>();
      (Array.isArray(assignedTech) ? assignedTech : []).forEach((item: any) => {
        assignedTechMap.set(item.name.trim().toLowerCase(), item);
      });

      // Map assigned Op Params into Map
      const assignedOpMap = new Map<string, any>();
      (Array.isArray(assignedOp) ? assignedOp : []).forEach((item: any) => {
        if (item.isActive !== false) {
          assignedOpMap.set(item.name.trim().toLowerCase(), item);
        }
      });

      // Build full Tech Spec Rows
      const builtTechRows: TechSpecRow[] = rawStandardTechSpecs.map((std) => {
        const assigned = assignedTechMap.get(std.name.trim().toLowerCase());
        return {
          standardId: std.id,
          name: std.name,
          unit: std.unit || '',
          category: std.category || '',
          description: std.description || '',
          isSelected: !!assigned,
          value: assigned ? assigned.value || '' : '',
          notes: assigned ? assigned.notes || '' : '',
        };
      });

      // Build full Operating Param Rows
      const builtOpRows: OpParamRow[] = rawStandardOpParams.map((std) => {
        const assigned = assignedOpMap.get(std.name.trim().toLowerCase());
        return {
          standardId: std.id,
          name: std.name,
          unit: std.unit || '',
          description: std.description || '',
          isSelected: !!assigned,
          minSpec: assigned
            ? (assigned.minSpec !== null && assigned.minSpec !== undefined ? String(assigned.minSpec) : '')
            : (std.minSpec !== null && std.minSpec !== undefined ? String(std.minSpec) : ''),
          maxSpec: assigned
            ? (assigned.maxSpec !== null && assigned.maxSpec !== undefined ? String(assigned.maxSpec) : '')
            : (std.maxSpec !== null && std.maxSpec !== undefined ? String(std.maxSpec) : ''),
          standardValue: assigned
            ? (assigned.standardValue !== null && assigned.standardValue !== undefined ? String(assigned.standardValue) : '')
            : '',
        };
      });

      setTechSpecRows(builtTechRows);
      setOpParamRows(builtOpRows);
    } catch (e: any) {
      toast.error('Lỗi', e.message);
    } finally {
      setDataLoading(false);
    }
  };

  // Selected Equipment
  const selectedEquipment = useMemo(() => {
    return equipmentList.find((eq) => eq.id === selectedEqId);
  }, [equipmentList, selectedEqId]);

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

  // ===================== TAB 1: TECH SPECS INTERACTION =====================
  const handleToggleTechSpec = (indexInFull: number) => {
    setTechSpecRows((prev) => {
      const copy = [...prev];
      copy[indexInFull] = {
        ...copy[indexInFull],
        isSelected: !copy[indexInFull].isSelected,
      };
      return copy;
    });
    setHasChanges(true);
  };

  const handleTechSpecValueChange = (indexInFull: number, field: 'value' | 'notes', val: string) => {
    setTechSpecRows((prev) => {
      const copy = [...prev];
      copy[indexInFull] = {
        ...copy[indexInFull],
        [field]: val,
      };
      return copy;
    });
    setHasChanges(true);
  };

  const handleSelectAllTech = (select: boolean) => {
    setTechSpecRows((prev) =>
      prev.map((row) => ({
        ...row,
        isSelected: select,
      }))
    );
    setHasChanges(true);
  };

  const filteredTechRows = useMemo(() => {
    return techSpecRows.map((row, fullIdx) => ({ row, fullIdx })).filter(({ row }) => {
      if (techFilterStatus === 'SELECTED' && !row.isSelected) return false;
      if (techFilterStatus === 'UNSELECTED' && row.isSelected) return false;
      if (!techSearch.trim()) return true;
      const term = techSearch.toLowerCase();
      return (
        row.name.toLowerCase().includes(term) ||
        row.unit.toLowerCase().includes(term) ||
        row.category.toLowerCase().includes(term) ||
        row.value.toLowerCase().includes(term)
      );
    });
  }, [techSpecRows, techSearch, techFilterStatus]);

  const selectedTechCount = useMemo(() => techSpecRows.filter((r) => r.isSelected).length, [techSpecRows]);

  // ===================== TAB 2: OPERATING PARAMS INTERACTION =====================
  const handleToggleOpParam = (indexInFull: number) => {
    setOpParamRows((prev) => {
      const copy = [...prev];
      copy[indexInFull] = {
        ...copy[indexInFull],
        isSelected: !copy[indexInFull].isSelected,
      };
      return copy;
    });
    setHasChanges(true);
  };

  const handleOpParamValueChange = (
    indexInFull: number,
    field: 'minSpec' | 'maxSpec' | 'standardValue',
    val: string
  ) => {
    setOpParamRows((prev) => {
      const copy = [...prev];
      copy[indexInFull] = {
        ...copy[indexInFull],
        [field]: val,
      };
      return copy;
    });
    setHasChanges(true);
  };

  const handleSelectAllOp = (select: boolean) => {
    setOpParamRows((prev) =>
      prev.map((row) => ({
        ...row,
        isSelected: select,
      }))
    );
    setHasChanges(true);
  };

  const filteredOpRows = useMemo(() => {
    return opParamRows.map((row, fullIdx) => ({ row, fullIdx })).filter(({ row }) => {
      if (opFilterStatus === 'SELECTED' && !row.isSelected) return false;
      if (opFilterStatus === 'UNSELECTED' && row.isSelected) return false;
      if (!opSearch.trim()) return true;
      const term = opSearch.toLowerCase();
      return (
        row.name.toLowerCase().includes(term) ||
        row.unit.toLowerCase().includes(term)
      );
    });
  }, [opParamRows, opSearch, opFilterStatus]);

  const selectedOpCount = useMemo(() => opParamRows.filter((r) => r.isSelected).length, [opParamRows]);

  // ===================== SAVE ALL CHANGES FOR CURRENT EQUIPMENT =====================
  const handleSaveAll = async () => {
    if (!selectedEqId) return;
    setSaving(true);
    try {
      if (activeSubTab === 'TECHNICAL_SPECS') {
        // Prepare selected tech specs payload
        const selectedTechItems = techSpecRows
          .filter((r) => r.isSelected)
          .map((r) => ({
            name: r.name,
            value: r.value.trim(),
            unit: r.unit || null,
            category: r.category || null,
            notes: r.notes.trim() || null,
          }));

        await api.syncEquipmentTechnicalSpecs(selectedEqId, selectedTechItems);
        toast.success(
          'Đã lưu thông số KT',
          `Đã cập nhật ${selectedTechItems.length} thông số kỹ thuật cho thiết bị.`
        );
      } else {
        // Prepare selected op params payload
        const selectedOpItems = opParamRows
          .filter((r) => r.isSelected)
          .map((r) => ({
            name: r.name,
            unit: r.unit || null,
            minSpec: r.minSpec !== '' ? parseFloat(r.minSpec) : null,
            maxSpec: r.maxSpec !== '' ? parseFloat(r.maxSpec) : null,
            standardValue: r.standardValue !== '' ? parseFloat(r.standardValue) : null,
          }));

        await api.syncEquipmentParameters(selectedEqId, selectedOpItems);
        toast.success(
          'Đã lưu tham số vận hành',
          `Đã cập nhật ${selectedOpItems.length} tham số vận hành cho thiết bị.`
        );
      }

      setHasChanges(false);
      loadEquipmentMatrix(selectedEqId);
    } catch (e: any) {
      toast.error('Lỗi khi lưu', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Page Header */}
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
            Tích chọn trực tiếp để gắn thông số vào máy, bỏ tích để hủy liên kết. Nhập giá trị trực tiếp ngay trên bảng.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            className="btn btn-secondary"
            onClick={loadInitial}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Làm mới
          </button>

          {selectedEquipment && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveAll}
              disabled={saving}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 20px',
                fontSize: '13.5px',
                boxShadow: hasChanges ? '0 0 0 3px rgba(37, 99, 235, 0.25)' : 'none',
              }}
            >
              {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
              Lưu thiết lập máy
            </button>
          )}
        </div>
      </div>

      {/* Main Split View: Left Equipment List + Right Interactive Matrix */}
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
            maxHeight: '740px',
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
              maxHeight: '560px',
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
                    onClick={() => {
                      if (hasChanges) {
                        if (!window.confirm('Bạn có thay đổi chưa lưu trên máy hiện tại. Chuyển sang máy khác?')) {
                          return;
                        }
                      }
                      setSelectedEqId(eq.id);
                    }}
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

        {/* Right: Interactive Matrix for Selected Equipment */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {selectedEquipment ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Top Banner Info */}
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

              {/* 2 Main Sub-Tabs */}
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
                      padding: '1px 8px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      backgroundColor: activeSubTab === 'TECHNICAL_SPECS' ? 'rgba(37, 99, 235, 0.1)' : 'var(--bg-hover, #f1f5f9)',
                      color: activeSubTab === 'TECHNICAL_SPECS' ? '#2563eb' : 'var(--text-secondary)',
                      fontWeight: 700,
                    }}
                  >
                    Đã tích {selectedTechCount} / {techSpecRows.length}
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
                  2. Tham số Vận hành (Sổ vận hành / Quét QR)
                  <span
                    style={{
                      padding: '1px 8px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      backgroundColor: activeSubTab === 'OPERATING_PARAMS' ? 'rgba(37, 99, 235, 0.1)' : 'var(--bg-hover, #f1f5f9)',
                      color: activeSubTab === 'OPERATING_PARAMS' ? '#2563eb' : 'var(--text-secondary)',
                      fontWeight: 700,
                    }}
                  >
                    Đã tích {selectedOpCount} / {opParamRows.length}
                  </span>
                </button>
              </div>

              {/* Unsaved Changes Alert */}
              {hasChanges && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '6px',
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    color: '#b45309',
                    fontSize: '12.5px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>⚠️ Có thay đổi chưa lưu! Bấm <strong>"Lưu thiết lập máy"</strong> để lưu lại các thông số đã tích/bỏ tích.</span>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleSaveAll}
                    disabled={saving}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Save size={13} /> Lưu ngay
                  </button>
                </div>
              )}

              {/* ===================== TAB 1: TECHNICAL SPECS DIRECT MATRIX ===================== */}
              {activeSubTab === 'TECHNICAL_SPECS' && (
                <div>
                  {/* Toolbar inside Tab 1 */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px',
                      flexWrap: 'wrap',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ position: 'relative', width: '260px' }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Tìm thông số KT..."
                          value={techSearch}
                          onChange={(e) => setTechSearch(e.target.value)}
                          style={{ paddingLeft: '32px', height: '34px', fontSize: '12.5px' }}
                        />
                        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      </div>

                      {/* Quick Filters */}
                      <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color, #e2e8f0)' }}>
                        <button
                          type="button"
                          onClick={() => setTechFilterStatus('ALL')}
                          style={{
                            padding: '6px 12px',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            backgroundColor: techFilterStatus === 'ALL' ? 'var(--accent-blue, #2563eb)' : '#ffffff',
                            color: techFilterStatus === 'ALL' ? '#ffffff' : 'var(--text-primary)',
                          }}
                        >
                          Tất cả ({techSpecRows.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setTechFilterStatus('SELECTED')}
                          style={{
                            padding: '6px 12px',
                            border: 'none',
                            borderLeft: '1px solid var(--border-color, #e2e8f0)',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            backgroundColor: techFilterStatus === 'SELECTED' ? 'var(--accent-blue, #2563eb)' : '#ffffff',
                            color: techFilterStatus === 'SELECTED' ? '#ffffff' : 'var(--text-primary)',
                          }}
                        >
                          Đã chọn ({selectedTechCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => setTechFilterStatus('UNSELECTED')}
                          style={{
                            padding: '6px 12px',
                            border: 'none',
                            borderLeft: '1px solid var(--border-color, #e2e8f0)',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            backgroundColor: techFilterStatus === 'UNSELECTED' ? 'var(--accent-blue, #2563eb)' : '#ffffff',
                            color: techFilterStatus === 'UNSELECTED' ? '#ffffff' : 'var(--text-primary)',
                          }}
                        >
                          Chưa chọn ({techSpecRows.length - selectedTechCount})
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleSelectAllTech(true)}
                        style={{ fontSize: '12px' }}
                      >
                        <CheckCheck size={13} /> Chọn tất cả
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleSelectAllTech(false)}
                        style={{ fontSize: '12px' }}
                      >
                        <XSquare size={13} /> Bỏ chọn tất cả
                      </button>
                    </div>
                  </div>

                  {/* Direct Table */}
                  {dataLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                      <RefreshCw size={22} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
                      Đang tải danh mục thông số kỹ thuật...
                    </div>
                  ) : (
                    <div style={{ border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
                      <table className="custom-table" style={{ margin: 0, width: '100%' }}>
                        <thead>
                          <tr>
                            <th style={{ width: '50px', textAlign: 'center' }}>Áp dụng</th>
                            <th style={{ minWidth: '180px' }}>Tên thông số kỹ thuật (NSX)</th>
                            <th style={{ minWidth: '180px' }}>Giá trị danh định (Catalogue NSX)</th>
                            <th style={{ width: '90px', textAlign: 'center' }}>Đơn vị</th>
                            <th style={{ width: '120px', textAlign: 'center' }}>Phân nhóm</th>
                            <th>Ghi chú</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTechRows.map(({ row, fullIdx }) => (
                            <tr
                              key={row.standardId}
                              style={{
                                backgroundColor: row.isSelected ? 'rgba(37, 99, 235, 0.03)' : 'transparent',
                                opacity: row.isSelected ? 1 : 0.65,
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <td style={{ textAlign: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={row.isSelected}
                                  onChange={() => handleToggleTechSpec(fullIdx)}
                                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                />
                              </td>
                              <td>
                                <div
                                  onClick={() => handleToggleTechSpec(fullIdx)}
                                  style={{
                                    fontWeight: row.isSelected ? 700 : 500,
                                    color: row.isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                  }}
                                >
                                  {row.name}
                                </div>
                                {row.description && (
                                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    {row.description}
                                  </div>
                                )}
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="form-input"
                                  placeholder={row.isSelected ? 'Nhập giá trị theo máy...' : 'Tích để nhập'}
                                  disabled={!row.isSelected}
                                  value={row.value}
                                  onChange={(e) => handleTechSpecValueChange(fullIdx, 'value', e.target.value)}
                                  style={{
                                    height: '32px',
                                    fontSize: '13px',
                                    fontWeight: row.isSelected ? 600 : 400,
                                    backgroundColor: row.isSelected ? '#ffffff' : '#f8fafc',
                                  }}
                                />
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {row.unit ? (
                                  <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#f1f5f9', fontSize: '11.5px', fontWeight: 600 }}>
                                    {row.unit}
                                  </span>
                                ) : '—'}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {row.category ? (
                                  <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(37, 99, 235, 0.08)', color: '#2563eb', fontSize: '11px', fontWeight: 600 }}>
                                    {row.category}
                                  </span>
                                ) : '—'}
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="form-input"
                                  placeholder="Ghi chú..."
                                  disabled={!row.isSelected}
                                  value={row.notes}
                                  onChange={(e) => handleTechSpecValueChange(fullIdx, 'notes', e.target.value)}
                                  style={{
                                    height: '32px',
                                    fontSize: '12px',
                                    backgroundColor: row.isSelected ? '#ffffff' : '#f8fafc',
                                  }}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ===================== TAB 2: OPERATING PARAMS DIRECT MATRIX ===================== */}
              {activeSubTab === 'OPERATING_PARAMS' && (
                <div>
                  {/* Toolbar inside Tab 2 */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px',
                      flexWrap: 'wrap',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ position: 'relative', width: '260px' }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Tìm tham số vận hành..."
                          value={opSearch}
                          onChange={(e) => setOpSearch(e.target.value)}
                          style={{ paddingLeft: '32px', height: '34px', fontSize: '12.5px' }}
                        />
                        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      </div>

                      {/* Quick Filters */}
                      <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color, #e2e8f0)' }}>
                        <button
                          type="button"
                          onClick={() => setOpFilterStatus('ALL')}
                          style={{
                            padding: '6px 12px',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            backgroundColor: opFilterStatus === 'ALL' ? 'var(--accent-blue, #2563eb)' : '#ffffff',
                            color: opFilterStatus === 'ALL' ? '#ffffff' : 'var(--text-primary)',
                          }}
                        >
                          Tất cả ({opParamRows.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpFilterStatus('SELECTED')}
                          style={{
                            padding: '6px 12px',
                            border: 'none',
                            borderLeft: '1px solid var(--border-color, #e2e8f0)',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            backgroundColor: opFilterStatus === 'SELECTED' ? 'var(--accent-blue, #2563eb)' : '#ffffff',
                            color: opFilterStatus === 'SELECTED' ? '#ffffff' : 'var(--text-primary)',
                          }}
                        >
                          Đã chọn ({selectedOpCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpFilterStatus('UNSELECTED')}
                          style={{
                            padding: '6px 12px',
                            border: 'none',
                            borderLeft: '1px solid var(--border-color, #e2e8f0)',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            backgroundColor: opFilterStatus === 'UNSELECTED' ? 'var(--accent-blue, #2563eb)' : '#ffffff',
                            color: opFilterStatus === 'UNSELECTED' ? '#ffffff' : 'var(--text-primary)',
                          }}
                        >
                          Chưa chọn ({opParamRows.length - selectedOpCount})
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleSelectAllOp(true)}
                        style={{ fontSize: '12px' }}
                      >
                        <CheckCheck size={13} /> Chọn tất cả
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleSelectAllOp(false)}
                        style={{ fontSize: '12px' }}
                      >
                        <XSquare size={13} /> Bỏ chọn tất cả
                      </button>
                    </div>
                  </div>

                  {/* Direct Table */}
                  {dataLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                      <RefreshCw size={22} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
                      Đang tải danh mục tham số vận hành...
                    </div>
                  ) : (
                    <div style={{ border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
                      <table className="custom-table" style={{ margin: 0, width: '100%' }}>
                        <thead>
                          <tr>
                            <th style={{ width: '50px', textAlign: 'center' }}>Theo dõi</th>
                            <th style={{ minWidth: '180px' }}>Tên tham số vận hành</th>
                            <th style={{ width: '80px', textAlign: 'center' }}>Đơn vị</th>
                            <th style={{ width: '130px', textAlign: 'center' }}>Tiêu chuẩn Min</th>
                            <th style={{ width: '130px', textAlign: 'center' }}>Tiêu chuẩn Max</th>
                            <th style={{ width: '130px', textAlign: 'center' }}>Giá trị chuẩn</th>
                            <th style={{ width: '100px', textAlign: 'center' }}>Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredOpRows.map(({ row, fullIdx }) => (
                            <tr
                              key={row.standardId}
                              style={{
                                backgroundColor: row.isSelected ? 'rgba(37, 99, 235, 0.03)' : 'transparent',
                                opacity: row.isSelected ? 1 : 0.65,
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <td style={{ textAlign: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={row.isSelected}
                                  onChange={() => handleToggleOpParam(fullIdx)}
                                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                />
                              </td>
                              <td>
                                <div
                                  onClick={() => handleToggleOpParam(fullIdx)}
                                  style={{
                                    fontWeight: row.isSelected ? 700 : 500,
                                    color: row.isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                  }}
                                >
                                  {row.name}
                                </div>
                                {row.description && (
                                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    {row.description}
                                  </div>
                                )}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {row.unit ? (
                                  <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#f1f5f9', fontSize: '11.5px', fontWeight: 600 }}>
                                    {row.unit}
                                  </span>
                                ) : '—'}
                              </td>
                              <td>
                                <input
                                  type="number"
                                  step="any"
                                  className="form-input"
                                  placeholder="Min..."
                                  disabled={!row.isSelected}
                                  value={row.minSpec}
                                  onChange={(e) => handleOpParamValueChange(fullIdx, 'minSpec', e.target.value)}
                                  style={{
                                    height: '32px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    textAlign: 'center',
                                    backgroundColor: row.isSelected ? '#ffffff' : '#f8fafc',
                                  }}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  step="any"
                                  className="form-input"
                                  placeholder="Max..."
                                  disabled={!row.isSelected}
                                  value={row.maxSpec}
                                  onChange={(e) => handleOpParamValueChange(fullIdx, 'maxSpec', e.target.value)}
                                  style={{
                                    height: '32px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    textAlign: 'center',
                                    backgroundColor: row.isSelected ? '#ffffff' : '#f8fafc',
                                  }}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  step="any"
                                  className="form-input"
                                  placeholder="Chuẩn..."
                                  disabled={!row.isSelected}
                                  value={row.standardValue}
                                  onChange={(e) => handleOpParamValueChange(fullIdx, 'standardValue', e.target.value)}
                                  style={{
                                    height: '32px',
                                    fontSize: '13px',
                                    textAlign: 'center',
                                    backgroundColor: row.isSelected ? '#ffffff' : '#f8fafc',
                                  }}
                                />
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span
                                  style={{
                                    padding: '2px 8px',
                                    borderRadius: '10px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    backgroundColor: row.isSelected ? '#dcfce7' : '#f1f5f9',
                                    color: row.isSelected ? '#16a34a' : '#94a3b8',
                                  }}
                                >
                                  {row.isSelected ? 'Đang theo dõi' : 'Không dùng'}
                                </span>
                              </td>
                            </tr>
                          ))}
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
    </div>
  );
};
