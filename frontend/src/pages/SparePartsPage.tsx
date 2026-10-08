import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Plus, AlertCircle, Package, AlertTriangle, XCircle, WalletCards, ArrowUpRight, X } from 'lucide-react';
import { useToast } from '../components/common/Toast';
import { EmptyState, PageHeader, FilterBar, SearchInput, ExportButton, KpiCard } from '../components/common';

export const SparePartsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const toast = useToast();

  useEffect(() => {
    const q = searchParams.get('search');
    if (q !== null) {
      setSearch(q);
    }
  }, [searchParams]);

  const [formData, setFormData] = useState({
    name: '',
    itemCode: '',
    category: 'Cơ khí',
    quantity: 10,
    unit: 'Cái',
    unitPrice: 150000,
    location: 'Kho A-1',
  });

  const [selectedCategory, setSelectedCategory] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in' | 'low' | 'out' | 'warning'>('all');
  const [isWarningBannerDismissed, setIsWarningBannerDismissed] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getInventory({ search });
      setInventory(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createInventory(formData);
      setIsAddOpen(false);
      toast.success('Thành công', 'Đã thêm phụ tùng mới.');
      loadData();
    } catch (err: any) {
      toast.error('Lỗi', err.message || 'Lỗi thêm phụ tùng!');
    }
  };

  // THUẬT TOÁN TỐI ƯU HÓA: Single-Pass Vector Reduction O(N)
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
    return Array.from(new Set((inventory || []).map((i: any) => i.category).filter(Boolean)));
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
        { key: 'category', label: 'Nhóm vật tư' },
        { key: 'location', label: 'Vị trí kho' },
        { key: 'quantity', label: 'Tồn kho' },
        { key: 'unit', label: 'Đơn vị' },
        { key: 'unitPrice', label: 'Đơn giá (VNĐ)' },
      ],
      data: inventory,
    };
  };

  return (
    <div>
      <PageHeader
        title="Kho phụ tùng"
        subtitle="Quản lý kho phụ tùng, vật tư bảo trì"
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <ExportButton
              onExport={handleExportInventory}
              label="Xuất danh sách"
            />
            <button className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
              <Plus size={16} /> Thêm phụ tùng
            </button>
          </div>
        }
      />

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
                <th style={{ textAlign: 'center', width: '80px' }}>Chi tiết</th>
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
                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Chưa gán máy</span>
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
                      <button className="btn btn-secondary btn-sm" style={{ padding: '3px 8px', fontSize: '12px' }}>Xem</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Add */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Thêm phụ tùng mới">
        <form onSubmit={handleCreate}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Tên phụ tùng *</label>
              <input type="text" className="form-input" required placeholder="VD: Vòng bi SKF 6205" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Mã phụ tùng *</label>
              <input type="text" className="form-input" required placeholder="VD: SKF-6205" value={formData.itemCode} onChange={(e) => setFormData({ ...formData, itemCode: e.target.value })} />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Đơn vị tính</label>
              <input type="text" className="form-input" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Tồn hiện tại</label>
              <input type="number" className="form-input" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })} />
            </div>
          </div>

          <div className="modal-footer" style={{ padding: 0, marginTop: '20px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsAddOpen(false)}>Hủy</button>
            <button type="submit" className="btn btn-primary">Thêm phụ tùng</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
