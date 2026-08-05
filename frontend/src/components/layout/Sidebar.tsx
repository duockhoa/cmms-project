import React from 'react';
import {
  LayoutDashboard,
  Cpu,
  Wrench,
  CheckSquare,
  Package,
  BarChart3,
  Users,
  Calendar,
  UserCheck,
  Settings,
  ShieldCheck,
  Info,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  collapsed: boolean;
  onCloseSidebar?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, collapsed, onCloseSidebar }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'equipment', label: 'Thiết bị', icon: Cpu },
    { id: 'work-orders', label: 'Yêu cầu sửa chữa', icon: Wrench },
    { id: 'checklists', label: 'Checklist bảo trì', icon: CheckSquare },
    { id: 'spare-parts', label: 'Kho phụ tùng', icon: Package },
    { id: 'reports', label: 'Báo cáo & Phân tích', icon: BarChart3 },
    { id: 'users', label: 'Người dùng CMMS', icon: Users },
    { id: 'maintenance', label: 'Lịch bảo trì', icon: Calendar },
    { id: 'technicians', label: 'Kỹ thuật viên', icon: UserCheck },
    { id: 'settings', label: 'Cài đặt hệ thống', icon: Settings },
    { id: 'about', label: 'Giới thiệu', icon: Info },
  ];

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`} style={{ top: '60px' }}>
      {/* Menu Navigation */}
      <nav style={{ padding: '12px 8px', flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (window.innerWidth <= 768) {
                  onCloseSidebar?.();
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: isActive ? 'var(--bg-hover)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.1s ease',
              }}
            >
              <Icon size={16} color={isActive ? 'var(--text-primary)' : 'var(--text-muted)'} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border-color)', fontSize: '12px', color: 'var(--text-muted)' }}>
        CMMS v1.0
      </div>
    </aside>
  );
};
