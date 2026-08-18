import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast, useConfirmDialog } from '../components/common/Toast';
import { Modal } from '../components/common/Modal';
import { ArrowLeft, Plus, Save, Trash2, GripVertical, CheckSquare } from 'lucide-react';

export const ChecklistDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { confirm } = useConfirmDialog();

  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Modal Thư viện
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [libraryItems, setLibraryItems] = useState<any[]>([]);
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<string[]>([]);
  
  // Modal Thêm thủ công
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [manualItemText, setManualItemText] = useState('');

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  const loadData = async (templateId: string) => {
    try {
      setLoading(true);
      const data = await api.getChecklistTemplate(templateId);
      setTemplate(data);
    } catch (err: any) {
      toast.error('Lỗi', 'Không thể tải Checklist Template');
      navigate('/checklists');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLibrary = async () => {
    try {
      const items = await api.getChecklistLibrary();
      setLibraryItems(items);
      setSelectedLibraryIds([]);
      setIsLibraryOpen(true);
    } catch (err: any) {
      toast.error('Lỗi tải thư viện', err.message);
    }
  };

  const handleAddFromLibrary = async () => {
    if (selectedLibraryIds.length === 0) return;
    try {
      const itemsToAdd = libraryItems
        .filter(item => selectedLibraryIds.includes(item.id))
        .map(item => ({ itemText: item.itemText }));
      
      const updatedTemplate = await api.addChecklistTemplateItems(template.id, itemsToAdd);
      setTemplate(updatedTemplate);
      setIsLibraryOpen(false);
      toast.success(`Đã thêm ${itemsToAdd.length} hạng mục`);
    } catch (err: any) {
      toast.error('Lỗi', 'Không thể thêm hạng mục từ thư viện');
    }
  };

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualItemText.trim()) return;
    try {
      const updatedTemplate = await api.addChecklistTemplateItems(template.id, [{ itemText: manualItemText }]);
      setTemplate(updatedTemplate);
      setIsManualOpen(false);
      setManualItemText('');
      toast.success('Đã thêm hạng mục mới');
    } catch (err: any) {
      toast.error('Lỗi', 'Không thể thêm hạng mục');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    const ok = await confirm('Xóa hạng mục', 'Bạn có chắc muốn xóa hạng mục này khỏi template?');
    if (ok) {
      try {
        const updatedTemplate = await api.deleteChecklistTemplateItem(template.id, itemId);
        setTemplate(updatedTemplate);
        toast.success('Đã xóa hạng mục');
      } catch (err: any) {
        toast.error('Lỗi xóa hạng mục', err.message);
      }
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Đang tải dữ liệu...</div>;
  if (!template) return <div style={{ padding: '20px' }}>Không tìm thấy template</div>;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <button className="btn-icon" onClick={() => navigate('/checklists')}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
            <span className="badge badge-primary">{template.code}</span>
            <span className={`badge badge-${template.isActive ? 'success' : 'neutral'}`}>
              {template.isActive ? 'Đang dùng' : 'Tạm dừng'}
            </span>
          </div>
          <h1 className="page-title">{template.name}</h1>
          {template.description && <p className="page-subtitle">{template.description}</p>}
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Danh sách hạng mục kiểm tra</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Tổng cộng: {template.items?.length || 0} mục</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={() => setIsManualOpen(true)}>
              <Plus size={16} /> Thêm thủ công
            </button>
            <button className="btn btn-primary" onClick={handleOpenLibrary}>
              <CheckSquare size={16} /> Chọn từ Thư viện
            </button>
          </div>
        </div>

        <div className="card-body">
          {template.items?.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
              <CheckSquare size={40} style={{ opacity: 0.2, margin: '0 auto 12px' }} />
              <p>Chưa có hạng mục nào trong mẫu checklist này.</p>
              <p style={{ fontSize: '13px' }}>Hãy thêm thủ công hoặc chọn các mẫu có sẵn từ Thư viện hệ thống.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {template.items?.map((item: any, index: number) => (
                <div key={item.id} style={{
                  display: 'flex', alignItems: 'center', padding: '16px',
                  backgroundColor: 'var(--bg-secondary)', borderRadius: '8px',
                  border: '1px solid var(--border-color)', gap: '16px'
                }}>
                  <div style={{ color: 'var(--text-muted)', cursor: 'grab' }}>
                    <GripVertical size={20} />
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)', width: '32px' }}>
                    {index + 1}.
                  </div>
                  <div style={{ flex: 1, fontSize: '15px' }}>
                    {item.itemText}
                  </div>
                  <button className="btn-icon text-danger" onClick={() => handleDeleteItem(item.id)}>
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Thư viện */}
      <Modal isOpen={isLibraryOpen} onClose={() => setIsLibraryOpen(false)} title="Thêm hạng mục từ Thư viện">
        <div style={{ marginBottom: '16px', maxHeight: '400px', overflowY: 'auto' }}>
          {libraryItems.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Thư viện đang trống.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {libraryItems.map(item => (
                <label key={item.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                  border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer',
                  backgroundColor: selectedLibraryIds.includes(item.id) ? 'var(--primary-light)' : 'transparent'
                }}>
                  <input
                    type="checkbox"
                    style={{ width: '18px', height: '18px' }}
                    checked={selectedLibraryIds.includes(item.id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedLibraryIds([...selectedLibraryIds, item.id]);
                      else setSelectedLibraryIds(selectedLibraryIds.filter(id => id !== item.id));
                    }}
                  />
                  <div>
                    <div style={{ fontWeight: 500 }}>{item.itemText}</div>
                    {item.category && <span className="badge badge-neutral mt-1">{item.category}</span>}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer" style={{ padding: 0 }}>
          <button className="btn btn-secondary" onClick={() => setIsLibraryOpen(false)}>Hủy</button>
          <button className="btn btn-primary" onClick={handleAddFromLibrary} disabled={selectedLibraryIds.length === 0}>
            Thêm {selectedLibraryIds.length} hạng mục
          </button>
        </div>
      </Modal>

      {/* Modal Thêm thủ công */}
      <Modal isOpen={isManualOpen} onClose={() => setIsManualOpen(false)} title="Thêm hạng mục thủ công">
        <form onSubmit={handleAddManual}>
          <div className="form-group">
            <label className="form-label">Nội dung hạng mục *</label>
            <textarea
              className="form-input"
              rows={3}
              required
              placeholder="VD: Kiểm tra mức dầu nhờn"
              value={manualItemText}
              onChange={e => setManualItemText(e.target.value)}
            />
          </div>
          <div className="modal-footer" style={{ padding: 0, marginTop: '20px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsManualOpen(false)}>Hủy</button>
            <button type="submit" className="btn btn-primary">Thêm</button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
