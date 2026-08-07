import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Plus, Search, UserCheck, Shield, Lock, Edit, Trash2, RefreshCw } from 'lucide-react';
import { useToast } from '../components/common/Toast';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const toast = useToast();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'TECHNICIAN',
    department: 'Tổ Bảo trì Xưởng A',
    phone: '',
  });

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await api.getUsers({ includeInactive: true });
      setUsers(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setUsers([
      ...users,
      {
        id: String(Date.now()),
        ...formData,
        isActive: true,
        status: 'ACTIVE',
      },
    ]);
    setIsAddOpen(false);
    toast.success('Thành công', 'Đã thêm thành viên mới.');
    setFormData({ name: '', email: '', role: 'TECHNICIAN', department: 'Tổ Bảo trì Xưởng A', phone: '' });
  };

  const filteredUsers = users.filter((u) => {
    const nameMatch = u.name?.toLowerCase().includes(search.toLowerCase());
    const emailMatch = u.email?.toLowerCase().includes(search.toLowerCase());
    const phoneMatch = u.phone?.toLowerCase().includes(search.toLowerCase());
    const matchSearch = nameMatch || emailMatch || phoneMatch;
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const adminCount = users.filter(u => u.role === 'ADMIN').length;
  const techCount = users.filter(u => u.role === 'TECHNICIAN').length;
  const operatorCount = users.filter(u => u.role === 'OPERATOR' || u.role === 'MANAGER').length;

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '12px' }}>
        <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--primary)' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Đang tải danh sách người dùng...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Người dùng CMMS</h1>
          <p className="page-subtitle">Quản lý danh sách tài khoản, phân quyền và phòng ban vận hành</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
          <Plus size={16} /> Thêm người dùng
        </button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-card-title">Tổng người dùng</div>
          <div className="kpi-card-value">{users.length}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-title">Quản trị viên (Admin)</div>
          <div className="kpi-card-value" style={{ color: 'var(--accent-blue)' }}>{adminCount}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-title">Kỹ thuật viên</div>
          <div className="kpi-card-value" style={{ color: 'var(--success)' }}>{techCount}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-title">Nhân viên vận hành</div>
          <div className="kpi-card-value" style={{ color: 'var(--info)' }}>{operatorCount}</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="card mb-4" style={{ display: 'flex', gap: '12px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '34px' }}
            placeholder="Tìm theo tên, email, sđt..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="form-select" style={{ width: '180px' }} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">Tất cả vai trò</option>
          <option value="ADMIN">Quản trị viên (Admin)</option>
          <option value="MANAGER">Trưởng phòng / Quản đốc</option>
          <option value="TECHNICIAN">Kỹ thuật viên</option>
          <option value="OPERATOR">Nhân viên vận hành</option>
        </select>
      </div>

      {/* Data Table */}
      <div className="table-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Người dùng</th>
              <th>Email</th>
              <th>Số điện thoại</th>
              <th>Vai trò</th>
              <th>Phòng ban / Đơn vị</th>
              <th>Trạng thái</th>
              <th style={{ textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      backgroundColor: '#0f172a', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '12px'
                    }}>
                      {u.name.split(' ').pop()?.substring(0, 2).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 600 }}>{u.name}</span>
                  </div>
                </td>
                <td>{u.email}</td>
                <td>{u.phone || '---'}</td>
                <td>
                  {u.role === 'ADMIN' && <span className="badge badge-danger"><Shield size={10} /> Admin</span>}
                  {u.role === 'MANAGER' && <span className="badge badge-warning">Quản đốc</span>}
                  {u.role === 'TECHNICIAN' && <span className="badge badge-success">Kỹ thuật viên</span>}
                  {u.role === 'OPERATOR' && <span className="badge badge-info">Vận hành</span>}
                </td>
                <td>{u.department}</td>
                <td>
                  <span className={`badge badge-${u.isActive ? 'success' : 'secondary'}`}>
                    {u.isActive ? 'Hoạt động' : 'Vô hiệu hóa'}
                  </span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                    <button className="btn btn-secondary btn-sm"><Edit size={12} /></button>
                    <button className="btn btn-secondary btn-sm"><Lock size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex-between" style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
        <div>Hiển thị 1 - {filteredUsers.length} trên {filteredUsers.length} kết quả</div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button className="btn btn-secondary btn-sm" disabled>&lt;</button>
          <button className="btn btn-primary btn-sm">1</button>
          <button className="btn btn-secondary btn-sm" disabled>&gt;</button>
        </div>
      </div>

      {/* Add Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Thêm người dùng mới">
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">Họ và tên *</label>
            <input type="text" className="form-input" required placeholder="Nhập họ tên" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input type="email" className="form-input" required placeholder="user@company.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Số điện thoại</label>
              <input type="text" className="form-input" placeholder="0912..." value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Vai trò hệ thống</label>
              <select className="form-select" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                <option value="TECHNICIAN">Kỹ thuật viên</option>
                <option value="MANAGER">Trưởng phòng / Quản đốc</option>
                <option value="OPERATOR">Nhân viên vận hành</option>
                <option value="ADMIN">Quản trị viên (Admin)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Phòng ban</label>
              <input type="text" className="form-input" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} />
            </div>
          </div>

          <div className="modal-footer" style={{ padding: 0, marginTop: '20px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsAddOpen(false)}>Hủy</button>
            <button type="submit" className="btn btn-primary">Thêm người dùng</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
