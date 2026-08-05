import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Plus, Search, AlertCircle } from 'lucide-react';

export const SparePartsPage: React.FC = () => {
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [search, setSearch] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    itemCode: '',
    category: 'Cơ khí',
    quantity: 10,
    unit: 'Cái',
    unitPrice: 150000,
    location: 'Kho A-1',
  });

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
      loadData();
    } catch (err) {
      alert('Lỗi thêm phụ tùng!');
    }
  };

  const totalItems = inventory.length;
  const lowStockItems = inventory.filter((item: any) => item.quantity > 0 && item.quantity <= (item.minQuantity || 5));
  const outOfStockItems = inventory.filter((item: any) => item.quantity === 0);
  const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * (item.unitPrice || 0)), 0);
  
  // Total low/out stock for banner
  const bannerWarnings = inventory.filter((item: any) => item.quantity <= (item.minQuantity || 5));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Kho phụ tùng</h1>
          <p className="page-subtitle">Quản lý kho phụ tùng, vật tư bảo trì</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
          <Plus size={16} /> Thêm phụ tùng
        </button>
      </div>

      {/* KPI Row */}
      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-card-title">Tổng phụ tùng</div>
          <div className="kpi-card-value">{totalItems}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-title">Sắp hết hàng</div>
          <div className="kpi-card-value" style={{ color: 'var(--warning)' }}>{lowStockItems.length}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-title">Hết hàng</div>
          <div className="kpi-card-value" style={{ color: 'var(--danger)' }}>{outOfStockItems.length}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-title">Giá trị tồn kho</div>
          <div className="kpi-card-value" style={{ color: 'var(--success)' }}>{totalValue.toLocaleString('vi-VN')} ₫</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-title">Đã xuất tháng này</div>
          <div className="kpi-card-value">0</div>
        </div>
      </div>

      {/* Warnings Banner */}
      {bannerWarnings.length > 0 && (
        <div className="card mb-4" style={{ backgroundColor: 'var(--warning-bg)', borderColor: 'var(--warning)', color: 'var(--warning)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '13px', flexWrap: 'wrap' }}>
            <AlertCircle size={16} /> Cảnh báo phụ tùng sắp hết: {bannerWarnings.map((item: any) => `${item.name} (${item.quantity}/${item.minQuantity || 5})`).join(', ')}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="card mb-4" style={{ display: 'flex', gap: '12px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text" className="form-input" style={{ paddingLeft: '34px' }}
            placeholder="Tìm theo mã, tên phụ tùng, thiết bị..."
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="form-select" style={{ width: '160px' }}><option>Tất cả nhóm</option></select>
        <select className="form-select" style={{ width: '160px' }}><option>Tất cả vị trí</option></select>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Đang tải...</div>
      ) : (
        <div className="table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Tên phụ tùng</th>
                <th>Nhóm</th>
                <th>Tồn kho</th>
                <th>Vị trí</th>
                <th>Giá tham khảo</th>
                <th style={{ textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 700 }}>{item.itemCode}</td>
                  <td style={{ fontWeight: 600 }}>{item.name}</td>
                  <td>{item.category}</td>
                  <td style={{ fontWeight: 700 }}>
                    {item.quantity} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.unit}</span>
                  </td>
                  <td>{item.location || 'Kho A-1'}</td>
                  <td style={{ color: 'var(--success)', fontWeight: 600 }}>
                    {item.unitPrice?.toLocaleString('vi-VN')} ₫
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="btn btn-secondary btn-sm">Xem</button>
                  </td>
                </tr>
              ))}
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
