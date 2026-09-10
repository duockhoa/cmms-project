import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { useToast, useConfirmDialog } from '../common/Toast';
import { Modal } from '../common/Modal';
import { 
  Plus, Edit2, Trash2, RefreshCw, Shield, CheckSquare, 
  Square, Search, ChevronRight, Check,
  Zap, Cpu, AlertTriangle, ClipboardList, BookOpen, Package, Calendar, Settings, MessageSquare, Layers
} from 'lucide-react';
import { PERMISSIONS_REGISTRY, ALL_PERMISSION_CODES } from '../../constants/permissions.registry';

const MODULE_ICONS: Record<string, React.FC<any>> = {
  utilities: Zap,
  equipment: Cpu,
  requests: AlertTriangle,
  work_orders: ClipboardList,
  checklists: CheckSquare,
  operation_logs: BookOpen,
  spare_parts: Package,
  maintenance_schedules: Calendar,
  feedbacks: MessageSquare,
  settings: Settings,
};

export const RolesSettingsTab: React.FC = () => {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editRole, setEditRole] = useState<any | null>(null);
  const [form, setForm] = useState({ name: '', description: '', permissions: [] as string[] });
  const [permSearch, setPermSearch] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('utilities');

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
    setPermSearch('');
    setSelectedModuleId(PERMISSIONS_REGISTRY[0]?.id || 'utilities');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (role: any) => {
    setEditRole(role);
    let parsedPerms: string[] = [];
    try {
      if (Array.isArray(role.permissions)) {
        parsedPerms = role.permissions;
      } else if (typeof role.permissions === 'string') {
        parsedPerms = JSON.parse(role.permissions);
      }
    } catch (e) {
      parsedPerms = [];
    }
    if (parsedPerms.includes('ALL') || parsedPerms.includes('*')) {
      parsedPerms = ['ALL', ...ALL_PERMISSION_CODES];
    }
    setForm({ name: role.name, description: role.description || '', permissions: parsedPerms });
    setPermSearch('');
    setSelectedModuleId(PERMISSIONS_REGISTRY[0]?.id || 'utilities');
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

  const toggleModulePermissions = (moduleCodes: string[]) => {
    setForm(prev => {
      const allSelected = moduleCodes.every(c => prev.permissions.includes(c));
      let updated: string[];
      if (allSelected) {
        updated = prev.permissions.filter(c => !moduleCodes.includes(c));
      } else {
        const newSet = new Set([...prev.permissions, ...moduleCodes]);
        updated = Array.from(newSet);
      }
      return { ...prev, permissions: updated };
    });
  };

  const handleSelectAll = () => {
    setForm(prev => ({ ...prev, permissions: [...ALL_PERMISSION_CODES] }));
  };

  const handleDeselectAll = () => {
    setForm(prev => ({ ...prev, permissions: [] }));
  };

  const filteredRegistry = useMemo(() => {
    if (!permSearch.trim()) return PERMISSIONS_REGISTRY;
    const q = permSearch.toLowerCase();
    return PERMISSIONS_REGISTRY.map(m => {
      const matchedPerms = m.permissions.filter(
        p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      );
      return { ...m, permissions: matchedPerms };
    }).filter(m => m.permissions.length > 0);
  }, [permSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Lỗi', 'Vui lòng nhập tên nhóm quyền');
      return;
    }

    try {
      const isAllSelected = ALL_PERMISSION_CODES.every(c => form.permissions.includes(c));
      const permsToSave = isAllSelected ? ['ALL', ...form.permissions] : form.permissions.filter(p => p !== 'ALL');
      const payload = { ...form, permissions: permsToSave };

      if (editRole) {
        await api.updateRole(editRole.id, payload);
        toast.success('Thành công', 'Cập nhật nhóm quyền thành công');
      } else {
        await api.createRole(payload);
        toast.success('Thành công', 'Tạo nhóm quyền mới thành công');
      }
      setIsModalOpen(false);
      loadRoles();
    } catch (err: any) {
      toast.error('Lỗi', err.message || 'Không thể lưu nhóm quyền');
    }
  };

  const handleDelete = async (role: any) => {
    const ok = await confirm('Xóa nhóm quyền', `Bạn có chắc chắn xóa nhóm quyền "${role.name}"?`, { type: 'danger' });
    if (!ok) return;
    try {
      await api.deleteRole(role.id);
      toast.success('Thành công', 'Đã xóa nhóm quyền');
      loadRoles();
    } catch (err: any) {
      toast.error('Lỗi', err.message || 'Không thể xóa nhóm quyền');
    }
  };

  const getRolePermDisplay = (role: any) => {
    try {
      const perms = Array.isArray(role.permissions)
        ? role.permissions
        : typeof role.permissions === 'string'
        ? JSON.parse(role.permissions)
        : [];
      if (perms.includes('ALL') || perms.includes('*')) {
        return { label: `Toàn quyền (${ALL_PERMISSION_CODES.length}/${ALL_PERMISSION_CODES.length})`, isAll: true };
      }
      return { label: `${perms.length} / ${ALL_PERMISSION_CODES.length} quyền`, isAll: false };
    } catch (e) {}
    return { label: `0 / ${ALL_PERMISSION_CODES.length} quyền`, isAll: false };
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={18} color="var(--primary)" />
            Danh mục Nhóm quyền & Vai trò (Roles)
          </h3>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
            Tự định nghĩa các nhóm quyền và ma trận phân quyền chi tiết cho tất cả các phân hệ.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={14} /> Thêm Nhóm quyền mới
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
              <th style={{ textAlign: 'center' }}>Số quyền được cấp</th>
              <th style={{ textAlign: 'center' }}>Số lượng User</th>
              <th style={{ textAlign: 'center', width: '120px' }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {roles.map(r => {
              const permInfo = getRolePermDisplay(r);
              return (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.name}</td>
                  <td>{r.description || '---'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`badge badge-${permInfo.isAll ? 'success' : 'info'}`} style={{ fontSize: '11px', fontWeight: 600 }}>
                      {permInfo.label}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 600 }}>{r._count?.users || 0}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEdit(r)} title="Chỉnh sửa vai trò">
                      <Edit2 size={13}/>
                    </button>
                    <button className="btn btn-secondary btn-sm" style={{ color: 'var(--danger)', marginLeft: 8 }} onClick={() => handleDelete(r)} title="Xóa vai trò">
                      <Trash2 size={13}/>
                    </button>
                  </td>
                </tr>
              );
            })}
            {roles.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  Chưa có nhóm quyền nào được tạo
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {/* Modal Add / Edit Role */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editRole ? `Sửa Nhóm Quyền: ${editRole.name}` : 'Thêm Nhóm Quyền Mới'}
        maxWidth="1080px"
      >
        <form onSubmit={handleSubmit}>
          {/* Role Info Form */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '4px' }}>
                Tên nhóm quyền *
              </label>
              <input 
                className="form-input" 
                required 
                placeholder="VD: Kỹ sư Quản lý Tiện ích" 
                value={form.name} 
                onChange={e => setForm({...form, name: e.target.value})} 
              />
            </div>
            <div>
              <label className="form-label" style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '4px' }}>
                Mô tả vai trò
              </label>
              <input 
                className="form-input" 
                placeholder="VD: Xem và quản lý các thiết bị, sự cố và tiện ích" 
                value={form.description} 
                onChange={e => setForm({...form, description: e.target.value})} 
              />
            </div>
          </div>

          {/* Master-Detail Permissions Customizer */}
          <div style={{ 
            border: '1px solid var(--border-color)', 
            borderRadius: '8px', 
            overflow: 'hidden', 
            display: 'flex', 
            height: '520px', 
            backgroundColor: 'var(--surface)' 
          }}>
            {/* LEFT SIDEBAR: Phân hệ chức năng */}
            <div style={{ 
              width: '270px', 
              flexShrink: 0, 
              borderRight: '1px solid var(--border-color)', 
              backgroundColor: 'var(--bg-subtle, #f8fafc)',
              display: 'flex', 
              flexDirection: 'column' 
            }}>
              {/* Sidebar Search & Batch Action */}
              <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ position: 'relative', marginBottom: '8px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Tìm kiếm quyền..."
                    value={permSearch}
                    onChange={e => setPermSearch(e.target.value)}
                    style={{ paddingLeft: '28px', height: '32px', fontSize: '12px' }}
                  />
                  <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  <span>Tổng chọn: <strong style={{ color: 'var(--primary)' }}>{form.permissions.length}</strong>/{ALL_PERMISSION_CODES.length}</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button 
                      type="button" 
                      onClick={handleSelectAll} 
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0, fontSize: '11px', fontWeight: 600 }}
                    >
                      Chọn hết
                    </button>
                    <span>•</span>
                    <button 
                      type="button" 
                      onClick={handleDeselectAll} 
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0, fontSize: '11px', fontWeight: 600 }}
                    >
                      Bỏ chọn hết
                    </button>
                  </div>
                </div>
              </div>

              {/* Modules List */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', padding: '6px 8px 4px 8px', letterSpacing: '0.5px' }}>
                  Danh sách Phân hệ
                </div>

                {/* Option: Tất cả phân hệ */}
                <div
                  onClick={() => setSelectedModuleId('all')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    marginBottom: '4px',
                    backgroundColor: selectedModuleId === 'all' ? 'var(--primary, #2563eb)' : 'transparent',
                    color: selectedModuleId === 'all' ? '#ffffff' : 'var(--text-primary)',
                    fontWeight: selectedModuleId === 'all' ? 700 : 500,
                    fontSize: '12.5px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Layers size={15} />
                    <span>Tất cả phân hệ</span>
                  </div>
                  <span style={{ 
                    fontSize: '10.5px',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    backgroundColor: selectedModuleId === 'all' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                    color: selectedModuleId === 'all' ? '#ffffff' : 'var(--text-secondary)',
                    fontWeight: 600
                  }}>
                    {form.permissions.length}/{ALL_PERMISSION_CODES.length}
                  </span>
                </div>

                <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '4px 0 6px 0' }} />

                {filteredRegistry.map(m => {
                  const Icon = MODULE_ICONS[m.id] || Shield;
                  const isSelected = selectedModuleId === m.id;
                  const moduleCodes = m.permissions.map(p => p.code);
                  const selectedCount = moduleCodes.filter(c => form.permissions.includes(c)).length;
                  const isAll = selectedCount === moduleCodes.length && moduleCodes.length > 0;

                  return (
                    <div
                      key={m.id}
                      onClick={() => setSelectedModuleId(m.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        marginBottom: '3px',
                        backgroundColor: isSelected ? 'var(--primary, #2563eb)' : 'transparent',
                        color: isSelected ? '#ffffff' : 'var(--text-primary)',
                        fontWeight: isSelected ? 700 : 500,
                        fontSize: '12.5px',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.04)');
                      }}
                      onMouseLeave={e => {
                        if (!isSelected) (e.currentTarget.style.backgroundColor = 'transparent');
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
                        <Icon size={15} style={{ flexShrink: 0 }} />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {m.name}
                        </span>
                      </div>
                      <span style={{ 
                        fontSize: '10.5px',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        flexShrink: 0,
                        backgroundColor: isSelected 
                          ? 'rgba(255,255,255,0.25)' 
                          : isAll 
                            ? '#dcfce7' 
                            : selectedCount > 0 
                              ? '#dbeafe' 
                              : '#f1f5f9',
                        color: isSelected 
                          ? '#ffffff' 
                          : isAll 
                            ? '#15803d' 
                            : selectedCount > 0 
                              ? '#1d4ed8' 
                              : '#64748b',
                        fontWeight: 600
                      }}>
                        {selectedCount}/{m.permissions.length}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RIGHT DETAIL PANE: Chi tiết từng quyền */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#ffffff' }}>
              {selectedModuleId === 'all' ? (
                // View all modules
                <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
                  <div style={{ marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid var(--border-color)' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Tất cả các quyền trong hệ thống ({ALL_PERMISSION_CODES.length} quyền)
                    </h4>
                    <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Bấm tích chọn riêng từng quyền bên dưới hoặc bấm vào từng phân hệ ở cột bên trái để chọn nhanh.
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {filteredRegistry.map(m => {
                      const Icon = MODULE_ICONS[m.id] || Shield;
                      const moduleCodes = m.permissions.map(p => p.code);
                      const selectedInModule = moduleCodes.filter(c => form.permissions.includes(c));
                      const allSelected = selectedInModule.length === moduleCodes.length && moduleCodes.length > 0;

                      return (
                        <div key={m.id} style={{ border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            padding: '8px 12px', 
                            backgroundColor: 'var(--bg-subtle, #f8fafc)',
                            borderBottom: '1px solid var(--border-color)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Icon size={16} color="var(--primary)" />
                              <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{m.name}</strong>
                              <span className="badge" style={{ fontSize: '10.5px' }}>
                                {selectedInModule.length}/{m.permissions.length} đã chọn
                              </span>
                            </div>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => toggleModulePermissions(moduleCodes)}
                              style={{ fontSize: '11px', padding: '3px 8px' }}
                            >
                              {allSelected ? 'Bỏ chọn phân hệ' : 'Chọn hết'}
                            </button>
                          </div>

                          <div style={{ 
                            padding: '10px 12px', 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                            gap: '8px',
                            backgroundColor: '#ffffff'
                          }}>
                            {m.permissions.map(p => {
                              const checked = form.permissions.includes(p.code);
                              return (
                                <label
                                  key={p.code}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '8px',
                                    padding: '8px 10px',
                                    borderRadius: '6px',
                                    border: `1px solid ${checked ? 'var(--primary, #2563eb)' : 'var(--border-color, #e2e8f0)'}`,
                                    backgroundColor: checked ? 'rgba(37, 99, 235, 0.05)' : '#ffffff',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => togglePermission(p.code)}
                                    style={{ width: 16, height: 16, marginTop: '2px', cursor: 'pointer', flexShrink: 0 }}
                                  />
                                  <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                      {p.name}
                                    </div>
                                    <div style={{ fontSize: '10.5px', fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: '1px' }}>
                                      {p.code}
                                    </div>
                                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.3 }}>
                                      {p.description}
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                // View selected single module
                (() => {
                  const currentModule = PERMISSIONS_REGISTRY.find(m => m.id === selectedModuleId);
                  if (!currentModule) {
                    return (
                      <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Vui lòng chọn một phân hệ từ danh sách bên trái
                      </div>
                    );
                  }

                  const Icon = MODULE_ICONS[currentModule.id] || Shield;
                  const moduleCodes = currentModule.permissions.map(p => p.code);
                  const selectedCount = moduleCodes.filter(c => form.permissions.includes(c)).length;
                  const isAllSelected = selectedCount === moduleCodes.length && moduleCodes.length > 0;

                  const filteredPerms = permSearch.trim() 
                    ? currentModule.permissions.filter(p => 
                        p.name.toLowerCase().includes(permSearch.toLowerCase()) ||
                        p.code.toLowerCase().includes(permSearch.toLowerCase()) ||
                        p.description.toLowerCase().includes(permSearch.toLowerCase())
                      )
                    : currentModule.permissions;

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      {/* Active Module Header */}
                      <div style={{ 
                        padding: '12px 16px', 
                        borderBottom: '1px solid var(--border-color)', 
                        backgroundColor: 'var(--bg-subtle, #f8fafc)',
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center' 
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ 
                            width: 34, 
                            height: 34, 
                            borderRadius: '8px', 
                            backgroundColor: '#dbeafe', 
                            color: 'var(--primary)', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center' 
                          }}>
                            <Icon size={18} />
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {currentModule.name}
                              </h4>
                              <span 
                                className="badge" 
                                style={{ 
                                  fontSize: '11px', 
                                  backgroundColor: selectedCount > 0 ? '#dbeafe' : '#f1f5f9',
                                  color: selectedCount > 0 ? '#1d4ed8' : '#64748b',
                                  fontWeight: 600
                                }}
                              >
                                Đã chọn: {selectedCount}/{currentModule.permissions.length} quyền
                              </span>
                            </div>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              Tích chọn từng quyền cụ thể bên dưới để cấu hình riêng lẻ cho vai trò này.
                            </div>
                          </div>
                        </div>

                        {/* Module Batch Toggle Button */}
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => toggleModulePermissions(moduleCodes)}
                          style={{ fontSize: '12px', padding: '5px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          {isAllSelected ? <CheckSquare size={14} color="var(--primary)" /> : <Square size={14} />}
                          {isAllSelected ? 'Bỏ chọn phân hệ này' : 'Chọn hết phân hệ này'}
                        </button>
                      </div>

                      {/* Permissions List Grid */}
                      <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', 
                          gap: '10px' 
                        }}>
                          {filteredPerms.map(p => {
                            const checked = form.permissions.includes(p.code);
                            return (
                              <label
                                key={p.code}
                                style={{
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: '10px',
                                  padding: '10px 12px',
                                  borderRadius: '8px',
                                  border: `1.5px solid ${checked ? 'var(--primary, #2563eb)' : 'var(--border-color, #e2e8f0)'}`,
                                  backgroundColor: checked ? 'rgba(37, 99, 235, 0.05)' : '#ffffff',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                  boxShadow: checked ? '0 1px 3px rgba(37,99,235,0.1)' : 'none'
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => togglePermission(p.code)}
                                  style={{ width: 17, height: 17, marginTop: '2px', cursor: 'pointer', flexShrink: 0 }}
                                />
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                      {p.name}
                                    </span>
                                    {checked && (
                                      <span style={{ 
                                        fontSize: '10px', 
                                        fontWeight: 700, 
                                        color: '#1d4ed8', 
                                        backgroundColor: '#dbeafe', 
                                        padding: '1px 5px', 
                                        borderRadius: '4px' 
                                      }}>
                                        Đã cấp
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '10.5px', fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    {p.code}
                                  </div>
                                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '3px', lineHeight: 1.35 }}>
                                    {p.description}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>

                        {filteredPerms.length === 0 && (
                          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                            Không tìm thấy quyền nào khớp với "{permSearch}" trong phân hệ này
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          </div>

          <div className="modal-footer" style={{ marginTop: '16px', padding: 0, display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              Lưu nhóm quyền
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
