import React from 'react';
import type { UtilitiesPageViewModel } from '../../hooks/useUtilitiesPage';
import { Ban, CheckCircle2, FileText, Filter, Layers, RefreshCw, X } from 'lucide-react';
import { formatVN } from '../../utils/formatters';

interface UtilityCumulativeMetersTableProps {
  model: UtilitiesPageViewModel;
}

export const UtilityCumulativeMetersTable: React.FC<UtilityCumulativeMetersTableProps> = ({ model }) => {
  const {
    cumulativeFilter, setCumulativeFilter, cumulativeData, cumulativeType, cumulativeLoading,
    displayedCumulativeMeters,
  } = model;

  return (
<>
{/* 3. BẢNG CHI TIẾT CÁC ĐỒNG HỒ ĐO TRONG KỲ */}
<div className="card util-section-card">
  <div className="section-card-header" style={{ marginBottom: '16px' }}>
    <div>
      <h3 className="section-title">
        <FileText size={18} color="#0284c7" />
        <span>DANH SÁCH ĐỒNG HỒ & SẢN LƯỢNG TRONG KỲ</span>
      </h3>
      <p className="section-sub">
        Chi tiết chỉ số đầu kỳ, cuối kỳ, sản lượng thực tế và tỷ trọng của từng điểm đo.
      </p>
    </div>

    {/* Bộ lọc gộp dạng Dropdown: Phân loại & Từng điểm đo */}
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Filter size={14} style={{ position: 'absolute', left: '10px', color: '#64748b', pointerEvents: 'none' }} />
        <select
          value={cumulativeFilter}
          onChange={(e) => setCumulativeFilter(e.target.value)}
          style={{
            padding: '7px 28px 7px 30px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#ffffff',
            fontSize: '13px',
            fontWeight: 600,
            color: '#0f172a',
            cursor: 'pointer',
            outline: 'none',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            minWidth: '180px',
            maxWidth: '100%',
            boxSizing: 'border-box',
          }}
          title="Lọc theo phân loại hoặc chọn xem chi tiết từng điểm đo"
        >
          <option value="ALL">Tất cả đồng hồ ({cumulativeData?.allMeters?.length || 0})</option>
          <option value="SUPPLY">Nguồn Tổng Cấp ({cumulativeData?.supplyMeters?.length || 0})</option>
          <option value="CONSUMPTION">Đo Tiêu Thụ ({cumulativeData?.consumptionMeters?.length || 0})</option>
          {cumulativeType === 'WATER' && (
            <option value="RECYCLED">Nước Tái Sử Dụng ({cumulativeData?.recycledMeters?.length || 0})</option>
          )}
          {(cumulativeData?.excludedMeters?.length || 0) > 0 && (
            <option value="EXCLUDED">Đo Đối Chứng ({cumulativeData.excludedMeters.length})</option>
          )}
          {(cumulativeData?.allMeters || []).map((m: any) => (
            <option key={m.id} value={m.id}>
              {m.code} - {m.name}
            </option>
          ))}
        </select>
      </div>

      {cumulativeFilter !== 'ALL' && (
        <button
          onClick={() => setCumulativeFilter('ALL')}
          style={{
            padding: '6px 10px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            color: '#64748b',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all 0.15s',
          }}
          title="Đặt lại về Tất cả đồng hồ"
        >
          <X size={13} />
          <span>Đặt lại</span>
        </button>
      )}
    </div>
  </div>

  <div className="table-responsive">
    <table className="custom-table">
      <thead>
        <tr>
          <th style={{ width: '50px', textAlign: 'center' }}>STT</th>
          <th>Mã Điểm Đo</th>
          <th>Tên Đồng Hồ / Thiết Bị</th>
          <th style={{ width: '170px' }}>Phân Loại</th>
          <th>Vị Trí Lắp Đặt</th>
          <th style={{ textAlign: 'center' }}>Lần Ghi</th>
          <th style={{ textAlign: 'right' }}>Số Đầu Kỳ</th>
          <th style={{ textAlign: 'right' }}>Số Cuối Kỳ</th>
          <th style={{ textAlign: 'center' }}>Hệ Số CT</th>
          <th style={{ textAlign: 'right', fontWeight: 800 }}>Sản Lượng ({cumulativeData?.summary?.unit})</th>
          <th style={{ textAlign: 'right' }}>Tỷ Trọng (%)</th>
        </tr>
      </thead>
      <tbody>
        {cumulativeLoading ? (
          <tr>
            <td colSpan={11} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              Đang tính toán sản lượng kỳ...
            </td>
          </tr>
        ) : !cumulativeData?.allMeters || cumulativeData.allMeters.length === 0 ? (
          <tr>
            <td colSpan={11} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              Chưa có điểm đo nào cho loại tiện ích này.
            </td>
          </tr>
        ) : displayedCumulativeMeters.length === 0 ? (
          <tr>
            <td colSpan={11} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8', fontSize: '13px' }}>
              Không có đồng hồ nào khớp với bộ lọc đã chọn.
            </td>
          </tr>
        ) : (
          displayedCumulativeMeters.map((m: any, idx: number) => (
            <tr key={m.id}>
              <td style={{ textAlign: 'center', color: '#64748b', fontSize: '12px' }}>{idx + 1}</td>
              <td>
                <strong style={{ color: '#2563eb', fontSize: '13px' }}>{m.code}</strong>
              </td>
              <td>
                <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '13px' }}>{m.name}</div>
                {m.tariffType === 'THREE_PHASE' && (
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span title="Bình thường (T1)">T1: <strong style={{ color: '#0f172a' }}>{formatVN(m.normalConsumption)}</strong></span>
                    <span title="Cao điểm (T2)" style={{ color: '#dc2626' }}>T2: <strong>{formatVN(m.peakConsumption)}</strong></span>
                    <span title="Thấp điểm (T3)" style={{ color: '#16a34a' }}>T3: <strong>{formatVN(m.offPeakConsumption)}</strong></span>
                  </div>
                )}
              </td>
              <td>
                {m.isSupplyMeter ? (
                  <span style={{
                    padding: '4px 8px', borderRadius: '4px', fontSize: '11.5px', fontWeight: 700,
                    backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', display: 'inline-flex', alignItems: 'center', gap: '4px'
                  }}>
                    <Layers size={12} /> NGUỒN TỔNG CẤP
                  </span>
                ) : m.isRecycledWater ? (
                  <span style={{
                    padding: '4px 8px', borderRadius: '4px', fontSize: '11.5px', fontWeight: 700,
                    backgroundColor: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', display: 'inline-flex', alignItems: 'center', gap: '4px'
                  }} title="Đồng hồ nước tái sử dụng - không cộng dồn vào tổng dùng để chống tính trùng">
                    <RefreshCw size={12} /> NƯỚC TÁI SỬ DỤNG
                  </span>
                ) : m.isExcludedFromTotal ? (
                  <span style={{
                    padding: '4px 8px', borderRadius: '4px', fontSize: '11.5px', fontWeight: 700,
                    backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', display: 'inline-flex', alignItems: 'center', gap: '4px'
                  }} title="Đồng hồ đo đối chứng / trung gian - Không tính vào Tổng cấp và Không tính vào Tổng dùng">
                    <Ban size={12} /> ĐO ĐỐI CHỨNG (KHÔNG TÍNH TỔNG)
                  </span>
                ) : (
                  <span style={{
                    padding: '4px 8px', borderRadius: '4px', fontSize: '11.5px', fontWeight: 600,
                    backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', display: 'inline-flex', alignItems: 'center', gap: '4px'
                  }}>
                    <CheckCircle2 size={12} /> TIÊU THỤ NỘI BỘ
                  </span>
                )}
              </td>
              <td style={{ fontSize: '12.5px', color: '#475569' }}>{m.location}</td>
              <td style={{ textAlign: 'center', fontSize: '12px' }}>
                <span style={{ padding: '2px 8px', borderRadius: '10px', backgroundColor: '#f1f5f9', color: '#334155' }}>
                  {m.readingsCount} lần
                </span>
              </td>
              <td style={{ textAlign: 'right', fontSize: '12.5px', color: '#64748b' }}>
                {m.startValue !== null && m.startValue !== undefined ? formatVN(m.startValue) : '-'}
              </td>
              <td style={{ textAlign: 'right', fontSize: '12.5px', color: '#0f172a', fontWeight: 600 }}>
                {m.endValue !== null && m.endValue !== undefined ? formatVN(m.endValue) : '-'}
              </td>
              <td style={{ textAlign: 'center', fontSize: '12px' }}>
                x{m.multiplier}
              </td>
              <td style={{ textAlign: 'right', fontSize: '13.5px', fontWeight: 800, color: m.isSupplyMeter ? '#1d4ed8' : m.isRecycledWater ? '#7c3aed' : m.isExcludedFromTotal ? '#b45309' : '#047857' }}>
                {formatVN(m.periodConsumption)} {m.unit}
              </td>
              <td style={{ textAlign: 'right', fontSize: '12.5px', fontWeight: 600, color: '#334155' }}>
                {m.isExcludedFromTotal ? <span style={{ color: '#94a3b8' }}>-</span> : `${m.sharePercent}%`}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
</div>
</>
  );
};
