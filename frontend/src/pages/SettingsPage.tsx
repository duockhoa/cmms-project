import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  Settings, Layers, MapPin, Cpu, Shield, Users, 
  ListChecks, UserCheck, Gauge, AlertTriangle, RefreshCw,
  LucideIcon, Sliders, BookOpen, Activity
} from 'lucide-react';

import { CategoriesSettingsTab } from '../components/settings/CategoriesSettingsTab';
import { LocationsSettingsTab } from '../components/settings/LocationsSettingsTab';
import { ProductionLinesSettingsTab } from '../components/settings/ProductionLinesSettingsTab';
import { StandardTechnicalSpecsTab } from '../components/settings/StandardTechnicalSpecsTab';
import { StandardParametersTab } from '../components/settings/StandardParametersTab';
import { ChecklistLibraryTab } from '../components/settings/ChecklistLibraryTab';
import { SystemSettingsTab } from '../components/settings/SystemSettingsTab';
import { RolesSettingsTab } from '../components/settings/RolesSettingsTab';
import { UsersSettingsTab } from '../components/settings/UsersSettingsTab';
import { TechniciansSettingsTab } from '../components/settings/TechniciansSettingsTab';
import { EquipmentParameterAssignTab } from '../components/settings/EquipmentParameterAssignTab';

export type SettingsTabId =
  | 'categories'
  | 'locations'
  | 'production-lines'
  | 'standard-technical-specs'
  | 'standard-parameters'
  | 'equipment-parameters'
  | 'checklist-library'
  | 'system-settings'
  | 'users'
  | 'roles'
  | 'technicians';

interface NavGroup {
  title: string;
  items: {
    id: SettingsTabId;
    label: string;
    description: string;
    icon: LucideIcon;
  }[];
}

const SETTINGS_GROUPS: NavGroup[] = [
  {
    title: 'DANH MỤC CƠ SỞ',
    items: [
      {
        id: 'categories',
        label: 'Phân loại thiết bị',
        description: 'Nhóm thiết bị, phân loại máy móc',
        icon: Cpu,
      },
      {
        id: 'locations',
        label: 'Vị trí & Nhà xưởng',
        description: 'Phân xưởng, phòng sạch & KTV phụ trách',
        icon: MapPin,
      },
      {
        id: 'production-lines',
        label: 'Khu vực / Dây chuyền',
        description: 'Line sản xuất, dây chuyền đóng gói',
        icon: Layers,
      },
      {
        id: 'standard-technical-specs',
        label: 'Thư viện Thông số KT (NSX)',
        description: 'Công suất, Điện áp, Kích thước, Dung tích...',
        icon: BookOpen,
      },
      {
        id: 'standard-parameters',
        label: 'Thư viện Tham số Vận hành',
        description: 'Nhiệt độ, Áp suất, Rung, Dòng điện, pH...',
        icon: Gauge,
      },
      {
        id: 'equipment-parameters',
        label: 'Thiết lập thông số máy',
        description: 'Gán thông số KT & tham số vận hành',
        icon: Sliders,
      },
    ],
  },
  {
    title: 'VẬN HÀNH & CHECKLIST',
    items: [
      {
        id: 'checklist-library',
        label: 'Thư viện Checklist',
        description: 'Hạng mục kiểm tra mẫu định kỳ',
        icon: ListChecks,
      },
      {
        id: 'system-settings',
        label: 'Tham số hệ thống',
        description: 'Cảnh báo trước hạn & định danh',
        icon: Settings,
      },
    ],
  },
  {
    title: 'NGƯỜI DÙNG & PHÂN QUYỀN',
    items: [
      {
        id: 'users',
        label: 'Người dùng & Tài khoản',
        description: 'Đồng bộ HRM & gán nhóm quyền',
        icon: Users,
      },
      {
        id: 'roles',
        label: 'Quản lý Nhóm quyền',
        description: 'Cấu hình phân quyền RBAC',
        icon: Shield,
      },
      {
        id: 'technicians',
        label: 'Kỹ thuật viên',
        description: 'Chuyên môn & trạng thái làm việc',
        icon: UserCheck,
      },
    ],
  },
];

