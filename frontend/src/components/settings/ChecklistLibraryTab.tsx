import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { Plus, Edit2, Trash2, Search, RefreshCw, ListChecks, CheckCircle2, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useToast, useConfirmDialog } from '../common/Toast';

interface ChecklistItem {
  id: string;
  category: string;
  itemText: string;
  description?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const CATEGORIES = [
  'Cơ khí',
  'Điện',
  'Thủy lực',
  'An toàn',
  'Vệ sinh',
  'Chung',
];

const CATEGORY_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  'Cơ khí': { bg: 'rgba(37, 99, 235, 0.08)', color: '#2563eb', border: 'rgba(37, 99, 235, 0.2)' },
  'Điện': { bg: 'rgba(217, 119, 6, 0.08)', color: '#d97706', border: 'rgba(217, 119, 6, 0.2)' },
  'Thủy lực': { bg: 'rgba(8, 145, 178, 0.08)', color: '#0891b2', border: 'rgba(8, 145, 178, 0.2)' },
  'An toàn': { bg: 'rgba(220, 38, 38, 0.08)', color: '#dc2626', border: 'rgba(220, 38, 38, 0.2)' },
  'Vệ sinh': { bg: 'rgba(22, 163, 74, 0.08)', color: '#16a34a', border: 'rgba(22, 163, 74, 0.2)' },
  'Chung': { bg: 'rgba(100, 116, 139, 0.08)', color: '#475569', border: 'rgba(100, 116, 139, 0.2)' },
};

