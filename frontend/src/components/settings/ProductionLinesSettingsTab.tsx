import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { Plus, Edit2, Trash2, Search, RefreshCw, Layers, Tag } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useToast, useConfirmDialog } from '../common/Toast';

interface ProductionLineItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export const ProductionLinesSettingsTab: React.FC = () => {
  const [lines, setLines] = useState<ProductionLineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProductionLineItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
  });

  const toast = useToast();
  const { confirm } = useConfirmDialog();

  useEffect(() => {
    loadLines();
  }, []);

  const loadLines = async () => {
    setLoading(true);
    try {
      const data = await api.getProductionLines();
      setLines(Array.isArray(data) ? data : []);
    } catch (error: any) {
      toast.error('Lỗi tải dữ liệu', error.message || 'Không thể tải danh sách dây chuyền.');
    } finally {
      setLoading(false);
    }
  };

  const filteredLines = useMemo(() => {
    return lines.filter((line) => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        line.code.toLowerCase().includes(term) ||
        line.name.toLowerCase().includes(term) ||
        (line.description && line.description.toLowerCase().includes(term))
      );
    });
  }, [lines, searchTerm]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({ code: '', name: '', description: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: ProductionLineItem) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      description: item.description || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim()) {
      toast.error('Thiếu thông tin', 'Vui lòng nhập Mã và Tên khu vực / dây chuyền.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingItem) {
        await api.updateProductionLine(editingItem.id, formData);
        toast.success('Thành công', 'Đã cập nhật khu vực / dây chuyền.');
      } else {
        await api.createProductionLine(formData);
        toast.success('Thành công', 'Đã thêm khu vực / dây chuyền mới.');
      }
      setIsModalOpen(false);
      loadLines();
    } catch (err: any) {
      toast.error('Lỗi lưu dữ liệu', err.message || 'Không thể lưu dây chuyền.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item: ProductionLineItem) => {
    const ok = await confirm(
      'Xác nhận xóa khu vực / dây chuyền',
      `Bạn có chắc chắn muốn xóa "${item.name}" (${item.code}) không?`
    );
    if (ok) {
      try {
        await api.deleteProductionLine(item.id);
        toast.success('Đã xóa', 'Khu vực / dây chuyền đã được xóa thành công.');
        loadLines();
      } catch (err: any) {
        toast.error('Lỗi xóa', err.message || 'Không thể xóa do ràng buộc dữ liệu.');
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
            <Layers size={20} style={{ color: 'var(--accent-blue, #2563eb)' }} />
            Khu vực & Dây chuyền sản xuất
          </h3>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
            Khai báo các line sản xuất (Dây chuyền chiết rót, Dây chuyền đóng gói, Line pha chế...).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            className="btn btn-secondary"
            onClick={loadLines}
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
            <Plus size={15} /> Thêm dây chuyền
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
            placeholder="Tìm theo mã hoặc tên dây chuyền..."
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
          Tổng số: <strong style={{ color: 'var(--text-primary)' }}>{filteredLines.length}</strong> / {lines.length} dây chuyền
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-secondary)' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
          <div style={{ fontSize: '13.5px' }}>Đang tải danh sách dây chuyền...</div>
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
                  <th style={{ width: '150px' }}>Mã dây chuyền</th>
                  <th style={{ minWidth: '220px' }}>Tên dây chuyền / Khu vực</th>
                  <th style={{ minWidth: '260px' }}>Mô tả ghi chú</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredLines.length > 0 ? (
                  filteredLines.map((item, index) => (
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
                            backgroundColor: 'rgba(147, 51, 234, 0.08)',
                            color: '#9333ea',
                            border: '1px solid rgba(147, 51, 234, 0.2)',
                          }}
                        >
                          <Tag size={11} /> {item.code}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13.5px' }}>
                          {item.name}
                        </div>
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
                            width: '52px',
                            height: '52px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(147, 51, 234, 0.08)',
                            color: '#9333ea',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '12px',
                          }}
                        >
                          <Layers size={26} />
                        </div>
                        <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                          Chưa có dây chuyền nào
                        </h4>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                          Khai báo các line sản xuất để liên kết máy móc và theo dõi bảo trì.
                        </p>
                        <button className="btn btn-primary" onClick={handleOpenAdd}>
                          <Plus size={15} /> Thêm dây chuyền đầu tiên
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
        title={editingItem ? 'Chỉnh sửa khu vực / dây chuyền' : 'Thêm khu vực / dây chuyền mới'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              Mã dây chuyền <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="VD: LINE-CR-01, LINE-DG-02..."
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              disabled={!!editingItem}
            />
            {editingItem && (
              <small style={{ color: 'var(--text-muted)', fontSize: '11.5px', marginTop: '2px', display: 'block' }}>
                Mã dây chuyền không thể thay đổi sau khi tạo.
              </small>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              Tên dây chuyền / Khu vực <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="VD: Dây chuyền chiết rót siro, Line phân liều rắn..."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mô tả / Ghi chú</label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="Ghi chú thêm về dây chuyền / line sản xuất..."
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
