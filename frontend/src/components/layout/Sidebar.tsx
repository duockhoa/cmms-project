import React from 'react';
import { NavLink } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';
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
  Info,
  AlertCircle,
  ClipboardList,
  MessageSquarePlus,
  Zap,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onCloseSidebar?: () => void;
}

interface MenuItemConfig {
  id: string;
  label: string;
  icon: any;
  permission?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onCloseSidebar }) => {
  const { can } = usePermissions();

  const allMenuItems: MenuItemConfig[] = [
    { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard, permission: 'dashboard:view' },
    { id: 'equipment', label: 'Thiết bị', icon: Cpu, permission: 'equipment:view' },
    { id: 'requests', label: 'Báo cáo sự cố', icon: AlertCircle, permission: 'requests:view' },
    { id: 'operation-logs', label: 'Sổ vận hành', icon: ClipboardList, permission: 'operation_logs:view' },
    { id: 'utilities', label: 'Điện, Nước & Tiện ích', icon: Zap, permission: 'utilities:view' },
    { id: 'work-orders', label: 'Phiếu sửa chữa', icon: Wrench, permission: 'work_orders:view' },
    { id: 'checklists', label: 'Checklist bảo trì', icon: CheckSquare, permission: 'checklists:view' },
    { id: 'spare-parts', label: 'Kho phụ tùng', icon: Package, permission: 'inventory:view' },
    { id: 'reports', label: 'Báo cáo & Phân tích', icon: BarChart3, permission: 'reports:view' },
    { id: 'maintenance', label: 'Lịch bảo trì', icon: Calendar, permission: 'schedules:view' },
    { id: 'feedbacks', label: 'Góp ý & Báo lỗi', icon: MessageSquarePlus, permission: 'feedbacks:view' },
    { id: 'settings', label: 'Cài đặt hệ thống', icon: Settings, permission: 'settings:view' },
    { id: 'about', label: 'Giới thiệu', icon: Info },
  ];

  const visibleMenuItems = allMenuItems.filter((item) => {
    if (!item.permission) return true;
    return can(item.permission);
  });

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`} style={{ top: '60px' }}>
      {/* Menu Navigation */}
      <nav style={{ padding: '12px 8px', flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
        {visibleMenuItems.map((item) => {
          const Icon = item.icon;
          const targetPath = item.id === 'dashboard' ? '/' : `/${item.id}`;
          return (
            <NavLink
              key={item.id}
              to={targetPath}
              onClick={() => {
                if (window.innerWidth <= 768) {
                  onCloseSidebar?.();
                }
              }}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 12px',
                borderRadius: 'var(--radius-sm)',
                textDecoration: 'none',
                backgroundColor: isActive ? 'var(--bg-hover)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.1s ease',
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} color={isActive ? 'var(--text-primary)' : 'var(--text-muted)'} />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border-color)', fontSize: '12px', color: 'var(--text-muted)' }}>
        DK.QLTB v1.0
      </div>
    </aside>
  );
};