export const SettingsPage: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTabId>('categories');

  useEffect(() => {
    api.getMe()
      .then((res: any) => {
        const u = res?.user || res;
        const role = u?.role?.toUpperCase();
        if (role === 'ADMIN' || role === 'SUPER_ADMIN' || res?.permissions?.includes('ALL')) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      })
      .catch(() => setIsAdmin(false));
  }, []);

  if (isAdmin === null) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
        <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
        <div>Đang kiểm tra quyền truy cập...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: '24px', maxWidth: '800px', margin: '40px auto', textAlign: 'center' }}>
        <div
          className="card"
          style={{
            padding: '48px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            backgroundColor: 'var(--bg-secondary, #ffffff)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(220, 38, 38, 0.1)',
              color: 'var(--danger, #dc2626)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AlertTriangle size={32} />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Từ chối truy cập
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', maxWidth: '440px', margin: 0 }}>
            Bạn không có quyền truy cập vào mục <strong>Cài đặt hệ thống</strong>. Vui lòng liên hệ Quản trị viên (Admin) để được phân quyền.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 0 24px 0' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={22} style={{ color: 'var(--accent-blue, #2563eb)' }} />
            Cài đặt & Cấu hình hệ thống
          </h1>
          <p className="page-subtitle" style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Quản lý danh mục cơ sở, thông số vận hành, thư viện checklist và phân quyền người dùng.
          </p>
        </div>
      </div>

      {/* Main Grid: Left Nav + Right Content */}
      <div
        style={{
          display: 'flex',
          gap: '20px',
          alignItems: 'flex-start',
          flexDirection: 'row',
        }}
      >
        {/* Left Nav Menu Panel */}
        <div
          className="card"
          style={{
            width: '280px',
            flexShrink: 0,
            padding: '12px 8px',
            backgroundColor: 'var(--bg-secondary, #ffffff)',
            borderRadius: '10px',
            border: '1px solid var(--border-color, #e2e8f0)',
          }}
        >
          {SETTINGS_GROUPS.map((group, gIdx) => (
            <div key={group.title} style={{ marginBottom: gIdx < SETTINGS_GROUPS.length - 1 ? '16px' : '0' }}>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--text-muted, #94a3b8)',
                  padding: '6px 12px 4px 12px',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                }}
              >
                {group.title}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        backgroundColor: isActive ? 'var(--bg-hover, #f1f5f9)' : 'transparent',
                        color: isActive ? 'var(--accent-blue, #2563eb)' : 'var(--text-primary, #0f172a)',
                        borderLeft: isActive ? '3px solid var(--accent-blue, #2563eb)' : '3px solid transparent',
                        width: '100%',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-hover, #f8fafc)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <Icon
                        size={17}
                        style={{
                          color: isActive ? 'var(--accent-blue, #2563eb)' : 'var(--text-secondary, #64748b)',
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: isActive ? 700 : 600,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {item.label}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-secondary, #64748b)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            marginTop: '1px',
                          }}
                        >
                          {item.description}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Right Active Content Panel */}
        <div
          className="card"
          style={{
            flex: 1,
            padding: '24px',
            minHeight: '560px',
            backgroundColor: 'var(--bg-secondary, #ffffff)',
            borderRadius: '10px',
            border: '1px solid var(--border-color, #e2e8f0)',
            overflow: 'hidden',
          }}
        >
          {activeTab === 'categories' && <CategoriesSettingsTab />}
          {activeTab === 'locations' && <LocationsSettingsTab />}
          {activeTab === 'production-lines' && <ProductionLinesSettingsTab />}
          {activeTab === 'standard-technical-specs' && <StandardTechnicalSpecsTab />}
          {activeTab === 'standard-parameters' && <StandardParametersTab />}
          {activeTab === 'equipment-parameters' && <EquipmentParameterAssignTab />}
          {activeTab === 'checklist-library' && <ChecklistLibraryTab />}
          {activeTab === 'system-settings' && <SystemSettingsTab />}
          {activeTab === 'users' && <UsersSettingsTab />}
          {activeTab === 'roles' && <RolesSettingsTab />}
          {activeTab === 'technicians' && <TechniciansSettingsTab />}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
