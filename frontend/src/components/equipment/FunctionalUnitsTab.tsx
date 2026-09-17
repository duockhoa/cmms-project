import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Edit, Trash2, Cpu, CheckCircle2, AlertTriangle, AlertCircle, 
  RefreshCw, Copy, Search, Check, Layers, ArrowRight, BookOpen, Sparkles
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { useToast } from '../common/Toast';

interface FunctionalUnitsTabProps {
  equipmentId: string;
  equipmentCode?: string;
  equipmentName?: string;
  onUnitsUpdated?: () => void;
}

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

export const FunctionalUnitsTab: React.FC<FunctionalUnitsTabProps> = ({
  equipmentId,
  equipmentCode,
  equipmentName,
  onUnitsUpdated,
}) => {
  const toast = useToast();
  const [units, setUnits] = useState<any[]>([]);
  const [libraryList, setLibraryList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'LIBRARY' | 'CUSTOM'>('LIBRARY');
  const [editingUnit, setEditingUnit] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Library picker filter
  const [libSearch, setLibSearch] = useState('');
  const [libCategory, setLibCategory] = useState('Tất cả');
  const [selectedLibItems, setSelectedLibItems] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    status: 'OPERATIONAL',
    category: 'Cơ khí',
  });

  // Delete Confirm Modal State
  const [unitToDelete, setUnitToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Clone from other equipment State
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
    } catch (err: any) {
      console.error('Lỗi tải danh sách cụm chức năng:', err);
      toast.error('Lỗi', 'Không thể tải danh sách cụm chức năng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [equipmentId]);

  // Tự động tổng hợp tất cả phân nhóm kỹ thuật hiện có trong thư viện
  const allCategories = useMemo(() => {
    const custom = libraryList.map(i => i.category?.trim()).filter(Boolean) as string[];
    return Array.from(new Set([...BASE_CATEGORIES, ...custom]));
  }, [libraryList]);

  // Lọc danh sách thư viện trong modal
  const filteredLibrary = useMemo(() => {
    return libraryList.filter(item => {
      const matchSearch = !libSearch.trim() || 
        item.name.toLowerCase().includes(libSearch.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(libSearch.toLowerCase()));
      const matchCat = libCategory === 'Tất cả' || (item.category && item.category.toLowerCase() === libCategory.toLowerCase());
      return matchSearch && matchCat;
    });
  }, [libraryList, libSearch, libCategory]);

  const handleOpenAddModal = () => {
    setEditingUnit(null);
    setModalMode('LIBRARY');
    setLibSearch('');
    setLibCategory('Tất cả');
    setSelectedLibItems([]);

    const nextIndex = (units.length + 1).toString().padStart(2, '0');
    setFormData({
      name: '',
      code: equipmentCode ? `${equipmentCode}-CU${nextIndex}` : `CU-${nextIndex}`,
      description: '',
      status: 'OPERATIONAL',
      category: 'Cơ khí',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (unit: any) => {
    setEditingUnit(unit);
    setModalMode('CUSTOM'); // Chỉnh sửa trực tiếp
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

  const handleToggleLibraryItem = (libItem: any) => {
    const isAlreadyOnMachine = units.some(u => u.name.toLowerCase().trim() === libItem.name.toLowerCase().trim());
    if (isAlreadyOnMachine) return;

    setSelectedLibItems(prev => {
      const exists = prev.some(i => i.id === libItem.id);
      const updated = exists ? prev.filter(i => i.id !== libItem.id) : [...prev, libItem];

      if (updated.length === 1) {
        const single = updated[0];
        const nextIndex = (units.length + 1).toString().padStart(2, '0');
        setFormData(f => ({
          ...f,
          name: single.name,
          code: equipmentCode ? `${equipmentCode}-CU${nextIndex}` : `CU-${nextIndex}`,
          description: single.description || '',
          category: single.category || 'Cơ khí',
        }));
      } else if (updated.length === 0) {
        setFormData(f => ({ ...f, name: '', code: '', description: '' }));
      }
      return updated;
    });
  };

  const handleSelectAllFilteredLibrary = () => {
    const currentNames = new Set(units.map(u => u.name.toLowerCase().trim()));
    const availableItems = filteredLibrary.filter(item => !currentNames.has(item.name.toLowerCase().trim()));
    setSelectedLibItems(availableItems);
    if (availableItems.length === 1) {
      const single = availableItems[0];
      const nextIndex = (units.length + 1).toString().padStart(2, '0');
      setFormData(f => ({
        ...f,
        name: single.name,
        code: equipmentCode ? `${equipmentCode}-CU${nextIndex}` : `CU-${nextIndex}`,
        description: single.description || '',
        category: single.category || 'Cơ khí',
      }));
    }
  };

  const handleDeselectAllLibrary = () => {
    setSelectedLibItems([]);
    setFormData(f => ({ ...f, name: '', code: '', description: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Gán từ Thư viện (1 hoặc nhiều cụm)
    if (!editingUnit && modalMode === 'LIBRARY') {
      if (selectedLibItems.length === 0) {
        toast.error('Chưa chọn cụm', 'Vui lòng tích chọn ít nhất một cụm chức năng từ thư viện');
        return;
      }

      try {
        setSubmitting(true);
        if (selectedLibItems.length === 1) {
          const item = selectedLibItems[0];
          await api.createEquipmentFunctionalUnit(equipmentId, {
            name: item.name,
            code: formData.code.trim() || undefined,
            description: formData.description.trim() || item.description || undefined,
            status: formData.status || 'OPERATIONAL',
            category: formData.category || item.category || 'Cơ khí',
          });
          toast.success('Gán thành công', `Đã thêm cụm "${item.name}" vào thiết bị`);
        } else {
          // Nhiều cụm: tạo theo lô (batch)
          const itemsToCreate = selectedLibItems.map((item, idx) => {
            const nextIdx = (units.length + 1 + idx).toString().padStart(2, '0');
            return {
              name: item.name,
              code: equipmentCode ? `${equipmentCode}-CU${nextIdx}` : `CU-${nextIdx}`,
              description: item.description || '',
              category: item.category || 'Cơ khí',
              status: formData.status || 'OPERATIONAL',
            };
          });
          const result = await api.createBatchEquipmentFunctionalUnits(equipmentId, itemsToCreate);
          toast.success(
            'Gán thành công',
            result?.message || `Đã gán thành công ${result?.createdCount || selectedLibItems.length} cụm chức năng vào thiết bị`
          );
        }
        setIsModalOpen(false);
        await loadData();
        if (onUnitsUpdated) onUnitsUpdated();
      } catch (err: any) {
        toast.error('Thao tác thất bại', err.message || 'Có lỗi xảy ra khi gán cụm chức năng');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // 2. Tạo cụm mới độc lập hoặc cập nhật
    if (!formData.name.trim()) {
      toast.error('Thiếu thông tin', 'Vui lòng nhập tên cụm chức năng');
      return;
    }

    try {
      setSubmitting(true);
      if (editingUnit) {
        await api.updateEquipmentFunctionalUnit(equipmentId, editingUnit.id, {
          name: formData.name.trim(),
          code: formData.code.trim() || undefined,
          description: formData.description.trim() || undefined,
          status: formData.status,
        });
        toast.success('Cập nhật thành công', `Đã lưu thay đổi cho cụm "${formData.name}"`);
      } else {
        await api.createEquipmentFunctionalUnit(equipmentId, {
          name: formData.name.trim(),
          code: formData.code.trim() || undefined,
          description: formData.description.trim() || undefined,
          status: formData.status,
          category: formData.category,
        });
        toast.success('Thêm thành công', `Đã thêm cụm "${formData.name}" vào thiết bị và thư viện`);
      }
      setIsModalOpen(false);
      await loadData();
      if (onUnitsUpdated) onUnitsUpdated();
    } catch (err: any) {
      toast.error('Thao tác thất bại', err.message || 'Có lỗi xảy ra khi lưu cụm chức năng');
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
      if (onUnitsUpdated) onUnitsUpdated();
    } catch (err: any) {
      toast.error('Xóa thất bại', err.message || 'Không thể xóa cụm chức năng');
    } finally {
      setIsDeleting(false);
    }
  };

  // ==========================================
  // XỬ LÝ SAO CHÉP TỪ MÁY KHÁC (CLONE)
  // ==========================================
  const handleOpenCloneModal = async () => {
    setIsCloneModalOpen(true);
    setSelectedSourceEqId('');
    setSourceUnits([]);
    setSelectedUnitIds([]);
    try {
      // Tải danh sách thiết bị khác
      const eqs = await api.getEquipment();
      const list = Array.isArray(eqs) ? eqs : (eqs?.data || []);
      // Loại trừ thiết bị hiện tại
      setAllEquipments(list.filter((eq: any) => eq.id !== equipmentId));
    } catch (err) {
      console.error('Lỗi tải danh sách thiết bị:', err);
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
      const res = await api.getEquipmentFunctionalUnits(sourceId);
      const unitsList = Array.isArray(res) ? res : [];
      setSourceUnits(unitsList);

      // Mặc định chọn những cụm chưa tồn tại trên máy hiện tại
      const currentNames = new Set(units.map(u => u.name.toLowerCase().trim()));
      const availableIds = unitsList
        .filter(u => !currentNames.has(u.name.toLowerCase().trim()))
        .map(u => u.id);
      setSelectedUnitIds(availableIds);
    } catch (err) {
      toast.error('Lỗi', 'Không thể tải danh sách cụm của thiết bị đã chọn');
      setSourceUnits([]);
      setSelectedUnitIds([]);
    } finally {
      setLoadingSourceUnits(false);
    }
  };

  const handleToggleUnitSelect = (id: string) => {
    setSelectedUnitIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllUnits = () => {
    const currentNames = new Set(units.map(u => u.name.toLowerCase().trim()));
    const selectable = sourceUnits
      .filter(u => !currentNames.has(u.name.toLowerCase().trim()))
      .map(u => u.id);
    setSelectedUnitIds(selectable);
  };

  const handleDeselectAllUnits = () => {
    setSelectedUnitIds([]);
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

      toast.success(
        'Sao chép thành công',
        result.message || `Đã sao chép ${result.clonedCount || selectedUnitIds.length} cụm chức năng!`
      );
      setIsCloneModalOpen(false);
      await loadData();
      if (onUnitsUpdated) onUnitsUpdated();
    } catch (err: any) {
      toast.error('Sao chép thất bại', err.message || 'Có lỗi xảy ra khi sao chép');
    } finally {
      setCloning(false);
    }
  };

  // Thống kê nhanh
  const totalCount = units.length;
  const operationalCount = units.filter(u => u.status === 'OPERATIONAL').length;
  const warningCount = units.filter(u => u.status === 'WARNING').length;
  const incidentCount = units.filter(u => u.status === 'INCIDENT').length;

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'OPERATIONAL':
        return <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={12} /> Hoạt động tốt</span>;
      case 'WARNING':
        return <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={12} /> Cần theo dõi</span>;
      case 'INCIDENT':
        return <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><AlertCircle size={12} /> Sự cố / Hỏng</span>;
      case 'INACTIVE':
        return <span className="badge" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>Ngừng hoạt động</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Thẻ KPI tổng kết nhanh */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        <div className="kpi-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}>
            <Cpu size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>TỔNG CỤM CHỨC NĂNG</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>{totalCount}</div>
          </div>
        </div>

        <div className="kpi-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>HOẠT ĐỘNG TỐT</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#10b981' }}>{operationalCount}</div>
          </div>
        </div>

        <div className="kpi-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>CẦN THEO DÕI</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#d97706' }}>{warningCount}</div>
          </div>
        </div>

        <div className="kpi-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <AlertCircle size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>SỰ CỐ / HỎNG</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#dc2626' }}>{incidentCount}</div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Danh sách cụm chức năng chính
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Quản lý các bộ phận, cụm cơ cấu chính cấu thành máy và liên kết với thư viện chuẩn
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button 
              onClick={loadData}
              className="btn btn-secondary btn-sm"
              title="Làm mới dữ liệu"
              disabled={loading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} /> Làm mới
            </button>
            <button 
              onClick={handleOpenCloneModal}
              className="btn btn-outline-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
              title="Sao chép các cụm chức năng từ thiết bị tương tự"
            >
              <Copy size={14} /> Sao chép từ máy khác
            </button>
            <button 
              onClick={handleOpenAddModal}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
            >
              <Plus size={15} /> Thêm cụm chức năng
            </button>
          </div>
        </div>

        {/* Bảng dữ liệu */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '14px' }}>
            Đang tải danh sách cụm chức năng...
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="custom-table" style={{ fontSize: '13px' }}>
              <thead>
                <tr>
                  <th style={{ width: '60px', textAlign: 'center' }}>STT</th>
                  <th style={{ width: '150px' }}>Mã cụm</th>
                  <th style={{ minWidth: '220px' }}>Tên cụm chức năng</th>
                  <th style={{ width: '170px' }}>Trạng thái</th>
                  <th style={{ minWidth: '250px' }}>Mô tả / Thông số phụ trách</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {units.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '36px 16px' }}>
                      <Cpu size={36} style={{ margin: '0 auto 10px', opacity: 0.35, display: 'block' }} />
                      <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                        Chưa có cụm chức năng chính nào
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                        Bạn có thể chọn từ Thư viện mẫu có sẵn hoặc sao chép nhanh từ máy tương tự khác.
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                        <button 
                          onClick={handleOpenCloneModal}
                          className="btn btn-outline-primary btn-sm"
                        >
                          <Copy size={13} style={{ marginRight: '4px' }} /> Sao chép từ máy khác
                        </button>
                        <button 
                          onClick={handleOpenAddModal}
                          className="btn btn-primary btn-sm"
                        >
                          <Plus size={13} style={{ marginRight: '4px' }} /> Thêm cụm từ Thư viện
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : units.map((u, idx) => (
                  <tr key={u.id}>
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontWeight: 500 }}>{idx + 1}</td>
                    <td>
                      <span style={{ 
                        fontFamily: 'monospace', 
                        fontWeight: 700, 
                        fontSize: '12px',
                        color: 'var(--text-primary)',
                        backgroundColor: 'var(--bg-secondary)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)'
                      }}>
                        {u.code || '---'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>
                        {u.name}
                      </div>
                      {u.libraryItem && (
                        <div style={{ fontSize: '11px', color: '#2563eb', marginTop: '2px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <BookOpen size={11} /> Thư viện chuẩn: {u.libraryItem.category ? `[${u.libraryItem.category}]` : ''}
                        </div>
                      )}
                    </td>
                    <td>
                      {renderStatusBadge(u.status)}
                    </td>
                    <td style={{ color: u.description ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                      {u.description || 'Chưa có mô tả'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          title="Chỉnh sửa cụm chức năng"
                          style={{ padding: '4px 7px' }}
                          onClick={() => handleOpenEditModal(u)}
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          className="btn btn-outline-danger btn-sm"
                          title="Xóa cụm chức năng"
                          style={{ padding: '4px 7px' }}
                          onClick={() => setUnitToDelete(u)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ==================================================== */}
      {/* MODAL THÊM / SỬA CỤM CHỨC NĂNG (GIAO DIỆN NÂNG CẤP) */}
      {/* ==================================================== */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => !submitting && setIsModalOpen(false)}
          title={editingUnit ? `Chỉnh sửa cụm: ${editingUnit.name}` : 'Thêm cụm chức năng cho thiết bị'}
          maxWidth="640px"
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Chế độ chọn (chỉ hiển thị khi thêm mới) */}
            {!editingUnit && (
              <div style={{ 
                display: 'flex', 
                backgroundColor: 'var(--bg-secondary)', 
                padding: '4px', 
                borderRadius: '8px', 
                border: '1px solid var(--border-color)',
                gap: '4px'
              }}>
                <button
                   onClick={() => {
                    setModalMode('LIBRARY');
                    setSelectedLibItems([]);
                  }}
                >
                  <BookOpen size={15} /> 1. Chọn từ Thư viện có sẵn ({libraryList.length})
                </button>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: modalMode === 'CUSTOM' ? '#2563eb' : 'transparent',
                    color: modalMode === 'CUSTOM' ? '#ffffff' : 'var(--text-primary)',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                  onClick={() => {
                    setModalMode('CUSTOM');
                    setSelectedLibItems([]);
                    const nextIndex = (units.length + 1).toString().padStart(2, '0');
                    setFormData({
                      name: '',
                      code: equipmentCode ? `${equipmentCode}-CU${nextIndex}` : `CU-${nextIndex}`,
                      description: '',
                      status: 'OPERATIONAL',
                      category: 'Cơ khí',
                    });
                  }}
                >
                  <Sparkles size={15} /> 2. Tạo cụm mới độc lập
                </button>
              </div>
            )}

            {/* ==================================================== */}
            {/* TAB 1: CHỌN TỪ THƯ VIỆN CÓ SẴN (CHỌN ĐƯỢC NHIỀU CỤM) */}
            {/* ==================================================== */}
            {!editingUnit && modalMode === 'LIBRARY' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Thanh tìm kiếm & lọc nhóm */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      className="form-input"
                      style={{ paddingLeft: '30px', fontSize: '13px' }}
                      placeholder="Tìm cụm trong thư viện..."
                      value={libSearch}
                      onChange={(e) => setLibSearch(e.target.value)}
                    />
                  </div>

                  <select
                    className="form-select"
                    style={{ width: '170px', fontSize: '13px' }}
                    value={libCategory}
                    onChange={(e) => setLibCategory(e.target.value)}
                  >
                    {allCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Thanh thao tác chọn nhanh */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', padding: '0 2px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {filteredLibrary.length} cụm trong danh mục
                    {selectedLibItems.length > 0 && (
                      <strong style={{ color: '#2563eb', marginLeft: '6px' }}>
                        (Đã chọn {selectedLibItems.length})
                      </strong>
                    )}
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-sm"
                      style={{ fontSize: '11px', padding: '3px 8px', height: 'auto', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '4px' }}
                      onClick={handleSelectAllFilteredLibrary}
                    >
                      Chọn tất cả ({filteredLibrary.filter(item => !units.some(u => u.name.toLowerCase().trim() === item.name.toLowerCase().trim())).length})
                    </button>
                    {selectedLibItems.length > 0 && (
                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{ fontSize: '11px', padding: '3px 8px', height: 'auto', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-muted)', cursor: 'pointer', borderRadius: '4px' }}
                        onClick={handleDeselectAllLibrary}
                      >
                        Bỏ chọn
                      </button>
                    )}
                  </div>
                </div>

                {/* Danh sách thẻ cụm trong thư viện có checkbox chọn nhiều */}
                <div style={{
                  maxHeight: '220px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  backgroundColor: 'var(--bg-secondary)',
                }}>
                  {filteredLibrary.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-muted)', fontSize: '13px' }}>
                      Không tìm thấy cụm chức năng nào phù hợp. Hãy chuyển sang tab <strong>"Tạo cụm mới độc lập"</strong> để nhập cụm đặc thù.
                    </div>
                  ) : (
                    filteredLibrary.map(item => {
                      const isAlreadyOnMachine = units.some(u => u.name.toLowerCase().trim() === item.name.toLowerCase().trim());
                      const isSelected = selectedLibItems.some(i => i.id === item.id);

                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            if (!isAlreadyOnMachine) {
                              handleToggleLibraryItem(item);
                            }
                          }}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            cursor: isAlreadyOnMachine ? 'not-allowed' : 'pointer',
                            backgroundColor: isSelected 
                              ? 'rgba(37, 99, 235, 0.12)' 
                              : isAlreadyOnMachine 
                              ? 'var(--bg-secondary)' 
                              : 'var(--bg-primary)',
                            border: isSelected 
                              ? '1px solid #2563eb' 
                              : '1px solid var(--border-color)',
                            opacity: isAlreadyOnMachine ? 0.6 : 1,
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={isAlreadyOnMachine}
                              onChange={() => handleToggleLibraryItem(item)}
                              onClick={(e) => e.stopPropagation()}
                              style={{ cursor: isAlreadyOnMachine ? 'not-allowed' : 'pointer', width: '15px', height: '15px' }}
                            />
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: '13px', color: isSelected ? '#2563eb' : 'var(--text-primary)' }}>
                                {item.name}
                              </div>
                              {item.description && (
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {item.description}
                                </div>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}>
                            {isAlreadyOnMachine ? (
                              <span className="badge" style={{ fontSize: '11px', backgroundColor: 'rgba(100, 116, 139, 0.15)', color: 'var(--text-muted)' }}>
                                ✓ Đã có trên máy
                              </span>
                            ) : (
                              <span className="badge" style={{ fontSize: '11px' }}>
                                {item.category || 'Cơ khí'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Danh sách nhãn các cụm đã chọn */}
                {selectedLibItems.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Đã chọn ({selectedLibItems.length} cụm):
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '90px', overflowY: 'auto' }}>
                      {selectedLibItems.map(item => (
                        <span
                          key={item.id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            backgroundColor: 'rgba(37, 99, 235, 0.1)',
                            color: '#2563eb',
                            border: '1px solid rgba(37, 99, 235, 0.25)',
                            padding: '3px 8px',
                            borderRadius: '16px',
                            fontSize: '12px',
                            fontWeight: 500,
                          }}
                        >
                          {item.name}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleLibraryItem(item);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#2563eb',
                              cursor: 'pointer',
                              padding: 0,
                              fontSize: '14px',
                              lineHeight: 1,
                              fontWeight: 700,
                            }}
                            title="Bỏ chọn"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tùy biến khi chọn 1 cụm vs nhiều cụm */}
                {selectedLibItems.length === 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
                    <div className="grid-2">
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Mã cụm trên máy (Tùy chọn)</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Để trống tự sinh (VD: CU-01)"
                          value={formData.code}
                          onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        />
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Phân nhóm kỹ thuật</label>
                        <input
                          type="text"
                          className="form-input"
                          list="fu-tab-categories-datalist"
                          placeholder="Chọn gợi ý hoặc gõ nhóm mới..."
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Trạng thái hoạt động</label>
                      <select
                        className="form-select"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      >
                        <option value="OPERATIONAL">🟢 Hoạt động tốt</option>
                        <option value="WARNING">🟡 Cần theo dõi / bảo dưỡng</option>
                        <option value="INCIDENT">🔴 Đang có sự cố hỏng</option>
                        <option value="INACTIVE">⚪ Ngừng hoạt động</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Mô tả nhiệm vụ / Thông số cụm này trên máy</label>
                      <textarea
                        className="form-textarea"
                        rows={2}
                        placeholder="VD: Buồng gia nhiệt, màng lọc HEPA và quạt thổi khí..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {selectedLibItems.length > 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600 }}>
                        Trạng thái hoạt động chung cho {selectedLibItems.length} cụm
                      </label>
                      <select
                        className="form-select"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      >
                        <option value="OPERATIONAL">🟢 Hoạt động tốt</option>
                        <option value="WARNING">🟡 Cần theo dõi / bảo dưỡng</option>
                        <option value="INCIDENT">🔴 Đang có sự cố hỏng</option>
                        <option value="INACTIVE">⚪ Ngừng hoạt động</option>
                      </select>
                    </div>

                    <div style={{ 
                      padding: '10px 12px', 
                      backgroundColor: 'rgba(37, 99, 235, 0.06)', 
                      borderRadius: '6px', 
                      border: '1px solid rgba(37, 99, 235, 0.15)',
                      fontSize: '12px',
                      color: '#1e40af',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}>
                      <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Sparkles size={14} /> Tự động sinh mã & kế thừa thông tin:
                      </div>
                      <div style={{ color: 'var(--text-secondary)' }}>
                        Mã cụm trên máy sẽ được tự động đánh số thứ tự liên tiếp (VD: <code>{equipmentCode ? `${equipmentCode}-CU${(units.length + 1).toString().padStart(2, '0')}` : `CU-${(units.length + 1).toString().padStart(2, '0')}`}</code>, <code>CU{(units.length + 2).toString().padStart(2, '0')}</code>...). Sau khi gán, bạn có thể chỉnh sửa riêng từng cụm bất cứ lúc nào.
                      </div>
                    </div>
                  </div>
                )}

                {selectedLibItems.length === 0 && (
                  <div style={{ 
                    padding: '12px', 
                    textAlign: 'center', 
                    color: 'var(--text-muted)', 
                    fontSize: '12px', 
                    border: '1px dashed var(--border-color)', 
                    borderRadius: '6px' 
                  }}>
                    👈 Hãy tích chọn một hoặc nhiều cụm chức năng từ danh sách phía trên để gán vào thiết bị.
                  </div>
                )}
              </div>
            )}

            {/* ==================================================== */}
            {/* TAB 2: TẠO CỤM MỚI ĐỘC LẬP / CHỈNH SỬA CỤM HIỆN CÓ  */}
            {/* ==================================================== */}
            {(editingUnit || modalMode === 'CUSTOM') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Tên cụm chức năng *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="VD: Cụm bơm áp lực, Cụm băng tải nạp..."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    autoFocus
                  />
                  {!editingUnit && (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
                      💡 <strong>Tự động học:</strong> Sau khi tạo, cụm này sẽ được tự động lưu vào <strong>Thư viện dùng chung</strong> để các máy khác có thể chọn sử dụng.
                    </div>
                  )}
                </div>

                {/* Mã cụm & Phân nhóm */}
                <div className="grid-2">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Mã cụm trên máy (Tùy chọn)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Để trống tự sinh (VD: CU-01)"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Phân nhóm kỹ thuật</label>
                    <input
                      type="text"
                      className="form-input"
                      list="fu-tab-categories-datalist"
                      placeholder="Chọn gợi ý hoặc gõ nhóm mới..."
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    />
                    <datalist id="fu-tab-categories-datalist">
                      {allCategories.filter(c => c !== 'Tất cả').map(cat => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* Trạng thái hoạt động */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Trạng thái hoạt động</label>
                  <select
                    className="form-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="OPERATIONAL">🟢 Hoạt động tốt</option>
                    <option value="WARNING">🟡 Cần theo dõi / bảo dưỡng</option>
                    <option value="INCIDENT">🔴 Đang có sự cố hỏng</option>
                    <option value="INACTIVE">⚪ Ngừng hoạt động</option>
                  </select>
                </div>

                {/* Mô tả chi tiết */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Mô tả nhiệm vụ / Thông số cụm này trên máy</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    placeholder="VD: Bơm dung dịch rửa áp lực 5-8 bar, motor 3kW..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={submitting}
                onClick={() => setIsModalOpen(false)}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={
                  submitting || 
                  (modalMode === 'LIBRARY' && !editingUnit ? selectedLibItems.length === 0 : !formData.name.trim())
                }
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                {submitting ? (
                  'Đang xử lý...'
                ) : editingUnit ? (
                  'Lưu thay đổi'
                ) : modalMode === 'LIBRARY' ? (
                  selectedLibItems.length === 0 
                    ? 'Chọn cụm để gán' 
                    : selectedLibItems.length === 1 
                    ? 'Gán 1 cụm vào thiết bị' 
                    : `Gán (${selectedLibItems.length}) cụm vào thiết bị`
                ) : (
                  'Tạo & gán vào thiết bị'
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ==================================================== */}
      {/* MODAL SAO CHÉP CỤM CHỨC NĂNG TỪ THIẾT BỊ KHÁC        */}
      {/* ==================================================== */}
      {isCloneModalOpen && (
        <Modal
          isOpen={isCloneModalOpen}
          onClose={() => !cloning && setIsCloneModalOpen(false)}
          title="Sao chép cụm chức năng từ thiết bị khác"
          maxWidth="600px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Chọn một thiết bị tương tự có sẵn để sao chép nhanh toàn bộ hoặc một số cụm chức năng sang <strong>{equipmentName || equipmentCode}</strong>.
            </div>

            {/* Dropdown chọn thiết bị nguồn */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>Chọn thiết bị nguồn *</label>
              <select
                className="form-select"
                value={selectedSourceEqId}
                onChange={(e) => handleSelectSourceEquipment(e.target.value)}
                autoFocus
              >
                <option value="">-- Chọn thiết bị để sao chép cụm chức năng --</option>
                {allEquipments.map((eq: any) => (
                  <option key={eq.id} value={eq.id}>
                    [{eq.code}] {eq.name} {eq.category ? `(${eq.category})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Danh sách các cụm của thiết bị nguồn */}
            {selectedSourceEqId && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label" style={{ fontWeight: 700, margin: 0 }}>
                    Danh sách cụm chức năng ({sourceUnits.length})
                  </label>
                  {sourceUnits.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '11px', padding: '2px 8px' }}
                        onClick={handleSelectAllUnits}
                      >
                        Chọn tất cả
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '11px', padding: '2px 8px' }}
                        onClick={handleDeselectAllUnits}
                      >
                        Bỏ chọn
                      </button>
                    </div>
                  )}
                </div>

                {loadingSourceUnits ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    Đang tải danh sách cụm...
                  </div>
                ) : sourceUnits.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '13px' }}>
                    Thiết bị này chưa có cụm chức năng nào để sao chép.
                  </div>
                ) : (
                  <div style={{
                    maxHeight: '220px',
                    overflowY: 'auto',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-secondary)',
                    padding: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    {sourceUnits.map((su) => {
                      const currentNames = new Set(units.map(u => u.name.toLowerCase().trim()));
                      const isAlreadyExists = currentNames.has(su.name.toLowerCase().trim());
                      const isChecked = selectedUnitIds.includes(su.id);

                      return (
                        <div
                          key={su.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            backgroundColor: isAlreadyExists ? 'var(--bg-tertiary)' : (isChecked ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-primary)'),
                            border: isChecked && !isAlreadyExists ? '1px solid #2563eb' : '1px solid var(--border-color)',
                            opacity: isAlreadyExists ? 0.6 : 1,
                          }}
                        >
                          <input
                            type="checkbox"
                            disabled={isAlreadyExists}
                            checked={isChecked && !isAlreadyExists}
                            onChange={() => handleToggleUnitSelect(su.id)}
                            style={{ cursor: isAlreadyExists ? 'not-allowed' : 'pointer', width: '16px', height: '16px' }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                              {su.name} <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-muted)' }}>({su.code})</span>
                            </div>
                            {su.description && (
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                {su.description}
                              </div>
                            )}
                          </div>
                          {isAlreadyExists && (
                            <span className="badge" style={{ fontSize: '11px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                              Đã có trên máy
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={cloning}
                onClick={() => setIsCloneModalOpen(false)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={cloning || selectedUnitIds.length === 0}
                onClick={handleExecuteClone}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Copy size={14} /> {cloning ? 'Đang sao chép...' : `Sao chép (${selectedUnitIds.length}) cụm`}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ==================================================== */}
      {/* MODAL XÁC NHẬN XÓA CỤM CHỨC NĂNG                     */}
      {/* ==================================================== */}
      {unitToDelete && (
        <Modal
          isOpen={Boolean(unitToDelete)}
          onClose={() => !isDeleting && setUnitToDelete(null)}
          title="Xác nhận xóa cụm chức năng"
          maxWidth="440px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: '12px', 
              padding: '12px', 
              backgroundColor: 'rgba(239, 68, 68, 0.08)', 
              border: '1px solid rgba(239, 68, 68, 0.2)', 
              borderRadius: '8px' 
            }}>
              <AlertTriangle size={24} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                Bạn có chắc chắn muốn xóa cụm chức năng <strong style={{ color: '#ef4444' }}>{unitToDelete.name}</strong> ({unitToDelete.code}) khỏi thiết bị này?
                <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Lưu ý: Thao tác này chỉ gỡ cụm ra khỏi thiết bị, không xóa mẫu trong Thư viện dùng chung.
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={isDeleting}
                onClick={() => setUnitToDelete(null)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Trash2 size={14} /> {isDeleting ? 'Đang xóa...' : 'Xóa cụm chức năng'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
