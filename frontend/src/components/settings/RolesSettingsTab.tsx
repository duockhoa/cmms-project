import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast, useConfirmDialog } from '../common/Toast';
import { Modal } from '../common/Modal';
import { Plus, Edit2, Trash2, RefreshCw } from 'lucide-react';

const MODULES = [
  { id: 'equipment', name: 'Thiết bị & Máy móc' },
  { id: 'requests', name: 'Báo cáo sự cố' },
  { id: 'operation_logs', name: 'Sổ vận hành máy' },
  { id: 'utilities', name: 'Điện, Nước & Tiện ích' },
  { id: 'work_orders', name: 'Phiếu bảo trì (Work Orders)' },
  { id: 'checklists', name: 'Checklist bảo trì' },
  { id: 'inventory', name: 'Kho & Phụ tùng' },
  { id: 'reports', name: 'Báo cáo & Phân tích' },
  { id: 'schedules', name: 'Lịch bảo trì định kỳ' },
  { id: 'feedbacks', name: 'Góp ý & Báo lỗi' },
  { id: 'settings', name: 'Cài đặt hệ thống' },
];

const ACTIONS = [
  { id: 'read', name: 'Xem' },
  { id: 'write', name: 'Thêm/Sửa' },
  { id: 'delete', name: 'Xóa' },
  { id: 'approve', name: 'Duyệt' },
];

export const RolesSettingsTab: React.FC = () => {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editRole, setEditRole] = useState<any | null>(null);
  const [form, setForm] = useState({ name: '', description: '', permissions: [] as string[] });

  const toast = useToast();
  const { confirm } = useConfirmDialog();

  const loadRoles = async () => {
    setLoading(true);
    try {
      const data = await api.getRoles();
      setRoles(data);
    } catch (err: any) {
      toast.error('Lỗi tải danh sách', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const handleOpenAdd = () => {
    setEditRole(null);
    setForm({ name: '', description: '', permissions: [] });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (role: any) => {
    setEditRole(role);
    const parsedPerms = role.permissions ? JSON.parse(role.permissions) : [];
    setForm({ name: role.name, description: role.description || '', permissions: parsedPerms });
    setIsModalOpen(true);
  };

  const togglePermission = (perm: string) => {
    setForm(prev => {
      const current = prev.permissions;
      if (current.includes(perm)) {
        return { ...prev, permissions: current.filter(p => p !== perm) };
      } else {
        return { ...prev, permissions: [...current, perm] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editRole) {
        await api.updateRole(editRole.id, form);
        toast.success('Thành công', 'Cập nhật nhóm quyền thành công');
      } else {
        await api.createRole(form);
        toast.success('Thành công', 'Tạo nhóm quyền mới thành công');
      }
      setIsModalOpen(false);
      loadRoles();
    } catch (err: any) {
      toast.error('Lỗi', err.message || 'Không thể lưu nhóm quyền');
    }
  };

  const handleDelete = async (role: any) => {
    const ok = await confirm('Xóa nhóm quyền', `Bạn có chắc chắn xóa nhóm quyền ${role.name}?`, { type: 'danger' });
    if (!ok) return;
    try {
      await api.deleteRole(role.id);
      toast.success('Thành công', 'Đã xóa nhóm quyền');
      loadRoles();
    } catch (err: any) {
      toast.error('Lỗi', err.message || 'Không thể xóa nhóm quyền');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Danh mục Nhóm quyền (Roles)</h3>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>Tự định nghĩa các nhóm quyền và ma trận phân quyền.</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={14} /> Thêm Nhóm quyền
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}><RefreshCw className="animate-spin" /></div>
      ) : (
        <table className="custom-table">
          <thead>
            <tr>
              <th>Tên nhóm quyền</th>
              <th>Mô tả</th>
              <th>Số lượng User</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {roles.map(r => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600 }}>{r.name}</td>
                <td>{r.description || '---'}</td>
                <td>{r._count?.users || 0}</td>
                <td>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEdit(r)}><Edit2 size={13}/></button>
                  <button className="btn btn-secondary btn-sm" style={{ color: 'var(--danger)', marginLeft: 8 }} onClick={() => handleDelete(r)}><Trash2 size={13}/></button>
                </td>
              </tr>
            ))}
            {roles.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>Chưa có nhóm quyền nào</td></tr>}
          </tbody>
        </table>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editRole ? 'Sửa Nhóm Quyền' : 'Thêm Nhóm Quyền Mới'}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Tên nhóm quyền *</label>
            <input className="form-input" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Mô tả</label>
            <input className="form-input" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
          </div>

          <div style={{ marginTop: '20px' }}>
            <label className="form-label">Ma trận Quyền hạn (Permissions)</label>
            <table className="custom-table" style={{ marginTop: 8 }}>
              <thead>
                <tr>
                  <th>Tính năng</th>
                  {ACTIONS.map(a => <th key={a.id} style={{ textAlign: 'center' }}>{a.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {MODULES.map(m => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 600 }}>{m.name}</td>
                    {ACTIONS.map(a => {
                      const perm = `${m.id}:${a.id}`;
                      const checked = form.permissions.includes(perm);
                      return (
                        <td key={a.id} style={{ textAlign: 'center' }}>
                          <input type="checkbox" checked={checked} onChange={() => togglePermission(perm)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="modal-footer" style={{ marginTop: '20px', padding: 0 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Hủy</button>
            <button type="submit" className="btn btn-primary">Lưu nhóm quyền</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
