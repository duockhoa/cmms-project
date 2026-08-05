import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Plus, Search, MoreHorizontal, Eye, Trash2, Edit } from 'lucide-react';
import { EquipmentDetailPage } from './EquipmentDetailPage';

export const EquipmentPage: React.FC = () => {
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<any>(null);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category: 'Cơ khí',
    location: 'Nhà xưởng A',
    status: 'OPERATIONAL',
    serialNumber: '',
    specs: '',
    notes: '',
  });

  const loadEquipment = async () => {
    try {
      setLoading(true);
      const res = await api.getEquipment({ search, category: categoryFilter, status: statusFilter });
      setEquipment(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEquipment();
  }, [search, categoryFilter, statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createEquipment(formData);
      setIsAddOpen(false);
      setFormData({ name: '', code: '', category: 'Cơ khí', location: 'Nhà xưởng A', status: 'OPERATIONAL', serialNumber: '', specs: '', notes: '' });
      loadEquipment();
    } catch (err) {
      alert('Lỗi tạo thiết bị!');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Xóa thiết bị này?')) {
      await api.deleteEquipment(id);
      loadEquipment();
    }
  };

  if (detailItem) {
    return <EquipmentDetailPage item={detailItem} onBack={() => setDetailItem(null)} />;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Quản lý thiết bị</h1>
          <p className="page-subtitle">Quản lý thông tin và tình trạng thiết bị</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
          <Plus size={16} /> Thêm thiết bị
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card mb-4" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '34px' }}
            placeholder="Tìm theo tên, số serial, vị trí..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select className="form-select" style={{ width: '160px' }} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">Tất cả loại</option>
          <option value="Cơ khí">Cơ khí</option>
          <option value="Điện">Điện</option>
          <option value="Điều hòa/Ventilation">Điều hòa / Ventilation</option>
          <option value="Cấp thoát nước">Cấp thoát nước</option>
          <option value="Sản xuất">Sản xuất</option>
        </select>

        <select className="form-select" style={{ width: '160px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="OPERATIONAL">Hoạt động</option>
          <option value="UNDER_MAINTENANCE">Cảnh báo</option>
          <option value="INCIDENT">Nguy hiểm</option>
          <option value="DISCOMMISSIONED">Ngoại tuyến</option>
        </select>
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
                <th>Tên thiết bị</th>
                <th>Loại</th>
                <th>Vị trí</th>
                <th>Trạng thái</th>
                <th>Bảo trì tiếp</th>
                <th style={{ textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {equipment.map((item) => (
                <tr 
                  key={item.id} 
                  onClick={() => setDetailItem(item)}
                  style={{ cursor: 'pointer' }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ fontWeight: 700 }}>{item.code}</td>
                  <td style={{ fontWeight: 600 }}>{item.name}</td>
                  <td>{item.category}</td>
                  <td>{item.location}</td>
                  <td><StatusBadge status={item.status} /></td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {item.schedules?.[0]?.nextDueDate 
                      ? new Date(item.schedules[0].nextDueDate).toLocaleDateString('vi-VN') 
                      : 'Chưa lập lịch'}
                  </td>
                  <td 
                    style={{ textAlign: 'center', position: 'relative' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button 
                      className="btn btn-secondary btn-sm" 
                      onClick={() => setActiveActionMenu(activeActionMenu === item.id ? null : item.id)}
                      style={{ padding: '4px 8px' }}
                    >
                      <MoreHorizontal size={14} />
                    </button>
                    {activeActionMenu === item.id && (
                      <div className="action-dropdown" style={{
                        position: 'absolute', right: '10px', top: '35px',
                        backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-md)',
                        zIndex: 100, display: 'flex', flexDirection: 'column', width: '130px', padding: '4px 0'
                      }}>
                        <button 
                          onClick={() => { setDetailItem(item); setActiveActionMenu(null); }}
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)' }}
                        >
                          <Eye size={12} /> Xem chi tiết
                        </button>
                        <button 
                          onClick={() => { alert('Tính năng chỉnh sửa thiết bị đang phát triển.'); setActiveActionMenu(null); }}
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)' }}
                        >
                          <Edit size={12} /> Chỉnh sửa
                        </button>
                        <button 
                          onClick={() => { handleDelete(item.id); setActiveActionMenu(null); }}
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '13px', color: 'var(--danger)' }}
                        >
                          <Trash2 size={12} /> Xóa
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Add Equipment */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Thêm thiết bị mới">
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">Tên thiết bị *</label>
            <input type="text" className="form-input" required placeholder="Nhập tên thiết bị" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Loại</label>
              <select className="form-select" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                <option value="Cơ khí">Cơ khí</option>
                <option value="Điện">Điện</option>
                <option value="Sản xuất">Sản xuất</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Trạng thái</label>
              <select className="form-select" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                <option value="OPERATIONAL">Hoạt động</option>
                <option value="UNDER_MAINTENANCE">Cảnh báo</option>
                <option value="INCIDENT">Nguy hiểm</option>
              </select>
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Vị trí</label>
              <input type="text" className="form-input" placeholder="Vị trí lắp đặt" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Số serial</label>
              <input type="text" className="form-input" placeholder="Số serial" value={formData.serialNumber} onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Mô tả thiết bị</label>
            <textarea className="form-textarea" rows={3} placeholder="Mô tả thiết bị" value={formData.specs} onChange={(e) => setFormData({ ...formData, specs: e.target.value })} />
          </div>

          <div className="modal-footer" style={{ padding: 0, marginTop: '20px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsAddOpen(false)}>Hủy</button>
            <button type="submit" className="btn btn-primary">Thêm mới</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
