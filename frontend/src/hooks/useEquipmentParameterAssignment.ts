import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/common/Toast';

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

export const useEquipmentParameterAssignment = () => {
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

  return {
    activeSubTab, dataLoading, eqSearch, filteredEquipment, filteredOpRows, filteredTechRows,
    handleOpParamValueChange, handleSaveAll, handleSelectAllOp, handleSelectAllTech,
    handleTechSpecValueChange, handleToggleOpParam, handleToggleTechSpec, hasChanges,
    loadInitial, loading, locations, opFilterStatus, opParamRows, opSearch, saving,
    selectedEqId, selectedEquipment, selectedLocation, selectedOpCount, selectedTechCount,
    setActiveSubTab, setEqSearch, setOpFilterStatus, setOpSearch, setSelectedEqId,
    setSelectedLocation, setTechFilterStatus, setTechSearch, techFilterStatus, techSearch,
    techSpecRows,
  };
};

export type EquipmentParameterAssignmentModel = ReturnType<typeof useEquipmentParameterAssignment>;
