import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Droplets, RefreshCw, Save, Zap } from 'lucide-react';

interface UtilityCycleSummary {
  cycleDescription?: string;
  startDayLabel?: string;
}

interface UtilitySettingsControlsProps {
  selectedMonth: number;
  selectedYear: number;
  loading: boolean;
  batchSaving: boolean;
  elecCycle?: UtilityCycleSummary | null;
  waterCycle?: UtilityCycleSummary | null;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  onAutoFill: () => void;
  onReload: () => void;
  onSaveAll: () => void;
}

export const UtilitySettingsControls: React.FC<UtilitySettingsControlsProps> = ({
  selectedMonth,
  selectedYear,
  loading,
  batchSaving,
  elecCycle,
  waterCycle,
  onMonthChange,
  onYearChange,
  onAutoFill,
  onReload,
  onSaveAll,
}) => {
  const navigate = useNavigate();
  const disabled = loading || batchSaving;

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
            Chỉ Số Chốt Đầu Kỳ (Điện & Nước)
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary, #64748b)', margin: 0 }}>
            Khởi tạo mặt số ban đầu cho từng chu kỳ tính toán điện & nước theo đúng logic kỳ đối soát nhà máy.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/utilities?tab=cumulative&month=' + selectedMonth + '&year=' + selectedYear)}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: '#2563eb' }}
          >
            <span>Xem Báo Cáo Kỳ {selectedMonth}/{selectedYear}</span>
            <ArrowUpRight size={15} />
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onAutoFill}
            disabled={disabled}
            title="Tự động điền mốc đầu kỳ cho các đồng hồ chưa có số chốt"
            style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: '#047857' }}
          >
            <Zap size={14} color="#059669" />
            <span>Điền mốc từ lịch sử</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onReload}
            disabled={disabled}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Tải lại
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onSaveAll}
            disabled={disabled}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', backgroundColor: '#2563eb' }}
          >
            {batchSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            Lưu tất cả chỉ số kỳ này
          </button>
        </div>
      </div>

      <div
        style={{
          backgroundColor: '#f8fafc',
          border: '1.5px solid #e2e8f0',
          borderRadius: '10px',
          padding: '16px 20px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b' }}>
              Chọn Kỳ Tính Toán:
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <select
                className="form-input"
                style={{ width: '130px', height: '36px', fontSize: '13px', fontWeight: 600 }}
                value={selectedMonth}
                onChange={(event) => onMonthChange(parseInt(event.target.value, 10))}
              >
                {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                  <option key={month} value={month}>
                    Tháng {String(month).padStart(2, '0')}
                  </option>
                ))}
              </select>
              <select
                className="form-input"
                style={{ width: '100px', height: '36px', fontSize: '13px', fontWeight: 600 }}
                value={selectedYear}
                onChange={(event) => onYearChange(parseInt(event.target.value, 10))}
              >
                {[2025, 2026, 2027, 2028].map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ backgroundColor: '#fefce8', border: '1px solid #fde047', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: '#854d0e' }}>
              <Zap size={15} color="#ca8a04" />
              <span>
                <strong>Logic Kỳ Điện:</strong> {elecCycle?.cycleDescription || 'Từ 01 đến ngày cuối tháng'} (Bắt đầu: <strong>{elecCycle?.startDayLabel}</strong>)
              </span>
            </div>
            <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: '#0369a1' }}>
              <Droplets size={15} color="#0284c7" />
              <span>
                <strong>Logic Kỳ Nước:</strong> {waterCycle?.cycleDescription || 'Từ 21 tháng trước đến 20 tháng này'} (Bắt đầu: <strong>{waterCycle?.startDayLabel}</strong>)
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
