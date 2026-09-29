import { formatVN } from '../../utils/formatters';

interface ChartGeometry {
  chartHeight: number;
  chartWidth: number;
  paddingLeft: number;
  paddingTop: number;
  pointCount: number;
}

export const calculateNiceScale = (
  rawValueMax: number,
  paddingTop: number,
  chartHeight: number,
) => {
  if (rawValueMax <= 0) {
    const maxValue = 100;
    const yTicks = [0, 25, 50, 75, 100].map(value => ({
      val: value,
      y: paddingTop + chartHeight - (value / maxValue) * chartHeight,
    }));
    return { maxVal: maxValue, yTicks };
  }

  const paddedMax = rawValueMax * 1.06;
  const roughStep = paddedMax / 5;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const fraction = roughStep / magnitude;
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  const step = niceFraction * magnitude;
  const maxValue = Math.ceil(paddedMax / step) * step;
  const yTicks: { val: number; y: number }[] = [];

  for (let value = 0; value <= maxValue + step * 0.001; value += step) {
    const roundedValue = Number(value.toFixed(4));
    yTicks.push({
      val: roundedValue,
      y: paddingTop + chartHeight - (roundedValue / maxValue) * chartHeight,
    });
  }

  return { maxVal: maxValue, yTicks };
};

export const getChartX = (index: number, geometry: ChartGeometry) => {
  const { chartWidth, paddingLeft, pointCount } = geometry;
  if (pointCount <= 1) return paddingLeft + chartWidth / 2;
  return paddingLeft + (index / (pointCount - 1)) * chartWidth;
};

export const getChartY = (
  value: number,
  maxValue: number,
  paddingTop: number,
  chartHeight: number,
) => paddingTop + chartHeight - (Math.max(0, value) / maxValue) * chartHeight;

export const createSmoothChartPath = (
  values: number[],
  getY: (value: number) => number,
  geometry: ChartGeometry,
) => {
  if (values.length === 0) return '';

  const bottomY = geometry.paddingTop + geometry.chartHeight;
  const points = values.map((value, index) => ({
    x: getChartX(index, geometry),
    y: Math.min(bottomY, getY(value)),
  }));
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x},${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const point0 = points[index === 0 ? 0 : index - 1];
    const point1 = points[index];
    const point2 = points[index + 1];
    const point3 = points[index + 2 >= points.length ? points.length - 1 : index + 2];
    const control1X = point1.x + (point2.x - point0.x) / 6;
    let control1Y = point1.y + (point2.y - point0.y) / 6;
    const control2X = point2.x - (point3.x - point1.x) / 6;
    let control2Y = point2.y - (point3.y - point1.y) / 6;

    if (point1.y >= bottomY && point2.y >= bottomY) {
      control1Y = bottomY;
      control2Y = bottomY;
    } else {
      control1Y = Math.min(bottomY, control1Y);
      control2Y = Math.min(bottomY, control2Y);
    }

    path += ` C ${control1X},${control1Y} ${control2X},${control2Y} ${point2.x},${point2.y}`;
  }
  return path;
};

export const createAreaChartPath = (
  values: number[],
  getY: (value: number) => number,
  geometry: ChartGeometry,
) => {
  const linePath = createSmoothChartPath(values, getY, geometry);
  if (!linePath) return '';
  const lastX = getChartX(values.length - 1, geometry);
  const firstX = getChartX(0, geometry);
  const bottomY = geometry.paddingTop + geometry.chartHeight;
  return `${linePath} L ${lastX},${bottomY} L ${firstX},${bottomY} Z`;
};

export const formatChartTick = (value: number, maxValue: number) => {
  if (value === 0) return '0';
  if (maxValue >= 10000) {
    return value % 1000 === 0 ? `${value / 1000}k` : `${(value / 1000).toFixed(1)}k`;
  }
  return formatVN(value);
};
