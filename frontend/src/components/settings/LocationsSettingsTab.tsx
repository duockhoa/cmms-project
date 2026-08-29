import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { Plus, Edit2, Trash2, Search, RefreshCw, MapPin, UserCheck } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useToast, useConfirmDialog } from '../common/Toast';

interface LocationItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  responsibleTechId?: string | null;
  responsibleTech?: { id: string; name: string; email?: string } | null;
  createdAt?: string;
  updatedAt?: string;
}

export const LocationsSettingsTab: React.FC = () => {
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LocationItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    responsibleTechId: '',
  });

  const toast = useToast();
  const { confirm } = useConfirmDialog();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [locData, techData] = await Promise.all([
        api.getLocations(),
        api.getUsers({ role: 'TECHNICIAN' }).catch(() => []),
      ]);
      setLocations(Array.isArray(locData) ? locData : []);
      setTechnicians(Array.isArray(techData) ? techData : []);
    } catch (error: any) {
      toast.error('Lỗi tải dữ liệu', error.message || 'Không thể tải danh sách vị trí.');
    } finally {
      setLoading(false);
    }
  };

  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        loc.code.toLowerCase().includes(term) ||
        loc.name.toLowerCase().includes(term) ||
        (loc.description && loc.description.toLowerCase().includes(term)) ||
        (loc.responsibleTech?.name && loc.responsibleTech.name.toLowerCase().includes(term))
      );
    });
  }, [locations, searchTerm]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({ code: '', name: '', description: '', responsibleTechId: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: LocationItem) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      description: item.description || '',
      responsibleTechId: item.responsibleTechId || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim()) {
      toast.error('Thiếu thông tin', 'Vui lòng nhập Mã và Tên vị trí/nhà xưởng.');
      return;
    }

    setSubmitting(true);
    const payload = {
      code: formData.code,
      name: formData.name,
      description: formData.description || null,
      responsibleTechId: formData.responsibleTechId || null,
    };

    try {
      if (editingItem) {
        await api.updateLocation(editingItem.id, payload);
        toast.success('Thành công', 'Đã cập nhật vị trí / nhà xưởng.');
      } else {
        await api.createLocation(payload);
        toast.success('Thành công', 'Đã thêm vị trí / nhà xưởng mới.');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error('Lỗi lưu dữ liệu', err.message || 'Không thể lưu vị trí.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item: LocationItem) => {
    const ok = await confirm(
      'Xác nhận xóa vị trí',
      `Bạn có chắc chắn muốn xóa "${item.name}" (${item.code}) không?`
    );
    if (ok) {
      try {
        await api.deleteLocation(item.id);
        toast.success('Đã xóa', 'Vị trí đã được xóa thành công.');
        loadData();
      } catch (err: any) {
        toast.error('Lỗi xóa', err.message || 'Không thể xóa vị trí do có ràng buộc dữ liệu thiết bị.');
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
            <MapPin size={20} style={{ color: 'var(--accent-blue, #2563eb)' }} />
            Vị trí & Phân xưởng sản xuất
          </h3>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
            Quản lý danh sách các nhà xưởng, khu vực phòng sạch và phân công kỹ thuật viên phụ trách.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            className="btn btn-secondary"
            onClick={loadData}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Làm mới
          </button>
          <button
            className="btn btn-primary"
            onClick={handleOpenAdd}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <Plus size={15} /> Thêm vị trí
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '16px',
          flexWrap: 'wrap',
          alignItems: 'center',
          backgroundColor: 'var(--bg-primary, #f8fafc)',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid var(--border-color, #e2e8f0)',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 260px', minWidth: '220px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Tìm theo mã xưởng, tên xưởng, kỹ thuật viên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '34px', height: '36px', fontSize: '13px' }}
          />
          <Search
            size={15}
            style={{
              position: 'absolute',
              left: '11px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted, #94a3b8)',
            }}
          />
        </div>

        <div
          style={{
            fontSize: '12.5px',
            color: 'var(--text-secondary)',
            marginLeft: 'auto',
          }}
        >
          Tổng số: <strong style={{ color: 'var(--text-primary)' }}>{filteredLocations.length}</strong> / {locations.length} vị trí
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-secondary)' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
          <div style={{ fontSize: '13.5px' }}>Đang tải danh sách vị trí...</div>
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
                  <th style={{ width: '140px' }}>Mã vị trí</th>
                  <th style={{ minWidth: '200px' }}>Tên vị trí / Xưởng</th>
                  <th style={{ minWidth: '180px' }}>KTV phụ trách</th>
                  <th style={{ minWidth: '220px' }}>Mô tả ghi chú</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredLocations.length > 0 ? (
                  filteredLocations.map((item, index) => (
                    <tr key={item.id}>
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                        {index + 1}
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 700,
                            backgroundColor: 'rgba(16, 185, 129, 0.08)',
                            color: '#059669',
                            border: '1px solid rgba(16, 185, 129, 0.2)',
                          }}
                        >
                          <MapPin size={11} /> {item.code}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13.5px' }}>
                          {item.name}
                        </div>
                      </td>
                      <td>
                        {item.responsibleTech ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              backgroundColor: 'rgba(37, 99, 235, 0.08)',
                              color: '#2563eb',
                            }}
                          >
                            <UserCheck size={12} /> {item.responsibleTech.name}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>
                            Chưa phân công
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                          {item.description || '—'}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            className="btn-icon"
                            onClick={() => handleOpenEdit(item)}
                            title="Sửa"
                            style={{
                              padding: '6px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-color, #e2e8f0)',
                              backgroundColor: 'transparent',
                              color: 'var(--accent-blue, #2563eb)',
                              cursor: 'pointer',
                            }}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="btn-icon"
                            onClick={() => handleDelete(item)}
                            title="Xóa"
                            style={{
                              padding: '6px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-color, #e2e8f0)',
                              backgroundColor: 'transparent',
                              color: 'var(--danger, #dc2626)',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ padding: 0 }}>
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
                            backgroundColor: 'rgba(16, 185, 129, 0.08)',
                            color: '#059669',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '12px',
                          }}
                        >
                          <MapPin size={26} />
                        </div>
                        <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                          Chưa có vị trí nào
                        </h4>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                          Thêm các phân xưởng như Xưởng Cơ điện, Xưởng Mắt mũi, Xưởng TUDL...
                        </p>
                        <button className="btn btn-primary" onClick={handleOpenAdd}>
                          <Plus size={15} /> Thêm vị trí đầu tiên
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Add/Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Chỉnh sửa vị trí / nhà xưởng' : 'Thêm vị trí / nhà xưởng mới'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              Mã vị trí <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="VD: LOC-CD, LOC-MM, LOC-KKD..."
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              disabled={!!editingItem}
            />
            {editingItem && (
              <small style={{ color: 'var(--text-muted)', fontSize: '11.5px', marginTop: '2px', display: 'block' }}>
                Mã vị trí không thể thay đổi sau khi tạo.
              </small>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              Tên vị trí / Nhà xưởng <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="VD: Xưởng Cơ điện, Xưởng Thuốc KKD..."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Kỹ thuật viên phụ trách chính</label>
            <select
              className="form-input"
              value={formData.responsibleTechId}
              onChange={(e) => setFormData({ ...formData, responsibleTechId: e.target.value })}
            >
              <option value="">-- Chưa phân công --</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.email})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Mô tả / Ghi chú</label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="Ghi chú thêm về phân xưởng / vị trí..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div
            className="modal-footer"
            style={{
              padding: '16px 0 0 0',
              marginTop: '20px',
              borderTop: '1px solid var(--border-color, #e2e8f0)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px',
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={submitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {submitting && <RefreshCw size={14} className="animate-spin" />}
              {editingItem ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
