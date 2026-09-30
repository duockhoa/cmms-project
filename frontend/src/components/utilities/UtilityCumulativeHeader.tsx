import React from 'react';
import type { UtilitiesPageViewModel } from '../../hooks/useUtilitiesPage';
import { Calendar, Droplets, RefreshCw, Zap } from 'lucide-react';
import { ExportButton } from '../common';

interface UtilityCumulativeHeaderProps {
  model: UtilitiesPageViewModel;
}

export const UtilityCumulativeHeader: React.FC<UtilityCumulativeHeaderProps> = ({ model }) => {
  const {
    cumulativeType, setCumulativeType, cumulativeMonth, setCumulativeMonth,
    cumulativeYear, setCumulativeYear, cumulativeData, cumulativeLoading,
    dynamicYears, loadCumulativeReport, handleExportCumulativeCSV,
  } = model;

  return (
    <div className="card util-section-card" style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'inline-flex', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '8px', gap: '4px' }}>
            <button
              onClick={() => setCumulativeType('ELECTRICITY')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: 'none',
                borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                backgroundColor: cumulativeType === 'ELECTRICITY' ? '#ffffff' : 'transparent',
                color: cumulativeType === 'ELECTRICITY' ? '#ca8a04' : '#64748b',
                boxShadow: cumulativeType === 'ELECTRICITY' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Zap size={16} />
              <span>Kỳ Điện (01 ➔ Cuối tháng)</span>
            </button>
            <button
              onClick={() => setCumulativeType('WATER')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: 'none',
                borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                backgroundColor: cumulativeType === 'WATER' ? '#ffffff' : 'transparent',
                color: cumulativeType === 'WATER' ? '#0284c7' : '#64748b',
                boxShadow: cumulativeType === 'WATER' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Droplets size={16} />
              <span>Kỳ Nước (21 ➔ 20)</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Tháng:</span>
            <select
              value={cumulativeMonth}
              onChange={event => setCumulativeMonth(parseInt(event.target.value, 10))}
              className="modal-select"
              style={{ width: '105px', height: '36px', padding: '0 8px', fontSize: '13px' }}
            >
              {Array.from({ length: 12 }, (_, index) => index + 1).map(month => (
                <option key={month} value={month}>Tháng {month < 10 ? `0${month}` : month}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Năm:</span>
            <select
              value={cumulativeYear}
              onChange={event => setCumulativeYear(parseInt(event.target.value, 10))}
              className="modal-select"
              style={{ width: '90px', height: '36px', padding: '0 8px', fontSize: '13px' }}
            >
              {dynamicYears.map((year: number) => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={loadCumulativeReport}
            className="btn-action-outline"
            title="Tải lại số liệu"
            disabled={cumulativeLoading}
          >
            <RefreshCw size={15} className={cumulativeLoading ? 'animate-spin' : ''} />
            <span>{cumulativeLoading ? 'Đang tính...' : 'Tính Lại'}</span>
          </button>
          <ExportButton
            onExport={handleExportCumulativeCSV}
            className="btn-action-outline"
            style={{ backgroundColor: '#10b981', color: '#ffffff', borderColor: '#10b981' }}
            label="Xuất Báo Cáo (CSV)"
          />
        </div>
      </div>

      <div style={{
        marginTop: '16px', padding: '12px 16px', borderRadius: '8px',
        backgroundColor: cumulativeType === 'ELECTRICITY' ? '#fefce8' : '#f0f9ff',
        border: `1px solid ${cumulativeType === 'ELECTRICITY' ? '#fde047' : '#bae6fd'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Calendar size={18} color={cumulativeType === 'ELECTRICITY' ? '#ca8a04' : '#0284c7'} />
          <div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginRight: '8px' }}>
              {cumulativeData?.cycleDescription || `Chu kỳ tính toán Tháng ${cumulativeMonth}/${cumulativeYear}`}
            </span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              ({cumulativeType === 'ELECTRICITY'
                ? 'Kỳ điện tính từ ngày đầu tiên đến ngày cuối cùng của tháng'
                : 'Kỳ nước tính từ ngày 21 tháng trước đến ngày 20 tháng sau'})
            </span>
          </div>
        </div>
        <span style={{ fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', backgroundColor: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1' }}>
          Đơn vị: {cumulativeData?.summary?.unit || (cumulativeType === 'ELECTRICITY' ? 'kWh' : 'm³')}
        </span>
      </div>
    </div>
  );
};
