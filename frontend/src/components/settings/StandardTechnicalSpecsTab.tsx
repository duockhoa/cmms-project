import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { 
  Plus, Edit2, Trash2, Search, RefreshCw, 
  Tag, Info, BookOpen
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { useToast, useConfirmDialog } from '../common/Toast';

export const StandardTechnicalSpecsTab: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    unit: '',
    category: '',
    description: '',
    isActive: true,
  });

  const toast = useToast();
  const { confirm } = useConfirmDialog();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.getStandardTechnicalSpecs();
      setItems(Array.isArray(res) ? res : []);
    } catch (err: any) {
      toast.error('Lỗi tải dữ liệu', err.message || 'Không thể tải thư viện thông số kỹ thuật.');
    } finally {
      setLoading(false);
    }
  };

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set);
  }, [items]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchCat = selectedCategory === 'ALL' || item.category === selectedCategory;
      const matchSearch =
        !search.trim() ||
        item.name?.toLowerCase().includes(search.toLowerCase()) ||
        (item.unit && item.unit.toLowerCase().includes(search.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(search.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [items, search, selectedCategory]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      unit: '',
      category: 'Cơ khí',
      description: '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      unit: item.unit || '',
      category: item.category || '',
      description: item.description || '',
      isActive: item.isActive !== undefined ? item.isActive : true,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Thiếu thông tin', 'Vui lòng nhập tên thông số kỹ thuật.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        unit: formData.unit.trim() || null,
        category: formData.category.trim() || null,
        description: formData.description.trim() || null,
        isActive: formData.isActive,
      };

      if (editingItem) {
        await api.updateStandardTechnicalSpec(editingItem.id, payload);
        toast.success('Thành công', 'Đã cập nhật thông số kỹ thuật chuẩn.');
      } else {
        await api.createStandardTechnicalSpec(payload);
        toast.success('Thành công', 'Đã thêm thông số kỹ thuật mới vào thư viện.');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error('Lỗi lưu thông số', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: any) => {
    const ok = await confirm(
      'Xóa thông số kỹ thuật',
      `Bạn có chắc muốn xóa "${item.name}" khỏi thư viện chuẩn?`
    );
    if (ok) {
      try {
        await api.deleteStandardTechnicalSpec(item.id);
        toast.success('Đã xóa', 'Đã xóa thông số khỏi thư viện.');
        loadData();
      } catch (err: any) {
        toast.error('Lỗi xóa', err.message);
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
            <BookOpen size={20} style={{ color: 'var(--accent-blue, #2563eb)' }} />
            Thư viện Thông số Kỹ thuật chuẩn từ Nhà sản xuất
          </h3>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
            Quản lý danh mục các chỉ tiêu kỹ thuật danh định của máy (Công suất, Điện áp, Dung tích, Trọng lượng, Kích thước...).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-secondary"
            onClick={loadData}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Tải lại
          </button>
          <button
            className="btn btn-primary"
            onClick={handleOpenAdd}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <Plus size={15} /> Thêm thông số chuẩn
          </button>
        </div>
      </div>

      {/* Toolbar Search & Filter */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '280px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Tìm thông số KT, đơn vị..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '32px', height: '36px', fontSize: '13px' }}
            />
            <Search
              size={15}
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
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{ height: '36px', fontSize: '13px', minWidth: '150px' }}
          >
            <option value="ALL">Tất cả phân nhóm</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
          Hiển thị <strong>{filteredItems.length}</strong> / {items.length} thông số
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-secondary)' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
          <div>Đang tải thư viện thông số kỹ thuật...</div>
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
          <table className="custom-table" style={{ margin: 0, width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '50px', textAlign: 'center' }}>STT</th>
                <th style={{ minWidth: '200px' }}>Tên thông số kỹ thuật</th>
                <th style={{ width: '110px', textAlign: 'center' }}>Đơn vị đo</th>
                <th style={{ width: '130px', textAlign: 'center' }}>Phân nhóm</th>
                <th>Mô tả / Ý nghĩa</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Trạng thái</th>
                <th style={{ width: '90px', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length > 0 ? (
                filteredItems.map((item, idx) => (
                  <tr key={item.id}>
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                      {idx + 1}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '13px' }}>
                        {item.name}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {item.unit ? (
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: 'var(--bg-hover, #f1f5f9)',
                            fontSize: '12px',
                            fontWeight: 600,
                            border: '1px solid var(--border-color, #e2e8f0)',
                          }}
                        >
                          {item.unit}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {item.category ? (
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(37, 99, 235, 0.08)',
                            color: '#2563eb',
                            fontSize: '11.5px',
                            fontWeight: 600,
                          }}
                        >
                          {item.category}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                      {item.description || '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: item.isActive !== false ? '#dcfce7' : '#f1f5f9',
                          color: item.isActive !== false ? '#16a34a' : '#64748b',
                        }}
                      >
                        {item.isActive !== false ? 'Áp dụng' : 'Khóa'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button
                          className="btn-icon"
                          onClick={() => handleOpenEdit(item)}
                          title="Sửa"
                          style={{
                            padding: '5px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color, #e2e8f0)',
                            backgroundColor: 'transparent',
                            color: 'var(--accent-blue, #2563eb)',
                            cursor: 'pointer',
                          }}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => handleDelete(item)}
                          title="Xóa"
                          style={{
                            padding: '5px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color, #e2e8f0)',
                            backgroundColor: 'transparent',
                            color: 'var(--danger, #dc2626)',
                            cursor: 'pointer',
                          }}
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
                    Không có thông số nào phù hợp với bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Add / Edit Standard Technical Spec */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Sửa thông số kỹ thuật chuẩn' : 'Thêm thông số kỹ thuật chuẩn mới'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              Tên thông số kỹ thuật <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="VD: Công suất động cơ, Điện áp nguồn, Dung tích..."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Đơn vị đo (Unit)</label>
              <input
                type="text"
                className="form-input"
                placeholder="VD: kW, V, Lít, mm, kg, HP..."
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phân nhóm</label>
              <input
                type="text"
                className="form-input"
                placeholder="VD: Điện, Cơ khí, Dung tích, Kích thước..."
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Mô tả / Ý nghĩa</label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="Mô tả mục đích và cách lấy thông tin theo catalogue..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                style={{ width: '16px', height: '16px' }}
              />
              Đang áp dụng trong thư viện chuẩn
            </label>
          </div>

          <div
            className="modal-footer"
            style={{
              padding: '16px 0 0 0',
              marginTop: '16px',
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
              disabled={saving}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {saving && <RefreshCw size={14} className="animate-spin" />}
              {editingItem ? 'Cập nhật' : 'Thêm mới'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
