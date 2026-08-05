import React, { useState } from 'react';
import { Settings, Shield, Link2, Bell, Database, Save, Check } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'hrm' | 'notifications' | 'backup'>('hrm');
  const [saved, setSaved] = useState(false);

  const [hrmConfig, setHrmConfig] = useState({
    ssoEnabled: true,
    ssoUrl: 'https://hrm.company.com/oauth2/authorize',
    tokenUrl: 'https://hrm.company.com/oauth2/token',
    clientId: 'cmms-app-prod',
    clientSecret: '••••••••••••••••••••••••',
    syncRoles: true,
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Cài đặt hệ thống</h1>
          <p className="page-subtitle">Cấu hình tham số vận hành, thông báo và Tích hợp Đăng nhập HRM SSO</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave}>
          {saved ? <Check size={16} /> : <Save size={16} />} {saved ? 'Đã lưu cấu hình!' : 'Lưu thay đổi'}
        </button>
      </div>

      {/* Settings Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <button
          className={`btn ${activeTab === 'general' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('general')}
        >
          <Settings size={14} /> Thông tin chung
        </button>
        <button
          className={`btn ${activeTab === 'hrm' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('hrm')}
        >
          <Link2 size={14} /> Tích hợp HRM / SSO (Đăng nhập chung)
        </button>
        <button
          className={`btn ${activeTab === 'notifications' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('notifications')}
        >
          <Bell size={14} /> Cấu hình Thông báo
        </button>
        <button
          className={`btn ${activeTab === 'backup' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('backup')}
        >
          <Database size={14} /> Sao lưu & Dữ liệu
        </button>
      </div>

      {/* HRM SSO Tab Content */}
      {activeTab === 'hrm' && (
        <div className="card">
          <div className="flex-between mb-4">
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Cấu hình Đăng nhập Tập trung HRM (SSO OAuth2)</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Kết nối tài khoản người dùng và phân quyền từ hệ thống HRM chung của công ty.
              </p>
            </div>
            <span className="badge badge-success">Sẵn sàng đấu nối</span>
          </div>

          <form onSubmit={handleSave}>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="checkbox"
                id="ssoToggle"
                checked={hrmConfig.ssoEnabled}
                onChange={(e) => setHrmConfig({ ...hrmConfig, ssoEnabled: e.target.checked })}
              />
              <label htmlFor="ssoToggle" style={{ fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                Kích hoạt Đăng nhập qua HRM SSO (Single Sign-On)
              </label>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">HRM Authorization URL (OAuth2)</label>
                <input
                  type="text"
                  className="form-input"
                  value={hrmConfig.ssoUrl}
                  onChange={(e) => setHrmConfig({ ...hrmConfig, ssoUrl: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">HRM Token Endpoint URL</label>
                <input
                  type="text"
                  className="form-input"
                  value={hrmConfig.tokenUrl}
                  onChange={(e) => setHrmConfig({ ...hrmConfig, tokenUrl: e.target.value })}
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Client ID</label>
                <input
                  type="text"
                  className="form-input"
                  value={hrmConfig.clientId}
                  onChange={(e) => setHrmConfig({ ...hrmConfig, clientId: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Client Secret</label>
                <input
                  type="password"
                  className="form-input"
                  value={hrmConfig.clientSecret}
                  onChange={(e) => setHrmConfig({ ...hrmConfig, clientSecret: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
              <input
                type="checkbox"
                id="syncRoles"
                checked={hrmConfig.syncRoles}
                onChange={(e) => setHrmConfig({ ...hrmConfig, syncRoles: e.target.checked })}
              />
              <label htmlFor="syncRoles" style={{ fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Tự động đồng bộ Vai trò (Role) và Phòng ban từ HRM về CMMS
              </label>
            </div>
          </form>
        </div>
      )}

      {/* General Tab Content */}
      {activeTab === 'general' && (
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Thông tin Công ty & Nhà xưởng</h3>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Tên Doanh nghiệp</label>
              <input type="text" className="form-input" defaultValue="Công ty Cổ phần Chế tạo & Bảo trì Công nghiệp" />
            </div>
            <div className="form-group">
              <label className="form-label">Mã viết tắt Hệ thống</label>
              <input type="text" className="form-input" defaultValue="CMMS-ENTERPRISE" />
            </div>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Ngưỡng Cảnh báo & Thông báo Email</h3>
          <div className="form-group">
            <label className="form-label">Số ngày cảnh báo trước khi đến hạn Bảo trì Định kỳ</label>
            <input type="number" className="form-input" defaultValue={7} style={{ maxWidth: '200px' }} />
          </div>
        </div>
      )}

      {/* Backup Tab */}
      {activeTab === 'backup' && (
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Sao lưu Cơ sở dữ liệu SQLite</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Đã sao lưu gần nhất: 2026-07-24 16:00:00 (`dev.db`).
          </p>
          <button className="btn btn-secondary">Tải bản sao lưu (.db)</button>
        </div>
      )}
    </div>
  );
};
