import React from 'react';
import { Search, Bell, Sun, Moon, Menu } from 'lucide-react';

interface NavbarProps {
  theme: string;
  setTheme: (theme: string) => void;
  toggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ theme, setTheme, toggleSidebar }) => {
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
          <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', letterSpacing: '0.5px' }}>CMMS BẢO TRÌ</span>
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

        {/* Bell */}
        <button
          className="btn btn-secondary btn-sm"
          style={{ position: 'relative', padding: '6px 10px', borderRadius: '50%', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title="Thông báo"
        >
          <Bell size={16} color="var(--text-secondary)" />
          <span style={{
            position: 'absolute', top: '-2px', right: '-2px',
            backgroundColor: 'var(--danger)', color: '#fff',
            fontSize: '9px', fontWeight: 700, borderRadius: '50%',
            width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1
          }}>3</span>
        </button>

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.1 }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Lê Hoàng Cương</span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>NV Kỹ Thuật</span>
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
            LC
          </div>
        </div>
      </div>
    </header>
  );
};
