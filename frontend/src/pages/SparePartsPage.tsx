import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { Modal } from '../components/common/Modal';
import {
  Plus,
  Package,
  AlertTriangle,
  XCircle,
  WalletCards,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  X,
  Edit2,
  Cpu,
  Save,
  Check,
} from 'lucide-react';
import { useToast } from '../components/common/Toast';
import { EmptyState, PageHeader, FilterBar, SearchInput, ExportButton, KpiCard } from '../components/common';
import { Tabs, TabItem } from '../components/common/Tabs';
import { ReceiptsTab } from '../components/inventory/ReceiptsTab';
import { IssuesTab } from '../components/inventory/IssuesTab';
import { StockReportTab } from '../components/inventory/StockReportTab';

const DEFAULT_CATEGORIES = [
  'Linh kiện tiêu hao',
  'Linh kiện điện',
  'Cơ khí',
  'Cảm biến',
  'Dầu mỡ & Hóa chất',
  'Khác',
];

const COMMON_UNITS = ['Cái', 'Bộ', 'Chiếc', 'Mét', 'Cuộn', 'Hộp', 'Bình', 'Lít', 'Kg'];
const COMMON_LOCATIONS = ['Kho Cơ điện', 'Kệ A1', 'Kệ A2', 'Kệ B1', 'Tủ linh kiện', 'Kho phụ tùng chung'];

