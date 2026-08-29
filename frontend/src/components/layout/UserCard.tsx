import React, { useState, useRef, useEffect } from 'react';
import { Settings, User, LayoutGrid, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function UserCard({ user }: { user: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  };

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name?: string) => {
    if (!name) return 'CN';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const hrmRootUrl = import.meta.env.VITE_HRM_ROOT_URL || 'https://hrmserver.dkpharma.io.vn';

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Dropdown Trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          padding: '4px 6px',
          borderRadius: '8px',
          transition: 'background-color 0.15s ease',
          backgroundColor: isOpen ? 'var(--bg-hover, #f1f5f9)' : 'transparent',
          userSelect: 'none',
        }}
        onMouseEnter={(e) => {
          if (!isOpen) e.currentTarget.style.backgroundColor = 'var(--bg-hover, #f1f5f9)';
        }}
        onMouseLeave={(e) => {
          if (!isOpen) e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'right', lineHeight: 1.25 }}>
          <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-primary, #0f172a)' }}>
            {user?.name || 'Đang tải...'}
          </span>
          <span style={{ fontSize: '11.5px', color: 'var(--text-secondary, #64748b)' }}>
            {user?.position ? `${user.position} ` : ''}{user?.department || (user?.role === 'ADMIN' ? 'Quản trị viên' : user?.role === 'MANAGER' ? 'Quản lý' : user?.role === 'TECHNICIAN' ? 'Kỹ thuật viên' : '')}
          </span>
        </div>

        {/* Avatar */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            overflow: 'hidden',
            flexShrink: 0,
            backgroundColor: '#b91c1c',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '13px',
            border: '2px solid var(--border-color, #e2e8f0)',
          }}
        >
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user?.name || 'Avatar'}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => {
                // If avatar image fails, fallback to initials
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <span>{getInitials(user?.name)}</span>
          )}
        </div>
      </div>

      {/* Dropdown Menu Content */}
      {isOpen && (
        <div
          className="card"
          style={{
            position: 'absolute',
            right: 0,
            top: '46px',
            minWidth: '200px',
            zIndex: 1000,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
            padding: '6px 0',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-secondary, #ffffff)',
          }}
        >
          {/* Cài đặt */}
          <div
            onClick={() => {
              setIsOpen(false);
              navigate('/settings');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '9px 16px',
              fontSize: '13px',
              color: 'var(--text-primary, #0f172a)',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover, #f1f5f9)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <Settings size={16} color="var(--text-secondary, #64748b)" />
            <span>Cài đặt</span>
          </div>

          {/* Hồ sơ cá nhân */}
          <div
            onClick={() => {
              setIsOpen(false);
              navigate('/about');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '9px 16px',
              fontSize: '13px',
              color: 'var(--text-primary, #0f172a)',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover, #f1f5f9)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <User size={16} color="var(--text-secondary, #64748b)" />
            <span>Hồ sơ cá nhân</span>
          </div>

          {/* Tất cả ứng dụng */}
          <div
            onClick={() => {
              setIsOpen(false);
              window.open(hrmRootUrl, '_blank');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '9px 16px',
              fontSize: '13px',
              color: 'var(--text-primary, #0f172a)',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover, #f1f5f9)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <LayoutGrid size={16} color="var(--text-secondary, #64748b)" />
            <span>Tất cả ứng dụng</span>
          </div>

          <div
            style={{
              height: '1px',
              backgroundColor: 'var(--border-color, #e2e8f0)',
              margin: '4px 0',
            }}
          />

          {/* Đăng xuất */}
          <div
            onClick={async () => {
              setIsOpen(false);
              handleLogout();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '9px 16px',
              fontSize: '13px',
              color: 'var(--danger, #dc2626)',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover, #f1f5f9)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <LogOut size={16} color="var(--danger, #dc2626)" />
            <span>Đăng xuất</span>
          </div>
        </div>
      )}
    </div>
  );
}

export { UserCard };
