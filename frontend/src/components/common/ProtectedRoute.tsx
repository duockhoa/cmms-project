import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';

interface ProtectedRouteProps {
  permission: string;
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ permission, children }) => {
  const { can, loading } = usePermissions();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
          gap: '12px',
          color: 'var(--text-secondary, #64748b)',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            border: '3px solid #e2e8f0',
            borderTopColor: 'var(--accent-blue, #2563eb)',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }}
        />
        <span style={{ fontSize: '13px', fontWeight: 500 }}>Đang kiểm tra quyền truy cập...</span>
      </div>
    );
  }

  const hasAccess = can(permission);

  if (!hasAccess) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '65vh',
          textAlign: 'center',
          padding: '24px',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--danger, #ef4444)',
            marginBottom: '16px',
          }}
        >
          <ShieldAlert size={36} />
        </div>

        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
          Không có quyền truy cập
        </h2>

        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '460px', marginBottom: '8px', lineHeight: 1.5 }}>
          Tài khoản của bạn chưa được phân quyền xem màn hình này.
        </p>

        <div
          style={{
            fontSize: '12px',
            fontFamily: 'monospace',
            backgroundColor: 'var(--bg-secondary, #f1f5f9)',
            color: 'var(--text-muted, #64748b)',
            padding: '4px 10px',
            borderRadius: '6px',
            marginBottom: '20px',
            border: '1px solid var(--border-color, #e2e8f0)',
          }}
        >
          Mã quyền yêu cầu: <strong>{permission}</strong>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate(-1)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={15} /> Quay lại
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Home size={15} /> Về trang chính
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

/**
 * Điều hướng thông minh cho trang chủ (/):
 * - Nếu có quyền 'dashboard:view': Render Dashboard
 * - Nếu không có quyền: Tự động điều hướng đến View đầu tiên mà user được phép xem
 */
export const SmartHomeRoute: React.FC<{ dashboardComponent: React.ReactNode }> = ({ dashboardComponent }) => {
  const { can, loading } = usePermissions();

  if (loading) {
    return null;
  }

  if (can('dashboard:view')) {
    return <>{dashboardComponent}</>;
  }

  // Danh sách các view dự phòng theo thứ tự ưu tiên
  const fallbackViews = [
    { perm: 'requests:view', path: '/requests' },
    { perm: 'operation_logs:view', path: '/operation-logs' },
    { perm: 'work_orders:view', path: '/work-orders' },
    { perm: 'equipment:view', path: '/equipment' },
    { perm: 'utilities:view', path: '/utilities' },
    { perm: 'checklists:view', path: '/checklists' },
    { perm: 'inventory:view', path: '/spare-parts' },
    { perm: 'schedules:view', path: '/maintenance' },
    { perm: 'reports:view', path: '/reports' },
    { perm: 'feedbacks:view', path: '/feedbacks' },
    { perm: 'settings:view', path: '/settings' },
  ];

  const firstAccessible = fallbackViews.find((v) => can(v.perm));
  if (firstAccessible) {
    return <Navigate to={firstAccessible.path} replace />;
  }

  return <Navigate to="/about" replace />;
};
