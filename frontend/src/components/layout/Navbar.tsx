import React, { useState, useEffect } from 'react';
import { Menu, Sun, Moon } from 'lucide-react';
import { api } from '../../services/api';
import { HeaderSearch } from './HeaderSearch';
import { NotificationDropdown } from './NotificationDropdown';
import { UserCard } from './UserCard';

interface NavbarProps {
  theme: string;
  setTheme: (theme: string) => void;
  toggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ theme, setTheme, toggleSidebar }) => {
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.getMe();
        setCurrentUser(res?.user || res);
      } catch (e) {
        console.error('Failed to load user profile in Navbar:', e);
      }
    };
    fetchUser();
  }, []);

  return (
    <header
      className="top-navbar"
      style={{
        height: '60px',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--bg-secondary, #ffffff)',
        borderBottom: '1px solid var(--border-color, #e2e8f0)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
      }}
    >
      {/* Left side: Hamburger toggle + Logo + Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={toggleSidebar}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px',
            borderRadius: '6px',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover, #f1f5f9)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          title="Thu gọn / Mở rộng Menu"
        >
          <Menu size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src="/dkpharmalogo.png"
            alt="Logo"
            style={{
              height: '36px',
              width: 'auto',
              objectFit: 'contain',
              display: 'block',
            }}
          />

          <div
            style={{
              height: '22px',
              width: '1px',
              backgroundColor: 'var(--border-color, #e2e8f0)',
            }}
          />

          <h1
            style={{
              fontSize: '16.5px',
              fontWeight: 700,
              color: 'var(--text-primary, #0f172a)',
              letterSpacing: '0.4px',
              margin: 0,
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            QUẢN LÝ THIẾT BỊ
          </h1>
        </div>
      </div>

      {/* Right side: Search, Notification, Theme toggle, UserCard */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <HeaderSearch />

        <NotificationDropdown currentUser={currentUser} />

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="btn btn-secondary btn-sm"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            border: '1px solid var(--border-color, #e2e8f0)',
          }}
          title="Chuyển chế độ Sáng / Tối"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <UserCard user={currentUser} />
      </div>
    </header>
  );
};
