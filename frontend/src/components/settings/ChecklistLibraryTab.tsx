import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useToast, useConfirmDialog } from '../common/Toast';

export const ChecklistLibraryTab: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
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
    try {
      const data = await api.getChecklistLibrary();
      setItems(data);
    } catch (error: any) {
      toast.error('Lỗi tải dữ liệu', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({ category: 'Cơ khí', itemText: '', description: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
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
    try {
      if (editingItem) {
        await api.updateChecklistLibraryItem(editingItem.id, formData);
        toast.success('Cập nhật hạng mục thành công');
      } else {
        await api.createChecklistLibraryItem(formData);
        toast.success('Thêm hạng mục mới thành công');
      }
      setIsModalOpen(false);
      loadItems();
    } catch (err: any) {
      toast.error('Lỗi lưu hạng mục', err.message);
    }
  };

  const handleDelete = async (item: any) => {
    const ok = await confirm('Xóa hạng mục', `Bạn có chắc chắn muốn xóa hạng mục "${item.itemText}" khỏi thư viện?`);
    if (ok) {
      try {
        await api.deleteChecklistLibraryItem(item.id);
        toast.success('Đã xóa hạng mục');
        loadItems();
      } catch (err: any) {
        toast.error('Lỗi xóa hạng mục', err.message);
      }
    }
  };

  if (loading) return <div>Đang tải dữ liệu thư viện...</div>;

  return (
    <div className="tab-pane active">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>Thư viện hạng mục Checklist</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Định nghĩa sẵn các hạng mục kiểm tra mẫu để có thể chọn nhanh khi tạo Checklist mới.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} /> Thêm hạng mục
        </button>
      </div>

      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: '150px' }}>Phân loại</th>
              <th>Nội dung hạng mục</th>
              <th>Mô tả / Ghi chú</th>
              <th style={{ width: '120px', textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <span className="badge badge-neutral">{item.category}</span>
                </td>
                <td style={{ fontWeight: 500 }}>{item.itemText}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{item.description || '-'}</td>
                <td style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button className="btn-icon text-info" onClick={() => handleOpenEdit(item)}>
                      <Edit2 size={16} />
                    </button>
                    <button className="btn-icon text-danger" onClick={() => handleDelete(item)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                  Thư viện chưa có hạng mục nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem ? 'Sửa hạng mục' : 'Thêm hạng mục mới'}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Phân loại / Chuyên môn *</label>
            <select className="form-input" required value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
              <option value="Cơ khí">Cơ khí</option>
              <option value="Điện">Điện & Điện tử</option>
              <option value="Thủy lực">Thủy lực / Khí nén</option>
              <option value="An toàn">An toàn (Safety)</option>
              <option value="Vệ sinh">Vệ sinh (5S)</option>
              <option value="Chung">Kiểm tra chung</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Nội dung hạng mục (Item text) *</label>
            <textarea 
              className="form-input" 
              required 
              rows={2}
              placeholder="VD: Kiểm tra độ mòn của dây đai truyền động"
              value={formData.itemText} 
              onChange={e => setFormData({ ...formData, itemText: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Mô tả / Hướng dẫn (tùy chọn)</label>
            <textarea 
              className="form-input" 
              rows={2}
              placeholder="Ghi chú thêm hoặc hướng dẫn cách kiểm tra..."
              value={formData.description} 
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="modal-footer" style={{ padding: 0, marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Hủy</button>
            <button type="submit" className="btn btn-primary">{editingItem ? 'Cập nhật' : 'Thêm vào thư viện'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
