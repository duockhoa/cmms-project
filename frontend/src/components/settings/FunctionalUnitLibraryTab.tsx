import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { Plus, Edit2, Trash2, Search, RefreshCw, Cpu, Layers, Tag, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useToast } from '../common/Toast';

interface FunctionalUnitLibraryItem {
  id: string;
  code?: string | null;
  name: string;
  category?: string | null;
  description?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    functionalUnits: number;
  };
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

export const FunctionalUnitLibraryTab: React.FC = () => {
  const toast = useToast();
  const [items, setItems] = useState<FunctionalUnitLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');

  // Modal Thêm / Sửa
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FunctionalUnitLibraryItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: 'Cơ khí',
    description: '',
  });

  // Modal Xóa
  const [itemToDelete, setItemToDelete] = useState<FunctionalUnitLibraryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadLibrary();
  }, []);

  const loadLibrary = async () => {
    setLoading(true);
    try {
      const data = await api.getFunctionalUnitLibrary();
      setItems(Array.isArray(data) ? data : []);
    } catch (error: any) {
      toast.error('Lỗi tải dữ liệu', error.message || 'Không thể tải danh mục Thư viện cụm chức năng.');
    } finally {
      setLoading(false);
    }
  };

  // Tự động tổng hợp tất cả phân nhóm kỹ thuật hiện có trong hệ thống
  const allCategories = useMemo(() => {
    const custom = items.map(i => i.category?.trim()).filter(Boolean) as string[];
    return Array.from(new Set([...BASE_CATEGORIES, ...custom]));
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        !searchTerm.trim() ||
        (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.code && item.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCategory =
        selectedCategory === 'Tất cả' ||
        (item.category && item.category.toLowerCase() === selectedCategory.toLowerCase());

      return matchSearch && matchCategory;
    });
  }, [items, searchTerm, selectedCategory]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      code: `FU-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      name: '',
      category: 'Cơ khí',
      description: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: FunctionalUnitLibraryItem) => {
    setEditingItem(item);
    setFormData({
      code: item.code || '',
      name: item.name,
      category: item.category || 'Cơ khí',
      description: item.description || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Thiếu thông tin', 'Vui lòng nhập tên cụm chức năng.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingItem) {
        await api.updateFunctionalUnitLibraryItem(editingItem.id, {
          name: formData.name.trim(),
          code: formData.code.trim() || undefined,
          category: formData.category,
          description: formData.description.trim() || undefined,
        });
        toast.success('Thành công', `Đã cập nhật cụm "${formData.name}" trong Thư viện.`);
      } else {
        await api.createFunctionalUnitLibraryItem({
          name: formData.name.trim(),
          code: formData.code.trim() || undefined,
          category: formData.category,
          description: formData.description.trim() || undefined,
        });
        toast.success('Thành công', `Đã thêm cụm "${formData.name}" vào Thư viện dùng chung.`);
      }
      setIsModalOpen(false);
      loadLibrary();
    } catch (err: any) {
      toast.error('Lỗi lưu dữ liệu', err.message || 'Không thể lưu cụm chức năng.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteFunctionalUnitLibraryItem(itemToDelete.id);
      toast.success('Đã xóa', `Đã xóa cụm "${itemToDelete.name}" khỏi Thư viện.`);
      setItemToDelete(null);
      loadLibrary();
    } catch (err: any) {
      toast.error('Xóa thất bại', err.message || 'Không thể xóa cụm chức năng này.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Thống kê nhanh
  const totalCount = items.length;
  const totalEquipmentsUsing = items.reduce((sum, item) => sum + (item._count?.functionalUnits || 0), 0);
  const categoriesCount = new Set(items.map(i => i.category || 'Khác')).size;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & KPI Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div className="kpi-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}>
            <Cpu size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>TỔNG CỤM CHUẨN THƯ VIỆN</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>{totalCount}</div>
          </div>
        </div>

        <div className="kpi-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <Layers size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>PHÂN NHÓM KỸ THUẬT</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981' }}>{categoriesCount} nhóm</div>
          </div>
        </div>

        <div className="kpi-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>LƯỢT THIẾT BỊ ĐANG ÁP DỤNG</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#d97706' }}>{totalEquipmentsUsing} lượt</div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Thư viện Cụm chức năng Dùng chung
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Danh mục cụm chuẩn toàn nhà máy. Khi thêm cụm trên bất kỳ thiết bị nào, hệ thống sẽ tự động học và lưu vào đây để các máy khác dùng lại.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={loadLibrary}
              className="btn btn-secondary btn-sm"
              title="Làm mới"
              disabled={loading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} /> Làm mới
            </button>
            <button
              onClick={handleOpenAdd}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
            >
              <Plus size={15} /> Thêm cụm chuẩn mới
            </button>
          </div>
        </div>

        {/* Filters bar */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ position: 'relative', flex: '1 1 250px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '32px' }}
              placeholder="Tìm theo tên, mã quy chuẩn, mô tả cụm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
            {allCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '12px', padding: '5px 10px', borderRadius: '16px', whiteSpace: 'nowrap' }}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Đang tải dữ liệu thư viện...
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="custom-table" style={{ fontSize: '13px' }}>
              <thead>
                <tr>
                  <th style={{ width: '60px', textAlign: 'center' }}>STT</th>
                  <th style={{ width: '130px' }}>Mã chuẩn</th>
                  <th style={{ minWidth: '220px' }}>Tên cụm chức năng</th>
                  <th style={{ width: '170px' }}>Phân nhóm</th>
                  <th style={{ minWidth: '250px' }}>Mô tả nhiệm vụ kỹ thuật</th>
                  <th style={{ width: '130px', textAlign: 'center' }}>Đang áp dụng</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      Không tìm thấy cụm chức năng nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => (
                    <tr key={item.id}>
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td>
                        <span style={{
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          fontSize: '12px',
                          color: '#2563eb',
                          backgroundColor: 'rgba(37, 99, 235, 0.08)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}>
                          {item.code || 'FU-AUTO'}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>
                          {item.name}
                        </div>
                      </td>
                      <td>
                        <span className="badge" style={{
                          backgroundColor: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-color)',
                          fontSize: '12px'
                        }}>
                          {item.category || 'Cơ khí'}
                        </span>
                      </td>
                      <td style={{ color: item.description ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                        {item.description || 'Chưa có mô tả'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          backgroundColor: (item._count?.functionalUnits || 0) > 0 ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-secondary)',
                          color: (item._count?.functionalUnits || 0) > 0 ? '#10b981' : 'var(--text-muted)'
                        }}>
                          {item._count?.functionalUnits || 0} máy
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '4px' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            title="Sửa cụm chuẩn"
                            style={{ padding: '4px 7px' }}
                            onClick={() => handleOpenEdit(item)}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            className="btn btn-outline-danger btn-sm"
                            title="Xóa khỏi thư viện"
                            style={{ padding: '4px 7px' }}
                            onClick={() => setItemToDelete(item)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL THÊM / SỬA CỤM CHUẨN TRONG THƯ VIỆN */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => !submitting && setIsModalOpen(false)}
          title={editingItem ? `Chỉnh sửa cụm: ${editingItem.name}` : 'Thêm cụm chức năng chuẩn vào Thư viện'}
          maxWidth="520px"
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>Tên cụm chức năng chuẩn *</label>
              <input
                type="text"
                className="form-input"
                placeholder="VD: Cụm bơm áp lực, Cụm chiết rót, Cụm cấp phôi..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                autoFocus
              />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Mã quy chuẩn (Tùy chọn)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="VD: FU-PUMP, FU-CONV..."
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phân nhóm kỹ thuật</label>
                <input
                  type="text"
                  className="form-input"
                  list="lib-tab-categories-datalist"
                  placeholder="Chọn gợi ý hoặc gõ nhóm mới..."
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
                <datalist id="lib-tab-categories-datalist">
                  {allCategories.filter(c => c !== 'Tất cả').map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  💡 Chọn từ danh sách gợi ý hoặc tự gõ nhóm mới (VD: Quang học, Dung môi...)
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Mô tả chuẩn / Thông số nhiệm vụ</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Mô tả tiêu chuẩn của cụm chức năng này..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

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
                disabled={submitting || !formData.name.trim()}
              >
                {submitting ? 'Đang lưu...' : (editingItem ? 'Lưu thay đổi' : 'Lưu vào Thư viện')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL XÁC NHẬN XÓA */}
      {itemToDelete && (
        <Modal
          isOpen={Boolean(itemToDelete)}
          onClose={() => !isDeleting && setItemToDelete(null)}
          title="Xác nhận xóa cụm khỏi Thư viện"
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
                Bạn có chắc chắn muốn xóa cụm <strong style={{ color: '#ef4444' }}>{itemToDelete.name}</strong> khỏi Thư viện dùng chung?
                {(itemToDelete._count?.functionalUnits || 0) > 0 && (
                  <div style={{ marginTop: '8px', padding: '6px 8px', backgroundColor: 'rgba(245, 158, 11, 0.15)', borderRadius: '4px', color: '#b45309', fontWeight: 600, fontSize: '12px' }}>
                    ⚠️ Hiện có {itemToDelete._count?.functionalUnits} thiết bị đang sử dụng cụm này. Việc xóa khỏi thư viện sẽ chỉ gỡ liên kết mẫu, dữ liệu trên các máy vẫn được giữ nguyên.
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={isDeleting}
                onClick={() => setItemToDelete(null)}
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
                <Trash2 size={14} /> {isDeleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