export const ChecklistLibraryTab: React.FC = () => {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    category: 'Cơ khí',
    itemText: '',
    description: '',
  });

  const toast = useToast();
  const { confirm } = useConfirmDialog();

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await api.getChecklistLibrary();
      setItems(Array.isArray(data) ? data : []);
    } catch (error: any) {
      toast.error('Lỗi tải dữ liệu', error.message || 'Không thể kết nối đến máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        searchTerm.trim() === '' ||
        item.itemText.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCategory =
        selectedCategory === 'ALL' || item.category === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [items, searchTerm, selectedCategory]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      category: selectedCategory !== 'ALL' ? selectedCategory : 'Cơ khí',
      itemText: '',
      description: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: ChecklistItem) => {
    setEditingItem(item);
    setFormData({
      category: item.category,
      itemText: item.itemText,
      description: item.description || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.itemText.trim()) {
      toast.error('Thiếu thông tin', 'Vui lòng nhập nội dung hạng mục.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingItem) {
        await api.updateChecklistLibraryItem(editingItem.id, formData);
        toast.success('Thành công', 'Đã cập nhật hạng mục kiểm tra.');
      } else {
        await api.createChecklistLibraryItem(formData);
        toast.success('Thành công', 'Đã thêm hạng mục mới vào thư viện.');
      }
      setIsModalOpen(false);
      loadItems();
    } catch (err: any) {
      toast.error('Lỗi lưu hạng mục', err.message || 'Không thể lưu vào hệ thống.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item: ChecklistItem) => {
    const ok = await confirm(
      'Xác nhận xóa hạng mục',
      `Bạn có chắc chắn muốn xóa hạng mục "${item.itemText}" khỏi thư viện không? Thao tác này không thể hoàn tác.`
    );
    if (ok) {
      try {
        await api.deleteChecklistLibraryItem(item.id);
        toast.success('Đã xóa', 'Hạng mục đã được gỡ khỏi thư viện.');
        loadItems();
      } catch (err: any) {
        toast.error('Lỗi xóa hạng mục', err.message);
      }
    }
  };

  const getCategoryBadge = (category: string) => {
    const style = CATEGORY_STYLES[category] || CATEGORY_STYLES['Chung'];
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '3px 9px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 600,
          backgroundColor: style.bg,
          color: style.color,
          border: `1px solid ${style.border}`,
          whiteSpace: 'nowrap',
        }}
      >
        {category}
      </span>
    );
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
            <ListChecks size={20} style={{ color: 'var(--accent-blue, #2563eb)' }} />
            Thư viện hạng mục Checklist
          </h3>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
            Định nghĩa sẵn các hạng mục kiểm tra mẫu để có thể chọn nhanh khi tạo Checklist mới.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            className="btn btn-secondary"
            onClick={loadItems}
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
            <Plus size={15} /> Thêm hạng mục
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
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 260px', minWidth: '220px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Tìm kiếm nội dung, mô tả, phân loại..."
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

        {/* Category Filter */}
        <div style={{ width: '180px' }}>
          <select
            className="form-input"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{ height: '36px', fontSize: '13px' }}
          >
            <option value="ALL">Tất cả phân loại</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Total stats */}
        <div
          style={{
            fontSize: '12.5px',
            color: 'var(--text-secondary)',
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>Hiển thị:</span>
          <strong style={{ color: 'var(--text-primary)' }}>{filteredItems.length}</strong>
          <span>/ {items.length} hạng mục</span>
        </div>
      </div>

      {/* Table Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-secondary)' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
          <div style={{ fontSize: '13.5px' }}>Đang tải thư viện checklist...</div>
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
                  <th style={{ width: '140px' }}>Phân loại</th>
                  <th style={{ minWidth: '240px' }}>Nội dung hạng mục</th>
                  <th style={{ minWidth: '260px' }}>Mô tả / Hướng dẫn thực hiện</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length > 0 ? (
                  filteredItems.map((item, index) => (
                    <tr key={item.id}>
                      <td style={{ textAlign: 'center', color: 'var(--text-muted, #94a3b8)', fontSize: '12px' }}>
                        {index + 1}
                      </td>
                      <td>{getCategoryBadge(item.category)}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary, #0f172a)', fontSize: '13.5px' }}>
                          {item.itemText}
                        </div>
                      </td>
                      <td>
                        {item.description ? (
                          <div style={{ color: 'var(--text-secondary, #475569)', fontSize: '13px', lineHeight: 1.4 }}>
                            {item.description}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '12px', fontStyle: 'italic' }}>
                            Không có mô tả
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            className="btn-icon"
                            onClick={() => handleOpenEdit(item)}
                            title="Sửa hạng mục"
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
                            title="Xóa hạng mục"
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
                    <td colSpan={5} style={{ padding: 0 }}>
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
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(37, 99, 235, 0.08)',
                            color: 'var(--accent-blue, #2563eb)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '14px',
                          }}
                        >
                          <ListChecks size={28} />
                        </div>
                        {items.length === 0 ? (
                          <>
                            <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                              Thư viện chưa có hạng mục nào
                            </h4>
                            <p
                              style={{
                                fontSize: '13px',
                                color: 'var(--text-secondary)',
                                maxWidth: '420px',
                                marginBottom: '18px',
                              }}
                            >
                              Tạo sẵn các hạng mục kiểm tra (ví dụ: kiểm tra độ rung, đo dòng điện, vệ sinh bộ lọc...) để tái sử dụng khi tạo checklist.
                            </p>
                            <button className="btn btn-primary" onClick={handleOpenAdd} style={{ fontSize: '13px' }}>
                              <Plus size={15} /> Thêm hạng mục đầu tiên
                            </button>
                          </>
                        ) : (
                          <>
                            <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                              Không tìm thấy hạng mục phù hợp
                            </h4>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                              Không có kết quả nào khớp với từ khóa tìm kiếm hoặc phân loại đã chọn.
                            </p>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                setSearchTerm('');
                                setSelectedCategory('ALL');
                              }}
                            >
                              Xóa bộ lọc
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Add / Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Sửa hạng mục kiểm tra' : 'Thêm hạng mục kiểm tra mới'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              Phân loại / Chuyên môn <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <select
              className="form-input"
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              style={{ fontSize: '13px' }}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              Nội dung hạng mục (Item text) <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <textarea
              className="form-input"
              required
              rows={3}
              placeholder="VD: Kiểm tra độ mòn của dây đai truyền động và độ căng"
              value={formData.itemText}
              onChange={(e) => setFormData({ ...formData, itemText: e.target.value })}
              style={{ resize: 'vertical', fontSize: '13px' }}
            />
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Mô tả ngắn gọn, rõ ràng tiêu chí mà kỹ thuật viên cần kiểm tra.
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Mô tả / Hướng dẫn thực hiện (tùy chọn)</label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="Ghi chú thêm về tiêu chuẩn đạt/không đạt hoặc dụng cụ cần dùng..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{ resize: 'vertical', fontSize: '13px' }}
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
              {editingItem ? 'Cập nhật' : 'Thêm vào thư viện'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
