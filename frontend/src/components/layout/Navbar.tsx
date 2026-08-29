import React, { useState, useEffect } from 'react';
import { Search, Bell, Sun, Moon, Menu } from 'lucide-react';
import { api } from '../../services/api';
import { io, Socket } from 'socket.io-client';

interface NavbarProps {
  theme: string;
  setTheme: (theme: string) => void;
  toggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ theme, setTheme, toggleSidebar }) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.getNotifications();
      setNotifications(res);
    } catch (e) {
      console.error(e);
    }
  };

  // 1. Fetch current user and initial notifications list
  useEffect(() => {
    const initData = async () => {
      try {
        const res = await api.getMe();
        setCurrentUser(res?.user || res);
      } catch (e) {
        console.error('Failed to load user profile in Navbar:', e);
      }
      fetchNotifications();
    };
    initData();
  }, []);

  // 2. Establish WebSocket client connection once currentUser is resolved
  useEffect(() => {
    if (!currentUser) return;

    const socketUrl = window.location.protocol === 'https:' 
      ? `https://${window.location.hostname}:3001/notifications`
      : `http://${window.location.hostname}:3001/notifications`;

    const socket: Socket = io(socketUrl, {
      query: {
        userId: currentUser.id,
        role: currentUser.role,
        department: currentUser.department || '',
      },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('[WEBSOCKET] Connected to real-time notification gateway');
    });

    socket.on('notification', (newNotification: any) => {
      console.log('[WEBSOCKET] Received instant notification:', newNotification);
      setNotifications((prev) => [newNotification, ...prev]);
    });

    socket.on('disconnect', () => {
      console.log('[WEBSOCKET] Disconnected from notification gateway');
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUser]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <header className="top-navbar" style={{ padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      {/* Left side: Hamburger, Logo, System Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button 
          onClick={toggleSidebar}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', padding: '4px' }}
        >
          <Menu size={20} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/dkpharmalogo.png" alt="DKPharma" style={{ height: '32px', objectFit: 'contain' }} />
          <div style={{ height: '20px', width: '1px', backgroundColor: 'var(--border-color)', margin: '0 4px' }}></div>
          <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', letterSpacing: '0.5px' }}>DK.QLTB</span>
        </div>
      </div>

      {/* Right side: Search, Theme Toggle, Bell, Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Search */}
        <div style={{ position: 'relative', width: '220px' }}>
          <input
            type="text"
            className="form-input"
            style={{ paddingRight: '34px', paddingLeft: '12px', height: '34px', fontSize: '13px', borderRadius: '20px' }}
            placeholder="Tìm kiếm..."
          />
          <Search size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        </div>

        {/* Bell and Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn btn-secondary btn-sm"
            style={{ position: 'relative', padding: '6px 10px', borderRadius: '50%', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Thông báo"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <Bell size={16} color="var(--text-secondary)" />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: '-2px', right: '-2px',
                backgroundColor: 'var(--danger)', color: '#fff',
                fontSize: '9px', fontWeight: 700, borderRadius: '50%',
                width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1
              }}>{unreadCount}</span>
            )}
          </button>

          {showDropdown && (
            <div className="card" style={{
              position: 'absolute', right: 0, top: '42px', width: '360px',
              maxHeight: '400px', overflowY: 'auto', zIndex: 1000,
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              padding: '12px 0', border: '1px solid var(--border-color)',
              display: 'flex', flexDirection: 'column'
            }}>
              <div style={{ padding: '0 16px 8px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '13.5px' }}>Thông báo gần đây</span>
                {unreadCount > 0 && (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{unreadCount} chưa đọc</span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                    Không có thông báo nào.
                  </div>
                ) : (
                  notifications.slice(0, 8).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleMarkAsRead(n.id)}
                      style={{
                        padding: '10px 16px', borderBottom: '1px solid var(--border-color)',
                        cursor: 'pointer', transition: 'background 0.2s',
                        backgroundColor: n.isRead ? 'transparent' : 'rgba(16, 185, 129, 0.05)',
                        display: 'flex', flexDirection: 'column', gap: '4px'
                      }}
                      className="notification-item"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <span style={{ fontWeight: n.isRead ? 600 : 700, fontSize: '13px', color: 'var(--text-primary)' }}>{n.title}</span>
                        {!n.isRead && (
                          <span style={{ width: '6px', height: '6px', backgroundColor: '#10b981', borderRadius: '50%', flexShrink: 0, marginTop: '5px' }}></span>
                        )}
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.3 }}>{n.message}</span>
                      <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', alignSelf: 'flex-end', marginTop: '2px' }}>
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(n.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="btn btn-secondary btn-sm"
          style={{ width: '34px', height: '34px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
          title="Chuyển chế độ Sáng / Tối"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* User Profile */}
        <div style={{ position: 'relative' }}>
          <div 
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
            onClick={() => setShowUserDropdown(!showUserDropdown)}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.1 }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {currentUser?.name || 'Đang tải...'}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                {currentUser ? (currentUser.role === 'ADMIN' ? 'Quản trị viên' : currentUser.role === 'MANAGER' ? 'Quản lý' : currentUser.role === 'TECHNICIAN' ? 'Kỹ thuật viên' : 'Người dùng') : ''}
              </span>
            </div>
            {/* Circular Red Avatar */}
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              backgroundColor: '#b91c1c', color: '#ffffff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: 700,
              border: '2px solid rgba(255,255,255,0.2)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              {currentUser?.name ? currentUser.name.split(' ').pop()?.substring(0, 2).toUpperCase() : 'U'}
            </div>
          </div>

          {showUserDropdown && (
            <div className="card" style={{
              position: 'absolute', right: 0, top: '46px', width: '200px',
              zIndex: 1000, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
              padding: '8px 0', border: '1px solid var(--border-color)',
              display: 'flex', flexDirection: 'column'
            }}>
              <a 
                href={import.meta.env.VITE_HRM_ROOT_URL || 'https://hrm.example.com'} 
                style={{ padding: '10px 16px', color: 'var(--text-primary)', textDecoration: 'none', fontSize: '13px', cursor: 'pointer' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                Tất cả ứng dụng
              </a>
              <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '4px 0' }}></div>
              <div 
                onClick={handleLogout}
                style={{ padding: '10px 16px', color: 'var(--danger)', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                Đăng xuất
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
