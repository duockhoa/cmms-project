import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Settings, Save, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '../common/Toast';

export const SystemSettingsTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({
    'app.name': 'DK-CMMS',
    'app.version': '1.0.0',
    'wo.autoAssign': 'false',
    'WARNING_LEAD_DAYS': '7',
    'COMPANY_NAME': 'CÔNG TY CỔ PHẦN DƯỢC KHOA (DKPHARMA)',
    'SYSTEM_ABBREVIATION': 'DK.QLTB',
  });

  const toast = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await api.getSystemSettings();
      if (Array.isArray(data)) {
        const map: Record<string, string> = {};
        data.forEach((item: any) => {
          map[item.key] = item.value;
        });
        setSettings((prev) => ({ ...prev, ...map }));
      }
    } catch (error: any) {
      toast.error('Lỗi tải cấu hình', error.message || 'Không thể tải cấu hình tham số hệ thống.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Save each setting key-value
      await Promise.all(
        Object.entries(settings).map(([key, value]) =>
          api.updateSystemSetting({ key, value: String(value) })
        )
      );
      toast.success('Thành công', 'Đã lưu toàn bộ cấu hình tham số hệ thống.');
      loadSettings();
    } catch (err: any) {
      toast.error('Lỗi lưu cấu hình', err.message || 'Không thể lưu tham số.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={20} style={{ color: 'var(--accent-blue, #2563eb)' }} />
            Cấu hình tham số vận hành hệ thống
          </h3>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
            Điều chỉnh các thông số cảnh báo hạn bảo trì định kỳ và thông tin định danh toàn hệ thống.
          </p>
        </div>

        <button
          className="btn btn-secondary"
          onClick={loadSettings}
          disabled={loading || saving}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Tải lại
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-secondary)' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
          <div style={{ fontSize: '13.5px' }}>Đang tải cấu hình hệ thống...</div>
        </div>
      ) : (
        <form onSubmit={handleSave}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              backgroundColor: 'var(--bg-secondary, #ffffff)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '8px',
              padding: '24px',
            }}
          >
            {/* Warning Lead Days */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontWeight: 700 }}>
                Số ngày cảnh báo trước hạn bảo trì định kỳ (Warning Lead Days)
              </label>
              <div style={{ maxWidth: '320px' }}>
                <input
                  type="number"
                  min="0"
                  max="365"
                  className="form-input"
                  value={settings['WARNING_LEAD_DAYS'] || '7'}
                  onChange={(e) => setSettings({ ...settings, WARNING_LEAD_DAYS: e.target.value })}
                  required
                />
              </div>
              <small style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '6px', display: 'block' }}>
                Hệ thống sẽ gửi thông báo và đánh dấu cảnh báo trước khi đến hạn bảo trì định kỳ đúng số ngày này.
              </small>
            </div>

            <div style={{ height: '1px', backgroundColor: 'var(--border-color, #e2e8f0)' }} />

            {/* Company Name */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontWeight: 700 }}>
                Tên doanh nghiệp / Đơn vị quản lý
              </label>
              <div style={{ maxWidth: '480px' }}>
                <input
                  type="text"
                  className="form-input"
                  value={settings['COMPANY_NAME'] || 'CÔNG TY CỔ PHẦN DƯỢC KHOA (DKPHARMA)'}
                  onChange={(e) => setSettings({ ...settings, COMPANY_NAME: e.target.value })}
                  required
                />
              </div>
              <small style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '6px', display: 'block' }}>
                Tên công ty xuất hiện trên tiêu đề phiếu bảo trì, báo cáo xuất PDF và biên bản nghiệm thu.
              </small>
            </div>

            <div style={{ height: '1px', backgroundColor: 'var(--border-color, #e2e8f0)' }} />

            {/* System Abbreviation */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontWeight: 700 }}>
                Tên viết tắt hệ thống (System Abbreviation)
              </label>
              <div style={{ maxWidth: '320px' }}>
                <input
                  type="text"
                  className="form-input"
                  value={settings['SYSTEM_ABBREVIATION'] || 'DK.QLTB'}
                  onChange={(e) => setSettings({ ...settings, SYSTEM_ABBREVIATION: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={{ height: '1px', backgroundColor: 'var(--border-color, #e2e8f0)' }} />

            {/* Auto Assign Work Order */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontWeight: 700 }}>
                Tự động gán KTV phụ trách phân xưởng khi sinh Work Order
              </label>
              <select
                className="form-input"
                style={{ maxWidth: '320px' }}
                value={settings['wo.autoAssign'] || 'false'}
                onChange={(e) => setSettings({ ...settings, 'wo.autoAssign': e.target.value })}
              >
                <option value="true">Bật - Tự động gán KTV phụ trách xưởng</option>
                <option value="false">Tắt - Phân công thủ công khi duyệt</option>
              </select>
            </div>

            {/* Submit Button */}
            <div
              style={{
                borderTop: '1px solid var(--border-color, #e2e8f0)',
                paddingTop: '16px',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 20px', fontSize: '13.5px' }}
              >
                {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
                Lưu cấu hình hệ thống
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
