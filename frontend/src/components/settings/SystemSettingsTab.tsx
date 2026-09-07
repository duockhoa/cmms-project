import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Settings, Save, RefreshCw, AlertCircle, CheckCircle2, Zap, Droplets } from 'lucide-react';
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
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const [supplyMeters, setSupplyMeters] = useState<any[]>([]);
  const [meterBaselines, setMeterBaselines] = useState<Record<string, string>>({});
  const [meterCurrents, setMeterCurrents] = useState<Record<string, string>>({});

  const toast = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const [data, periodRes] = await Promise.all([
        api.getSystemSettings(),
        api.getUtilityPeriodBaselines({ month: currentMonth, year: currentYear }),
      ]);

      if (Array.isArray(data)) {
        const map: Record<string, string> = {};
        data.forEach((item: any) => {
          map[item.key] = item.value;
        });
        setSettings((prev) => ({ ...prev, ...map }));
      }

      const supplies = periodRes?.supplyMeters || [];
      setSupplyMeters(supplies);

      const mapBaselines: Record<string, string> = {};
      const mapCurrents: Record<string, string> = {};
      supplies.forEach((p: any) => {
        mapBaselines[p.pointId] = p.baselineValue !== null && p.baselineValue !== undefined ? String(p.baselineValue) : '0';
        mapCurrents[p.pointId] = p.lastReadingValue !== null && p.lastReadingValue !== undefined ? String(p.lastReadingValue) : (p.baselineValue !== null && p.baselineValue !== undefined ? String(p.baselineValue) : '0');
      });
      setMeterBaselines(mapBaselines);
      setMeterCurrents(mapCurrents);
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
      // 1. Save system setting key-values
      await Promise.all(
        Object.entries(settings).map(([key, value]) =>
          api.updateSystemSetting({ key, value: String(value) })
        )
      );

      // 2. Save supply meter baselines & currents for current period if changed
      const itemsToSave = supplyMeters
        .filter((m) => {
          const valStr = meterBaselines[m.pointId];
          const currStr = meterCurrents[m.pointId];
          const val = parseFloat(valStr);
          const currVal = parseFloat(currStr);
          const baseChanged = !isNaN(val) && val !== m.baselineValue;
          const currChanged = !isNaN(currVal) && currVal !== m.lastReadingValue;
          return baseChanged || currChanged;
        })
        .map((m) => ({
          pointId: m.pointId,
          baselineValue: parseFloat(meterBaselines[m.pointId]),
          currentValue: !isNaN(parseFloat(meterCurrents[m.pointId])) ? parseFloat(meterCurrents[m.pointId]) : undefined,
          notes: `Chỉ số chốt đầu kỳ tính toán Tháng ${currentMonth}/${currentYear} (Tham số hệ thống)`,
        }));

      if (itemsToSave.length > 0) {
        await api.setUtilityPeriodBaselines({
          month: currentMonth,
          year: currentYear,
          items: itemsToSave,
        });
      }

      toast.success('Thành công', 'Đã lưu cấu hình hệ thống và cập nhật sản lượng nguồn tổng cấp.');
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

            {/* KHỞI TẠO CHỈ SỐ ĐẦU KỲ TỔNG CẤP ĐIỆN & NƯỚC */}
            {supplyMeters.length > 0 && (
              <>
                <div style={{ height: '1px', backgroundColor: 'var(--border-color, #e2e8f0)' }} />

                <div style={{ margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="form-label" style={{ fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', color: '#0f172a' }}>
                      <Zap size={16} color="#d97706" />
                      Chỉ số đầu kỳ Tổng cấp Điện & Nước (Triển khai nhà máy)
                    </label>
                  </div>
                  <small style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '14px', display: 'block', lineHeight: 1.5 }}>
                    Xác lập mốc số ban đầu (mặt số thực tế trên đồng hồ tổng) khi đưa phần mềm vào vận hành, giúp nhân viên không bị chặn lỗi <em>"Số sau nhỏ hơn số trước"</em> khi ghi số ca đầu tiên.
                  </small>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                    {supplyMeters.map((m) => {
                      const isElec = m.type === 'ELECTRICITY';
                      return (
                        <div
                          key={m.pointId}
                          style={{
                            padding: '14px 16px',
                            borderRadius: '8px',
                            backgroundColor: '#f8fafc',
                            border: `1px solid ${isElec ? '#fde68a' : '#bfdbfe'}`,
                            borderLeft: `4px solid ${isElec ? '#f59e0b' : '#3b82f6'}`,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: isElec ? '#b45309' : '#1d4ed8' }}>
                              {isElec ? '⚡ TỔNG CẤP ĐIỆN' : '💧 TỔNG CẤP NƯỚC'} ({m.code})
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>📍 {m.location}</span>
                          </div>
                          <div style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>
                            {m.name}
                          </div>
                          <div style={{ fontSize: '11px', color: isElec ? '#b45309' : '#0369a1', marginBottom: '10px' }}>
                            Mốc bắt đầu kỳ: <strong>{m.startDayLabel}</strong>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '11px', color: '#475569', marginBottom: '3px', fontWeight: 600 }}>
                                1. Đầu kỳ ({m.unit}):
                              </label>
                              <input
                                type="number"
                                inputMode="decimal"
                                step="any"
                                className="form-input"
                                style={{ height: '34px', fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}
                                value={meterBaselines[m.pointId] ?? ''}
                                onChange={(e) => setMeterBaselines({ ...meterBaselines, [m.pointId]: e.target.value })}
                              />
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: '11px', color: '#047857', marginBottom: '3px', fontWeight: 600 }}>
                                2. Hiện tại ({m.unit}):
                              </label>
                              <input
                                type="number"
                                inputMode="decimal"
                                step="any"
                                className="form-input"
                                style={{ height: '34px', fontSize: '13.5px', fontWeight: 700, color: '#047857', borderColor: '#86efac' }}
                                value={meterCurrents[m.pointId] ?? ''}
                                onChange={(e) => setMeterCurrents({ ...meterCurrents, [m.pointId]: e.target.value })}
                              />
                            </div>
                          </div>

                          {/* Sản lượng phát sinh đến nay */}
                          {(() => {
                            const bVal = parseFloat(meterBaselines[m.pointId]);
                            const cVal = parseFloat(meterCurrents[m.pointId]);
                            if (!isNaN(bVal) && !isNaN(cVal) && cVal >= bVal) {
                              const diff = (cVal - bVal) * (m.multiplier || 1.0);
                              return (
                                <div style={{ fontSize: '11.5px', padding: '4px 8px', borderRadius: '4px', backgroundColor: '#ecfdf5', color: '#065f46', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span>Sản lượng từ đầu kỳ đến nay:</span>
                                  <strong>+{diff.toLocaleString()} {m.unit}</strong>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

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
