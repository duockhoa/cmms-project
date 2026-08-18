import React, { useState, useEffect } from 'react';
import { api, fetchWithAuth } from '../services/api';
import { useToast, useConfirmDialog } from '../components/common/Toast';
import { Modal } from '../components/common/Modal';
import { 
  Settings, Layers, MapPin, HardDrive, Cpu, 
  Plus, Search, Edit2, Trash2, Save, RefreshCw, AlertTriangle
} from 'lucide-react';

import { Shield, Users } from 'lucide-react';
import { RolesSettingsTab } from '../components/settings/RolesSettingsTab';
import { UsersSettingsTab } from '../components/settings/UsersSettingsTab';

const API_BASE = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

type SettingsTab = 'categories' | 'locations' | 'production-lines' | 'system-settings' | 'standard-parameters' | 'roles' | 'users';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('categories');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data States
  const [categories, setCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [productionLines, setProductionLines] = useState<any[]>([]);
  const [systemSettings, setSystemSettings] = useState<any[]>([]);
  const [standardParameters, setStandardParameters] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Modal States
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  
  // Form State for Categories/Locations/ProductionLines
  const [itemForm, setItemForm] = useState({
    code: '',
    name: '',
    description: '',
    responsibleTechId: '',
  });

  // Form State for System Settings (Key-Value)
  const [systemForm, setSystemForm] = useState<Record<string, string>>({});

  // Form State for Standard Parameters
  const [paramForm, setParamForm] = useState({
    name: '',
    unit: '',
    minSpec: '',
    maxSpec: '',
    description: '',
    isActive: true,
  });

  // Form State for Roles
  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
  });

  const toast = useToast();
  const { confirm } = useConfirmDialog();

  // Load data based on active tab
  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'categories') {
        const res = await fetchWithAuth(`${API_BASE}/api/v1/equipment-categories`);
        if (!res.ok) throw new Error('Không thể tải danh sách loại thiết bị');
        const data = await res.json();
        setCategories(data);
      } else if (activeTab === 'locations') {
        const res = await fetchWithAuth(`${API_BASE}/api/v1/locations`);
        if (!res.ok) throw new Error('Không thể tải danh sách vị trí');
        const data = await res.json();
        setLocations(data);
        const techs = await api.getUsers({ role: 'TECHNICIAN' }).catch(() => []);
        setTechnicians(techs);
      } else if (activeTab === 'production-lines') {
        const res = await fetchWithAuth(`${API_BASE}/api/v1/production-lines`);
        if (!res.ok) throw new Error('Không thể tải danh sách dây chuyền');
        const data = await res.json();
        setProductionLines(data);
      } else if (activeTab === 'system-settings') {
        const res = await fetchWithAuth(`${API_BASE}/api/v1/system-settings`);
        if (!res.ok) throw new Error('Không thể tải cấu hình hệ thống');
        const data = await res.json();
        setSystemSettings(data);
        const form: Record<string, string> = {};
        data.forEach((s: any) => {
          form[s.key] = s.value;
        });
        setSystemForm(form);
      } else if (activeTab === 'standard-parameters') {
        const res = await fetchWithAuth(`${API_BASE}/api/v1/standard-parameters`);
        if (!res.ok) throw new Error('Không thể tải danh sách thông số chuẩn');
        const data = await res.json();
        setStandardParameters(data);
      } else if (activeTab === 'roles') {
        const res = await api.getRoles();
        setRoles(res);
      } else if (activeTab === 'users') {
        const [usersRes, rolesRes] = await Promise.all([
          api.getUsers({}),
          api.getRoles()
        ]);
        setUsers(usersRes);
        setRoles(rolesRes);
      }
    } catch (err: any) {
      toast.error('Lỗi tải dữ liệu', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setSearchQuery('');
  }, [activeTab]);

  // Open modal for Create
  const handleOpenAdd = () => {
    setEditItem(null);
    setItemForm({ code: '', name: '', description: '', responsibleTechId: '' });
    setParamForm({ name: '', unit: '', minSpec: '', maxSpec: '', description: '', isActive: true });
    setIsAddEditOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (item: any) => {
    setEditItem(item);
    if (activeTab === 'standard-parameters') {
      setParamForm({
        name: item.name,
        unit: item.unit || '',
        minSpec: item.minSpec !== null ? String(item.minSpec) : '',
        maxSpec: item.maxSpec !== null ? String(item.maxSpec) : '',
        description: item.description || '',
        isActive: item.isActive,
      });
    } else {
      setItemForm({
        code: item.code,
        name: item.name,
        description: item.description || '',
        responsibleTechId: item.responsibleTechId || '',
      });
    }
    setIsAddEditOpen(true);
  };

  // Form Submit for CRUD items
  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpointMap: Partial<Record<SettingsTab, string>> = {
      'categories': 'equipment-categories',
      'locations': 'locations',
      'production-lines': 'production-lines',
      'system-settings': 'system-settings',
      'standard-parameters': 'standard-parameters',
    };
    
    const urlSegment = endpointMap[activeTab];
    if (!urlSegment) return;

    try {
      if (editItem) {
        // Edit mode (PATCH)
        let body: any = {};
        if (activeTab === 'standard-parameters') {
          body = {
            name: paramForm.name.trim(),
            unit: paramForm.unit.trim() || null,
            minSpec: paramForm.minSpec ? Number(paramForm.minSpec) : null,
            maxSpec: paramForm.maxSpec ? Number(paramForm.maxSpec) : null,
            description: paramForm.description.trim() || null,
            isActive: paramForm.isActive,
          };
        } else {
          body = {
            name: itemForm.name.trim(),
            description: itemForm.description.trim(),
          };
          if (activeTab === 'locations') {
            body.responsibleTechId = itemForm.responsibleTechId || null;
          }
        }
        const res = await fetchWithAuth(`${API_BASE}/api/v1/${urlSegment}/${editItem.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Lỗi cập nhật phần tử');
        }
        toast.success('Thành công', 'Đã cập nhật cấu hình thành công.');
      } else {
        // Create mode (POST)
        let body: any = {};
        if (activeTab === 'standard-parameters') {
          body = {
            name: paramForm.name.trim(),
            unit: paramForm.unit.trim() || null,
            minSpec: paramForm.minSpec ? Number(paramForm.minSpec) : null,
            maxSpec: paramForm.maxSpec ? Number(paramForm.maxSpec) : null,
            description: paramForm.description.trim() || null,
            isActive: paramForm.isActive,
          };
        } else {
          body = {
            code: itemForm.code.trim().toUpperCase(),
            name: itemForm.name.trim(),
            description: itemForm.description.trim(),
          };
          if (activeTab === 'locations') {
            body.responsibleTechId = itemForm.responsibleTechId || null;
          }
        }
        const res = await fetchWithAuth(`${API_BASE}/api/v1/${urlSegment}`, {
          method: 'POST',
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Lỗi thêm mới phần tử');
        }
        toast.success('Thành công', 'Đã thêm mới cấu hình thành công.');
      }
      setIsAddEditOpen(false);
      loadData();
    } catch (err: any) {
      toast.error('Lỗi lưu cấu hình', err.message);
    }
  };

  // Delete Action for CRUD items
  const handleDeleteItem = async (item: any) => {
    const endpointMap: Partial<Record<SettingsTab, string>> = {
      'categories': 'equipment-categories',
      'locations': 'locations',
      'production-lines': 'production-lines',
      'system-settings': 'system-settings',
      'standard-parameters': 'standard-parameters',
    };
    const titleMap: Partial<Record<SettingsTab, string>> = {
      'categories': 'loại thiết bị',
      'locations': 'vị trí/nhà xưởng',
      'production-lines': 'khu vực',
      'system-settings': 'cài đặt',
      'standard-parameters': 'thông số chuẩn',
    };
    const urlSegment = endpointMap[activeTab];
    const segmentTitle = titleMap[activeTab];

    const ok = await confirm(
      `Xóa ${segmentTitle}`, 
      `Bạn có chắc chắn muốn xóa ${segmentTitle} [${item.name}]? Hành động này không thể hoàn tác.`, 
      { confirmText: 'Xóa danh mục', type: 'danger' }
    );
    if (!ok) return;

    try {
      const res = await fetchWithAuth(`${API_BASE}/api/v1/${urlSegment}/${item.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Lỗi khi xóa ${segmentTitle}`);
      }
      toast.success('Đã xóa', `Đã gỡ bỏ ${segmentTitle} khỏi hệ thống.`);
      loadData();
    } catch (err: any) {
      toast.error('Xóa thất bại', err.message);
    }
  };

  // Submit System Settings
  const handleSystemSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      for (const [key, value] of Object.entries(systemForm)) {
        const res = await fetchWithAuth(`${API_BASE}/api/v1/system-settings`, {
          method: 'POST',
          body: JSON.stringify({ key, value }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || `Lỗi lưu tham số: ${key}`);
        }
      }
      toast.success('Thành công', 'Đã lưu cấu hình tham số hệ thống.');
      loadData();
    } catch (err: any) {
      toast.error('Lỗi lưu cài đặt', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter list by search query
  const getFilteredItems = () => {
    let items: any[] = [];
    if (activeTab === 'categories') items = categories;
    else if (activeTab === 'locations') items = locations;
    else if (activeTab === 'production-lines') items = productionLines;
    else if (activeTab === 'standard-parameters') items = standardParameters;

    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.code.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query))
    );
  };

  const filteredItems = getFilteredItems();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Cài đặt hệ thống</h1>
          <p className="page-subtitle">Quản lý các cấu hình danh mục và tham số vận hành của hệ thống bảo trì.</p>
        </div>
      </div>

      <div style={{
        display: 'flex',
        gap: '24px',
        alignItems: 'flex-start',
        marginTop: '20px',
      }} className="settings-container">
        
        {/* Left Vertical Sub-sidebar Menu */}
        <div className="card" style={{
          flex: '0 0 280px',
          width: '280px',
          padding: '16px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}>
          <button
            onClick={() => setActiveTab('categories')}
            style={activeTab === 'categories' ? activeMenuStyles : inactiveMenuStyles}
          >
            <Cpu size={16} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: '13.5px' }}>Loại thiết bị</div>
              <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>Quản lý danh mục loại máy móc.</div>
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('locations')}
            style={activeTab === 'locations' ? activeMenuStyles : inactiveMenuStyles}
          >
            <MapPin size={16} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: '13.5px' }}>Nhà xưởng & Vị trí</div>
              <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>Vị trí lắp đặt, phân xưởng.</div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('production-lines')}
            style={activeTab === 'production-lines' ? activeMenuStyles : inactiveMenuStyles}
          >
            <Layers size={16} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: '13.5px' }}>Khu vực</div>
              <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>Quản lý khu vực sản xuất.</div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('system-settings')}
            style={activeTab === 'system-settings' ? activeMenuStyles : inactiveMenuStyles}
          >
            <Settings size={16} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: '13.5px' }}>Tham số vận hành</div>
              <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>Cảnh báo, chu kỳ hệ thống.</div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('standard-parameters')}
            style={activeTab === 'standard-parameters' ? activeMenuStyles : inactiveMenuStyles}
          >
            <HardDrive size={16} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: '13.5px' }}>Thông số chuẩn</div>
              <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>Thư viện thông số máy móc.</div>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            style={activeTab === 'roles' ? activeMenuStyles : inactiveMenuStyles}
          >
            <Shield size={16} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: '13.5px' }}>Quản lý Nhóm quyền</div>
              <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>Tạo và cấp quyền truy cập.</div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            style={activeTab === 'users' ? activeMenuStyles : inactiveMenuStyles}
          >
            <Users size={16} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: '13.5px' }}>Người dùng & Gán quyền</div>
              <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>Danh sách tài khoản hệ thống.</div>
            </div>
          </button>
        </div>

        {/* Right Main Content Panel */}
        <div className="card" style={{ flex: 1, padding: '24px', minHeight: '460px' }}>
          {activeTab === 'roles' ? (
            <RolesSettingsTab />
          ) : activeTab === 'users' ? (
            <UsersSettingsTab />
          ) : activeTab === 'system-settings' ? (
            // System Settings Form
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Cấu hình tham số hệ thống</h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Điều chỉnh các thông số cảnh báo và cấu hình chung cho hệ thống bảo trì.
                </p>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
                  Đang tải cấu hình...
                </div>
              ) : (
                <form onSubmit={handleSystemSettingsSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>Số ngày cảnh báo trước hạn bảo trì định kỳ (Warning Lead Days)</label>
                    <input
                      type="number"
                      className="form-input"
                      style={{ maxWidth: '280px' }}
                      value={systemForm['WARNING_LEAD_DAYS'] || ''}
                      onChange={(e) => setSystemForm({ ...systemForm, 'WARNING_LEAD_DAYS': e.target.value })}
                      required
                    />
                    <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                      Hệ thống sẽ gửi cảnh báo hoặc tạo trước Work Order chuẩn bị bảo trì trước số ngày cấu hình này.
                    </small>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>Tên doanh nghiệp sử dụng</label>
                    <input
                      type="text"
                      className="form-input"
                      value={systemForm['COMPANY_NAME'] || ''}
                      onChange={(e) => setSystemForm({ ...systemForm, 'COMPANY_NAME': e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>Tên viết tắt hệ thống</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ maxWidth: '280px' }}
                      value={systemForm['SYSTEM_ABBREVIATION'] || ''}
                      onChange={(e) => setSystemForm({ ...systemForm, 'SYSTEM_ABBREVIATION': e.target.value })}
                      required
                    />
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <Save size={15} /> Lưu thay đổi
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div>
              {/* Header inside right panel */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, textTransform: 'capitalize' }}>
                    Danh mục {activeTab === 'categories' ? 'Loại thiết bị' : activeTab === 'locations' ? 'Vị trí / Nhà xưởng' : activeTab === 'standard-parameters' ? 'Thông số chuẩn' : 'Khu vực'}
                  </h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Quản lý danh sách chuẩn dùng để phân loại và cấu hình.
                  </p>
                </div>
                
                <button className="btn btn-primary" onClick={handleOpenAdd} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Plus size={14} /> Thêm mới
                </button>
              </div>

              {/* Filter / Search Bar */}
              <div style={{ position: 'relative', marginBottom: '16px' }}>
                <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '34px' }}
                  placeholder="Tìm theo mã, tên danh mục..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Table List */}
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
                  Đang tải dữ liệu...
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th style={{ width: '80px' }}>STT</th>
                        {activeTab === 'standard-parameters' ? (
                          <>
                            <th style={{ width: '160px' }}>Tên thông số</th>
                            <th>Đơn vị</th>
                            <th>Min/Max Spec</th>
                            <th>Trạng thái</th>
                          </>
                        ) : (
                          <>
                            <th style={{ width: '160px' }}>Mã danh mục</th>
                            <th>Tên hiển thị</th>
                            <th>Mô tả ghi chú</th>
                          </>
                        )}
                        <th style={{ width: '140px', textAlign: 'center' }}>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                            Chưa có dữ liệu danh mục nào được khai báo.
                          </td>
                        </tr>
                      ) : (
                        filteredItems.map((item, idx) => (
                          <tr key={item.id}>
                            <td style={{ fontWeight: 600 }}>{idx + 1}</td>
                            {activeTab === 'standard-parameters' ? (
                              <>
                                <td style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>{item.name}</td>
                                <td>{item.unit || '—'}</td>
                                <td>{item.minSpec ?? '—'} / {item.maxSpec ?? '—'}</td>
                                <td>
                                  <span style={{ 
                                    backgroundColor: item.isActive ? '#dcfce7' : '#f3f4f6', 
                                    color: item.isActive ? '#16a34a' : '#6b7280', 
                                    padding: '4px 10px', 
                                    borderRadius: '12px', 
                                    fontSize: '12px',
                                    fontWeight: 600
                                  }}>
                                    {item.isActive ? 'Hoạt động' : 'Tạm dừng'}
                                  </span>
                                </td>
                              </>
                            ) : (
                              <>
                                <td style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>{item.code}</td>
                                <td style={{ fontWeight: 600 }}>
                                  <div>{item.name}</div>
                                  {activeTab === 'locations' && item.responsibleTech && (
                                    <div style={{ fontSize: '11.5px', color: '#10b981', marginTop: '2px', fontWeight: 500 }}>
                                      Phụ trách: {item.responsibleTech.name}
                                    </div>
                                  )}
                                </td>
                                <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{item.description || '—'}</td>
                              </>
                            )}
                            <td>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleOpenEdit(item)}
                                  style={{ padding: '6px' }}
                                  title="Chỉnh sửa"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleDeleteItem(item)}
                                  style={{ padding: '6px', color: 'var(--danger)' }}
                                  title="Xóa"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Add/Edit dialog */}
      <Modal 
        isOpen={isAddEditOpen} 
        onClose={() => setIsAddEditOpen(false)} 
        title={editItem ? `Chỉnh sửa ${activeTab === 'categories' ? 'loại thiết bị' : activeTab === 'locations' ? 'vị trí/nhà xưởng' : activeTab === 'standard-parameters' ? 'thông số chuẩn' : 'khu vực'}` : `Thêm mới ${activeTab === 'categories' ? 'loại thiết bị' : activeTab === 'locations' ? 'vị trí/nhà xưởng' : activeTab === 'standard-parameters' ? 'thông số chuẩn' : 'khu vực'}`}
      >
        <form onSubmit={handleItemSubmit}>
          {activeTab === 'standard-parameters' ? (
            <>
              <div className="form-group">
                <label className="form-label">Tên thông số *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  disabled={!!editItem}
                  placeholder="VD: Nhiệt độ, Áp suất..."
                  value={paramForm.name}
                  onChange={(e) => setParamForm({ ...paramForm, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Đơn vị</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="VD: °C, Bar, RPM..."
                  value={paramForm.unit}
                  onChange={(e) => setParamForm({ ...paramForm, unit: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Min Spec</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    placeholder="Ngưỡng dưới"
                    value={paramForm.minSpec}
                    onChange={(e) => setParamForm({ ...paramForm, minSpec: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Max Spec</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    placeholder="Ngưỡng trên"
                    value={paramForm.maxSpec}
                    onChange={(e) => setParamForm({ ...paramForm, maxSpec: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Mô tả / Ghi chú</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Nhập mô tả..."
                  value={paramForm.description}
                  onChange={(e) => setParamForm({ ...paramForm, description: e.target.value })}
                />
              </div>

              {editItem && (
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                  <input 
                    type="checkbox" 
                    id="isActive"
                    checked={paramForm.isActive}
                    onChange={(e) => setParamForm({ ...paramForm, isActive: e.target.checked })}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <label htmlFor="isActive" style={{ margin: 0, fontWeight: 500 }}>Trạng thái hoạt động</label>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">Mã danh mục *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  disabled={!!editItem}
                  placeholder="Nhập mã viết liền không dấu (Ví dụ: AP_LUC, XUONG_C)"
                  value={itemForm.code}
                  onChange={(e) => setItemForm({ ...itemForm, code: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tên hiển thị *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="Nhập tên hiển thị đầy đủ"
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mô tả ghi chú</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Nhập mô tả tóm tắt..."
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                />
              </div>

              {activeTab === 'locations' && (
                <div className="form-group">
                  <label className="form-label">Kỹ thuật viên phụ trách phân xưởng</label>
                  <select
                    className="form-select"
                    value={itemForm.responsibleTechId}
                    onChange={(e) => setItemForm({ ...itemForm, responsibleTechId: e.target.value })}
                  >
                    <option value="">-- Chưa chỉ định / Trống --</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.specialty || 'Kỹ thuật viên'})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          <div className="modal-footer" style={{ padding: 0, marginTop: '20px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsAddEditOpen(false)}>Hủy</button>
            <button type="submit" className="btn btn-primary">{editItem ? 'Lưu thay đổi' : 'Thêm mới'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

// Styling Object Constants for vertical menu
const activeMenuStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  width: '100%',
  padding: '12px 16px',
  borderRadius: '8px',
  border: 'none',
  background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
  color: '#ffffff',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  boxShadow: '0 4px 12px rgba(15,23,42,0.15)',
};

const inactiveMenuStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  width: '100%',
  padding: '12px 16px',
  borderRadius: '8px',
  border: 'none',
  background: 'transparent',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

export default SettingsPage;
