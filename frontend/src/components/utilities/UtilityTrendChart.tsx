import React, { useState, useMemo } from 'react';
import { 
  BarChart2, LineChart, PieChart, 
  Eye, EyeOff, Calendar 
} from 'lucide-react';
import { formatVN } from '../../utils/formatters';

export interface UtilityTrendChartProps {
  trendData: any;
  trendViewMode: 'HOURLY' | 'DAILY' | 'MONTHLY' | 'YEARLY';
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
  trendViewMode,
  trendFilter,
  unit = 'kWh',
}) => {
  const [chartSubMode, setChartSubMode] = useState<'LINE' | 'BAR' | 'DONUT'>('LINE');
  const [showSupply, setShowSupply] = useState(true);
  const [showConsumption, setShowConsumption] = useState(true);
  const [showDelta, setShowDelta] = useState(true);
  const [showRecycled, setShowRecycled] = useState(true);
  const [showPointLines, setShowPointLines] = useState(true);
  const [pointVisibility, setPointVisibility] = useState<Record<string, boolean>>({});
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

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

  const toggleAllPoints = (visible: boolean) => {
    const updated: Record<string, boolean> = {};
    pointRows.forEach((p: any) => {
      updated[p.pointId] = visible;
    });
    setPointVisibility(updated);
    setShowPointLines(visible);
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

  // Helper tính thang đo chuẩn hóa (Nice Numbers Scale) với các mốc chia tròn đều, chuẩn xác
  const calcNiceScale = (rawValMax: number) => {
    if (rawValMax <= 0) {
      const defaultMax = 100;
      const ticks = [0, 25, 50, 75, 100].map(val => ({
        val,
        y: paddingTop + chartH - (val / defaultMax) * chartH,
      }));
      return { maxVal: defaultMax, yTicks: ticks };
    }

    // Đệm 6% để đỉnh cao nhất không chạm sát mép trên
    const paddedMax = rawValMax * 1.06;
    const targetIntervals = 5;
    const roughStep = paddedMax / targetIntervals;

    const exponent = Math.floor(Math.log10(roughStep));
    const magnitude = Math.pow(10, exponent);
    const fraction = roughStep / magnitude;

    let niceFraction = 1;
    if (fraction <= 1) niceFraction = 1;
    else if (fraction <= 2) niceFraction = 2;
    else if (fraction <= 2.5) niceFraction = 2.5;
    else if (fraction <= 5) niceFraction = 5;
    else niceFraction = 10;

    const step = niceFraction * magnitude;
    const niceMax = Math.ceil(paddedMax / step) * step;

    const ticks: { val: number; y: number }[] = [];
    for (let v = 0; v <= niceMax + step * 0.001; v += step) {
      const roundedVal = Number(v.toFixed(4));
      ticks.push({
        val: roundedVal,
        y: paddingTop + chartH - (roundedVal / niceMax) * chartH,
      });
    }

    return { maxVal: niceMax, yTicks: ticks };
  };

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
    return calcNiceScale(summaryRawMax);
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
    return calcNiceScale(pointRawMax);
  }, [pointRawMax, paddingTop, chartH]);

  // Tìm đỉnh cao nhất & thấp nhất trong kỳ
  const peakStats = useMemo(() => {
    if (seriesData.length === 0) return null;
    let peakSupply = { val: -1, label: '' };
    let peakConsumption = { val: -1, label: '' };
    seriesData.forEach((d: any) => {
      if (d.supply > peakSupply.val) peakSupply = { val: d.supply, label: d.label };
      if (d.consumption > peakConsumption.val) peakConsumption = { val: d.consumption, label: d.label };
    });
    return { peakSupply, peakConsumption };
  }, [seriesData]);

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
  const getX = (idx: number) => {
    if (n <= 1) return paddingLeft + chartW / 2;
    return paddingLeft + (idx / (n - 1)) * chartW;
  };

  // Tọa độ Y cho Biểu đồ 1 (Tổng)
  const getSummaryY = (val: number) => {
    return paddingTop + chartH - (Math.max(0, val) / summaryMaxVal) * chartH;
  };

  // Tọa độ Y cho Biểu đồ 2 (Chi tiết điểm đo)
  const getPointY = (val: number) => {
    return paddingTop + chartH - (Math.max(0, val) / pointMaxVal) * chartH;
  };

  // Tạo đường cong Bezier mượt mà theo hàm lấy Y tương ứng
  const createSmoothPath = (values: number[], getYFn: (val: number) => number) => {
    if (values.length === 0) return '';
    const bottomY = paddingTop + chartH;
    const points = values.map((val, idx) => ({ x: getX(idx), y: Math.min(bottomY, getYFn(val)) }));
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    let d = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 >= points.length ? points.length - 1 : i + 2];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      let cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      let cp2y = p2.y - (p3.y - p1.y) / 6;

      // Giữ đường cong nằm trên hoặc đúng mốc 0, không bị võng xuống dưới trục hoành
      if (p1.y >= bottomY && p2.y >= bottomY) {
        cp1y = bottomY;
        cp2y = bottomY;
      } else {
        cp1y = Math.min(bottomY, cp1y);
        cp2y = Math.min(bottomY, cp2y);
      }

      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    return d;
  };

  // Tạo vùng phủ Gradient (Area)
  const createAreaPath = (values: number[], getYFn: (val: number) => number) => {
    const lineD = createSmoothPath(values, getYFn);
    if (!lineD) return '';
    const lastX = getX(values.length - 1);
    const firstX = getX(0);
    const bottomY = paddingTop + chartH;
    return `${lineD} L ${lastX},${bottomY} L ${firstX},${bottomY} Z`;
  };

  // Định dạng nhãn trục Y
  const formatTickLabel = (val: number, maxV: number) => {
    if (val === 0) return '0';
    if (maxV >= 10000) {
      if (val % 1000 === 0) {
        return `${val / 1000}k`;
      }
      return `${(val / 1000).toFixed(1)}k`;
    }
    return formatVN(val);
  };

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

      {/* Style nội bộ cho biểu đồ */}
      <style>{`
        .utility-trend-chart-root {
          padding: 12px 14px;
          background-color: #ffffff;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          margin-bottom: 14px;
          box-sizing: border-box;
          width: 100%;
        }

        .chart-header-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }

        .chart-submode-pills {
          display: inline-flex;
          border-radius: 8px;
          padding: 2px;
          background-color: #f1f5f9;
          gap: 2px;
        }

        .submode-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 6px;
          border: none;
          background-color: transparent;
          color: #64748b;
          font-size: 11.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .submode-btn.active {
          background-color: #ffffff;
          color: #0f172a;
          box-shadow: 0 1px 2px rgba(0,0,0,0.08);
        }

        .chart-legend-row {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .legend-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          border: 1px solid;
          cursor: pointer;
          background-color: #ffffff;
          transition: all 0.15s ease;
        }

        .legend-pill.supply {
          border-color: #bfdbfe;
          color: #1d4ed8;
        }
        .legend-pill.consumption {
          border-color: #bbf7d0;
          color: #047857;
        }
        .legend-pill.delta {
          border-color: #fde68a;
          color: #b45309;
        }
        .legend-pill.recycled {
          border-color: #ddd6fe;
          color: #7c3aed;
        }
        .legend-pill.point-master {
          border-color: #c7d2fe;
          color: #4338ca;
          background-color: #eef2ff;
        }
        .legend-dot.point-master {
          background-color: #6366f1;
        }

        .chart-points-pills-bar {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 8px 12px;
          background-color: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          margin-bottom: 12px;
        }

        .points-pills-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11px;
          font-weight: 700;
          color: #475569;
        }

        .points-quick-actions {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .btn-point-action {
          border: none;
          background: none;
          color: #059669;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          padding: 0;
          transition: color 0.15s ease;
        }

        .btn-point-action:hover {
          color: #047857;
          text-decoration: underline;
        }

        .action-sep {
          color: #cbd5e1;
          font-size: 10px;
        }

        .points-pills-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .point-chip-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          border: 1px solid;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .point-chip-btn.hovered {
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
          transform: translateY(-1px);
        }

        .point-chip-btn.inactive {
          opacity: 0.45;
          text-decoration: line-through;
          background-color: #f1f5f9 !important;
          border-color: #cbd5e1 !important;
          color: #94a3b8 !important;
        }

        .point-chip-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .point-chip-code {
          font-weight: 700;
        }

        .point-chip-val {
          font-weight: 700;
          font-size: 10px;
          padding-left: 2px;
        }

        .tooltip-points-section {
          margin-top: 6px;
          padding-top: 6px;
          border-top: 1px dashed #e2e8f0;
        }

        .tooltip-points-title {
          font-size: 10.5px;
          font-weight: 700;
          color: #475569;
          margin-bottom: 4px;
        }

        .tooltip-points-scroll {
          max-height: 160px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .tooltip-point-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          font-size: 10.5px;
        }

        .tooltip-point-left {
          display: flex;
          align-items: center;
          gap: 4px;
          min-width: 0;
        }

        .tooltip-point-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .tooltip-point-name {
          color: #334155;
          font-weight: 600;
          max-width: 140px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .tooltip-point-num {
          font-weight: 700;
          flex-shrink: 0;
        }

        .legend-pill.inactive {
          opacity: 0.45;
          text-decoration: line-through;
          background-color: #f8fafc;
        }

        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .legend-dot.supply { background-color: #2563eb; }
        .legend-dot.consumption { background-color: #10b981; }
        .legend-dot.delta { background-color: #f59e0b; }
        .legend-dot.recycled { background-color: #8b5cf6; }

        .chart-quick-metrics {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          padding: 8px 12px;
          background-color: #f8fafc;
          border-radius: 8px;
          margin-bottom: 12px;
          border: 1px solid #f1f5f9;
        }

        .metric-chip {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11.5px;
        }

        .chip-label {
          color: #64748b;
          font-weight: 500;
        }

        .chip-val.supply { color: #1d4ed8; }
        .chip-val.cons { color: #047857; }
        .chip-val.avg { color: #0f172a; }

        .chip-date {
          font-size: 10.5px;
          color: #94a3b8;
        }

        .svg-chart-container {
          position: relative;
          width: 100%;
          overflow: hidden;
          background: #ffffff;
        }

        .interactive-svg-chart {
          width: 100%;
          height: auto;
          display: block;
        }

        .sub-chart-box {
          background-color: #ffffff;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
        }

        .sub-chart-header {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-height: 66px;
          margin-bottom: 8px;
        }

        .sub-chart-title-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sub-chart-title {
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
          line-height: 1.3;
        }

        .dual-charts-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          width: 100%;
        }

        @media (max-width: 1150px) {
          .dual-charts-grid {
            grid-template-columns: 1fr;
          }
        }

        .tooltip-axis-title {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          margin-bottom: 4px;
        }
        .tooltip-axis-title.summary {
          color: #1d4ed8;
        }
        .tooltip-axis-title.points {
          color: #7c3aed;
        }

        .chart-tooltip-floating {
          position: absolute;
          transform: translateX(-50%);
          background-color: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 8px 10px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.12);
          pointer-events: none;
          z-index: 20;
          min-width: 190px;
          font-size: 11.5px;
        }

        .tooltip-title {
          display: flex;
          align-items: center;
          gap: 5px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 5px;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 4px;
        }

        .tooltip-day-tag {
          font-size: 10px;
          padding: 1px 4px;
          border-radius: 4px;
          background-color: #f1f5f9;
          color: #475569;
        }

        .tooltip-body {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .tooltip-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .tooltip-legend-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }
        .tooltip-legend-dot.supply { background-color: #2563eb; }
        .tooltip-legend-dot.consumption { background-color: #10b981; }
        .tooltip-legend-dot.delta { background-color: #f59e0b; }
        .tooltip-legend-dot.recycled { background-color: #8b5cf6; }

        .tooltip-label {
          color: #64748b;
          font-size: 11px;
          flex: 1;
        }

        .tooltip-val {
          font-weight: 700;
        }
        .tooltip-val.supply { color: #1d4ed8; }
        .tooltip-val.consumption { color: #047857; }
        .tooltip-val.delta { color: #b45309; }
        .tooltip-val.recycled { color: #7c3aed; }

        /* Donut Chart Styles */
        .donut-chart-layout {
          display: grid;
          grid-template-columns: 240px 1fr;
          gap: 20px;
          align-items: center;
          padding: 12px 6px;
        }

        .donut-svg-col {
          display: flex;
          justify-content: center;
        }

        .donut-svg {
          width: 220px;
          height: 220px;
        }

        .donut-legend-col {
          display: flex;
          flex-direction: column;
        }

        .donut-legend-title {
          font-size: 12.5px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 10px 0;
        }

        .donut-legend-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 8px;
        }

        .donut-legend-item {
          padding: 7px 10px;
          border-radius: 8px;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .donut-item-header {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
        }

        .donut-item-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .donut-item-code {
          color: #0f172a;
        }

        .donut-item-name {
          color: #64748b;
          font-size: 11px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .donut-item-stats {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11.5px;
          margin-top: 2px;
        }

        .donut-item-val {
          font-weight: 700;
          color: #0f172a;
        }

        .donut-item-badge {
          font-size: 10.5px;
          font-weight: 800;
          padding: 1px 6px;
          border-radius: 4px;
        }

        @media (max-width: 768px) {
          .donut-chart-layout {
            grid-template-columns: 1fr;
          }
          .donut-legend-list {
            grid-template-columns: 1fr;
          }
          .chart-header-bar {
            flex-direction: column;
            align-items: stretch;
          }
          .chart-submode-pills {
            width: 100%;
          }
          .submode-btn {
            flex: 1;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};
