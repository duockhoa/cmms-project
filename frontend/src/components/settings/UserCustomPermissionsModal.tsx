import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { useToast } from '../common/Toast';
import { Modal } from '../common/Modal';
import { 
  Shield, ShieldCheck, Search, Key, CheckSquare, Square, Info, ChevronRight, Check,
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

interface UserCustomPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onUpdated: () => void;
}

export const UserCustomPermissionsModal: React.FC<UserCustomPermissionsModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdated,
}) => {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [permSearch, setPermSearch] = useState('');
  const [customPerms, setCustomPerms] = useState<string[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string>('utilities');

  // Quyền kế thừa từ Vai trò (CustomRole)
  const rolePermissions: string[] = useMemo(() => {
    if (!user || !user.customRole) return [];
    try {
      const raw = user.customRole.permissions;
      if (Array.isArray(raw)) return raw;
      if (typeof raw === 'string') return JSON.parse(raw);
    } catch (e) {}
    return [];
  }, [user]);

  // Khởi tạo custom permissions của user khi mở modal
  useEffect(() => {
    if (user) {
      try {
        let initialCustom: string[] = [];
        if (Array.isArray(user.customPermissions)) {
          initialCustom = user.customPermissions;
        } else if (typeof user.customPermissions === 'string') {
          initialCustom = JSON.parse(user.customPermissions);
        }
        setCustomPerms(initialCustom);
      } catch (e) {
        setCustomPerms([]);
      }
      setPermSearch('');
      setSelectedModuleId(PERMISSIONS_REGISTRY[0]?.id || 'utilities');
    }
  }, [user]);

  const toggleCustomPermission = (code: string) => {
    // Nếu quyền đã thuộc vai trò thì không cần bật/tắt quyền riêng (đã có sẵn)
    if (rolePermissions.includes(code)) return;

    setCustomPerms(prev => {
      if (prev.includes(code)) {
        return prev.filter(c => c !== code);
      } else {
        return [...prev, code];
      }
    });
  };

  const handleSelectAllModule = (moduleCodes: string[]) => {
    const codesToAdd = moduleCodes.filter(c => !rolePermissions.includes(c));
    setCustomPerms(prev => {
      const allSelected = codesToAdd.every(c => prev.includes(c));
      if (allSelected) {
        return prev.filter(c => !codesToAdd.includes(c));
      } else {
        return Array.from(new Set([...prev, ...codesToAdd]));
      }
    });
  };

  const handleSelectAllAvailable = () => {
    const available = ALL_PERMISSION_CODES.filter(c => !rolePermissions.includes(c));
    setCustomPerms(available);
  };

  const handleClearCustomPerms = () => {
    setCustomPerms([]);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await api.updateUserCustomPermissions(user.id, customPerms);
      toast.success('Thành công', `Đã cập nhật quyền riêng cho [${user.name}]`);
      onUpdated();
      onClose();
    } catch (err: any) {
      toast.error('Lỗi lưu quyền riêng', err?.message || 'Không thể lưu quyền');
    } finally {
      setSaving(false);
    }
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

  const hasFullAccess =
    rolePermissions.includes('ALL') ||
    rolePermissions.includes('*') ||
    customPerms.includes('ALL') ||
    customPerms.includes('*');

  const totalEffectivePerms = hasFullAccess
    ? ALL_PERMISSION_CODES.length
    : Array.from(new Set([...rolePermissions, ...customPerms])).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Cài đặt Quyền riêng: ${user.name}`}
      maxWidth="1080px"
    >
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: 'var(--bg-subtle, #f8fafc)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            marginBottom: '12px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                backgroundColor: 'var(--primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '15px',
                flexShrink: 0,
              }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '14.5px', color: 'var(--text-primary)' }}>
                  {user.name}
                </span>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  (@{user.username})
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  Vai trò chính:
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#2563eb',
                    backgroundColor: '#dbeafe',
                    padding: '1px 7px',
                    borderRadius: '4px',
                  }}
                >
                  {user.customRole?.name || 'Chưa gán vai trò'}
                </span>
                {user.role && (
                  <span className="badge badge-neutral" style={{ fontSize: '10px' }}>
                    {user.role}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Quyền kế thừa từ vai trò</div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#15803d' }}>
                {rolePermissions.includes('ALL') ? 'Toàn quyền (ALL)' : `${rolePermissions.length} quyền`}
              </div>
            </div>
            <div style={{ width: '1px', height: '28px', backgroundColor: 'var(--border-color)' }} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Quyền riêng bổ sung</div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#2563eb' }}>
                +{customPerms.length} quyền riêng
              </div>
            </div>
          </div>
        </div>

        <div style={{ 
          border: '1px solid var(--border-color)', 
          borderRadius: '8px', 
          overflow: 'hidden', 
          display: 'flex', 
          height: '520px', 
          backgroundColor: 'var(--surface)' 
        }}>
          <div style={{ 
            width: '270px', 
            flexShrink: 0, 
            borderRight: '1px solid var(--border-color)', 
            backgroundColor: 'var(--bg-subtle, #f8fafc)',
            display: 'flex', 
            flexDirection: 'column' 
          }}>
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Tìm kiếm quyền cấp..."
                  value={permSearch}
                  onChange={e => setPermSearch(e.target.value)}
                  style={{ paddingLeft: '28px', height: '32px', fontSize: '12px' }}
                />
                <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <span>Đã có: <strong style={{ color: 'var(--primary)' }}>{totalEffectivePerms}</strong>/{ALL_PERMISSION_CODES.length}</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button 
                    type="button" 
                    onClick={handleSelectAllAvailable} 
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0, fontSize: '11px', fontWeight: 600 }}
                    title="Cấp toàn bộ các quyền còn lại cho người dùng"
                  >
                    Cấp hết
                  </button>
                  <span>•</span>
                  <button 
                    type="button" 
                    onClick={handleClearCustomPerms} 
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0, fontSize: '11px', fontWeight: 600 }}
                    title="Xóa toàn bộ các quyền riêng bổ sung"
                  >
                    Xóa riêng
                  </button>
                </div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', padding: '6px 8px 4px 8px', letterSpacing: '0.5px' }}>
                Danh sách Phân hệ
              </div>

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
                  {totalEffectivePerms}/{ALL_PERMISSION_CODES.length}
                </span>
              </div>

              <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '4px 0 6px 0' }} />

              {filteredRegistry.map(m => {
                const Icon = MODULE_ICONS[m.id] || Shield;
                const isSelected = selectedModuleId === m.id;
                const moduleCodes = m.permissions.map(p => p.code);
                const inheritedCount = moduleCodes.filter(c => rolePermissions.includes(c)).length;
                const customCount = moduleCodes.filter(c => customPerms.includes(c)).length;
                const totalInModule = inheritedCount + customCount;
                const isAll = totalInModule === moduleCodes.length && moduleCodes.length > 0;

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
                          : customCount > 0 
                            ? '#dbeafe' 
                            : '#f1f5f9',
                      color: isSelected 
                        ? '#ffffff' 
                        : isAll 
                          ? '#15803d' 
                          : customCount > 0 
                            ? '#1d4ed8' 
                            : '#64748b',
                      fontWeight: 600
                    }}>
                      {totalInModule}/{m.permissions.length}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#ffffff' }}>
            {selectedModuleId === 'all' ? (
              <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
                <div style={{ marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid var(--border-color)' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Tất cả quyền trong hệ thống ({ALL_PERMISSION_CODES.length} quyền)
                  </h4>
                  <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Quyền màu xanh lá đã kế thừa từ vai trò. Quyền màu xanh lam là quyền riêng đã cấp thêm.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {filteredRegistry.map(m => {
                    const Icon = MODULE_ICONS[m.id] || Shield;
                    const moduleCodes = m.permissions.map(p => p.code);
                    const inheritedCount = moduleCodes.filter(c => rolePermissions.includes(c)).length;
                    const customCount = moduleCodes.filter(c => customPerms.includes(c)).length;
                    const availableInModule = moduleCodes.filter(c => !rolePermissions.includes(c));
                    const allAvailableSelected = availableInModule.length > 0 && availableInModule.every(c => customPerms.includes(c));

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
                              {inheritedCount + customCount}/{m.permissions.length} đã có
                            </span>
                            {customCount > 0 && (
                              <span style={{ fontSize: '10.5px', color: '#1d4ed8', backgroundColor: '#dbeafe', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                +{customCount} quyền riêng
                              </span>
                            )}
                          </div>
                          {availableInModule.length > 0 && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleSelectAllModule(moduleCodes)}
                              style={{ fontSize: '11px', padding: '3px 8px' }}
                            >
                              {allAvailableSelected ? 'Bỏ quyền riêng phân hệ' : 'Cấp hết phân hệ'}
                            </button>
                          )}
                        </div>

                        <div style={{ 
                          padding: '10px 12px', 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                          gap: '8px',
                          backgroundColor: '#ffffff'
                        }}>
                          {m.permissions.map(p => {
                            const isInherited = rolePermissions.includes(p.code);
                            const isCustom = customPerms.includes(p.code);
                            const isEffective = isInherited || isCustom;

                            return (
                              <label
                                key={p.code}
                                style={{
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: '8px',
                                  padding: '8px 10px',
                                  borderRadius: '6px',
                                  border: `1px solid ${isCustom ? '#93c5fd' : isInherited ? '#86efac' : 'var(--border-color)'}`,
                                  backgroundColor: isCustom ? '#f0f7ff' : isInherited ? '#f0fdf4' : 'transparent',
                                  cursor: isInherited ? 'default' : 'pointer',
                                  transition: 'all 0.15s ease',
                                  opacity: isInherited ? 0.9 : 1,
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isEffective}
                                  disabled={isInherited}
                                  onChange={() => toggleCustomPermission(p.code)}
                                  style={{ width: 15, height: 15, marginTop: '2px', cursor: isInherited ? 'default' : 'pointer', flexShrink: 0 }}
                                />
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                      {p.name}
                                    </span>
                                    {isInherited && (
                                      <span style={{ fontSize: '9.5px', fontWeight: 700, color: '#15803d', backgroundColor: '#dcfce7', padding: '1px 5px', borderRadius: '4px' }}>
                                        Từ vai trò
                                      </span>
                                    )}
                                    {isCustom && (
                                      <span style={{ fontSize: '9.5px', fontWeight: 700, color: '#1d4ed8', backgroundColor: '#dbeafe', padding: '1px 5px', borderRadius: '4px' }}>
                                        Quyền riêng
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: '1px' }}>
                                    {p.code}
                                  </div>
                                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.3 }}>
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
                const inheritedCount = moduleCodes.filter(c => rolePermissions.includes(c)).length;
                const customCount = moduleCodes.filter(c => customPerms.includes(c)).length;
                const totalInModule = inheritedCount + customCount;
                const availableInModule = moduleCodes.filter(c => !rolePermissions.includes(c));
                const allAvailableSelected = availableInModule.length > 0 && availableInModule.every(c => customPerms.includes(c));

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
                                backgroundColor: totalInModule > 0 ? '#dbeafe' : '#f1f5f9',
                                color: totalInModule > 0 ? '#1d4ed8' : '#64748b',
                                fontWeight: 600
                              }}
                            >
                              Đã có: {totalInModule}/{currentModule.permissions.length} quyền
                            </span>
                            {customCount > 0 && (
                              <span style={{ fontSize: '10.5px', color: '#1d4ed8', backgroundColor: '#dbeafe', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                +{customCount} quyền riêng
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            Bấm tích từng quyền để cấp thêm hoặc gỡ quyền riêng lẻ cho tài khoản này.
                          </div>
                        </div>
                      </div>

                      {availableInModule.length > 0 && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleSelectAllModule(moduleCodes)}
                          style={{ fontSize: '12px', padding: '5px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          {allAvailableSelected ? <CheckSquare size={14} color="var(--primary)" /> : <Square size={14} />}
                          {allAvailableSelected ? 'Bỏ quyền riêng phân hệ này' : 'Cấp hết phân hệ này'}
                        </button>
                      )}
                    </div>

                    {/* Permissions List Grid */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', 
                        gap: '10px' 
                      }}>
                        {filteredPerms.map(p => {
                          const isInherited = rolePermissions.includes(p.code);
                          const isCustom = customPerms.includes(p.code);
                          const isEffective = isInherited || isCustom;

                          return (
                            <label
                              key={p.code}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '10px',
                                padding: '10px 12px',
                                borderRadius: '8px',
                                border: `1.5px solid ${isCustom ? '#3b82f6' : isInherited ? '#86efac' : 'var(--border-color, #e2e8f0)'}`,
                                backgroundColor: isCustom ? '#f0f7ff' : isInherited ? '#f0fdf4' : '#ffffff',
                                cursor: isInherited ? 'default' : 'pointer',
                                transition: 'all 0.15s ease',
                                opacity: isInherited ? 0.9 : 1,
                                boxShadow: isCustom ? '0 1px 3px rgba(37,99,235,0.1)' : 'none'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isEffective}
                                disabled={isInherited}
                                onChange={() => toggleCustomPermission(p.code)}
                                style={{ width: 17, height: 17, marginTop: '2px', cursor: isInherited ? 'default' : 'pointer', flexShrink: 0 }}
                              />
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                    {p.name}
                                  </span>
                                  {isInherited && (
                                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#15803d', backgroundColor: '#dcfce7', padding: '1px 5px', borderRadius: '4px' }}>
                                      Từ vai trò
                                    </span>
                                  )}
                                  {isCustom && (
                                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#1d4ed8', backgroundColor: '#dbeafe', padding: '1px 5px', borderRadius: '4px' }}>
                                      Quyền riêng
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

        {/* Modal Footer */}
        <div
          className="modal-footer"
          style={{
            marginTop: '16px',
            padding: 0,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
          }}
        >
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Đóng
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Key size={14} />
            {saving ? 'Đang lưu...' : 'Lưu quyền riêng'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
