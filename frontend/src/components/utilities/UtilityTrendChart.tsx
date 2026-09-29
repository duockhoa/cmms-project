import React, { useState, useMemo } from 'react';
import { 
  BarChart2, LineChart, PieChart, 
  Eye, EyeOff, Calendar 
} from 'lucide-react';
import { formatVN } from '../../utils/formatters';
import {
  calculateNiceScale,
  createAreaChartPath,
  createSmoothChartPath,
  formatChartTick,
  getChartX,
  getChartY,
} from './utilityTrendChart.utils';
import './UtilityTrendChart.css';

export interface UtilityTrendChartProps {
  trendData: any;
  trendFilter: string;
  unit?: string;
}

const POINT_PALETTE = [
  '#8b5cf6', // Tím hoa cà
  '#06b6d4', // Lam ngọc
  '#f97316', // Cam rực
  '#ec4899', // Hồng đậm
  '#14b8a6', // Xanh ngọc
  '#6366f1', // Chàm
  '#e11d48', // Đỏ hồng
  '#84cc16', // Xanh chanh
  '#0ea5e9', // Xanh da trời
  '#d97706', // Vàng hổ phách
  '#a855f7', // Tím phong lan
  '#059669', // Xanh lục
];

export const UtilityTrendChart: React.FC<UtilityTrendChartProps> = ({
  trendData,
  trendFilter,
  unit = 'kWh',
}) => {
  const [chartSubMode, setChartSubMode] = useState<'LINE' | 'BAR' | 'DONUT'>('LINE');
  const [showSupply, setShowSupply] = useState(true);
  const [showConsumption, setShowConsumption] = useState(true);
  const [showDelta, setShowDelta] = useState(true);
  const showRecycled = true;
  const showPointLines = true;
  const [pointVisibility, setPointVisibility] = useState<Record<string, boolean>>({});
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);

  const timeColumns = trendData?.timeColumns || [];
  const summaryRows = trendData?.summaryRows || {};
  const pointRows = trendData?.pointRows || [];
  const activeUnit = trendData?.unit || unit;

  // Gán bảng màu riêng biệt cố định cho từng điểm đo (lọc riêng phụ tải tiêu thụ để trục Y Biểu đồ 2 độc lập hoàn toàn với biểu đồ Tổng cấp)
  const pointsWithColors = useMemo(() => {
    const list = (pointRows || []).filter((p: any) => {
      if (trendFilter === 'SUPPLY') return Boolean(p.isSupplyMeter);
      return !p.isSupplyMeter;
    });
    return list.map((p: any, idx: number) => ({
      ...p,
      color: POINT_PALETTE[idx % POINT_PALETTE.length],
    }));
  }, [pointRows, trendFilter]);

  // Kiểm tra điểm đo có đang được bật hiển thị đường trên biểu đồ hay không
  const isPointVisible = (pointId: string) => {
    if (!showPointLines) return false;
    if (trendFilter !== 'ALL') {
      if (trendFilter === 'SUPPLY') {
        const p = pointRows.find((x: any) => x.pointId === pointId);
        return Boolean(p?.isSupplyMeter);
      }
      if (trendFilter === 'CONSUMPTION') {
        const p = pointRows.find((x: any) => x.pointId === pointId);
        return !p?.isSupplyMeter && !p?.isRecycledWater && !p?.isExcludedFromTotal;
      }
      if (trendFilter === 'RECYCLED') {
        const p = pointRows.find((x: any) => x.pointId === pointId);
        return Boolean(p?.isRecycledWater);
      }
      if (trendFilter === 'EXCLUDED') {
        const p = pointRows.find((x: any) => x.pointId === pointId);
        return Boolean(p?.isExcludedFromTotal);
      }
      return pointId === trendFilter;
    }
    return pointVisibility[pointId] !== false;
  };

  const togglePointVisibility = (pointId: string) => {
    setPointVisibility(prev => ({
      ...prev,
      [pointId]: prev[pointId] === false ? true : false,
    }));
  };

  // Trích xuất mảng dữ liệu theo từng chuỗi thời gian
  const seriesData = useMemo(() => {
    return timeColumns.map((col: any) => {
      const supply = summaryRows?.totalSupply?.values?.[col.key] || 0;
      const consumption = summaryRows?.totalConsumption?.values?.[col.key] || 0;
      const delta = summaryRows?.delta?.values?.[col.key] || 0;
      const recycled = summaryRows?.totalRecycled?.values?.[col.key] || 0;

      // Giá trị của điểm đo được chọn cụ thể (nếu có)
      let selectedPointVal = 0;
      if (trendFilter !== 'ALL' && trendFilter !== 'SUPPLY' && trendFilter !== 'CONSUMPTION' && trendFilter !== 'RECYCLED' && trendFilter !== 'EXCLUDED') {
        const found = pointRows.find((p: any) => p.pointId === trendFilter);
        if (found) {
          selectedPointVal = found.values?.[col.key] || 0;
        }
      }

      return {
        key: col.key,
        label: col.label,
        shortLabel: col.shortLabel,
        subLabel: col.subLabel,
        supply,
        consumption,
        delta,
        recycled,
        selectedPointVal,
      };
    });
  }, [timeColumns, summaryRows, pointRows, trendFilter]);

  // Cấu hình kích thước SVG
  const svgWidth = 1040;
  const svgHeight = 320;
  const paddingLeft = 65;
  const paddingRight = 65;
  const paddingTop = 26;
  const paddingBottom = 42;

  const chartW = svgWidth - paddingLeft - paddingRight;
  const chartH = svgHeight - paddingTop - paddingBottom;
  const n = seriesData.length;
  const geometry = { chartHeight: chartH, chartWidth: chartW, paddingLeft, paddingTop, pointCount: n };

  // 1. Thang đo cực đại riêng cho Biểu Đồ 1 (Tổng hợp Nguồn Cấp & Dùng Toàn Nhà Máy)
  const summaryRawMax = useMemo(() => {
    let max = 0;
    seriesData.forEach((d: any) => {
      if (showSupply && d.supply > max) max = d.supply;
      if (showConsumption && d.consumption > max) max = d.consumption;
      if (showDelta && Math.abs(d.delta) > max) max = Math.abs(d.delta);
      if (showRecycled && d.recycled > max) max = d.recycled;
    });
    return max;
  }, [seriesData, showSupply, showConsumption, showDelta, showRecycled]);

  const { maxVal: summaryMaxVal, yTicks: summaryYTicks } = useMemo(() => {
    return calculateNiceScale(summaryRawMax, paddingTop, chartH);
  }, [summaryRawMax, paddingTop, chartH]);

  // 2. Thang đo cực đại riêng cho Biểu Đồ 2 (Từng vị trí / Phân xưởng con)
  const pointRawMax = useMemo(() => {
    let max = 0;
    pointsWithColors.forEach((p: any) => {
      if (isPointVisible(p.pointId)) {
        timeColumns.forEach((col: any) => {
          const v = p.values?.[col.key] || 0;
          if (v > max) max = v;
        });
      }
    });
    return max;
  }, [pointsWithColors, pointVisibility, timeColumns]);

  const { maxVal: pointMaxVal, yTicks: pointYTicks } = useMemo(() => {
    return calculateNiceScale(pointRawMax, paddingTop, chartH);
  }, [pointRawMax, paddingTop, chartH]);

  // Dữ liệu cho biểu đồ Donut (Tỷ trọng tiêu thụ của từng phân xưởng / điểm đo)
  const donutData = useMemo(() => {
    const consumers = pointRows.filter((p: any) => !p.isSupplyMeter && !p.isExcludedFromTotal && p.total > 0);
    const grandTotal = consumers.reduce((sum: number, p: any) => sum + (p.total || 0), 0);
    if (grandTotal === 0) return [];

    const colors = [
      '#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', 
      '#06b6d4', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
    ];

    let currentAngle = 0;
    return consumers.map((c: any, i: number) => {
      const share = (c.total / grandTotal) * 100;
      const angle = (share / 100) * 360;
      const startAngle = currentAngle;
      currentAngle += angle;
      return {
        pointId: c.pointId,
        code: c.code,
        name: c.name,
        location: c.location,
        total: c.total,
        share: Math.round(share * 10) / 10,
        color: colors[i % colors.length],
        startAngle,
        angle,
      };
    });
  }, [pointRows]);

  if (!timeColumns || timeColumns.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
        Chưa có dữ liệu chuỗi thời gian để vẽ biểu đồ.
      </div>
    );
  }

  // Helper tọa độ X
  const getX = (index: number) => getChartX(index, geometry);

  // Tọa độ Y cho Biểu đồ 1 (Tổng)
  const getSummaryY = (value: number) => getChartY(value, summaryMaxVal, paddingTop, chartH);

  // Tọa độ Y cho Biểu đồ 2 (Chi tiết điểm đo)
  const getPointY = (value: number) => getChartY(value, pointMaxVal, paddingTop, chartH);

  // Tạo đường cong Bezier mượt mà theo hàm lấy Y tương ứng
  const createSmoothPath = (values: number[], getY: (value: number) => number) =>
    createSmoothChartPath(values, getY, geometry);

  // Tạo vùng phủ Gradient (Area)
  const createAreaPath = (values: number[], getY: (value: number) => number) =>
    createAreaChartPath(values, getY, geometry);

  // Định dạng nhãn trục Y
  const formatTickLabel = formatChartTick;

  const [summaryHoverIndex, setSummaryHoverIndex] = useState<number | null>(null);
  const [pointHoverIndex, setPointHoverIndex] = useState<number | null>(null);

  const summaryHoveredData = summaryHoverIndex !== null && summaryHoverIndex >= 0 && summaryHoverIndex < seriesData.length 
    ? seriesData[summaryHoverIndex] 
    : null;

  const pointHoveredData = pointHoverIndex !== null && pointHoverIndex >= 0 && pointHoverIndex < seriesData.length 
    ? seriesData[pointHoverIndex] 
    : null;

  return (
    <div className="utility-trend-chart-root">
      {/* 1. Thanh Chuyển Đổi Dạng Biểu Đồ Con (Tab Bar) */}
      <div className="chart-header-bar">
        <div className="chart-submode-pills">
          <button
            type="button"
            onClick={() => setChartSubMode('LINE')}
            className={`submode-btn ${chartSubMode === 'LINE' ? 'active' : ''}`}
            title="Biểu đồ đường diễn biến theo thời gian"
          >
            <LineChart size={13} />
            <span>Đường Diễn Biến</span>
          </button>
          <button
            type="button"
            onClick={() => setChartSubMode('BAR')}
            className={`submode-btn ${chartSubMode === 'BAR' ? 'active' : ''}`}
            title="Biểu đồ cột so sánh cấp vào và tiêu thụ"
          >
            <BarChart2 size={13} />
            <span>Cột So Sánh</span>
          </button>
          <button
            type="button"
            onClick={() => setChartSubMode('DONUT')}
            className={`submode-btn ${chartSubMode === 'DONUT' ? 'active' : ''}`}
            title="Cơ cấu tỷ trọng tiêu thụ giữa các phân xưởng"
          >
            <PieChart size={13} />
            <span>Cơ Cấu Tỷ Trọng</span>
          </button>
        </div>
      </div>

      {/* CHẾ ĐỘ 1: BIỂU ĐỒ ĐƯỜNG 2 BÊN SONG SONG CẠNH NHAU TRÊN 1 KHUNG */}
      {chartSubMode === 'LINE' && (
        <div className="dual-charts-grid">
          {/* ========================================================= */}
          {/* CỘT TRÁI: TỔNG HỢP NGUỒN CẤP & TIÊU THỤ TOÀN NHÀ MÁY     */}
          {/* ========================================================= */}
          <div className="sub-chart-box">
            <div className="sub-chart-header">
              <div className="sub-chart-title-group">
                <h4 className="sub-chart-title">Tổng Hợp Nguồn Cấp & Tiêu Thụ Toàn Nhà Máy</h4>
              </div>

              {/* Legend cho Tổng hợp */}
              <div className="chart-legend-row">
                <button
                  type="button"
                  onClick={() => setShowSupply(!showSupply)}
                  className={`legend-pill supply ${showSupply ? 'active' : 'inactive'}`}
                >
                  <span className="legend-dot supply" />
                  <span>Cấp Vào</span>
                  {showSupply ? <Eye size={11} /> : <EyeOff size={11} />}
                </button>

                <button
                  type="button"
                  onClick={() => setShowConsumption(!showConsumption)}
                  className={`legend-pill consumption ${showConsumption ? 'active' : 'inactive'}`}
                >
                  <span className="legend-dot consumption" />
                  <span>Dùng Nội Bộ</span>
                  {showConsumption ? <Eye size={11} /> : <EyeOff size={11} />}
                </button>

                <button
                  type="button"
                  onClick={() => setShowDelta(!showDelta)}
                  className={`legend-pill delta ${showDelta ? 'active' : 'inactive'}`}
                >
                  <span className="legend-dot delta" />
                  <span>Hao Hụt</span>
                  {showDelta ? <Eye size={11} /> : <EyeOff size={11} />}
                </button>
              </div>
            </div>

            {/* Khung SVG Biểu Đồ Tổng Hợp */}
            <div className="svg-chart-container">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="interactive-svg-chart"
                onMouseLeave={() => setSummaryHoverIndex(null)}
              >
                <defs>
                  <linearGradient id="sideSupplyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="sideConsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Lưới ngang trục Y Biểu đồ 1 */}
                {summaryYTicks.map((tick, i) => (
                  <g key={`side-sum-tick-${i}`}>
                    <line
                      x1={paddingLeft}
                      y1={tick.y}
                      x2={svgWidth - paddingRight}
                      y2={tick.y}
                      stroke="#e2e8f0"
                      strokeDasharray={tick.val === 0 ? '0' : '4 4'}
                      strokeWidth="1"
                    />
                    <text
                      x={paddingLeft - 8}
                      y={tick.y + 4}
                      textAnchor="end"
                      fontSize="11"
                      fill="#94a3b8"
                      fontWeight="600"
                    >
                      {formatTickLabel(tick.val, summaryMaxVal)}
                    </text>
                  </g>
                ))}

                {/* Trục X Đường đáy */}
                <line
                  x1={paddingLeft}
                  y1={paddingTop + chartH}
                  x2={svgWidth - paddingRight}
                  y2={paddingTop + chartH}
                  stroke="#cbd5e1"
                  strokeWidth="1.5"
                />

                {/* Vùng Area Gradient Biểu đồ 1 */}
                {showSupply && (
                  <path
                    d={createAreaPath(seriesData.map((d: any) => d.supply), getSummaryY)}
                    fill="url(#sideSupplyGrad)"
                  />
                )}
                {showConsumption && (
                  <path
                    d={createAreaPath(seriesData.map((d: any) => d.consumption), getSummaryY)}
                    fill="url(#sideConsGrad)"
                  />
                )}

                {/* Đường Nguồn Cấp Vào */}
                {showSupply && (
                  <path
                    d={createSmoothPath(seriesData.map((d: any) => d.supply), getSummaryY)}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Đường Tiêu Thụ Nội Bộ */}
                {showConsumption && (
                  <path
                    d={createSmoothPath(seriesData.map((d: any) => d.consumption), getSummaryY)}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Đường Hao Hụt / Chênh Lệch */}
                {showDelta && (
                  <path
                    d={createSmoothPath(seriesData.map((d: any) => d.delta), getSummaryY)}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="1.8"
                    strokeDasharray="4 4"
                    strokeLinecap="round"
                  />
                )}

                {/* Hover line & marker */}
                {summaryHoverIndex !== null && (
                  <g>
                    <line
                      x1={getX(summaryHoverIndex)}
                      y1={paddingTop}
                      x2={getX(summaryHoverIndex)}
                      y2={paddingTop + chartH}
                      stroke="#94a3b8"
                      strokeDasharray="3 3"
                      strokeWidth="1.2"
                    />
                    {showSupply && (
                      <circle
                        cx={getX(summaryHoverIndex)}
                        cy={getSummaryY(seriesData[summaryHoverIndex].supply)}
                        r="4.5"
                        fill="#2563eb"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                    )}
                    {showConsumption && (
                      <circle
                        cx={getX(summaryHoverIndex)}
                        cy={getSummaryY(seriesData[summaryHoverIndex].consumption)}
                        r="4.5"
                        fill="#10b981"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                    )}
                  </g>
                )}

                {/* Các mốc thời gian trục X */}
                {seriesData.map((d: any, idx: number) => {
                  const x = getX(idx);
                  const showDate = n <= 14 || idx % Math.ceil(n / 12) === 0 || idx === n - 1;
                  return (
                    <g key={`side-col1-${d.key}`}>
                      {showDate && (
                        <>
                          <line x1={x} y1={paddingTop + chartH} x2={x} y2={paddingTop + chartH + 5} stroke="#cbd5e1" strokeWidth="1" />
                          <text x={x} y={paddingTop + chartH + 18} textAnchor="middle" fontSize="10" fill="#64748b" fontWeight="600">
                            {d.shortLabel}
                          </text>
                        </>
                      )}
                      <rect
                        x={x - (chartW / (n || 1)) / 2}
                        y={paddingTop}
                        width={chartW / (n || 1)}
                        height={chartH + 35}
                        fill="transparent"
                        cursor="pointer"
                        onMouseEnter={() => setSummaryHoverIndex(idx)}
                      />
                    </g>
                  );
                })}
              </svg>

              {summaryHoveredData && summaryHoverIndex !== null && (
                <div
                  className="chart-tooltip-floating"
                  style={{
                    left: `${(getX(summaryHoverIndex) / svgWidth) * 100}%`,
                    top: '10px',
                    transform: getX(summaryHoverIndex) > svgWidth * 0.6 ? 'translateX(-95%)' : 'translateX(5%)',
                  }}
                >
                  <div className="tooltip-title">
                    <Calendar size={12} />
                    <span>{summaryHoveredData.label}</span>
                  </div>
                  <div className="tooltip-body">
                    {showSupply && (
                      <div className="tooltip-row">
                        <div className="tooltip-point-left"><span className="tooltip-legend-dot supply" /><span className="tooltip-label">Cấp vào:</span></div>
                        <span className="tooltip-val supply">{formatVN(summaryHoveredData.supply)} {activeUnit}</span>
                      </div>
                    )}
                    {showConsumption && (
                      <div className="tooltip-row">
                        <div className="tooltip-point-left"><span className="tooltip-legend-dot consumption" /><span className="tooltip-label">Tiêu thụ:</span></div>
                        <span className="tooltip-val consumption">{formatVN(summaryHoveredData.consumption)} {activeUnit}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* CỘT PHẢI: DIỄN BIẾN TIÊU THỤ TỪNG VỊ TRÍ / PHÂN XƯỞNG CON */}
          {/* ========================================================= */}
          {pointsWithColors.length > 0 && (
            <div className="sub-chart-box points-box">
              <div className="sub-chart-header">
                <div className="sub-chart-title-group">
                  <h4 className="sub-chart-title">Diễn Biến Tiêu Thụ Từng Điểm Đo</h4>
                </div>

                {/* Danh sách badge chip bật/tắt từng điểm đo */}
                <div className="chart-legend-row">
                  {pointsWithColors.map((p: any) => {
                    const visible = isPointVisible(p.pointId);
                    const isHovered = hoveredPointId === p.pointId;
                    return (
                      <button
                        key={`chip-side-${p.pointId}`}
                        type="button"
                        onClick={() => togglePointVisibility(p.pointId)}
                        onMouseEnter={() => setHoveredPointId(p.pointId)}
                        onMouseLeave={() => setHoveredPointId(null)}
                        className={`point-chip-btn ${visible ? 'active' : 'inactive'} ${isHovered ? 'hovered' : ''}`}
                        style={{
                          borderColor: visible ? p.color : '#e2e8f0',
                          backgroundColor: visible ? `${p.color}15` : '#f8fafc',
                          color: visible ? '#0f172a' : '#94a3b8',
                        }}
                        title={`${p.name} - ${p.location}`}
                      >
                        <span className="point-chip-dot" style={{ backgroundColor: visible ? p.color : '#cbd5e1' }} />
                        <span className="point-chip-code">{p.code}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Khung SVG Biểu Đồ Điểm Đo Con */}
              <div className="svg-chart-container">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="interactive-svg-chart"
                  onMouseLeave={() => setPointHoverIndex(null)}
                >
                  {/* Lưới ngang trục Y Biểu đồ 2 */}
                  {pointYTicks.map((tick, i) => (
                    <g key={`pt-tick-side-${i}`}>
                      <line
                        x1={paddingLeft}
                        y1={tick.y}
                        x2={svgWidth - paddingRight}
                        y2={tick.y}
                        stroke="#e2e8f0"
                        strokeDasharray={tick.val === 0 ? '0' : '4 4'}
                        strokeWidth="1"
                      />
                      <text
                        x={paddingLeft - 8}
                        y={tick.y + 4}
                        textAnchor="end"
                        fontSize="11"
                        fill="#94a3b8"
                        fontWeight="600"
                      >
                        {formatTickLabel(tick.val, pointMaxVal)}
                      </text>
                    </g>
                  ))}

                  {/* Trục X Đường đáy */}
                  <line
                    x1={paddingLeft}
                    y1={paddingTop + chartH}
                    x2={svgWidth - paddingRight}
                    y2={paddingTop + chartH}
                    stroke="#cbd5e1"
                    strokeWidth="1.5"
                  />

                  {/* Đường cong Line từng điểm đo */}
                  {pointsWithColors.map((p: any) => {
                    if (!isPointVisible(p.pointId)) return null;
                    const pointVals = timeColumns.map((c: any) => p.values?.[c.key] || 0);
                    const isHoveredPoint = hoveredPointId === p.pointId;
                    const isDimmed = hoveredPointId !== null && !isHoveredPoint;

                    return (
                      <g key={`pt-line-side-${p.pointId}`} opacity={isDimmed ? 0.2 : 1}>
                        <path
                          d={createSmoothPath(pointVals, getPointY)}
                          fill="none"
                          stroke={p.color}
                          strokeWidth={isHoveredPoint ? 3 : 1.8}
                          strokeDasharray={p.isExcludedFromTotal ? '3 3' : undefined}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </g>
                    );
                  })}

                  {/* Hover line & marker */}
                  {pointHoverIndex !== null && (
                    <g>
                      <line
                        x1={getX(pointHoverIndex)}
                        y1={paddingTop}
                        x2={getX(pointHoverIndex)}
                        y2={paddingTop + chartH}
                        stroke="#94a3b8"
                        strokeDasharray="3 3"
                        strokeWidth="1.2"
                      />
                      {pointsWithColors.map((p: any) => {
                        if (!isPointVisible(p.pointId)) return null;
                        const val = p.values?.[seriesData[pointHoverIndex].key] || 0;
                        if (val <= 0) return null;
                        return (
                          <circle
                            key={`side-pt-dot-${p.pointId}`}
                            cx={getX(pointHoverIndex)}
                            cy={getPointY(val)}
                            r="3.5"
                            fill={p.color}
                            stroke="#ffffff"
                            strokeWidth="1.5"
                          />
                        );
                      })}
                    </g>
                  )}

                  {/* Các mốc thời gian trục X */}
                  {seriesData.map((d: any, idx: number) => {
                    const x = getX(idx);
                    const showDate = n <= 14 || idx % Math.ceil(n / 12) === 0 || idx === n - 1;
                    return (
                      <g key={`side-col2-${d.key}`}>
                        {showDate && (
                          <>
                            <line x1={x} y1={paddingTop + chartH} x2={x} y2={paddingTop + chartH + 5} stroke="#cbd5e1" strokeWidth="1" />
                            <text x={x} y={paddingTop + chartH + 18} textAnchor="middle" fontSize="10" fill="#64748b" fontWeight="600">
                              {d.shortLabel}
                            </text>
                          </>
                        )}
                        <rect
                          x={x - (chartW / (n || 1)) / 2}
                          y={paddingTop}
                          width={chartW / (n || 1)}
                          height={chartH + 35}
                          fill="transparent"
                          cursor="pointer"
                          onMouseEnter={() => setPointHoverIndex(idx)}
                        />
                      </g>
                    );
                  })}
                </svg>

                {pointHoveredData && pointHoverIndex !== null && (
                  <div
                    className="chart-tooltip-floating"
                    style={{
                      left: `${(getX(pointHoverIndex) / svgWidth) * 100}%`,
                      top: '10px',
                      transform: getX(pointHoverIndex) > svgWidth * 0.6 ? 'translateX(-95%)' : 'translateX(5%)',
                    }}
                  >
                    <div className="tooltip-title">
                      <Calendar size={12} />
                      <span>{pointHoveredData.label}</span>
                    </div>
                    <div className="tooltip-body">
                      {pointsWithColors
                        .filter((p: any) => isPointVisible(p.pointId) && (p.values?.[pointHoveredData.key] || 0) > 0)
                        .map((p: any) => {
                          const val = p.values?.[pointHoveredData.key] || 0;
                          return (
                            <div key={`side-tip-pt-${p.pointId}`} className="tooltip-point-item">
                              <div className="tooltip-point-left">
                                <span className="tooltip-point-dot" style={{ backgroundColor: p.color }} />
                                <span className="tooltip-point-name" title={p.name}>{p.code}</span>
                              </div>
                              <span className="tooltip-point-num" style={{ color: p.color }}>
                                {formatVN(val)} {activeUnit}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CHẾ ĐỘ 2: CỘT SO SÁNH (GROUPED BAR CHART) */}
      {chartSubMode === 'BAR' && (
        <div className="sub-chart-box">
          <div className="sub-chart-header">
            <div className="sub-chart-title-group">
              <h4 className="sub-chart-title">So Sánh Nguồn Cấp Vào & Tiêu Thụ Toàn Nhà Máy</h4>
              <span className="sub-chart-subtitle">(Biểu đồ cột so sánh theo từng mốc thời gian)</span>
            </div>
            <div className="chart-legend-row">
              <span className="legend-pill supply active"><span className="legend-dot supply" />Cấp Vào</span>
              <span className="legend-pill consumption active"><span className="legend-dot consumption" />Dùng Nội Bộ</span>
            </div>
          </div>
          <div className="svg-chart-container">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="interactive-svg-chart">
              {summaryYTicks.map((tick, i) => (
                <g key={`bar-tick-${i}`}>
                  <line x1={paddingLeft} y1={tick.y} x2={svgWidth - paddingRight} y2={tick.y} stroke="#e2e8f0" strokeDasharray={tick.val === 0 ? '0' : '4 4'} strokeWidth="1" />
                  <text x={paddingLeft - 8} y={tick.y + 4} textAnchor="end" fontSize="11" fill="#94a3b8" fontWeight="600">
                    {formatTickLabel(tick.val, summaryMaxVal)}
                  </text>
                </g>
              ))}
              <line x1={paddingLeft} y1={paddingTop + chartH} x2={svgWidth - paddingRight} y2={paddingTop + chartH} stroke="#cbd5e1" strokeWidth="1.5" />
              {seriesData.map((d: any, i: number) => {
                const centerX = getX(i);
                const totalBarGroupW = Math.min(26, (chartW / n) * 0.7);
                const singleBarW = totalBarGroupW / 2;
                const supplyH = (d.supply / summaryMaxVal) * chartH;
                const consH = (d.consumption / summaryMaxVal) * chartH;
                return (
                  <g key={`bar-grp-${d.key}`}>
                    <rect x={centerX - totalBarGroupW / 2} y={paddingTop + chartH - supplyH} width={Math.max(2, singleBarW - 1)} height={Math.max(0, supplyH)} fill="#3b82f6" rx="2" />
                    <rect x={centerX - totalBarGroupW / 2 + singleBarW} y={paddingTop + chartH - consH} width={Math.max(2, singleBarW - 1)} height={Math.max(0, consH)} fill="#10b981" rx="2" />
                    <text x={centerX} y={paddingTop + chartH + 15} textAnchor="middle" fontSize="10" fill="#64748b" fontWeight="600">{d.shortLabel}</text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {/* CHẾ ĐỘ 3: BIỂU ĐỒ TRÒN / DONUT (CƠ CẤU TỶ TRỌNG TIÊU THỤ) */}
      {chartSubMode === 'DONUT' && (
        <div className="donut-chart-layout">
          <div className="donut-svg-col">
            <svg viewBox="0 0 260 260" className="donut-svg">
              <g transform="translate(130, 130)">
                {donutData.map((slice: any) => {
                  const r = 95;
                  const innerR = 60;
                  const startRad = ((slice.startAngle - 90) * Math.PI) / 180;
                  const endRad = ((slice.startAngle + slice.angle - 90) * Math.PI) / 180;

                  const x1 = r * Math.cos(startRad);
                  const y1 = r * Math.sin(startRad);
                  const x2 = r * Math.cos(endRad);
                  const y2 = r * Math.sin(endRad);

                  const ix1 = innerR * Math.cos(endRad);
                  const iy1 = innerR * Math.sin(endRad);
                  const ix2 = innerR * Math.cos(startRad);
                  const iy2 = innerR * Math.sin(startRad);

                  const largeArc = slice.angle > 180 ? 1 : 0;
                  const d = `
                    M ${x1} ${y1}
                    A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}
                    L ${ix1} ${iy1}
                    A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2}
                    Z
                  `;

                  return (
                    <path
                      key={slice.pointId}
                      d={d}
                      fill={slice.color}
                      stroke="#ffffff"
                      strokeWidth="2"
                      style={{ transition: 'all 0.2s', cursor: 'pointer' }}
                    />
                  );
                })}
                {/* Tâm hình tròn hiển thị thông số chính */}
                <text textAnchor="middle" y="-6" fontSize="11" fill="#64748b" fontWeight="600">
                  Tổng Tiêu Thụ
                </text>
                <text textAnchor="middle" y="15" fontSize="15" fill="#0f172a" fontWeight="800">
                  {formatVN(summaryRows?.totalConsumption?.total || 0)}
                </text>
                <text textAnchor="middle" y="30" fontSize="10" fill="#94a3b8">
                  {activeUnit}
                </text>
              </g>
            </svg>
          </div>

          {/* Bảng chú giải chi tiết từng xưởng */}
          <div className="donut-legend-col">
            <h4 className="donut-legend-title">Cơ cấu tiêu thụ theo điểm đo:</h4>
            <div className="donut-legend-list">
              {donutData.map((slice: any) => (
                <div key={slice.pointId} className="donut-legend-item">
                  <div className="donut-item-header">
                    <span className="donut-item-dot" style={{ backgroundColor: slice.color }} />
                    <strong className="donut-item-code">{slice.code}</strong>
                    <span className="donut-item-name">{slice.name}</span>
                  </div>
                  <div className="donut-item-stats">
                    <span className="donut-item-val">{formatVN(slice.total)} {activeUnit}</span>
                    <span className="donut-item-badge" style={{ backgroundColor: `${slice.color}15`, color: slice.color }}>
                      {slice.share}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