export const SparePartsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [inventory, setInventory] = useState<any[]>([]);
  const [equipments, setEquipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const toast = useToast();

  // Active Tab State
  const [activeTab, setActiveTab] = useState<'inventory' | 'receipts' | 'issues' | 'report'>('inventory');

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [equipmentFilterText, setEquipmentFilterText] = useState('');

  const initialForm = {
    name: '',
    itemCode: '',
    specs: '',
    category: 'Linh kiện tiêu hao',
    customCategory: '',
    quantity: 0,
    unit: 'Cái',
    minQuantity: 1,
    unitPrice: 0,
    location: 'Kho Cơ điện',
    equipmentIds: [] as string[],
  };

  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    const q = searchParams.get('search');
    if (q !== null) {
      setSearch(q);
    }
  }, [searchParams]);

  const [selectedCategory, setSelectedCategory] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in' | 'low' | 'out' | 'warning'>('all');
  const [isWarningBannerDismissed, setIsWarningBannerDismissed] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getInventory({ search });
      setInventory(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search]);

  useEffect(() => {
    // Nạp danh sách thiết bị để chọn liên kết BOM
    api.getEquipment()
      .then((data) => setEquipments(data || []))
      .catch((err) => console.error('Lỗi nạp danh sách thiết bị:', err));
  }, []);

  const openAddModal = () => {
    setFormData(initialForm);
    setEquipmentFilterText('');
    setIsAddOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    const existingEqIds = (item.equipmentSpareParts || [])
      .map((es: any) => es.equipmentId || es.equipment?.id)
      .filter(Boolean);

    setFormData({
      name: item.name || '',
      itemCode: item.itemCode || '',
      specs: item.specs || '',
      category: item.category || 'Linh kiện tiêu hao',
      customCategory: '',
      quantity: Number(item.quantity) || 0,
      unit: item.unit || 'Cái',
      minQuantity: Number(item.minQuantity) || 1,
      unitPrice: Number(item.unitPrice) || 0,
      location: item.location || 'Kho Cơ điện',
      equipmentIds: existingEqIds,
    });
    setEquipmentFilterText('');
    setIsEditOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Thiếu thông tin', 'Vui lòng nhập tên phụ tùng.');
      return;
    }

    try {
      const payload: any = {
        name: formData.name.trim(),
        itemCode: formData.itemCode.trim() || undefined,
        specs: formData.specs.trim() || undefined,
        category: formData.customCategory.trim() || formData.category,
        quantity: Number(formData.quantity) || 0,
        unit: formData.unit.trim() || 'Cái',
        minQuantity: Number(formData.minQuantity) || 1,
        unitPrice: Number(formData.unitPrice) || 0,
        location: formData.location.trim() || 'Kho Cơ điện',
        equipmentIds: formData.equipmentIds,
      };

      await api.createInventory(payload);
      setIsAddOpen(false);
      toast.success('Thành công', 'Đã thêm phụ tùng mới.');
      loadData();
    } catch (err: any) {
      toast.error('Lỗi', err.message || 'Lỗi thêm phụ tùng!');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    if (!formData.name.trim()) {
      toast.error('Thiếu thông tin', 'Vui lòng nhập tên phụ tùng.');
      return;
    }

    try {
      const payload: any = {
        name: formData.name.trim(),
        itemCode: formData.itemCode.trim() || undefined,
        specs: formData.specs.trim() || undefined,
        category: formData.customCategory.trim() || formData.category,
        quantity: Number(formData.quantity) || 0,
        unit: formData.unit.trim() || 'Cái',
        minQuantity: Number(formData.minQuantity) || 1,
        unitPrice: Number(formData.unitPrice) || 0,
        location: formData.location.trim() || 'Kho Cơ điện',
        equipmentIds: formData.equipmentIds,
        expectedVersion: editingItem.version,
      };

      await api.updateInventory(editingItem.id, payload);
      setIsEditOpen(false);
      setEditingItem(null);
      toast.success('Thành công', 'Đã cập nhật phụ tùng.');
      loadData();
    } catch (err: any) {
      toast.error('Lỗi', err.message || 'Lỗi cập nhật phụ tùng!');
    }
  };

  const toggleEquipmentSelection = (eqId: string) => {
    setFormData((prev) => {
      const exists = prev.equipmentIds.includes(eqId);
      return {
        ...prev,
        equipmentIds: exists
          ? prev.equipmentIds.filter((id) => id !== eqId)
          : [...prev.equipmentIds, eqId],
      };
    });
  };

  // Single-Pass Vector Reduction O(N)
  const { totalItems, lowStockItems, outOfStockItems, totalValue, bannerWarnings } = useMemo(() => {
    const lowStock: any[] = [];
    const outOfStock: any[] = [];
    const warnings: any[] = [];
    let sumValue = 0;

    for (const item of inventory || []) {
      const minQty = item.minQuantity || 1;
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      sumValue += qty * price;

      if (qty === 0) {
        outOfStock.push(item);
        warnings.push(item);
      } else if (qty <= minQty) {
        lowStock.push(item);
        warnings.push(item);
      }
    }

    return {
      totalItems: inventory.length,
      lowStockItems: lowStock,
      outOfStockItems: outOfStock,
      totalValue: sumValue,
      bannerWarnings: warnings,
    };
  }, [inventory]);

  const uniqueCategories = useMemo(() => {
    const fromInv = (inventory || []).map((i: any) => i.category).filter(Boolean);
    return Array.from(new Set([...DEFAULT_CATEGORIES, ...fromInv]));
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    return (inventory || []).filter((item: any) => {
      if (selectedCategory && item.category !== selectedCategory) return false;
      const qty = Number(item.quantity) || 0;
      const minQty = Number(item.minQuantity) || 1;
      if (stockFilter === 'out' && qty !== 0) return false;
      if (stockFilter === 'low' && (qty === 0 || qty > minQty)) return false;
      if (stockFilter === 'in' && qty <= 0) return false;
      if (stockFilter === 'warning' && qty > minQty) return false;
      return true;
    });
  }, [inventory, selectedCategory, stockFilter]);

  const handleExportInventory = () => {
    return {
      filename: `Kho_phu_tung_${new Date().toISOString().slice(0, 10)}.csv`,
      headers: [
        { key: 'itemCode', label: 'Mã phụ tùng' },
        { key: 'name', label: 'Tên phụ tùng' },
        { key: 'specs', label: 'Quy cách & Model' },
        { key: 'category', label: 'Nhóm vật tư' },
        { key: 'location', label: 'Vị trí kho' },
        { key: 'quantity', label: 'Tồn kho' },
        { key: 'unit', label: 'Đơn vị' },
        { key: 'unitPrice', label: 'Đơn giá (VNĐ)' },
      ],
      data: inventory,
    };
  };

  const renderFormContent = (isEdit: boolean) => (
    <div>
      {/* 1. Thông tin cơ bản */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px', marginBottom: '14px' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontWeight: 600 }}>Tên phụ tùng / Vật tư *</label>
          <input
            type="text"
            className="form-input"
            required
            placeholder="VD: Vòng bi, Dây đai, Đồng hồ nhiệt, Sensor..."
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontWeight: 600 }}>Mã phụ tùng</label>
          <input
            type="text"
            className="form-input"
            placeholder={isEdit ? 'Mã phụ tùng' : 'Tự động tạo (VT-xxxx)'}
            value={formData.itemCode}
            onChange={(e) => setFormData({ ...formData, itemCode: e.target.value })}
          />
          <small style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {isEdit ? 'Mã định danh trong kho' : 'Để trống để tự tạo mã liên tiếp'}
          </small>
        </div>
      </div>

      {/* 2. Quy cách & Nhóm vật tư */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '14px', marginBottom: '14px' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontWeight: 600 }}>Quy cách / Model / Thông số kỹ thuật</label>
          <input
            type="text"
            className="form-input"
            placeholder="VD: 220V - 1pha, 0-1300oC, phi 5, SKF 6205, M8x30..."
            value={formData.specs}
            onChange={(e) => setFormData({ ...formData, specs: e.target.value })}
          />
          <small style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Thông số chi tiết, kích cỡ, tiêu chuẩn kỹ thuật
          </small>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontWeight: 600 }}>Nhóm phụ tùng *</label>
          <select
            className="form-select"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          >
            {uniqueCategories.map((c: string) => (
              <option key={c} value={c}>{c}</option>
            ))}
            <option value="CUSTOM">+ Nhập nhóm khác...</option>
          </select>
          {formData.category === 'CUSTOM' && (
            <input
              type="text"
              className="form-input"
              style={{ marginTop: '6px' }}
              placeholder="Nhập tên nhóm mới..."
              value={formData.customCategory}
              onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
            />
          )}
        </div>
      </div>

      {/* 3. Thiết bị sử dụng (Gán máy / BOM) */}
      <div className="card" style={{ padding: '12px 14px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <label className="form-label" style={{ marginBottom: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', color: '#1e293b' }}>
            <Cpu size={15} color="#2563eb" /> Thiết bị sử dụng (Gán máy - BOM)
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
              Đã gán: <strong style={{ color: '#2563eb' }}>{formData.equipmentIds.length}</strong> máy
            </span>
            {formData.equipmentIds.length > 0 && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ padding: '2px 8px', fontSize: '11px' }}
                onClick={() => setFormData({ ...formData, equipmentIds: [] })}
              >
                Bỏ gán tất cả
              </button>
            )}
          </div>
        </div>

        {/* Selected Equipment Badges */}
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
            marginBottom: '8px',
          }}
        >
          {formData.equipmentIds.length === 0 ? (
            <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', alignSelf: 'center' }}>
              Dùng chung toàn nhà máy / Chưa gán máy cố định
            </span>
          ) : (
            formData.equipmentIds.map((eqId) => {
              const eq = equipments.find((e) => e.id === eqId);
              return (
                <span
                  key={eqId}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '11.5px',
                    backgroundColor: '#eff6ff',
                    color: '#1d4ed8',
                    border: '1px solid #bfdbfe',
                    fontWeight: 600,
                  }}
                >
                  {eq ? `${eq.code}: ${eq.name}` : eqId}
                  <button
                    type="button"
                    onClick={() => toggleEquipmentSelection(eqId)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      color: '#1d4ed8',
                    }}
                    title="Xóa máy này"
                  >
                    <X size={13} />
                  </button>
                </span>
              );
            })
          )}
        </div>

        {/* Equipment Selector dropdown with search */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
          <select
            className="form-select"
            value=""
            onChange={(e) => {
              const val = e.target.value;
              if (val) toggleEquipmentSelection(val);
            }}
          >
            <option value="">-- Chọn máy để thêm vào danh sách gán --</option>
            {equipments
              .filter((eq) => !formData.equipmentIds.includes(eq.id))
              .map((eq) => (
                <option key={eq.id} value={eq.id}>
                  [{eq.code}] {eq.name} ({eq.location || 'Sản xuất'})
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* 4. Kho & Đơn vị tính */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontWeight: 600 }}>Vị trí lưu kho</label>
          <input
            type="text"
            className="form-input"
            list="location-suggestions"
            placeholder="VD: Kho Cơ điện, Kệ A1..."
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          />
          <datalist id="location-suggestions">
            {COMMON_LOCATIONS.map((loc) => (
              <option key={loc} value={loc} />
            ))}
          </datalist>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontWeight: 600 }}>Đơn vị tính</label>
          <input
            type="text"
            className="form-input"
            list="unit-suggestions"
            placeholder="VD: Cái, Bộ, Mét..."
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
          />
          <datalist id="unit-suggestions">
            {COMMON_UNITS.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </div>
      </div>

      {/* 5. Tồn kho & Định mức dự trù & Đơn giá */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '14px', marginBottom: '10px' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontWeight: 600 }}>Tồn kho thực tế</label>
          <input
            type="number"
            min="0"
            className="form-input"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
          />
          <small style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Số lượng hiện có trong kho
          </small>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontWeight: 600 }}>Mức dự trù an toàn</label>
          <input
            type="number"
            min="0"
            className="form-input"
            value={formData.minQuantity}
            onChange={(e) => setFormData({ ...formData, minQuantity: Number(e.target.value) })}
          />
          <small style={{ fontSize: '11px', color: '#d97706' }}>
            Cảnh báo khi tồn $\le$ mức này
          </small>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontWeight: 600 }}>Đơn giá ước tính (VNĐ)</label>
          <input
            type="number"
            min="0"
            step="1000"
            className="form-input"
            value={formData.unitPrice}
            onChange={(e) => setFormData({ ...formData, unitPrice: Number(e.target.value) })}
          />
          <small style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {formData.unitPrice > 0 ? `${Number(formData.unitPrice).toLocaleString('vi-VN')} đ` : '0 đ'}
          </small>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Kho phụ tùng"
        subtitle="Quản lý kho phụ tùng, vật tư bảo trì"
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            {activeTab === 'inventory' && (
              <>
                <ExportButton
                  onExport={handleExportInventory}
                  label="Xuất danh sách"
                />
                <button className="btn btn-primary" onClick={openAddModal}>
                  <Plus size={16} /> Thêm phụ tùng
                </button>
              </>
            )}
          </div>
        }
      />

      {/* Tabs Navigation */}
      <div style={{ marginBottom: '18px' }}>
        <Tabs
          variant="segmented"
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as any)}
          items={[
            {
              key: 'inventory',
              label: 'Danh mục & Tồn kho',
              icon: Package,
              count: totalItems,
            },
            {
              key: 'receipts',
              label: 'Nhập kho (Goods Receipt)',
              icon: ArrowDownLeft,
            },
            {
              key: 'issues',
              label: 'Xuất kho (Goods Issue)',
              icon: ArrowUpRight,
            },
            {
              key: 'report',
              label: 'Báo cáo Nhập - Xuất - Tồn',
              icon: FileText,
            },
          ]}
        />
      </div>

      {/* TAB 1: DANH MỤC & TỒN KHO HIỆN TẠI */}
      {activeTab === 'inventory' && (
        <>

      {/* KPI Row */}
      <div className="kpi-row">
        <div style={{ cursor: 'pointer' }} onClick={() => setStockFilter('all')}>
          <KpiCard title="Tổng phụ tùng" value={totalItems} icon={Package} variant="primary" />
        </div>
        <div style={{ cursor: 'pointer' }} onClick={() => setStockFilter(stockFilter === 'low' ? 'all' : 'low')}>
          <KpiCard title="Sắp hết hàng" value={lowStockItems.length} icon={AlertTriangle} variant="warning" />
        </div>
        <div style={{ cursor: 'pointer' }} onClick={() => setStockFilter(stockFilter === 'out' ? 'all' : 'out')}>
          <KpiCard title="Hết hàng" value={outOfStockItems.length} icon={XCircle} variant="danger" />
        </div>
        <KpiCard title="Giá trị tồn kho" value={`${totalValue.toLocaleString('vi-VN')} ₫`} icon={WalletCards} variant="success" />
        <KpiCard title="Đã xuất tháng này" value={0} icon={ArrowUpRight} variant="info" />
      </div>

      {/* Warnings Banner - Clean, Compact & Actionable */}
      {bannerWarnings.length > 0 && !isWarningBannerDismissed && (
        <div
          className="card mb-4"
          style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            padding: '12px 18px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#92400e', fontSize: '13px' }}>
            <div style={{ padding: '6px', borderRadius: '50%', backgroundColor: '#fef3c7', display: 'flex', flexShrink: 0 }}>
              <AlertTriangle size={18} color="#d97706" />
            </div>
            <div>
              <span style={{ fontWeight: 700 }}>Cảnh báo tồn kho:</span> Có{' '}
              <strong style={{ color: '#dc2626' }}>{outOfStockItems.length}</strong> phụ tùng hết hàng và{' '}
              <strong style={{ color: '#d97706' }}>{lowStockItems.length}</strong> phụ tùng dưới mức dự trù an toàn.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-warning btn-sm"
              onClick={() => setStockFilter(stockFilter === 'warning' ? 'all' : 'warning')}
              style={{ fontSize: '12px', padding: '5px 12px', fontWeight: 600 }}
            >
              {stockFilter === 'warning' ? 'Xem toàn bộ kho' : 'Lọc danh sách cần nhập hàng'}
            </button>
            <button
              type="button"
              onClick={() => setIsWarningBannerDismissed(true)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#92400e',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Đóng thông báo"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Filter & Search */}
      <FilterBar
        hasActiveFilters={Boolean(search || selectedCategory || stockFilter !== 'all')}
        onReset={() => {
          setSearch('');
          setSelectedCategory('');
          setStockFilter('all');
        }}
      >
        <div className="filter-search">
          <SearchInput
            placeholder="Tìm theo mã, tên phụ tùng, model, thiết bị..."
            value={search}
            onChange={setSearch}
          />
        </div>
        <div className="filter-item">
          <select
            className="form-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">Tất cả nhóm ({uniqueCategories.length})</option>
            {uniqueCategories.map((cat: any) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="filter-item">
          <select
            className="form-select"
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as any)}
          >
            <option value="all">Tất cả trạng thái tồn</option>
            <option value="in">Còn hàng trong kho</option>
            <option value="low">Sắp hết (dưới dự trù)</option>
            <option value="out">Hết hàng (0 tồn)</option>
            <option value="warning">Cần nhập hàng (hết hoặc thiếu)</option>
          </select>
        </div>
      </FilterBar>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Đang tải...</div>
      ) : (
        <div className="table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '100px' }}>Mã VT</th>
                <th style={{ minWidth: '220px' }}>Tên phụ tùng & Model</th>
                <th style={{ width: '130px' }}>Nhóm</th>
                <th style={{ minWidth: '200px' }}>Thiết bị sử dụng</th>
                <th style={{ width: '110px', textAlign: 'center' }}>Tồn kho</th>
                <th style={{ width: '110px' }}>Vị trí</th>
                <th style={{ textAlign: 'center', width: '80px' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.length === 0 && (
                <EmptyState colSpan={7} compact minHeight={150} title="Không có phụ tùng phù hợp" />
              )}
              {filteredInventory.map((item) => {
                const eqList = (item.equipmentSpareParts || []).map((es: any) => es.equipment).filter(Boolean);
                const isOutOfStock = (item.quantity || 0) === 0;
                const isLowStock = !isOutOfStock && (item.quantity || 0) <= (item.minQuantity || 1);

                return (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace', color: '#2563eb' }}>{item.itemCode}</td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.name}</div>
                      {item.specs && (
                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', whiteSpace: 'pre-line', marginTop: '2px', lineHeight: '1.3' }}>
                          {item.specs}
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                        {item.category}
                      </span>
                    </td>
                    <td>
                      {eqList.length === 0 ? (
                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Chưa gán máy</span>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {eqList.slice(0, 2).map((eq: any) => (
                            <span
                              key={eq.id}
                              style={{
                                fontSize: '11px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: '#f1f5f9',
                                color: '#334155',
                                border: '1px solid #e2e8f0',
                                fontWeight: 600,
                              }}
                              title={`${eq.code} - ${eq.name}`}
                            >
                              {eq.code}: {eq.name}
                            </span>
                          ))}
                          {eqList.length > 2 && (
                            <span
                              style={{
                                fontSize: '11px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: '#eff6ff',
                                color: '#2563eb',
                                fontWeight: 700,
                              }}
                              title={eqList.map((eq: any) => `${eq.code} - ${eq.name}`).join('\n')}
                            >
                              +{eqList.length - 2} máy khác
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          backgroundColor: isOutOfStock ? '#fef2f2' : isLowStock ? '#fffbeb' : '#ecfdf5',
                          color: isOutOfStock ? '#ef4444' : isLowStock ? '#d97706' : '#10b981',
                        }}
                      >
                        {item.quantity} {item.unit}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.location || 'Kho Cơ điện'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '3px 8px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => openEditModal(item)}
                        title="Xem chi tiết & Sửa"
                      >
                        <Edit2 size={12} /> Sửa
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      </>
      )}

      {/* TAB 2: QUẢN LÝ NHẬP KHO CHÍNH QUY */}
      {activeTab === 'receipts' && (
        <ReceiptsTab inventoryItems={inventory} onRefreshInventory={loadData} />
      )}

      {/* TAB 3: QUẢN LÝ XUẤT KHO */}
      {activeTab === 'issues' && (
        <IssuesTab inventoryItems={inventory} onRefreshInventory={loadData} />
      )}

      {/* TAB 4: BÁO CÁO NHẬP - XUẤT - TỒN & THẺ KHO */}
      {activeTab === 'report' && (
        <StockReportTab categories={uniqueCategories} />
      )}

      {/* Modal 1: Thêm phụ tùng mới */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Thêm phụ tùng mới vào kho" maxWidth="720px">
        <form onSubmit={handleCreate}>
          {renderFormContent(false)}
          <div className="modal-footer" style={{ padding: 0, marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsAddOpen(false)}>Hủy</button>
            <button type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={16} /> Thêm phụ tùng
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Chi tiết & Chỉnh sửa phụ tùng */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setEditingItem(null);
        }}
        title={`Chi tiết & Cập nhật phụ tùng [${editingItem?.itemCode || ''}]`}
        maxWidth="720px"
      >
        <form onSubmit={handleUpdate}>
          {renderFormContent(true)}
          <div className="modal-footer" style={{ padding: 0, marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setIsEditOpen(false);
                setEditingItem(null);
              }}
            >
              Đóng
            </button>
            <button type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Save size={16} /> Lưu thay đổi
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
