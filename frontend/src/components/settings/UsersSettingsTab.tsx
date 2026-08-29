import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast, useConfirmDialog } from '../common/Toast';
import { Modal } from '../common/Modal';
import { 
  RefreshCw, Shield, Edit2, Trash2, Plus, Save, 
  Search, Check, AlertTriangle, UserCheck, UserX, User 
} from 'lucide-react';

export const UsersSettingsTab: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Pending role changes per user: { [userId]: newRoleId }
  const [pendingRoles, setPendingRoles] = useState<Record<string, string>>({});
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    department: '',
    role: 'USER',
    roleId: '',
    specialty: '',
    isActive: true,
  });

  const toast = useToast();
  const { confirm } = useConfirmDialog();

  const loadData = async () => {
    setLoading(true);
    try {
      const [uRes, rRes] = await Promise.all([
        api.getUsers({ includeInactive: true }),
        api.getRoles(),
      ]);
      setUsers(uRes);
      setRoles(rRes);
      setPendingRoles({});
    } catch (err: any) {
      toast.error('Lỗi tải danh sách', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRoleSelectChange = (userId: string, roleId: string) => {
    setPendingRoles(prev => ({
      ...prev,
      [userId]: roleId,
    }));
  };

  const handleSaveSingleRole = async (userId: string) => {
    const roleId = pendingRoles[userId];
    if (roleId === undefined) return;

    setSavingUserId(userId);
    try {
      await api.updateUserRole(userId, roleId || null);
      toast.success('Thành công', 'Đã lưu phân quyền người dùng.');
      setPendingRoles(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      loadData();
    } catch (err: any) {
      toast.error('Lỗi', err.message || 'Không thể cập nhật quyền');
    } finally {
      setSavingUserId(null);
    }
  };

  const handleSaveAllPendingRoles = async () => {
    const userIds = Object.keys(pendingRoles);
    if (userIds.length === 0) return;

    setLoading(true);
    try {
      await Promise.all(
        userIds.map(uid => api.updateUserRole(uid, pendingRoles[uid] || null))
      );
      toast.success('Thành công', `Đã lưu cập nhật cho ${userIds.length} người dùng.`);
      setPendingRoles({});
      loadData();
    } catch (err: any) {
      toast.error('Lỗi', err.message || 'Không thể lưu tất cả thay đổi');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setUserForm({
      name: '',
      email: '',
      department: '',
      role: 'USER',
      roleId: '',
      specialty: '',
      isActive: true,
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (user: any) => {
    setSelectedUser(user);
    setUserForm({
      name: user.name || '',
      email: user.email || '',
      department: user.department || '',
      role: user.role || 'USER',
      roleId: user.roleId || '',
      specialty: user.specialty || '',
      isActive: user.isActive !== undefined ? user.isActive : true,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveUserForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name.trim() || !userForm.email.trim()) {
      toast.error('Thiếu thông tin', 'Vui lòng nhập Họ tên và Email.');
      return;
    }

    try {
      if (selectedUser) {
        await api.updateUser(selectedUser.id, userForm);
        toast.success('Thành công', 'Đã cập nhật thông tin người dùng.');
        setIsEditModalOpen(false);
      } else {
        await api.createUser(userForm);
        toast.success('Thành công', 'Đã tạo người dùng mới.');
        setIsAddModalOpen(false);
      }
      loadData();
    } catch (err: any) {
      toast.error('Lỗi', err.message || 'Không thể lưu người dùng');
    }
  };

  const handleDeleteUser = async (user: any) => {
    const ok = await confirm(
      'Xác nhận xóa người dùng',
      `Bạn có chắc chắn muốn xóa tài khoản "${user.name}" (${user.email}) khỏi hệ thống không?`,
      { type: 'danger' }
    );
    if (!ok) return;

    try {
      await api.deleteUser(user.id);
      toast.success('Đã xóa', `Đã xóa người dùng "${user.name}".`);
      loadData();
    } catch (err: any) {
      toast.error('Lỗi', err.message || 'Không thể xóa người dùng');
    }
  };

  const handleSyncHrm = async () => {
    setIsSyncing(true);
    try {
      const res = await api.syncHrmUsers();
      toast.success('Thành công', `Đã đồng bộ ${res.syncedCount || 0} người dùng từ HRM`);
      loadData();
    } catch (err: any) {
      toast.error('Lỗi đồng bộ', err.message || 'Không thể đồng bộ người dùng từ HRM');
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchSearch = searchTerm === '' || 
      (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.department && u.department.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchRole = roleFilter === '' || u.role === roleFilter;

    return matchSearch && matchRole;
  });

  const pendingCount = Object.keys(pendingRoles).length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Danh sách người dùng & Phân quyền</h3>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
            Quản lý tài khoản, gán nhóm quyền RBAC và phân quyền truy cập hệ thống.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {pendingCount > 0 && (
            <button 
              className="btn btn-primary" 
              onClick={handleSaveAllPendingRoles} 
              style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}
            >
              <Save size={14} /> Lưu tất cả thay đổi ({pendingCount})
            </button>
          )}
          <button className="btn btn-primary" onClick={handleOpenAdd} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={14} /> Thêm người dùng
          </button>
          <button className="btn btn-secondary" onClick={handleSyncHrm} disabled={isSyncing} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} /> Đồng bộ từ HRM
          </button>
          <button className="btn btn-secondary" onClick={loadData} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Làm mới
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: '280px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Tìm theo tên, email, phòng ban..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '32px', height: '36px', fontSize: '13px' }}
          />
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        </div>

        <select
          className="form-input"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{ width: '160px', height: '36px', fontSize: '13px' }}
        >
          <option value="">Tất cả vai trò</option>
          <option value="ADMIN">Quản trị viên (ADMIN)</option>
          <option value="MANAGER">Quản lý (MANAGER)</option>
          <option value="TECHNICIAN">Kỹ thuật viên</option>
          <option value="USER">Người dùng (USER)</option>
        </select>

        <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
          Tổng: <strong>{filteredUsers.length}</strong> / {users.length} người dùng
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}><RefreshCw className="animate-spin" /></div>
      ) : (
        <div className="table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Phòng ban</th>
                <th>Vai trò</th>
                <th style={{ minWidth: '220px' }}>
                  <Shield size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} /> 
                  Nhóm quyền (RBAC)
                </th>
                <th style={{ width: '90px', textAlign: 'center' }}>Trạng thái</th>
                <th style={{ width: '140px', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => {
                const currentRoleId = pendingRoles[u.id] !== undefined ? pendingRoles[u.id] : (u.roleId || '');
                const isModified = pendingRoles[u.id] !== undefined && pendingRoles[u.id] !== (u.roleId || '');
                const isSaving = savingUserId === u.id;

                return (
                  <tr key={u.id} style={{ backgroundColor: isModified ? 'rgba(37, 99, 235, 0.04)' : undefined }}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>{u.name}</div>
                      {u.specialty && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{u.specialty}</div>}
                    </td>
                    <td style={{ fontSize: '12.5px' }}>{u.email}</td>
                    <td style={{ fontSize: '12.5px' }}>{u.department || '---'}</td>
                    <td>
                      <span className={`badge badge-${u.role === 'ADMIN' ? 'danger' : u.role === 'MANAGER' ? 'warning' : u.role === 'TECHNICIAN' ? 'info' : 'neutral'}`} style={{ fontSize: '11px' }}>
                        {u.role === 'ADMIN' ? 'Quản trị viên' : u.role === 'MANAGER' ? 'Quản lý' : u.role === 'TECHNICIAN' ? 'Kỹ thuật viên' : 'Người dùng'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <select 
                          className="form-select" 
                          value={currentRoleId} 
                          onChange={e => handleRoleSelectChange(u.id, e.target.value)}
                          style={{ 
                            padding: '4px 8px', fontSize: '12.5px', flex: 1,
                            borderColor: isModified ? 'var(--primary)' : undefined,
                            fontWeight: isModified ? 600 : 400
                          }}
                        >
                          <option value="">-- Chưa gán nhóm quyền --</option>
                          {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>

                        {/* Save Button for modified role */}
                        {isModified && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleSaveSingleRole(u.id)}
                            disabled={isSaving}
                            style={{ padding: '4px 8px', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}
                            title="Lưu nhóm quyền mới"
                          >
                            {isSaving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
                            Lưu
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {u.isActive !== false ? (
                        <span style={{ color: 'var(--success)', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <UserCheck size={14} /> Hoạt động
                        </span>
                      ) : (
                        <span style={{ color: 'var(--danger)', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <UserX size={14} /> Khóa
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          onClick={() => handleOpenEdit(u)}
                          style={{ padding: '4px 8px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          title="Chỉnh sửa thông tin"
                        >
                          <Edit2 size={12} /> Sửa
                        </button>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          onClick={() => handleDeleteUser(u)}
                          style={{ padding: '4px 8px', fontSize: '12px', color: 'var(--danger)' }}
                          title="Xóa người dùng"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    Không tìm thấy người dùng phù hợp
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit User Modal */}
      <Modal 
        isOpen={isEditModalOpen || isAddModalOpen} 
        onClose={() => { setIsEditModalOpen(false); setIsAddModalOpen(false); }}
        title={selectedUser ? `Chỉnh sửa Người dùng: ${selectedUser.name}` : 'Thêm Người dùng Mới'}
        maxWidth="540px"
      >
        <form onSubmit={handleSaveUserForm} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '4px' }}>
              Họ và tên *
            </label>
            <input
              type="text"
              className="form-input"
              required
              value={userForm.name}
              onChange={e => setUserForm({ ...userForm, name: e.target.value })}
              placeholder="VD: Nguyễn Văn A"
            />
          </div>

          <div>
            <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '4px' }}>
              Email *
            </label>
            <input
              type="email"
              className="form-input"
              required
              value={userForm.email}
              onChange={e => setUserForm({ ...userForm, email: e.target.value })}
              placeholder="VD: user@dkpharma.vn"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '4px' }}>
                Phòng ban / Phân xưởng
              </label>
              <input
                type="text"
                className="form-input"
                value={userForm.department}
                onChange={e => setUserForm({ ...userForm, department: e.target.value })}
                placeholder="VD: Xưởng Cơ điện"
              />
            </div>
            <div>
              <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '4px' }}>
                Chức danh / Chuyên môn
              </label>
              <input
                type="text"
                className="form-input"
                value={userForm.specialty}
                onChange={e => setUserForm({ ...userForm, specialty: e.target.value })}
                placeholder="VD: Kỹ sư Điện"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '4px' }}>
                Vai trò hệ thống
              </label>
              <select
                className="form-input"
                value={userForm.role}
                onChange={e => setUserForm({ ...userForm, role: e.target.value })}
              >
                <option value="USER">Người dùng (USER)</option>
                <option value="TECHNICIAN">Kỹ thuật viên (TECHNICIAN)</option>
                <option value="MANAGER">Quản lý (MANAGER)</option>
                <option value="ADMIN">Quản trị viên (ADMIN)</option>
              </select>
            </div>
            <div>
              <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '4px' }}>
                Nhóm quyền RBAC
              </label>
              <select
                className="form-input"
                value={userForm.roleId}
                onChange={e => setUserForm({ ...userForm, roleId: e.target.value })}
              >
                <option value="">-- Chưa gán nhóm quyền --</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', marginTop: '4px' }}>
              <input
                type="checkbox"
                checked={userForm.isActive}
                onChange={e => setUserForm({ ...userForm, isActive: e.target.checked })}
                style={{ width: 16, height: 16 }}
              />
              <span>Tài khoản đang hoạt động (cho phép đăng nhập)</span>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => { setIsEditModalOpen(false); setIsAddModalOpen(false); }}
            >
              Hủy
            </button>
            <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Save size={14} /> Lưu người dùng
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
