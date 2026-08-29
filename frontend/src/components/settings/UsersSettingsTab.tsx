import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../common/Toast';
import { RefreshCw, Shield } from 'lucide-react';

export const UsersSettingsTab: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const toast = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [uRes, rRes, meRes] = await Promise.all([
        api.getUsers({}),
        api.getRoles(),
        api.getMe().catch(() => null)
      ]);
      setUsers(uRes);
      setRoles(rRes);
      const adminRole = import.meta.env.VITE_SUPER_ADMIN_ROLE || 'ADMIN';
      const userObj = meRes?.user || meRes;
      const userRole = userObj?.role;
      if (userRole === adminRole || meRes?.permissions?.includes('ALL') || userRole === 'ADMIN') {
        setIsAdmin(true);
      }
    } catch (err: any) {
      toast.error('Lỗi tải danh sách', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChangeRole = async (userId: string, roleId: string) => {
    try {
      await api.updateUserRole(userId, roleId || null);
      toast.success('Thành công', 'Đã cập nhật phân quyền người dùng');
      loadData();
    } catch (err: any) {
      toast.error('Lỗi', err.message || 'Không thể cập nhật quyền');
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Danh sách người dùng & Phân quyền</h3>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>Gán nhóm quyền cho nhân sự trong hệ thống.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-primary" onClick={handleSyncHrm} disabled={isSyncing} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} /> Đồng bộ từ HRM
          </button>
          <button className="btn btn-secondary" onClick={loadData} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Làm mới
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}><RefreshCw className="animate-spin" /></div>
      ) : (
        <table className="custom-table">
          <thead>
            <tr>
              <th>Họ tên</th>
              <th>Email</th>
              <th>Phòng ban</th>
              <th>Vai trò hệ thống cũ</th>
              <th style={{ width: '250px' }}><Shield size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }}/> Nhóm quyền (RBAC)</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600 }}>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.department || '---'}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{u.role}</td>
                <td>
                  <select 
                    className="form-select" 
                    value={u.roleId || ''} 
                    onChange={e => handleChangeRole(u.id, e.target.value)}
                    style={{ padding: '6px 12px', fontSize: '13px' }}
                  >
                    <option value="">-- Chưa gán nhóm quyền --</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
