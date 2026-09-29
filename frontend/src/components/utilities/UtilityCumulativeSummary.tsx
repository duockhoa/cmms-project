import React from 'react';
import { AlertTriangle, Droplets, Layers, PieChart, RefreshCw, Zap } from 'lucide-react';
import { KpiCard } from '../common';

interface UtilityCumulativeSummaryProps {
  model: Record<string, any>;
}

export const UtilityCumulativeSummary: React.FC<UtilityCumulativeSummaryProps> = ({ model }) => {
  const { cumulativeType, cumulativeData, cumulativeMonth, cumulativeYear } = model;

  return (
    <>
{/* 2. Thẻ KPI TỔNG KẾT ĐỐI SOÁT */}
<div className={`cumulative-kpi-grid ${cumulativeType === 'WATER' ? 'five-cols' : ''}`} style={{ marginBottom: '16px' }}>
  <KpiCard
    title="1. TỔNG CẤP VÀO"
    value={`${cumulativeData?.summary?.totalSupply?.toLocaleString() || 0} ${cumulativeData?.summary?.unit || ''}`}
    icon={Layers}
    variant="primary"
    subtext={`Gồm ${cumulativeData?.supplyMeters?.length || 0} ĐH nguồn tổng`}
  />
  <KpiCard
    title="2. TỔNG SỬ DỤNG"
    value={`${cumulativeData?.summary?.totalConsumption?.toLocaleString() || 0} ${cumulativeData?.summary?.unit || ''}`}
    icon={cumulativeType === 'ELECTRICITY' ? Zap : Droplets}
    variant="success"
    subtext={
      cumulativeType === 'WATER' && (cumulativeData?.recycledMeters?.length || 0) > 0
        ? `${cumulativeData?.consumptionMeters?.length || 0} ĐH (trừ ${cumulativeData?.recycledMeters?.length} ĐH tái SD)`
        : `Tổng ${cumulativeData?.consumptionMeters?.length || 0} ĐH phân xưởng`
    }
  />
  <KpiCard
    title="3. CHÊNH LỆCH"
    value={`${(cumulativeData?.summary?.delta || 0) > 0 ? '+' : ''}${cumulativeData?.summary?.delta?.toLocaleString() || 0} ${cumulativeData?.summary?.unit || ''}`}
    icon={PieChart}
    variant={(cumulativeData?.summary?.delta || 0) < 0 ? 'danger' : (cumulativeData?.summary?.lossRate || 0) > 6 ? 'warning' : 'primary'}
    subtext={(cumulativeData?.summary?.delta || 0) >= 0 ? 'Lượng hao hụt / thất thoát' : 'Dùng vượt lượng cấp!'}
  />
  <KpiCard
    title="4. TỶ LỆ HAO HỤT"
    value={`${cumulativeData?.summary?.lossRate || 0}%`}
    icon={AlertTriangle}
    variant={(cumulativeData?.summary?.lossRate || 0) > 6 ? 'danger' : (cumulativeData?.summary?.lossRate || 0) > 3 ? 'warning' : 'success'}
    subtext={
      (cumulativeData?.summary?.lossRate || 0) <= 3
        ? 'Mức an toàn (< 3%)'
        : (cumulativeData?.summary?.lossRate || 0) <= 6
        ? 'Tiêu chuẩn (3 - 6%)'
        : 'Cảnh báo cao (> 6%)'
    }
  />
  {cumulativeType === 'WATER' && (
    <KpiCard
      title="5. NƯỚC TÁI SỬ DỤNG"
      value={`${cumulativeData?.summary?.totalRecycled?.toLocaleString() || 0} m³`}
      icon={RefreshCw}
      variant="purple"
      footer={<>Tái sinh: <strong>{cumulativeData?.summary?.recycleRate || 0}%</strong> (Không cộng tổng)</>}
    />
  )}
</div>

{/* Thanh Tiến Trình Đối Chiếu Trực Quan */}
<div className="card util-section-card" style={{ marginBottom: '20px' }}>
  <h3 className="section-title" style={{ marginBottom: '14px' }}>
    <PieChart size={17} color="#2563eb" />
    <span>ĐỐI CHIẾU CÂN BẰNG TỔNG CẤP VÀ TIÊU THỤ (KỲ {cumulativeMonth}/{cumulativeYear})</span>
  </h3>

  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
        <span style={{ fontWeight: 600, color: '#1e293b' }}>
          1. Nguồn Tổng Cấp Vào ({cumulativeData?.summary?.totalSupply?.toLocaleString() || 0} {cumulativeData?.summary?.unit})
        </span>
        <span style={{ fontWeight: 700, color: '#2563eb' }}>100%</span>
      </div>
      <div style={{ height: '14px', backgroundColor: '#e2e8f0', borderRadius: '7px', overflow: 'hidden' }}>
        <div style={{ width: '100%', height: '100%', backgroundColor: '#3b82f6', borderRadius: '7px' }} />
      </div>
    </div>

    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
        <span style={{ fontWeight: 600, color: '#1e293b' }}>
          2. Tổng Tiêu Thụ Thực Tế ({cumulativeData?.summary?.totalConsumption?.toLocaleString() || 0} {cumulativeData?.summary?.unit})
        </span>
        <span style={{ fontWeight: 700, color: '#10b981' }}>
          {cumulativeData?.summary?.totalSupply > 0 
            ? Math.round((cumulativeData?.summary?.totalConsumption / cumulativeData?.summary?.totalSupply) * 100) 
            : 0}%
        </span>
      </div>
      <div style={{ height: '14px', backgroundColor: '#e2e8f0', borderRadius: '7px', overflow: 'hidden' }}>
        <div style={{
          width: `${Math.min(100, cumulativeData?.summary?.totalSupply > 0 
            ? (cumulativeData?.summary?.totalConsumption / cumulativeData?.summary?.totalSupply) * 100 
            : 0)}%`,
          height: '100%',
          backgroundColor: '#10b981',
          borderRadius: '7px',
          transition: 'width 0.4s ease'
        }} />
      </div>
    </div>

    {/* Nước tái sử dụng nếu có */}
    {cumulativeType === 'WATER' && (cumulativeData?.summary?.totalRecycled || 0) > 0 && (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
          <span style={{ fontWeight: 600, color: '#6b21a8' }}>
            3. Nước Tái Sử Dụng / Tiết Kiệm ({cumulativeData?.summary?.totalRecycled?.toLocaleString()} m³) - Không cộng vào tổng dùng
          </span>
          <span style={{ fontWeight: 700, color: '#7c3aed' }}>
            {cumulativeData?.summary?.recycleRate || 0}%
          </span>
        </div>
        <div style={{ height: '14px', backgroundColor: '#e2e8f0', borderRadius: '7px', overflow: 'hidden' }}>
          <div style={{
            width: `${Math.min(100, cumulativeData?.summary?.recycleRate || 0)}%`,
            height: '100%',
            backgroundColor: '#8b5cf6',
            borderRadius: '7px',
            transition: 'width 0.4s ease'
          }} />
        </div>
      </div>
    )}

    {/* Phân tích điện 3 giá nếu có */}
    {cumulativeType === 'ELECTRICITY' && cumulativeData?.summary?.threePhaseBreakdown && (
      <div style={{
        marginTop: '10px', paddingTop: '14px', borderTop: '1px dashed #cbd5e1',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px'
      }}>
        <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>Biểu giá T1 (Bình thường):</span>
          <strong style={{ fontSize: '15px', color: '#0f172a' }}>
            {cumulativeData.summary.threePhaseBreakdown.normal.toLocaleString()} kWh
          </strong>
        </div>
        <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
          <span style={{ fontSize: '12px', color: '#dc2626', display: 'block' }}>Biểu giá T2 (Cao điểm):</span>
          <strong style={{ fontSize: '15px', color: '#dc2626' }}>
            {cumulativeData.summary.threePhaseBreakdown.peak.toLocaleString()} kWh
          </strong>
        </div>
        <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <span style={{ fontSize: '12px', color: '#16a34a', display: 'block' }}>Biểu giá T3 (Thấp điểm):</span>
          <strong style={{ fontSize: '15px', color: '#16a34a' }}>
            {cumulativeData.summary.threePhaseBreakdown.offPeak.toLocaleString()} kWh
          </strong>
        </div>
      </div>
    )}
  </div>
</div>

    </>
  );
};
