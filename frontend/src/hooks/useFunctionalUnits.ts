import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/common/Toast';

const BASE_CATEGORIES = [
  'Tất cả',
  'Cơ khí',
  'Điện - Tự động hóa',
  'Khí nén',
  'Thủy lực',
  'Nhiệt & Hơi',
  'Cảm biến & Đo lường',
  'Khác',
];

interface UseFunctionalUnitsOptions {
  equipmentId: string;
  equipmentCode?: string;
  onUnitsUpdated?: () => void;
}

const createEmptyForm = (equipmentCode?: string, index = 1) => ({
  name: '',
  code: equipmentCode ? `${equipmentCode}-CU${index.toString().padStart(2, '0')}` : `CU-${index.toString().padStart(2, '0')}`,
  description: '',
  status: 'OPERATIONAL',
  category: 'Cơ khí',
});

export const useFunctionalUnits = ({
  equipmentId,
  equipmentCode,
  onUnitsUpdated,
}: UseFunctionalUnitsOptions) => {
  const toast = useToast();
  const [units, setUnits] = useState<any[]>([]);
  const [libraryList, setLibraryList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'LIBRARY' | 'CUSTOM'>('LIBRARY');
  const [editingUnit, setEditingUnit] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [libSearch, setLibSearch] = useState('');
  const [libCategory, setLibCategory] = useState('Tất cả');
  const [selectedLibItems, setSelectedLibItems] = useState<any[]>([]);
  const [formData, setFormData] = useState(createEmptyForm(equipmentCode));
  const [unitToDelete, setUnitToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [allEquipments, setAllEquipments] = useState<any[]>([]);
  const [selectedSourceEqId, setSelectedSourceEqId] = useState('');
  const [sourceUnits, setSourceUnits] = useState<any[]>([]);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [loadingSourceUnits, setLoadingSourceUnits] = useState(false);
  const [cloning, setCloning] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resUnits, resLib] = await Promise.all([
        api.getEquipmentFunctionalUnits(equipmentId),
        api.getFunctionalUnitLibrary().catch(() => []),
      ]);
      setUnits(resUnits || []);
      setLibraryList(resLib || []);
    } catch (error) {
      console.error('Lỗi tải danh sách cụm chức năng:', error);
      toast.error('Lỗi', 'Không thể tải danh sách cụm chức năng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [equipmentId]);

  const allCategories = useMemo(() => {
    const custom = libraryList.map(item => item.category?.trim()).filter(Boolean) as string[];
    return Array.from(new Set([...BASE_CATEGORIES, ...custom]));
  }, [libraryList]);

  const filteredLibrary = useMemo(() => libraryList.filter(item => {
    const search = libSearch.toLowerCase().trim();
    const matchSearch = !search
      || item.name.toLowerCase().includes(search)
      || item.description?.toLowerCase().includes(search);
    const matchCategory = libCategory === 'Tất cả'
      || item.category?.toLowerCase() === libCategory.toLowerCase();
    return matchSearch && matchCategory;
  }), [libraryList, libSearch, libCategory]);

  const handleOpenAddModal = () => {
    setEditingUnit(null);
    setModalMode('LIBRARY');
    setLibSearch('');
    setLibCategory('Tất cả');
    setSelectedLibItems([]);
    setFormData(createEmptyForm(equipmentCode, units.length + 1));
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (unit: any) => {
    setEditingUnit(unit);
    setModalMode('CUSTOM');
    setSelectedLibItems([]);
    setFormData({
      name: unit.name || '',
      code: unit.code || '',
      description: unit.description || '',
      status: unit.status || 'OPERATIONAL',
      category: unit.libraryItem?.category || 'Cơ khí',
    });
    setIsModalOpen(true);
  };

  const applySingleLibraryItem = (items: any[]) => {
    if (items.length === 1) {
      const [item] = items;
      setFormData(current => ({
        ...current,
        name: item.name,
        code: createEmptyForm(equipmentCode, units.length + 1).code,
        description: item.description || '',
        category: item.category || 'Cơ khí',
      }));
    } else if (items.length === 0) {
      setFormData(current => ({ ...current, name: '', code: '', description: '' }));
    }
  };

  const handleToggleLibraryItem = (libraryItem: any) => {
    const alreadyAssigned = units.some(unit => unit.name.toLowerCase().trim() === libraryItem.name.toLowerCase().trim());
    if (alreadyAssigned) return;

    setSelectedLibItems(current => {
      const updated = current.some(item => item.id === libraryItem.id)
        ? current.filter(item => item.id !== libraryItem.id)
        : [...current, libraryItem];
      applySingleLibraryItem(updated);
      return updated;
    });
  };

  const handleSelectAllFilteredLibrary = () => {
    const currentNames = new Set(units.map(unit => unit.name.toLowerCase().trim()));
    const availableItems = filteredLibrary.filter(item => !currentNames.has(item.name.toLowerCase().trim()));
    setSelectedLibItems(availableItems);
    applySingleLibraryItem(availableItems);
  };

  const handleDeselectAllLibrary = () => {
    setSelectedLibItems([]);
    applySingleLibraryItem([]);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!editingUnit && modalMode === 'LIBRARY') {
      if (selectedLibItems.length === 0) {
        toast.error('Chưa chọn cụm', 'Vui lòng tích chọn ít nhất một cụm chức năng từ thư viện');
        return;
      }

      try {
        setSubmitting(true);
        if (selectedLibItems.length === 1) {
          const [item] = selectedLibItems;
          await api.createEquipmentFunctionalUnit(equipmentId, {
            name: item.name,
            code: formData.code.trim() || undefined,
            description: formData.description.trim() || item.description || undefined,
            status: formData.status || 'OPERATIONAL',
            category: formData.category || item.category || 'Cơ khí',
          });
          toast.success('Gán thành công', `Đã thêm cụm "${item.name}" vào thiết bị`);
        } else {
          const items = selectedLibItems.map((item, index) => ({
            name: item.name,
            code: createEmptyForm(equipmentCode, units.length + index + 1).code,
            description: item.description || '',
            category: item.category || 'Cơ khí',
            status: formData.status || 'OPERATIONAL',
          }));
          const result = await api.createBatchEquipmentFunctionalUnits(equipmentId, items);
          toast.success('Gán thành công', result?.message || `Đã gán thành công ${result?.createdCount || items.length} cụm chức năng vào thiết bị`);
        }
        setIsModalOpen(false);
        await loadData();
        onUnitsUpdated?.();
      } catch (error: any) {
        toast.error('Thao tác thất bại', error.message || 'Có lỗi xảy ra khi gán cụm chức năng');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!formData.name.trim()) {
      toast.error('Thiếu thông tin', 'Vui lòng nhập tên cụm chức năng');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim() || undefined,
        description: formData.description.trim() || undefined,
        status: formData.status,
      };
      if (editingUnit) {
        await api.updateEquipmentFunctionalUnit(equipmentId, editingUnit.id, payload);
        toast.success('Cập nhật thành công', `Đã lưu thay đổi cho cụm "${formData.name}"`);
      } else {
        await api.createEquipmentFunctionalUnit(equipmentId, { ...payload, category: formData.category });
        toast.success('Thêm thành công', `Đã thêm cụm "${formData.name}" vào thiết bị và thư viện`);
      }
      setIsModalOpen(false);
      await loadData();
      onUnitsUpdated?.();
    } catch (error: any) {
      toast.error('Thao tác thất bại', error.message || 'Có lỗi xảy ra khi lưu cụm chức năng');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!unitToDelete) return;
    try {
      setIsDeleting(true);
      await api.deleteEquipmentFunctionalUnit(equipmentId, unitToDelete.id);
      toast.success('Đã xóa', `Đã xóa cụm "${unitToDelete.name}" khỏi thiết bị`);
      setUnitToDelete(null);
      await loadData();
      onUnitsUpdated?.();
    } catch (error: any) {
      toast.error('Xóa thất bại', error.message || 'Không thể xóa cụm chức năng');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenCloneModal = async () => {
    setIsCloneModalOpen(true);
    setSelectedSourceEqId('');
    setSourceUnits([]);
    setSelectedUnitIds([]);
    try {
      const response = await api.getEquipment();
      const equipments = Array.isArray(response) ? response : response?.data || [];
      setAllEquipments(equipments.filter((equipment: any) => equipment.id !== equipmentId));
    } catch (error) {
      console.error('Lỗi tải danh sách thiết bị:', error);
    }
  };

  const handleSelectSourceEquipment = async (sourceId: string) => {
    setSelectedSourceEqId(sourceId);
    if (!sourceId) {
      setSourceUnits([]);
      setSelectedUnitIds([]);
      return;
    }
    try {
      setLoadingSourceUnits(true);
      const response = await api.getEquipmentFunctionalUnits(sourceId);
      const sourceList = Array.isArray(response) ? response : [];
      setSourceUnits(sourceList);
      const currentNames = new Set(units.map(unit => unit.name.toLowerCase().trim()));
      setSelectedUnitIds(sourceList.filter(unit => !currentNames.has(unit.name.toLowerCase().trim())).map(unit => unit.id));
    } catch {
      toast.error('Lỗi', 'Không thể tải danh sách cụm của thiết bị đã chọn');
      setSourceUnits([]);
      setSelectedUnitIds([]);
    } finally {
      setLoadingSourceUnits(false);
    }
  };

  const handleToggleUnitSelect = (id: string) => {
    setSelectedUnitIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  };

  const handleSelectAllUnits = () => {
    const currentNames = new Set(units.map(unit => unit.name.toLowerCase().trim()));
    setSelectedUnitIds(sourceUnits.filter(unit => !currentNames.has(unit.name.toLowerCase().trim())).map(unit => unit.id));
  };

  const handleExecuteClone = async () => {
    if (!selectedSourceEqId || selectedUnitIds.length === 0) {
      toast.error('Chưa chọn cụm', 'Vui lòng chọn ít nhất một cụm chức năng để sao chép');
      return;
    }
    try {
      setCloning(true);
      const result = await api.cloneEquipmentFunctionalUnits(equipmentId, {
        sourceEquipmentId: selectedSourceEqId,
        unitIds: selectedUnitIds,
      });
      toast.success('Sao chép thành công', result.message || `Đã sao chép ${result.clonedCount || selectedUnitIds.length} cụm chức năng!`);
      setIsCloneModalOpen(false);
      await loadData();
      onUnitsUpdated?.();
    } catch (error: any) {
      toast.error('Sao chép thất bại', error.message || 'Có lỗi xảy ra khi sao chép');
    } finally {
      setCloning(false);
    }
  };

  return {
    allCategories, allEquipments, cloning, editingUnit, filteredLibrary, formData,
    handleConfirmDelete, handleDeselectAllLibrary, handleDeselectAllUnits: () => setSelectedUnitIds([]),
    handleExecuteClone, handleOpenAddModal, handleOpenCloneModal, handleOpenEditModal,
    handleSelectAllFilteredLibrary, handleSelectAllUnits, handleSelectSourceEquipment,
    handleSubmit, handleToggleLibraryItem, handleToggleUnitSelect, isCloneModalOpen,
    isDeleting, isModalOpen, libCategory, libSearch, libraryList, loadData, loading,
    loadingSourceUnits, modalMode, selectedLibItems, selectedSourceEqId, selectedUnitIds,
    setFormData, setIsCloneModalOpen, setIsModalOpen, setLibCategory, setLibSearch,
    setModalMode, setSelectedLibItems, setUnitToDelete, sourceUnits, submitting,
    unitToDelete, units,
  };
};
