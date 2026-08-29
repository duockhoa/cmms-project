import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { api } from '../../services/api';
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
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onCloseSidebar?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onCloseSidebar }) => {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    api.getMe()
      .then((res: any) => {
        const u = res?.user || res;
        if (u) {
          const role = u.role?.toUpperCase();
          if (role === 'ADMIN' || role === 'SUPER_ADMIN' || res?.permissions?.includes('ALL')) {
            setIsAdmin(true);
          }
        }
      })
      .catch(() => null);
  }, []);

  const allMenuItems = [
    { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'equipment', label: 'Thiết bị', icon: Cpu },
    { id: 'requests', label: 'Báo cáo sự cố', icon: AlertCircle },
    { id: 'operation-logs', label: 'Sổ vận hành', icon: ClipboardList },
    { id: 'work-orders', label: 'Phiếu bảo trì (WO)', icon: Wrench },
    { id: 'checklists', label: 'Checklist bảo trì', icon: CheckSquare },
    { id: 'spare-parts', label: 'Kho phụ tùng', icon: Package },
    { id: 'reports', label: 'Báo cáo & Phân tích', icon: BarChart3 },
    { id: 'maintenance', label: 'Lịch bảo trì', icon: Calendar },
    { id: 'feedbacks', label: 'Góp ý & Báo lỗi', icon: MessageSquarePlus },
    ...(isAdmin ? [{ id: 'settings', label: 'Cài đặt hệ thống', icon: Settings }] : []),
    { id: 'about', label: 'Giới thiệu', icon: Info },
  ];

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`} style={{ top: '60px' }}>
      {/* Menu Navigation */}
      <nav style={{ padding: '12px 8px', flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
        {allMenuItems.map((item) => {
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
