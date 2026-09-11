import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast, useConfirmDialog } from '../components/common/Toast';
import { 
  Zap, Droplets, Cpu, QrCode, BarChart3, BarChart2,
  RefreshCw, Plus, Edit2, Trash2, 
  Printer, Download, Search, CheckCircle2, 
  Clock, Settings, FileText, ArrowRight,
  Calendar, PieChart, AlertTriangle, Layers,
  Ban, XCircle, ShieldAlert, Activity, Filter, X,
  TrendingUp, TrendingDown, CalendarDays, ChevronLeft, ChevronRight,
  Play, Square
} from 'lucide-react';
import { formatVN } from '../utils/formatters';
import { UtilityTrendChart } from '../components/utilities/UtilityTrendChart';
import { usePermissions } from '../hooks/usePermissions';

export const UtilitiesPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { confirm } = useConfirmDialog();
  const { can, isAdmin } = usePermissions();

  const [activeTab, setActiveTab] = useState<'overview' | 'readings' | 'statusLogs' | 'points' | 'cumulative'>('overview');
  const [loading, setLoading] = useState(false);

  // Dữ liệu chính
  const [points, setPoints] = useState<any[]>([]);
  const [readings, setReadings] = useState<any[]>([]);
  const [statusLogs, setStatusLogs] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);

  // Báo cáo tích lũy theo kỳ
  const [cumulativeType, setCumulativeType] = useState<'ELECTRICITY' | 'WATER'>('ELECTRICITY');
  const [cumulativeMonth, setCumulativeMonth] = useState<number>(new Date().getMonth() + 1);
  const [cumulativeYear, setCumulativeYear] = useState<number>(new Date().getFullYear());
  const [cumulativeData, setCumulativeData] = useState<any | null>(null);
  const [cumulativeLoading, setCumulativeLoading] = useState(false);
  const [cumulativeFilter, setCumulativeFilter] = useState<string>('ALL');

  // Báo cáo ma trận xu hướng theo thời gian (Giờ / Ngày / Tháng / Năm)
  const [trendViewMode, setTrendViewMode] = useState<'HOURLY' | 'DAILY' | 'MONTHLY' | 'YEARLY'>('DAILY');
  const [trendDay, setTrendDay] = useState<number>(new Date().getDate());
  const [trendMonth, setTrendMonth] = useState<number>(new Date().getMonth() + 1);
  const [trendYear, setTrendYear] = useState<number>(new Date().getFullYear());
  const [trendStartYear, setTrendStartYear] = useState<number>(new Date().getFullYear() - 3);
  const [trendEndYear, setTrendEndYear] = useState<number>(new Date().getFullYear());
  const [trendFilter, setTrendFilter] = useState<string>('ALL');
  const [trendData, setTrendData] = useState<any | null>(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendDisplayType, setTrendDisplayType] = useState<'TABLE' | 'CHART'>('TABLE');
  const trendTableContainerRef = useRef<HTMLDivElement>(null);

  const scrollTrendTable = (offset: number) => {
    if (trendTableContainerRef.current) {
      trendTableContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const scrollToPeriod = (ratio: number) => {
    if (trendTableContainerRef.current) {
      const maxScroll = trendTableContainerRef.current.scrollWidth - trendTableContainerRef.current.clientWidth;
      trendTableContainerRef.current.scrollTo({ left: maxScroll * ratio, behavior: 'smooth' });
    }
  };

  // Bộ lọc Sổ Ghi: Tách thành 2 bộ lọc (1: Theo loại tiện ích/nhóm, 2: Chi tiết từng điểm đo)
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterPointId, setFilterPointId] = useState<string>('ALL');
  const [filterSearch, setFilterSearch] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'VOIDED'>('ACTIVE');

  // Modal Đánh dấu Hủy kết quả sai
  const [voidModalReading, setVoidModalReading] = useState<any | null>(null);
  const [voidReason, setVoidReason] = useState<string>('');
  const [voiding, setVoiding] = useState<boolean>(false);
  const [recalculating, setRecalculating] = useState<boolean>(false);

  // Modal Chỉnh Sửa Bản Ghi Chỉ Số
  const [editModalReading, setEditModalReading] = useState<any | null>(null);
  const [editReadingForm, setEditReadingForm] = useState({
    readingValue: 0,
    previousValue: 0,
    recordedAt: '',
    shift: 'ALL',
    notes: '',
  });
  const [savingEditReading, setSavingEditReading] = useState(false);

  // Modal State cho Thêm/Sửa Điểm đo
  const [showPointModal, setShowPointModal] = useState(false);
  const [editingPoint, setEditingPoint] = useState<any | null>(null);
  const [pointForm, setPointForm] = useState({
    code: '',
    name: '',
    type: 'ELECTRICITY',
    location: '',
    tariffType: 'SINGLE',
    multiplier: 1.0,
    unit: 'kWh',
    description: '',
    isSupplyMeter: false,
    isRecycledWater: false,
    isExcludedFromTotal: false,
  });

  // Modal Xem & In mã QR
  const [printPoint, setPrintPoint] = useState<any | null>(null);

  // Mốc thời gian thực để tính giờ chạy hệ thống phụ trợ (tự động nhảy theo thời gian thực)
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 15000); // Tự động đồng bộ mỗi 15 giây
    return () => clearInterval(timer);
  }, []);

  // Hàm tính toán số giờ chạy thực tế (tích lũy + thời gian đang chạy từ lúc bật đến nay)
  const getLiveHourMeter = (sys: any) => {
    const baseHours = sys.lastReadingValue || 0;
    const startAt = sys.lastReadingAt || (sys.statusLogs?.length > 0 ? sys.statusLogs[0].recordedAt : null);
    if (sys.currentStatus !== 'RUNNING' || !startAt) {
      return { total: baseHours, sessionDelta: 0, isRunning: false };
    }
    const elapsedMs = Math.max(0, currentTime - new Date(startAt).getTime());
    const elapsedHours = elapsedMs / (1000 * 60 * 60);
    return {
      total: Math.round((baseHours + elapsedHours) * 10) / 10,
      sessionDelta: Math.round(elapsedHours * 10) / 10,
      isRunning: true,
    };
  };

  // Tải toàn bộ dữ liệu tiện ích
  const loadData = async () => {
    setLoading(true);
    try {
      const [pointsRes, readingsRes, logsRes, analyticsRes] = await Promise.all([
        api.getUtilityPoints(),
        api.getUtilityReadings({ limit: 500, includeEvn: true }),
        api.getUtilityStatusLogs({ limit: 100 }),
        api.getUtilityAnalytics({ days: 7 }),
      ]);

      const pointsList = Array.isArray(pointsRes) ? pointsRes : (pointsRes?.items || []);
      const readingsList = Array.isArray(readingsRes) ? readingsRes : (readingsRes?.items || []);
      const logsList = Array.isArray(logsRes) ? logsRes : (logsRes?.items || []);

      setPoints(pointsList);
      setReadings(readingsList);
      setStatusLogs(logsList);
      setAnalytics(analyticsRes || null);
    } catch (err: any) {
      console.error('Lỗi khi tải dữ liệu tiện ích:', err);
      toast.error('Lỗi tải dữ liệu', err?.message || 'Không thể tải dữ liệu tiện ích.');
    } finally {
      setLoading(false);
    }
  };

  // Tải báo cáo tích lũy theo kỳ
  const loadCumulativeReport = async () => {
    setCumulativeLoading(true);
    try {
      const data = await api.getCumulativeUtilityReport({
        type: cumulativeType,
        month: cumulativeMonth,
        year: cumulativeYear,
      });
      setCumulativeData(data);
    } catch (err: any) {
      console.error('Lỗi khi tải báo cáo tích lũy:', err);
      toast.error('Lỗi tải báo cáo', err?.message || 'Không thể tải dữ liệu báo cáo tích lũy.');
    } finally {
      setCumulativeLoading(false);
    }
  };

  // Tải báo cáo ma trận xu hướng theo thời gian
  const loadTrendMatrixReport = async () => {
    setTrendLoading(true);
    try {
      const data = await api.getUtilityTrendMatrix({
        type: cumulativeType,
        viewMode: trendViewMode,
        day: trendDay,
        month: trendMonth,
        year: trendYear,
        startYear: trendStartYear,
        endYear: trendEndYear,
      });
      setTrendData(data);
    } catch (err: any) {
      console.error('Lỗi khi tải báo cáo ma trận xu hướng:', err);
      toast.error('Lỗi tải xu hướng', err?.message || 'Không thể tải dữ liệu ma trận xu hướng.');
    } finally {
      setTrendLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'cumulative') {
      loadCumulativeReport();
    }
  }, [activeTab, cumulativeType, cumulativeMonth, cumulativeYear]);

  useEffect(() => {
    if (activeTab === 'readings') {
      api.getUtilityReadings({ limit: 500, includeEvn: true }).then((res: any) => {
        const list = Array.isArray(res) ? res : (res?.items || []);
        setReadings(list);
      }).catch(console.error);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'readings' && filterPointId !== 'ALL') {
      api.getUtilityReadings({ pointId: filterPointId, limit: 500, includeEvn: true }).then((res: any) => {
        const list = Array.isArray(res) ? res : (res?.items || []);
        if (list.length > 0) {
          setReadings((prev) => {
            const existingIds = new Set(list.map((x: any) => x.id));
            return [...list, ...prev.filter((x: any) => !existingIds.has(x.id))];
          });
        }
      }).catch(console.error);
    }
  }, [activeTab, filterPointId]);

  useEffect(() => {
    if (activeTab === 'cumulative') {
      loadTrendMatrixReport();
    }
  }, [activeTab, cumulativeType, trendViewMode, trendDay, trendMonth, trendYear, trendStartYear, trendEndYear]);

  // Xuất file CSV báo cáo ma trận xu hướng
  const handleExportTrendCSV = () => {
    if (!trendData || !trendData.timeColumns || trendData.timeColumns.length === 0) {
      toast.error('Chưa có dữ liệu', 'Không có dữ liệu ma trận để xuất file.');
      return;
    }
    const unit = trendData.unit || (cumulativeType === 'ELECTRICITY' ? 'kWh' : 'm³');
    const cols = trendData.timeColumns;
    let csv = '\uFEFF';
    csv += `BÁO CÁO TỔNG HỢP & XU HƯỚNG TIÊU THỤ ${trendData.type === 'ELECTRICITY' ? 'ĐIỆN NĂNG' : 'NƯỚC SẠCH'} THEO ${trendViewMode === 'HOURLY' ? `GIỜ (NGÀY ${trendDay}/${trendMonth}/${trendYear})` : trendViewMode === 'DAILY' ? `NGÀY (THÁNG ${trendMonth}/${trendYear})` : trendViewMode === 'MONTHLY' ? `THÁNG (NĂM ${trendYear})` : `CÁC NĂM (${trendStartYear} - ${trendEndYear})`}\n`;
    csv += `Ngày xuất:;${new Date().toLocaleString('vi-VN')}\n`;
    csv += `Đơn vị tính:;${unit}\n\n`;

    const headers = ['STT', 'Mã Điểm Đo', 'Tên Điểm Đo', 'Vị Trí', ...cols.map((c: any) => `"${c.label}"`), `Tổng Cộng (${unit})`, `Trung Bình (${unit})`];
    csv += headers.join(';') + '\n';

    if (trendData.summaryRows) {
      const { totalSupply, totalConsumption, totalRecycled, delta } = trendData.summaryRows;
      if (totalSupply) {
        csv += `Σ;NGUỒN CẤP;1. TỔNG CẤP VÀO;Toàn nhà máy;${cols.map((c: any) => totalSupply.values?.[c.key] || 0).join(';')};${totalSupply.total};${totalSupply.average}\n`;
      }
      if (totalConsumption) {
        csv += `Σ;TIÊU THỤ;2. TỔNG SỬ DỤNG NỘI BỘ;Các phân xưởng;${cols.map((c: any) => totalConsumption.values?.[c.key] || 0).join(';')};${totalConsumption.total};${totalConsumption.average}\n`;
      }
      if (totalRecycled && trendData.type === 'WATER' && totalRecycled.total > 0) {
        csv += `Σ;TÁI SINH;3. NƯỚC TÁI SỬ DỤNG;Thu hồi RO/tái sinh;${cols.map((c: any) => totalRecycled.values?.[c.key] || 0).join(';')};${totalRecycled.total};${totalRecycled.average}\n`;
      }
      if (delta) {
        csv += `Δ;HAO HỤT;4. CHÊNH LỆCH / HAO HỤT;Hệ thống phân phối;${cols.map((c: any) => delta.values?.[c.key] || 0).join(';')};${delta.total};${delta.average}\n`;
      }
      csv += '\n';
    }

    displayedTrendRows.forEach((r: any, idx: number) => {
      const rowData = [
        idx + 1,
        `"${r.code}"`,
        `"${r.name}"`,
        `"${r.location}"`,
        ...cols.map((c: any) => r.values?.[c.key] || 0),
        r.total,
        r.average,
      ];
      csv += rowData.join(';') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Ma_tran_xu_huong_${trendData.type.toLowerCase()}_${trendViewMode.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Xuất file thành công', 'Đã tải xuống file CSV báo cáo ma trận xu hướng.');
  };

  // Xuất file CSV báo cáo tích lũy
  const handleExportCumulativeCSV = () => {
    if (!cumulativeData) {
      toast.error('Chưa có dữ liệu', 'Vui lòng chờ tải dữ liệu báo cáo xong.');
      return;
    }
    const { summary, supplyMeters, consumptionMeters, recycledMeters, excludedMeters, cycleDescription, type, month, year } = cumulativeData;
    const unit = summary?.unit || '';

    let csv = '\uFEFF'; // UTF-8 BOM
    csv += `BÁO CÁO TÍCH LŨY ${type === 'ELECTRICITY' ? 'ĐIỆN NĂNG' : 'NƯỚC SẠCH'} THEO KỲ\n`;
    csv += `Chu kỳ tính toán:;${cycleDescription}\n`;
    csv += `Kỳ Tháng/Năm:;${month}/${year}\n`;
    csv += `Ngày xuất báo cáo:;${new Date().toLocaleString('vi-VN')}\n\n`;

    csv += `TỔNG KẾT ĐỐI SOÁT;\n`;
    csv += `Tổng cấp vào (${unit}):;${summary.totalSupply}\n`;
    csv += `Tổng đo tiêu thụ (${unit}):;${summary.totalConsumption}\n`;
    if (summary.totalRecycled !== undefined && summary.totalRecycled > 0) {
      csv += `Lượng nước tái sử dụng (${unit}):;${summary.totalRecycled} (Không tính vào tổng dùng để chống tính trùng)\n`;
      csv += `Tỷ lệ tái sử dụng (%):;${summary.recycleRate}%\n`;
    }
    csv += `Chênh lệch hao hụt (${unit}):;${summary.delta}\n`;
    csv += `Tỷ lệ hao hụt (%):;${summary.lossRate}%\n\n`;

    csv += `CHI TIẾT ĐỒNG HỒ NGUỒN TỔNG CẤP;\n`;
    csv += `STT;Mã;Tên đồng hồ;Vị trí;Số đầu kỳ;Số cuối kỳ;Hệ số;Sản lượng (${unit});Tỷ trọng (%)\n`;
    (supplyMeters || []).forEach((m: any, i: number) => {
      csv += `${i + 1};${m.code};${m.name};${m.location};${m.startValue};${m.endValue};${m.multiplier};${m.periodConsumption};${m.sharePercent}%\n`;
    });
    csv += `\n`;

    csv += `CHI TIẾT ĐỒNG HỒ ĐO TIÊU THỤ NỘI BỘ;\n`;
    csv += `STT;Mã;Tên đồng hồ;Vị trí;Số đầu kỳ;Số cuối kỳ;Hệ số;Sản lượng (${unit});Tỷ trọng (%)\n`;
    (consumptionMeters || []).forEach((m: any, i: number) => {
      csv += `${i + 1};${m.code};${m.name};${m.location};${m.startValue};${m.endValue};${m.multiplier};${m.periodConsumption};${m.sharePercent}%\n`;
    });

    if (recycledMeters && recycledMeters.length > 0) {
      csv += `\n`;
      csv += `CHI TIẾT ĐỒNG HỒ ĐO NƯỚC TÁI SỬ DỤNG (KHÔNG CỘNG DỒN VÀO TỔNG DÙNG);\n`;
      csv += `STT;Mã;Tên đồng hồ;Vị trí;Số đầu kỳ;Số cuối kỳ;Hệ số;Sản lượng (${unit});Tỷ trọng tái sinh (%)\n`;
      recycledMeters.forEach((m: any, i: number) => {
        csv += `${i + 1};${m.code};${m.name};${m.location};${m.startValue};${m.endValue};${m.multiplier};${m.periodConsumption};${m.sharePercent}%\n`;
      });
    }

    if (excludedMeters && excludedMeters.length > 0) {
      csv += `\n`;
      csv += `CHI TIẾT ĐỒNG HỒ ĐO ĐỐI CHỨNG (KHÔNG TÍNH VÀO TỔNG CẤP & TỔNG DÙNG);\n`;
      csv += `STT;Mã;Tên đồng hồ;Vị trí;Số đầu kỳ;Số cuối kỳ;Hệ số;Sản lượng (${unit});Ghi chú\n`;
      excludedMeters.forEach((m: any, i: number) => {
        csv += `${i + 1};${m.code};${m.name};${m.location};${m.startValue};${m.endValue};${m.multiplier};${m.periodConsumption};Đối chứng / Không tính tổng\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bao_cao_tich_luy_${type.toLowerCase()}_ky_${month}_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Xuất file thành công', `Đã tải xuống file CSV báo cáo kỳ ${month}/${year}.`);
  };

  // Mở modal thêm điểm đo
  const handleOpenAddPoint = () => {
    setEditingPoint(null);
    setPointForm({
      code: `ELEC-DB-${Math.floor(10 + Math.random() * 90)}`,
      name: '',
      type: 'ELECTRICITY',
      location: '',
      tariffType: 'SINGLE',
      multiplier: 1.0,
      unit: 'kWh',
      description: '',
      isSupplyMeter: false,
      isRecycledWater: false,
      isExcludedFromTotal: false,
    });
    setShowPointModal(true);
  };

  // Mở modal sửa điểm đo
  const handleOpenEditPoint = (point: any) => {
    setEditingPoint(point);
    setPointForm({
      code: point.code,
      name: point.name,
      type: point.type,
      location: point.location,
      tariffType: point.tariffType || 'SINGLE',
      multiplier: point.multiplier || 1.0,
      unit: point.unit || 'kWh',
      description: point.description || '',
      isSupplyMeter: Boolean(point.isSupplyMeter),
      isRecycledWater: Boolean(point.isRecycledWater),
      isExcludedFromTotal: Boolean(point.isExcludedFromTotal),
    });
    setShowPointModal(true);
  };

  // Lưu điểm đo (Thêm hoặc Sửa)
  const handleSavePoint = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPoint) {
        await api.updateUtilityPoint(editingPoint.id, pointForm);
        toast.success('Thành công', 'Đã cập nhật thông tin điểm đo.');
      } else {
        await api.createUtilityPoint(pointForm);
        toast.success('Thành công', 'Đã thêm mới điểm đo/hệ thống tiện ích.');
      }
      setShowPointModal(false);
      loadData();
    } catch (err: any) {
      toast.error('Lỗi lưu điểm đo', err?.message || 'Không thể lưu điểm đo.');
    }
  };

  // Xóa điểm đo
  const handleDeletePoint = async (point: any) => {
    const ok = await confirm(
      'Xóa điểm đo',
      `Bạn có chắc muốn xóa điểm đo [${point.code} - ${point.name}]? Tất cả dữ liệu lịch sử đo liên quan sẽ bị xóa!`,
      { type: 'danger' }
    );
    if (!ok) return;

    try {
      await api.deleteUtilityPoint(point.id);
      toast.success('Đã xóa', `Đã xóa điểm đo [${point.code}].`);
      loadData();
    } catch (err: any) {
      toast.error('Lỗi xóa điểm đo', err?.message || 'Không thể xóa điểm đo.');
    }
  };

  // Đổi trạng thái nhanh của Hệ thống phụ trợ
  const handleQuickToggleStatus = async (point: any, nextStatus: string) => {
    try {
      await api.recordUtilitySystemStatus({
        pointId: point.id,
        status: nextStatus as any,
        reason: `Chuyển trạng thái nhanh trên Dashboard sang ${nextStatus}`,
      });
      toast.success('Thành công', `Đã cập nhật trạng thái ${point.name} thành [${nextStatus}].`);
      loadData();
    } catch (err: any) {
      toast.error('Lỗi cập nhật', err?.message || 'Không thể đổi trạng thái.');
    }
  };

  // Chuẩn hóa & Tính toán lại toàn bộ chuỗi số liệu lịch sử
  const handleRecalculateAll = async () => {
    const ok = await confirm(
      'Chuẩn Hóa & Tính Lại Toàn Bộ Sản Lượng',
      'Hệ thống sẽ rà soát toàn bộ lịch sử ghi chỉ số theo thời gian của từng đồng hồ, tự động đồng bộ lại chỉ số trước và tính lại sản lượng tiêu thụ chuẩn xác theo hệ số nhân. Bạn có chắc muốn thực hiện?',
      { type: 'info' }
    );
    if (!ok) return;

    setRecalculating(true);
    try {
      const res = await api.recalculateUtilityReadings();
      toast.success('Đồng bộ thành công', res.message || 'Đã tính toán và chuẩn hóa lại dữ liệu.');
      await loadData();
      if (activeTab === 'cumulative') {
        loadCumulativeReport();
        loadTrendMatrixReport();
      }
    } catch (err: any) {
      toast.error('Lỗi tính toán lại', err?.message || 'Không thể đồng bộ lại dữ liệu.');
    } finally {
      setRecalculating(false);
    }
  };

  // Xuất file CSV danh sách ghi số
  const handleExportReadingsCSV = () => {
    if (filteredReadings.length === 0) {
      toast.warning('Chưa có dữ liệu', 'Không có bản ghi nào để xuất file.');
      return;
    }

    const headers = [
      'Thời gian ghi',
      'Mã điểm đo',
      'Tên điểm đo',
      'Vị trí',
      'Loại tiện ích',
      'Chỉ số trước',
      'Chỉ số mới',
      'Sản lượng tiêu thụ',
      'Đơn vị',
      'Người ghi',
      'Ghi chú',
    ];

    const rows = filteredReadings.map((r) => [
      new Date(r.recordedAt).toLocaleString('vi-VN'),
      `"${r.point?.code || ''}"`,
      `"${r.point?.name || ''}"`,
      `"${r.point?.location || ''}"`,
      r.point?.type === 'ELECTRICITY' ? 'Điện' : 'Nước',
      r.previousValue,
      r.readingValue,
      r.consumption ?? r.consumptionDelta ?? ((r.readingValue || 0) - (r.previousValue || 0)),
      r.point?.unit || '',
      `"${r.recordedByName || r.recordedByUser?.name || r.recordedBy?.name || ''}"`,
      `"${(r.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `So_ghi_dien_nuoc_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Xuất file thành công', 'Đã tải xuống file CSV danh sách ghi chỉ số.');
  };

  // Danh sách các điểm đo tương ứng với bộ lọc 1 (Loại / Nhóm)
  const filteredPointsForSelect = useMemo(() => {
    let list = (points || []).filter((p: any) => p.type === 'ELECTRICITY' || p.type === 'WATER');
    if (filterCategory === 'ELECTRICITY') {
      list = list.filter((p: any) => p.type === 'ELECTRICITY');
    } else if (filterCategory === 'WATER') {
      list = list.filter((p: any) => p.type === 'WATER');
    } else if (filterCategory === 'SUPPLY') {
      list = list.filter((p: any) => p.isSupplyMeter);
    } else if (filterCategory === 'CONSUMPTION') {
      list = list.filter((p: any) => !p.isSupplyMeter && !p.isRecycledWater && !p.isExcludedFromTotal);
    } else if (filterCategory === 'RECYCLED') {
      list = list.filter((p: any) => p.isRecycledWater);
    } else if (filterCategory === 'EXCLUDED') {
      list = list.filter((p: any) => p.isExcludedFromTotal);
    }
    return list;
  }, [points, filterCategory]);

  const handleCategoryChange = (cat: string) => {
    setFilterCategory(cat);
    setFilterPointId('ALL');
  };

  // Danh sách ghi số đã lọc (mặc định ẩn EVN Bot khi xem chung, nhưng hiển thị đầy đủ khi chọn lọc theo điểm đo cụ thể)
  const filteredReadings = useMemo(() => {
    const isSpecificPointFilter = filterPointId !== 'ALL';

    return readings.filter((r) => {
      // 1. Mặc định ẩn dữ liệu ghi tự động của EVN Bot khỏi sổ ghi chung.
      // Nhưng nếu người dùng chọn lọc theo 1 điểm đo cụ thể (chọn đồng hồ tổng EVN) thì hiển thị đầy đủ toàn bộ ra
      if (!isSpecificPointFilter) {
        const isEvnBot =
          r.recordedByName?.toLowerCase().includes('evn') ||
          r.recordedById === 'system-evn-bot' ||
          r.shift?.toLowerCase().includes('evn') ||
          r.notes?.toLowerCase().includes('amiss');
        if (isEvnBot) return false;
      }

      // 2. Bộ lọc 1: Theo loại tiện ích / Nhóm (Điện, Nước, Tổng cấp, Tiêu thụ, Tái sử dụng, Đối chứng)
      if (filterCategory !== 'ALL') {
        if (filterCategory === 'ELECTRICITY') {
          if (r.point?.type !== 'ELECTRICITY') return false;
        } else if (filterCategory === 'WATER') {
          if (r.point?.type !== 'WATER') return false;
        } else if (filterCategory === 'SUPPLY') {
          if (!r.point?.isSupplyMeter) return false;
        } else if (filterCategory === 'CONSUMPTION') {
          if (r.point?.isSupplyMeter || r.point?.isRecycledWater || r.point?.isExcludedFromTotal) return false;
        } else if (filterCategory === 'RECYCLED') {
          if (!r.point?.isRecycledWater) return false;
        } else if (filterCategory === 'EXCLUDED') {
          if (!r.point?.isExcludedFromTotal) return false;
        }
      }

      // 3. Bộ lọc 2: Theo điểm đo cụ thể trong nhóm
      if (filterPointId !== 'ALL') {
        if (r.pointId !== filterPointId && r.point?.id !== filterPointId && r.point?.code !== filterPointId) {
          return false;
        }
      }

      // 4. Trạng thái bản ghi (Hợp lệ / Đã hủy)
      if (filterStatus === 'ACTIVE' && r.isVoided) return false;
      if (filterStatus === 'VOIDED' && !r.isVoided) return false;

      // 5. Tìm kiếm từ khóa
      if (filterSearch.trim()) {
        const q = filterSearch.toLowerCase();
        const matchCode = r.point?.code?.toLowerCase().includes(q);
        const matchName = r.point?.name?.toLowerCase().includes(q);
        const matchLoc = r.point?.location?.toLowerCase().includes(q);
        const matchNotes = r.notes?.toLowerCase().includes(q);
        const matchVoidReason = r.voidReason?.toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchLoc && !matchNotes && !matchVoidReason) return false;
      }

      return true;
    });
  }, [readings, filterCategory, filterPointId, filterStatus, filterSearch]);

  // Danh sách đồng hồ trong kỳ đã lọc (tính toán động, không hardcode tiền tố hay chuỗi ghép)
  const displayedCumulativeMeters = useMemo(() => {
    const list = cumulativeData?.allMeters || [];
    if (!cumulativeFilter || cumulativeFilter === 'ALL') {
      return list;
    }
    switch (cumulativeFilter) {
      case 'SUPPLY':
        return list.filter((m: any) => m.isSupplyMeter);
      case 'CONSUMPTION':
        return list.filter((m: any) => !m.isSupplyMeter && !m.isRecycledWater && !m.isExcludedFromTotal);
      case 'RECYCLED':
        return list.filter((m: any) => m.isRecycledWater);
      case 'EXCLUDED':
        return list.filter((m: any) => m.isExcludedFromTotal);
      default:
        // Lọc trực tiếp theo ID của điểm đo được chọn
        return list.filter((m: any) => m.id === cumulativeFilter || m.code === cumulativeFilter);
    }
  }, [cumulativeData, cumulativeFilter]);

  // Danh sách dòng điểm đo ma trận xu hướng đã lọc
  const displayedTrendRows = useMemo(() => {
    const rows = trendData?.pointRows || [];
    if (!trendFilter || trendFilter === 'ALL') return rows;
    if (trendFilter === 'SUPPLY') return rows.filter((r: any) => r.isSupplyMeter);
    if (trendFilter === 'CONSUMPTION') return rows.filter((r: any) => !r.isSupplyMeter && !r.isRecycledWater && !r.isExcludedFromTotal);
    if (trendFilter === 'RECYCLED') return rows.filter((r: any) => r.isRecycledWater);
    if (trendFilter === 'EXCLUDED') return rows.filter((r: any) => r.isExcludedFromTotal);
    return rows.filter((r: any) => r.pointId === trendFilter || r.code === trendFilter);
  }, [trendData, trendFilter]);

  // Xử lý xác nhận hủy kết quả sai
  const handleConfirmVoidReading = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidModalReading) return;
    if (!voidReason.trim()) {
      toast.error('Thiếu thông tin', 'Vui lòng nhập lý do hủy kết quả ghi sai!');
      return;
    }

    try {
      setVoiding(true);
      await api.voidUtilityReading(voidModalReading.id, voidReason.trim());
      toast.success(
        'Đã đánh dấu hủy',
        `Bản ghi số của [${voidModalReading.point?.name}] đã được đánh dấu hủy và bảo toàn trong nhật ký kiểm toán.`
      );
      setVoidModalReading(null);
      setVoidReason('');
      await loadData();
    } catch (err: any) {
      toast.error('Lỗi hủy bản ghi', err?.message || 'Không thể hủy bản ghi.');
    } finally {
      setVoiding(false);
    }
  };

  // Mở modal chỉnh sửa bản ghi chỉ số
  const handleOpenEditReading = (r: any) => {
    setEditModalReading(r);
    const d = new Date(r.recordedAt);
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    setEditReadingForm({
      readingValue: r.readingValue || 0,
      previousValue: r.previousValue !== null && r.previousValue !== undefined ? r.previousValue : 0,
      recordedAt: localISOTime,
      shift: r.shift || 'ALL',
      notes: r.notes || '',
    });
  };

  // Xử lý xác nhận lưu chỉnh sửa bản ghi chỉ số
  const handleConfirmEditReading = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalReading) return;
    setSavingEditReading(true);
    try {
      const payload = {
        readingValue: Number(editReadingForm.readingValue),
        previousValue: Number(editReadingForm.previousValue),
        recordedAt: new Date(editReadingForm.recordedAt).toISOString(),
        shift: editReadingForm.shift,
        notes: editReadingForm.notes,
      };
      await api.updateUtilityReading(editModalReading.id, payload);
      toast.success('Thành công', 'Đã cập nhật bản ghi chỉ số và tự động tính lại sản lượng.');
      setEditModalReading(null);
      await loadData();
    } catch (err: any) {
      toast.error('Lỗi cập nhật', err?.message || 'Không thể cập nhật bản ghi.');
    } finally {
      setSavingEditReading(false);
    }
  };

  return (
    <div className="util-page-root">
      {/* 1. Header Trang & Nút Quét QR */}
      <div className="util-page-header">
        <div className="util-header-title-box">
          <h1 className="util-header-title">
            <Zap size={22} color="#eab308" className="util-title-icon" />
            <span>TIỆN ÍCH & NĂNG LƯỢNG</span>
          </h1>
          <p className="util-header-subtitle">
            Theo dõi Điện, Nước và Giám sát Bật/Tắt hệ thống phụ trợ.
          </p>
        </div>

        <div className="util-header-actions">
          {/* Nút Quét QR Lớn Nổi Bật cho Nhân Viên */}
          <button
            onClick={() => navigate('/utilities/scan')}
            className="util-scan-btn"
          >
            <QrCode size={18} />
            <span>QUÉT MÃ QR ĐO ĐẾM</span>
          </button>

          <button
            onClick={loadData}
            title="Làm mới dữ liệu"
            className="util-refresh-btn"
          >
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* 2. Thanh Tabs Điều Hướng */}
      <div className="util-tabs-wrapper">
        <div className="util-tabs-bar">
          {[
            { key: 'overview', label: 'Tổng Quan', fullLabel: 'Tổng Quan & Giám Sát', icon: BarChart3 },
            { key: 'readings', label: `Sổ Ghi (${filteredReadings.length})`, fullLabel: `Sổ Ghi Điện & Nước (${filteredReadings.length})`, icon: FileText },
            { key: 'statusLogs', label: `Bật / Tắt (${statusLogs.length})`, fullLabel: `Lịch Sử Bật / Tắt (${statusLogs.length})`, icon: Cpu },
            { key: 'points', label: `Điểm Đo (${points.length})`, fullLabel: `Danh Mục Điểm Đo & Tem (${points.length})`, icon: Settings },
            { key: 'cumulative', label: 'Báo Cáo Kỳ', fullLabel: 'Báo Cáo Tích Lũy Điện / Nước', icon: Calendar },
          ].map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key as any)}
                className={`util-tab-btn ${isActive ? 'active' : ''}`}
              >
                <Icon size={15} />
                <span className="tab-label-short">{t.label}</span>
                <span className="tab-label-full">{t.fullLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. NỘI DUNG THEO TAB */}

      {/* TAB 1: TỔNG QUAN & GIÁM SÁT */}
      {activeTab === 'overview' && (
        <div className="util-tab-content">
          {/* 6 Thẻ KPI Cards Thu Gọn (Điện Cấp, Điện Dùng, Nước Cấp, Nước Dùng, Phụ Trợ, Điểm Đo) */}
          <div className="util-kpi-grid">
            {/* Card 1: Điện cấp hôm nay */}
            <div className="card util-kpi-card kpi-elec-supply" title="Tổng sản lượng điện nguồn cấp vào nhà máy trong ngày (00h00 - 23h59)">
              <div className="kpi-top">
                <span className="kpi-label">
                  ĐIỆN CẤP HÔM NAY
                  {analytics?.summary?.electricitySupplyMeters?.length > 1 && (
                    <span className="kpi-count-tag">{analytics.summary.electricitySupplyMeters.length} ĐH</span>
                  )}
                </span>
                <div className="kpi-icon-box" style={{ backgroundColor: '#fef9c3', color: '#854d0e' }}>
                  <Zap size={13} />
                </div>
              </div>
              <div className="kpi-val">
                {analytics?.summary?.electricitySupplyToday?.toLocaleString() || 0} <span className="kpi-unit">kWh</span>
              </div>
              {analytics?.summary?.electricitySupplyMeters && analytics.summary.electricitySupplyMeters.length > 1 ? (
                <div className="kpi-meter-list">
                  {analytics.summary.electricitySupplyMeters.map((m: any) => (
                    <div key={m.id} className="kpi-meter-row" title={`${m.code} - ${m.name}: Hôm nay: ${m.today?.toLocaleString()} kWh | 7 ngày: ${m.period?.toLocaleString()} kWh`}>
                      <span className="kpi-meter-code">{m.code}:</span>
                      <span className="kpi-meter-val">{m.today?.toLocaleString() || 0}</span>
                      <span className="kpi-meter-sub">({m.period?.toLocaleString() || 0})</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="kpi-sub">
                  7 ngày: <strong>{analytics?.summary?.electricitySupplyPeriod?.toLocaleString() || 0} kWh</strong>
                </div>
              )}
            </div>

            {/* Card 2: Đã dùng điện hôm nay */}
            <div className="card util-kpi-card kpi-elec-cons" title="Tổng điện năng tiêu thụ thực tế tại các phân xưởng & phụ tải trong ngày (00h00 - 23h59)">
              <div className="kpi-top">
                <span className="kpi-label">ĐÃ DÙNG ĐIỆN</span>
                <div className="kpi-icon-box" style={{ backgroundColor: '#ffedd5', color: '#c2410c' }}>
                  <Activity size={13} />
                </div>
              </div>
              <div className="kpi-val" style={{ color: '#c2410c' }}>
                {analytics?.summary?.electricityConsumptionToday?.toLocaleString() || 0} <span className="kpi-unit">kWh</span>
              </div>
              <div className="kpi-sub">
                7 ngày: <strong>{analytics?.summary?.electricityConsumptionPeriod?.toLocaleString() || 0} kWh</strong>
              </div>
            </div>

            {/* Card 3: Nước cấp hôm nay */}
            <div className="card util-kpi-card kpi-water-supply" title="Tổng lượng nước nguồn cấp vào nhà máy trong ngày (00h00 - 23h59)">
              <div className="kpi-top">
                <span className="kpi-label">
                  NƯỚC CẤP HÔM NAY
                  {analytics?.summary?.waterSupplyMeters?.length > 1 && (
                    <span className="kpi-count-tag">{analytics.summary.waterSupplyMeters.length} ĐH</span>
                  )}
                </span>
                <div className="kpi-icon-box" style={{ backgroundColor: '#e0f2fe', color: '#0369a1' }}>
                  <Droplets size={13} />
                </div>
              </div>
              <div className="kpi-val">
                {analytics?.summary?.waterSupplyToday?.toLocaleString() || 0} <span className="kpi-unit">m³</span>
              </div>
              {analytics?.summary?.waterSupplyMeters && analytics.summary.waterSupplyMeters.length > 1 ? (
                <div className="kpi-meter-list">
                  {analytics.summary.waterSupplyMeters.map((m: any) => (
                    <div key={m.id} className="kpi-meter-row" title={`${m.code} - ${m.name}: Hôm nay: ${m.today?.toLocaleString()} m³ | 7 ngày: ${m.period?.toLocaleString()} m³`}>
                      <span className="kpi-meter-code">{m.code}:</span>
                      <span className="kpi-meter-val">{m.today?.toLocaleString() || 0}</span>
                      <span className="kpi-meter-sub">({m.period?.toLocaleString() || 0})</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="kpi-sub">
                  7 ngày: <strong>{analytics?.summary?.waterSupplyPeriod?.toLocaleString() || 0} m³</strong>
                </div>
              )}
            </div>

            {/* Card 4: Đã dùng nước hôm nay */}
            <div className="card util-kpi-card kpi-water-cons" title="Tổng lượng nước tiêu thụ tại các phân xưởng & dây chuyền nội bộ trong ngày (00h00 - 23h59)">
              <div className="kpi-top">
                <span className="kpi-label">ĐÃ DÙNG NƯỚC</span>
                <div className="kpi-icon-box" style={{ backgroundColor: '#ecfeff', color: '#0e7490' }}>
                  <Droplets size={13} />
                </div>
              </div>
              <div className="kpi-val" style={{ color: '#0e7490' }}>
                {analytics?.summary?.waterConsumptionToday?.toLocaleString() || 0} <span className="kpi-unit">m³</span>
              </div>
              <div className="kpi-sub">
                7 ngày: <strong>{analytics?.summary?.waterConsumptionPeriod?.toLocaleString() || 0} m³</strong>
              </div>
            </div>

            {/* Card 5: Hệ thống đang vận hành */}
            <div className="card util-kpi-card kpi-aux" title="Số lượng máy và hệ thống phụ trợ đang chạy">
              <div className="kpi-top">
                <span className="kpi-label">HỆ THỐNG CHẠY</span>
                <div className="kpi-icon-box" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                  <Cpu size={13} />
                </div>
              </div>
              <div className="kpi-val" style={{ color: '#16a34a' }}>
                {analytics?.systemStatusCounts?.RUNNING || 0} / {analytics?.systemStatusCounts?.TOTAL || 0}
              </div>
              <div className="kpi-sub">
                Tắt: {analytics?.systemStatusCounts?.OFF || 0} • Chờ: {analytics?.systemStatusCounts?.STANDBY || 0}
              </div>
            </div>

            {/* Card 6: Tổng điểm đo */}
            <div className="card util-kpi-card kpi-points" title="Tổng số đồng hồ đo điện, nước và thiết bị phụ trợ">
              <div className="kpi-top">
                <span className="kpi-label">TỔNG ĐIỂM ĐO</span>
                <div className="kpi-icon-box" style={{ backgroundColor: '#f3e8ff', color: '#6b21a8' }}>
                  <QrCode size={13} />
                </div>
              </div>
              <div className="kpi-val">
                {points.length} <span className="kpi-unit">Điểm</span>
              </div>
              <div className="kpi-sub">
                Điện: {analytics?.metersCount?.electricity || 0} • Nước: {analytics?.metersCount?.water || 0}
              </div>
            </div>
          </div>

          {/* Ma trận Giám sát Realtime Hệ thống Phụ trợ */}
          <div className="card util-section-card">
            <div className="section-card-header">
              <div>
                <h3 className="section-title">
                  <Cpu size={18} color="#8b5cf6" />
                  <span>TRẠNG THÁI HỆ THỐNG PHỤ TRỢ (REAL-TIME)</span>
                </h3>
                <p className="section-sub">
                  Giám sát Bật/Tắt, Chế độ chờ và Giờ chạy máy (Chiller, HVAC, Nồi hơi, Máy nén khí).
                </p>
              </div>
              <button
                onClick={() => navigate('/utilities/scan')}
                className="btn-action-outline"
              >
                <QrCode size={15} />
                <span>Quét Cập Nhật</span>
              </button>
            </div>

            <div className="aux-matrix-grid">
              {points.filter((p) => p.type === 'SYSTEM_AUX').map((sys) => {
                const liveHour = getLiveHourMeter(sys);
                const statusColor =
                  sys.currentStatus === 'RUNNING' ? '#16a34a' : sys.currentStatus === 'OFF' ? '#64748b' : sys.currentStatus === 'STANDBY' ? '#ea580c' : '#dc2626';
                const statusBg =
                  sys.currentStatus === 'RUNNING' ? '#f0fdf4' : sys.currentStatus === 'OFF' ? '#f8fafc' : sys.currentStatus === 'STANDBY' ? '#fff7ed' : '#fef2f2';
                const statusText =
                  sys.currentStatus === 'RUNNING' ? 'ĐANG CHẠY' : sys.currentStatus === 'OFF' ? 'ĐANG TẮT' : sys.currentStatus === 'STANDBY' ? 'CHỜ' : 'SỰ CỐ';

                return (
                  <div
                    key={sys.id}
                    className="aux-card"
                    style={{ borderTop: `3px solid ${statusColor}` }}
                  >
                    {/* Dòng 1: Mã thiết bị, vị trí và Huy hiệu trạng thái */}
                    <div className="aux-card-top">
                      <div className="aux-card-header-left">
                        <span className="aux-code">{sys.code}</span>
                        {sys.location && (
                          <span className="aux-loc" title={sys.location}>• {sys.location}</span>
                        )}
                      </div>
                      <span
                        className="aux-status-badge"
                        style={{ backgroundColor: statusBg, color: statusColor, borderColor: statusColor }}
                      >
                        <span className="status-dot" style={{ backgroundColor: statusColor }} />
                        {statusText}
                      </span>
                    </div>

                    {/* Dòng 2: Tên thiết bị và Đồng hồ giờ chạy thu gọn */}
                    <div className="aux-card-mid">
                      <h4 className="aux-name" title={sys.name}>{sys.name}</h4>
                      <div className="aux-hour-inline">
                        <Clock size={12} color={liveHour.isRunning ? '#16a34a' : '#94a3b8'} style={{ flexShrink: 0 }} />
                        <span className="aux-hour-val">
                          {liveHour.total.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}h
                        </span>
                        {liveHour.isRunning && (
                          <span className="aux-hour-delta" title="Giờ chạy lũy kế ca này">
                            (+{liveHour.sessionDelta.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}h)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dòng 3: Nút Bật/Tắt nhanh */}
                    <div className="aux-action-row">
                      {sys.currentStatus !== 'RUNNING' ? (
                        <button
                          onClick={() => handleQuickToggleStatus(sys, 'RUNNING')}
                          className="quick-btn start"
                          title="Bật máy"
                        >
                          <Play size={10} fill="currentColor" /> BẬT MÁY
                        </button>
                      ) : (
                        <button
                          onClick={() => handleQuickToggleStatus(sys, 'OFF')}
                          className="quick-btn stop"
                          title="Tắt máy"
                        >
                          <Square size={9} fill="currentColor" /> TẮT MÁY
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Biểu đồ xu hướng 7 ngày gần nhất */}
          {analytics?.dailyTrends && analytics.dailyTrends.length > 0 && (
            <div className="card util-section-card">
              <h3 className="section-title" style={{ marginBottom: '14px' }}>
                <BarChart3 size={18} color="#2563eb" />
                <span>XU HƯỚNG TIÊU THỤ (7 NGÀY GẦN NHẤT)</span>
              </h3>

              {/* Desktop Table View */}
              <div className="desktop-view-container">
                <div className="table-responsive">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th style={{ width: '130px' }}>Ngày</th>
                        <th>Điện tiêu thụ (kWh)</th>
                        <th>Nước tiêu thụ (m³)</th>
                        <th style={{ width: '100px', textAlign: 'center' }}>Số lượt ghi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.dailyTrends.map((d: any) => {
                        const maxElec = Math.max(...analytics.dailyTrends.map((x: any) => x.electricity || 1), 1);
                        const maxWater = Math.max(...analytics.dailyTrends.map((x: any) => x.water || 1), 1);
                        const pctElec = Math.min(100, Math.round((d.electricity / maxElec) * 100));
                        const pctWater = Math.min(100, Math.round((d.water / maxWater) * 100));

                        return (
                          <tr key={d.date}>
                            <td style={{ fontWeight: 600, fontSize: '13px' }}>
                              {new Date(d.date).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '70px', fontWeight: 700, fontSize: '13px', color: '#854d0e' }}>
                                  {d.electricity.toLocaleString()}
                                </span>
                                <div className="chart-bar-track">
                                  <div className="chart-bar-fill elec" style={{ width: `${pctElec}%` }} />
                                </div>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '50px', fontWeight: 700, fontSize: '13px', color: '#0369a1' }}>
                                  {d.water.toLocaleString()}
                                </span>
                                <div className="chart-bar-track">
                                  <div className="chart-bar-fill water" style={{ width: `${pctWater}%` }} />
                                </div>
                              </div>
                            </td>
                            <td style={{ textAlign: 'center', fontSize: '12.5px', color: '#64748b' }}>
                              {d.readingsCount} lần
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Card/List View */}
              <div className="mobile-cards-feed">
                {analytics.dailyTrends.map((d: any) => {
                  const maxElec = Math.max(...analytics.dailyTrends.map((x: any) => x.electricity || 1), 1);
                  const maxWater = Math.max(...analytics.dailyTrends.map((x: any) => x.water || 1), 1);
                  const pctElec = Math.min(100, Math.round((d.electricity / maxElec) * 100));
                  const pctWater = Math.min(100, Math.round((d.water / maxWater) * 100));

                  return (
                    <div key={d.date} className="mobile-trend-card">
                      <div className="trend-top-row">
                        <span className="trend-date">
                          {new Date(d.date).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                        </span>
                        <span className="trend-count">{d.readingsCount} lần ghi</span>
                      </div>

                      <div className="trend-bar-row">
                        <div className="trend-bar-meta">
                          <span className="trend-label elec">Điện:</span>
                          <span className="trend-val">{d.electricity.toLocaleString()} kWh</span>
                        </div>
                        <div className="chart-bar-track">
                          <div className="chart-bar-fill elec" style={{ width: `${pctElec}%` }} />
                        </div>
                      </div>

                      <div className="trend-bar-row">
                        <div className="trend-bar-meta">
                          <span className="trend-label water">Nước:</span>
                          <span className="trend-val">{d.water.toLocaleString()} m³</span>
                        </div>
                        <div className="chart-bar-track">
                          <div className="chart-bar-fill water" style={{ width: `${pctWater}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SỔ GHI ĐIỆN & NƯỚC */}
      {activeTab === 'readings' && (
        <div className="util-tab-content">
          {/* Bộ lọc đa năng */}
          <div className="card util-filter-bar">
            <div className="filter-search-box">
              <Search size={16} color="#94a3b8" />
              <input
                type="text"
                placeholder="Tìm mã hoặc tên điểm đo..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="filter-search-input"
              />
            </div>

            {/* Bộ lọc 1: Theo loại điện nước và tổng */}
            <select
              value={filterCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="filter-select"
              style={{ minWidth: '180px', fontWeight: 500 }}
              title="Bộ lọc 1: Phân loại tiện ích & nhóm nguồn"
            >
              <option value="ALL">Tất cả loại & nhóm</option>
              <option value="ELECTRICITY">⚡ Điện năng (kWh)</option>
              <option value="WATER">💧 Nước sạch (m³)</option>
              <option value="SUPPLY">🏢 Nguồn Tổng Cấp</option>
              <option value="CONSUMPTION">🏭 Đo Tiêu Thụ Nội Bộ</option>
              {points.some((p: any) => p.isRecycledWater) && (
                <option value="RECYCLED">♻️ Nước Tái Sử Dụng</option>
              )}
              {points.some((p: any) => p.isExcludedFromTotal) && (
                <option value="EXCLUDED">⚖️ Đo Đối Chứng</option>
              )}
            </select>

            {/* Bộ lọc 2: Chi tiết từng điểm đo theo bộ lọc thứ nhất */}
            <select
              value={filterPointId}
              onChange={(e) => setFilterPointId(e.target.value)}
              className="filter-select"
              style={{ minWidth: '220px', fontWeight: 500 }}
              title="Bộ lọc 2: Chi tiết từng điểm đo theo phân loại trên"
            >
              <option value="ALL">
                {filterCategory === 'ALL'
                  ? `Tất cả điểm đo (${filteredPointsForSelect.length})`
                  : `Tất cả điểm trong nhóm (${filteredPointsForSelect.length})`}
              </option>
              {filteredPointsForSelect.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name} {p.isSupplyMeter ? '★ (Tổng cấp)' : ''}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="filter-select"
              style={{ fontWeight: 600, color: filterStatus === 'VOIDED' ? '#dc2626' : filterStatus === 'ACTIVE' ? '#16a34a' : '#0f172a' }}
            >
              <option value="ACTIVE">Chỉ bản ghi hợp lệ</option>
              <option value="ALL">Tất cả (gồm đã hủy)</option>
              <option value="VOIDED">Chỉ bản ghi đã hủy</option>
            </select>

            {(filterCategory !== 'ALL' || filterPointId !== 'ALL' || filterSearch || filterStatus !== 'ACTIVE') && (
              <button
                onClick={() => {
                  setFilterCategory('ALL');
                  setFilterPointId('ALL');
                  setFilterSearch('');
                  setFilterStatus('ACTIVE');
                }}
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
                title="Đặt lại bộ lọc"
              >
                <X size={13} />
                <span>Đặt lại</span>
              </button>
            )}

            <button
              type="button"
              onClick={async () => {
                try {
                  const res = await api.getUtilityReadings({ limit: 500, includeEvn: true });
                  const list = Array.isArray(res) ? res : (res?.items || []);
                  setReadings(list);
                  toast.success('Đã làm mới', 'Đã tải lại danh sách bản ghi mới nhất.');
                } catch (e: any) {
                  toast.error('Lỗi', 'Không thể tải lại danh sách bản ghi.');
                }
              }}
              style={{
                padding: '7px 12px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s',
              }}
              title="Tải lại danh sách bản ghi mới nhất từ máy chủ"
            >
              <RefreshCw size={13} />
              <span>Làm mới</span>
            </button>

            {can('utilities:recalculate') && (
              <button
                type="button"
                onClick={handleRecalculateAll}
                disabled={recalculating}
                style={{
                  padding: '7px 12px',
                  borderRadius: '6px',
                  border: '1px solid #c7d2fe',
                  backgroundColor: recalculating ? '#e0e7ff' : '#eef2ff',
                  color: '#4338ca',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: recalculating ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.15s',
                }}
                title="Rà soát toàn bộ lịch sử và tự động tính lại chỉ số trước và sản lượng tiêu thụ chuẩn xác theo hệ số nhân"
              >
                <RefreshCw size={13} className={recalculating ? 'animate-spin' : ''} />
                <span>{recalculating ? 'Đang chuẩn hóa...' : 'Tính Lại Sản Lượng'}</span>
              </button>
            )}

            {can('utilities:export') && (
              <button
                onClick={handleExportReadingsCSV}
                className="btn-export-csv"
              >
                <Download size={15} />
                <span>Xuất Excel / CSV</span>
              </button>
            )}
          </div>

          {/* DUAL-VIEW: 1) DESKTOP TABLE VIEW */}
          <div className="desktop-view-container card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Điểm đo / Đồng hồ</th>
                    <th>Vị trí</th>
                    <th>Chỉ số trước</th>
                    <th>Chỉ số mới</th>
                    <th>Tiêu thụ (Δ)</th>
                    <th>Người ghi</th>
                    <th>Trạng thái & Ghi chú</th>
                    <th style={{ textAlign: 'center', width: '100px' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReadings.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                        Chưa có bản ghi số điện/nước nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredReadings.map((r) => {
                      const isVoided = Boolean(r.isVoided);
                      return (
                        <tr
                          key={r.id}
                          style={{
                            backgroundColor: isVoided ? '#fef2f2' : undefined,
                            opacity: isVoided ? 0.78 : 1,
                          }}
                        >
                          <td style={{ fontSize: '12.5px', whiteSpace: 'nowrap', textDecoration: isVoided ? 'line-through' : undefined }}>
                            {new Date(r.recordedAt).toLocaleString('vi-VN', {
                              hour: '2-digit', minute: '2-digit',
                              day: '2-digit', month: '2-digit', year: 'numeric',
                            })}
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {r.point?.type === 'ELECTRICITY' ? <Zap size={14} color="#eab308" /> : <Droplets size={14} color="#0ea5e9" />}
                              <span style={{ textDecoration: isVoided ? 'line-through' : undefined }}>{r.point?.name}</span>
                            </div>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>{r.point?.code}</span>
                          </td>
                          <td style={{ fontSize: '12px', color: '#475569' }}>{r.point?.location}</td>
                          <td style={{ fontSize: '12.5px', color: '#64748b', textDecoration: isVoided ? 'line-through' : undefined }}>
                            {r.previousValue?.toLocaleString()} {r.point?.unit}
                          </td>
                          <td style={{ fontSize: '13px', fontWeight: 700, color: isVoided ? '#dc2626' : '#0f172a', textDecoration: isVoided ? 'line-through' : undefined }}>
                            {r.readingValue?.toLocaleString()} {r.point?.unit}
                          </td>
                          <td>
                            {isVoided ? (
                              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#fee2e2', color: '#dc2626', fontWeight: 700 }}>
                                ĐÃ HỦY (KHÔNG TÍNH)
                              </span>
                            ) : (
                              <span className="delta-badge-table">
                                +{(r.consumption ?? r.consumptionDelta ?? ((r.readingValue || 0) - (r.previousValue || 0)))?.toLocaleString()} {r.point?.unit}
                              </span>
                            )}
                          </td>
                          <td style={{ fontSize: '12.5px' }}>{r.recordedByName || r.recordedByUser?.name || r.recordedBy?.name || '---'}</td>
                          <td style={{ fontSize: '12px', color: '#64748b', maxWidth: '220px' }}>
                            {isVoided ? (
                              <div>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontWeight: 700, fontSize: '11.5px' }}>
                                  <Ban size={12} /> Đã hủy kết quả
                                </span>
                                {r.voidReason && (
                                  <div style={{ color: '#991b1b', fontSize: '11px', marginTop: '2px' }}>
                                    Lý do: <em>{r.voidReason}</em>
                                  </div>
                                )}
                                {r.voidedByName && (
                                  <div style={{ color: '#6b7280', fontSize: '10.5px' }}>
                                    Bởi: {r.voidedByName}
                                  </div>
                                )}
                              </div>
                            ) : (
                              r.notes || '---'
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {!isVoided ? (
                              <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                                {can('utilities:edit_reading') && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditReading(r)}
                                    className="btn btn-sm"
                                    style={{
                                      padding: '4px 8px',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      color: '#2563eb',
                                      backgroundColor: '#eff6ff',
                                      border: '1px solid #bfdbfe',
                                      borderRadius: '4px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      cursor: 'pointer',
                                    }}
                                    title="Chỉnh sửa bản ghi chỉ số"
                                  >
                                    <Edit2 size={12} /> Sửa
                                  </button>
                                )}
                                {can('utilities:void_reading') && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setVoidModalReading(r);
                                      setVoidReason('');
                                    }}
                                    className="btn btn-sm"
                                    style={{
                                      padding: '4px 8px',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      color: '#dc2626',
                                      backgroundColor: '#fef2f2',
                                      border: '1px solid #fecaca',
                                      borderRadius: '4px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      cursor: 'pointer',
                                    }}
                                    title="Đánh dấu hủy kết quả ghi sai này (giữ nguyên nhật ký kiểm toán)"
                                  >
                                    <Ban size={12} /> Hủy số sai
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#9ca3af', fontStyle: 'italic' }}>
                                Đã lưu vết
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* DUAL-VIEW: 2) MOBILE CARD FEED VIEW */}
          <div className="mobile-cards-feed">
            {filteredReadings.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                Chưa có bản ghi số điện/nước nào.
              </div>
            ) : (
              filteredReadings.map((r) => {
                const isVoided = Boolean(r.isVoided);
                return (
                  <div
                    key={r.id}
                    className="card mobile-log-card"
                    style={{
                      backgroundColor: isVoided ? '#fef2f2' : undefined,
                      borderColor: isVoided ? '#fca5a5' : undefined,
                      opacity: isVoided ? 0.82 : 1,
                    }}
                  >
                    <div className="mobile-log-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
                        {r.point?.type === 'ELECTRICITY' ? <Zap size={16} color="#eab308" /> : <Droplets size={16} color="#0ea5e9" />}
                        <span className="mobile-log-point-name" style={{ textDecoration: isVoided ? 'line-through' : undefined }}>{r.point?.name}</span>
                      </div>
                      <span className="log-time-badge">
                        {new Date(r.recordedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                      </span>
                    </div>

                    <div className="mobile-log-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{r.point?.code} • {r.point?.location}</span>
                      {isVoided && (
                        <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#dc2626', backgroundColor: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>
                          ĐÃ HỦY
                        </span>
                      )}
                    </div>

                    <div className="mobile-log-values-row">
                      <div className="mobile-val-box">
                        <span className="val-lbl">Số cũ</span>
                        <span className="val-txt" style={{ textDecoration: isVoided ? 'line-through' : undefined }}>{r.previousValue?.toLocaleString()}</span>
                      </div>
                      <ArrowRight size={14} color="#94a3b8" />
                      <div className="mobile-val-box">
                        <span className="val-lbl">Số mới</span>
                        <span className="val-txt new" style={{ color: isVoided ? '#dc2626' : undefined, textDecoration: isVoided ? 'line-through' : undefined }}>{r.readingValue?.toLocaleString()}</span>
                      </div>
                      <div className="mobile-val-delta">
                        <span className="val-lbl">Tiêu thụ</span>
                        <span className="val-txt-delta" style={{ textDecoration: isVoided ? 'line-through' : undefined }}>
                          +{(r.consumption ?? r.consumptionDelta ?? ((r.readingValue || 0) - (r.previousValue || 0)))?.toLocaleString()} {r.point?.unit}
                        </span>
                      </div>
                    </div>

                    {isVoided && r.voidReason && (
                      <div style={{ padding: '6px 8px', borderRadius: '4px', backgroundColor: '#fee2e2', color: '#991b1b', fontSize: '11.5px', marginBottom: '8px' }}>
                        <strong>Lý do hủy:</strong> {r.voidReason} (bởi: {r.voidedByName || 'KTV'})
                      </div>
                    )}

                    <div className="mobile-log-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        {(r.recordedByName || r.recordedByUser?.name || r.recordedBy?.name) && (
                          <span>KTV: <strong>{r.recordedByName || r.recordedByUser?.name || r.recordedBy?.name}</strong></span>
                        )}
                        {r.notes && !isVoided && <span style={{ color: '#64748b' }}>• {r.notes}</span>}
                      </div>

                      {!isVoided && (
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          {can('utilities:edit_reading') && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditReading(r)}
                              style={{
                                padding: '4px 8px',
                                fontSize: '11px',
                                fontWeight: 600,
                                color: '#2563eb',
                                backgroundColor: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                borderRadius: '4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                cursor: 'pointer',
                              }}
                            >
                              <Edit2 size={12} /> Sửa
                            </button>
                          )}
                          {can('utilities:void_reading') && (
                            <button
                              type="button"
                              onClick={() => {
                                setVoidModalReading(r);
                                setVoidReason('');
                              }}
                              style={{
                                padding: '4px 8px',
                                fontSize: '11px',
                                fontWeight: 600,
                                color: '#dc2626',
                                backgroundColor: '#ffffff',
                                border: '1px solid #fecaca',
                                borderRadius: '4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                cursor: 'pointer',
                              }}
                            >
                              <Ban size={12} /> Hủy sai
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: LỊCH SỬ BẬT / TẮT HỆ THỐNG */}
      {activeTab === 'statusLogs' && (
        <div className="util-tab-content">
          {/* Desktop Table View */}
          <div className="desktop-view-container card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Hệ thống</th>
                    <th>Vị trí</th>
                    <th>Trạng thái mới</th>
                    <th>Đồng hồ giờ chạy</th>
                    <th>Giờ tăng thêm (Δ)</th>
                    <th>Lý do / Mô tả</th>
                    <th>Kỹ thuật viên</th>
                  </tr>
                </thead>
                <tbody>
                  {statusLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                        Chưa có lịch sử chuyển đổi trạng thái nào.
                      </td>
                    </tr>
                  ) : (
                    statusLogs.map((log) => {
                      const color =
                        log.status === 'RUNNING' ? '#16a34a' : log.status === 'OFF' ? '#64748b' : log.status === 'STANDBY' ? '#ea580c' : '#dc2626';
                      const bg =
                        log.status === 'RUNNING' ? '#f0fdf4' : log.status === 'OFF' ? '#f8fafc' : log.status === 'STANDBY' ? '#fff7ed' : '#fef2f2';

                      return (
                        <tr key={log.id}>
                          <td style={{ fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                            {new Date(log.recordedAt).toLocaleString('vi-VN')}
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, fontSize: '13px' }}>{log.point?.name}</div>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>{log.point?.code}</span>
                          </td>
                          <td style={{ fontSize: '12px', color: '#475569' }}>{log.point?.location}</td>
                          <td>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                backgroundColor: bg,
                                color: color,
                                border: `1px solid ${color}`,
                              }}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td style={{ fontSize: '13px', fontWeight: 600 }}>
                            {log.runningHours ? `${log.runningHours.toLocaleString()} h` : '---'}
                          </td>
                          <td>
                            {log.runningDelta ? (
                              <span style={{ fontWeight: 700, color: '#16a34a', fontSize: '12.5px' }}>
                                +{log.runningDelta.toLocaleString()} h
                              </span>
                            ) : (
                              '---'
                            )}
                          </td>
                          <td style={{ fontSize: '12.5px', color: '#475569', maxWidth: '240px' }}>
                            {log.reason || '---'}
                          </td>
                          <td style={{ fontSize: '12.5px' }}>{log.recordedByName || log.recordedByUser?.name || log.recordedBy?.name || '---'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Feed View */}
          <div className="mobile-cards-feed">
            {statusLogs.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                Chưa có lịch sử bật/tắt nào.
              </div>
            ) : (
              statusLogs.map((log) => {
                const color =
                  log.status === 'RUNNING' ? '#16a34a' : log.status === 'OFF' ? '#64748b' : log.status === 'STANDBY' ? '#ea580c' : '#dc2626';
                const bg =
                  log.status === 'RUNNING' ? '#f0fdf4' : log.status === 'OFF' ? '#f8fafc' : log.status === 'STANDBY' ? '#fff7ed' : '#fef2f2';

                return (
                  <div key={log.id} className="card mobile-log-card">
                    <div className="mobile-log-header">
                      <span className="mobile-log-point-name">{log.point?.name}</span>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: bg,
                          color: color,
                          border: `1px solid ${color}`,
                        }}
                      >
                        {log.status}
                      </span>
                    </div>

                    <div className="mobile-log-meta">
                      <span>{log.point?.code} • {log.point?.location}</span>
                      <span>{new Date(log.recordedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: '#f8fafc', borderRadius: '6px', margin: '8px 0' }}>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>Đồng hồ: <strong>{log.runningHours ? `${log.runningHours.toLocaleString()} h` : '---'}</strong></span>
                      {log.runningDelta && (
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a' }}>
                          Tăng: +{log.runningDelta} h
                        </span>
                      )}
                    </div>

                    {log.reason && (
                      <div style={{ fontSize: '12px', color: '#334155', marginTop: '4px' }}>
                        Lý do: <em>"{log.reason}"</em>
                      </div>
                    )}

                    <div className="mobile-log-footer" style={{ marginTop: '8px' }}>
                      <span>KTV: <strong>{log.recordedByName || log.recordedByUser?.name || log.recordedBy?.name || '---'}</strong></span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 4: DANH MỤC ĐIỂM ĐO & IN TEM QR */}
      {activeTab === 'points' && (
        <div className="util-tab-content">
          <div className="card util-section-card">
            <div className="section-card-header">
              <div>
                <h3 className="section-title">
                  <Settings size={18} color="#2563eb" />
                  <span>DANH MỤC ĐIỂM ĐO ĐIỆN, NƯỚC & HỆ THỐNG PHỤ TRỢ</span>
                </h3>
                <p className="section-sub">
                  Quản lý danh sách đồng hồ, hệ số nhân (CT) và in tem QR dán tại hiện trường.
                </p>
              </div>

              {can('utilities:manage_points') && (
                <button
                  onClick={handleOpenAddPoint}
                  className="btn-add-point"
                >
                  <Plus size={16} />
                  <span>Thêm Điểm Đo</span>
                </button>
              )}
            </div>

            {/* Desktop Table View */}
            <div className="desktop-view-container">
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th style={{ width: '120px' }}>Mã điểm đo</th>
                      <th>Tên đồng hồ / Hệ thống</th>
                      <th>Loại</th>
                      <th>Vị trí lắp đặt</th>
                      <th>Hệ số (CT)</th>
                      <th>Chỉ số gần nhất</th>
                      <th>Mã QR</th>
                      <th style={{ width: '130px', textAlign: 'center' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {points.map((p) => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 700, fontSize: '13px' }}>{p.code}</td>
                        <td style={{ fontWeight: 600, fontSize: '13px' }}>{p.name}</td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '4px',
                                backgroundColor: p.type === 'ELECTRICITY' ? '#fef9c3' : p.type === 'WATER' ? '#e0f2fe' : '#f3e8ff',
                                color: p.type === 'ELECTRICITY' ? '#854d0e' : p.type === 'WATER' ? '#0369a1' : '#6b21a8',
                              }}
                            >
                              {p.type === 'ELECTRICITY' ? 'Điện' : p.type === 'WATER' ? 'Nước' : 'Phụ trợ'}
                            </span>
                            {p.isSupplyMeter && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: '#f1f5f9',
                                  color: '#475569',
                                  border: '1px solid #cbd5e1',
                                }}
                              >
                                ĐH Tổng cấp
                              </span>
                            )}
                            {p.isRecycledWater && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: '#ccfbf1',
                                  color: '#0f766e',
                                  border: '1px solid #99f6e4',
                                }}
                              >
                                🔄 Tái sử dụng
                              </span>
                            )}
                            {p.isExcludedFromTotal && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: '#fffbeb',
                                  color: '#b45309',
                                  border: '1px solid #fde68a',
                                }}
                                title="Đồng hồ đo đối chứng / trung gian - Không tính vào Tổng cấp và Không tính vào Tổng dùng"
                              >
                                ⚖️ Đối chứng (Không tính tổng)
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ fontSize: '12.5px', color: '#475569' }}>{p.location}</td>
                        <td style={{ fontSize: '12.5px' }}>x{p.multiplier || 1}</td>
                        <td style={{ fontSize: '13px', fontWeight: 700 }}>
                          {p.type === 'SYSTEM_AUX'
                            ? `${getLiveHourMeter(p).total.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Giờ`
                            : `${p.lastReadingValue?.toLocaleString() || 0} ${p.unit}`}
                        </td>
                        <td>
                          <button
                            onClick={() => setPrintPoint(p)}
                            className="btn-qr-preview"
                          >
                            <QrCode size={13} />
                            <span>In Tem QR</span>
                          </button>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            {can('utilities:manage_points') && (
                              <button
                                onClick={() => handleOpenEditPoint(p)}
                                className="btn-icon-action"
                                title="Chỉnh sửa"
                              >
                                <Edit2 size={14} />
                              </button>
                            )}
                            {can('utilities:delete_point') && (
                              <button
                                onClick={() => handleDeletePoint(p)}
                                className="btn-icon-action danger"
                                title="Xóa điểm đo"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards List View */}
            <div className="mobile-cards-feed">
              {points.map((p) => (
                <div key={p.id} className="card mobile-point-card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 800, fontSize: '13.5px', color: '#0f172a' }}>{p.code}</span>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: p.type === 'ELECTRICITY' ? '#fef9c3' : p.type === 'WATER' ? '#e0f2fe' : '#f3e8ff',
                          color: p.type === 'ELECTRICITY' ? '#854d0e' : p.type === 'WATER' ? '#0369a1' : '#6b21a8',
                        }}
                      >
                        {p.type === 'ELECTRICITY' ? 'Điện' : p.type === 'WATER' ? 'Nước' : 'Phụ trợ'}
                      </span>
                      {p.isSupplyMeter && (
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
                          ĐH Tổng
                        </span>
                      )}
                      {p.isRecycledWater && (
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', backgroundColor: '#ccfbf1', color: '#0f766e', border: '1px solid #99f6e4' }}>
                          🔄 Tái SD
                        </span>
                      )}
                      {p.isExcludedFromTotal && (
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}>
                          ⚖️ Đối chứng
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b', marginBottom: '2px' }}>{p.name}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                    Vị trí: <strong>{p.location}</strong> {p.multiplier > 1 ? `• CT: x${p.multiplier}` : ''}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: '#f8fafc', borderRadius: '6px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '11.5px', color: '#64748b' }}>Chỉ số gần nhất:</span>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                      {p.type === 'SYSTEM_AUX'
                        ? `${getLiveHourMeter(p).total.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Giờ`
                        : `${p.lastReadingValue?.toLocaleString() || 0} ${p.unit}`}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setPrintPoint(p)}
                      className="btn-qr-preview"
                      style={{ flex: 1, justifyContent: 'center', padding: '8px' }}
                    >
                      <QrCode size={15} />
                      <span>In Tem QR</span>
                    </button>
                    <button
                      onClick={() => handleOpenEditPoint(p)}
                      className="btn-icon-action"
                      style={{ width: '36px', height: '36px' }}
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => handleDeletePoint(p)}
                      className="btn-icon-action danger"
                      style={{ width: '36px', height: '36px' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: BÁO CÁO TÍCH LŨY THEO KỲ (ĐIỆN & NƯỚC) */}
      {activeTab === 'cumulative' && (
        <div className="util-tab-content">
          {/* 1. Header & Bộ lọc Chu kỳ */}
          <div className="card util-section-card" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
                {/* Chọn loại Điện / Nước */}
                <div style={{ display: 'inline-flex', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '8px', gap: '4px' }}>
                  <button
                    onClick={() => setCumulativeType('ELECTRICITY')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '8px 14px', border: 'none', borderRadius: '6px',
                      fontSize: '13px', fontWeight: 700, cursor: 'pointer',
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
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '8px 14px', border: 'none', borderRadius: '6px',
                      fontSize: '13px', fontWeight: 700, cursor: 'pointer',
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

                {/* Chọn Tháng */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Tháng:</span>
                  <select
                    value={cumulativeMonth}
                    onChange={(e) => setCumulativeMonth(parseInt(e.target.value, 10))}
                    className="modal-select"
                    style={{ width: '105px', height: '36px', padding: '0 8px', fontSize: '13px' }}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>Tháng {m < 10 ? `0${m}` : m}</option>
                    ))}
                  </select>
                </div>

                {/* Chọn Năm */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Năm:</span>
                  <select
                    value={cumulativeYear}
                    onChange={(e) => setCumulativeYear(parseInt(e.target.value, 10))}
                    className="modal-select"
                    style={{ width: '90px', height: '36px', padding: '0 8px', fontSize: '13px' }}
                  >
                    {[2024, 2025, 2026, 2027, 2028].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Nút hành động */}
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

                <button
                  onClick={handleExportCumulativeCSV}
                  className="btn-action-outline"
                  style={{ backgroundColor: '#10b981', color: '#ffffff', borderColor: '#10b981' }}
                  title="Xuất file CSV"
                >
                  <Download size={15} />
                  <span>Xuất Báo Cáo (CSV)</span>
                </button>
              </div>
            </div>

            {/* Banner Thông Tin Chu Kỳ */}
            <div style={{
              marginTop: '16px', padding: '12px 16px', borderRadius: '8px',
              backgroundColor: cumulativeType === 'ELECTRICITY' ? '#fefce8' : '#f0f9ff',
              border: `1px solid ${cumulativeType === 'ELECTRICITY' ? '#fde047' : '#bae6fd'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px'
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

          {/* 2. Thẻ KPI TỔNG KẾT ĐỐI SOÁT */}
          <div className={`cumulative-kpi-grid ${cumulativeType === 'WATER' ? 'five-cols' : ''}`} style={{ marginBottom: '16px' }}>
            {/* Card 1: Tổng Cấp Vào */}
            <div className="card cumulative-kpi-card" style={{ borderLeft: '4px solid #3b82f6' }}>
              <div className="kpi-top">
                <span className="kpi-label" style={{ color: '#1d4ed8' }} title="1. TỔNG CẤP VÀO (TỪ NHÀ CUNG CẤP)">
                  1. TỔNG CẤP VÀO
                </span>
                <div className="kpi-icon-box" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
                  <Layers size={15} />
                </div>
              </div>
              <div className="kpi-val" style={{ color: '#1d4ed8' }}>
                {cumulativeData?.summary?.totalSupply?.toLocaleString() || 0}{' '}
                <span className="kpi-unit">{cumulativeData?.summary?.unit}</span>
              </div>
              <div className="kpi-sub" title={`Gồm ${cumulativeData?.supplyMeters?.length || 0} đồng hồ nguồn tổng cấp`}>
                Gồm {cumulativeData?.supplyMeters?.length || 0} ĐH nguồn tổng
              </div>
            </div>

            {/* Card 2: Tổng Đo Tiêu Thụ */}
            <div className="card cumulative-kpi-card" style={{ borderLeft: '4px solid #10b981' }}>
              <div className="kpi-top">
                <span className="kpi-label" style={{ color: '#047857' }} title="2. TỔNG LƯỢNG SỬ DỤNG (ĐO ĐƯỢC)">
                  2. TỔNG SỬ DỤNG
                </span>
                <div className="kpi-icon-box" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                  {cumulativeType === 'ELECTRICITY' ? <Zap size={15} /> : <Droplets size={15} />}
                </div>
              </div>
              <div className="kpi-val" style={{ color: '#047857' }}>
                {cumulativeData?.summary?.totalConsumption?.toLocaleString() || 0}{' '}
                <span className="kpi-unit">{cumulativeData?.summary?.unit}</span>
              </div>
              <div className="kpi-sub" title={
                cumulativeType === 'WATER' && (cumulativeData?.recycledMeters?.length || 0) > 0
                  ? `Tổng ${cumulativeData?.consumptionMeters?.length || 0} ĐH (đã trừ ${cumulativeData?.recycledMeters?.length} ĐH tái sử dụng)`
                  : `Tổng ${cumulativeData?.consumptionMeters?.length || 0} ĐH đo phân xưởng`
              }>
                {cumulativeType === 'WATER' && (cumulativeData?.recycledMeters?.length || 0) > 0
                  ? `${cumulativeData?.consumptionMeters?.length || 0} ĐH (trừ ${cumulativeData?.recycledMeters?.length} ĐH tái SD)`
                  : `Tổng ${cumulativeData?.consumptionMeters?.length || 0} ĐH phân xưởng`}
              </div>
            </div>

            {/* Card 3: Chênh Lệch Đối Soát */}
            <div className="card cumulative-kpi-card" style={{
              borderLeft: `4px solid ${
                (cumulativeData?.summary?.delta || 0) < 0 ? '#ef4444' : (cumulativeData?.summary?.lossRate || 0) > 6 ? '#f59e0b' : '#3b82f6'
              }`
            }}>
              <div className="kpi-top">
                <span className="kpi-label" title="3. CHÊNH LỆCH (CẤP - DÙNG)">3. CHÊNH LỆCH</span>
                <div className="kpi-icon-box" style={{ backgroundColor: '#f8fafc', color: '#64748b' }}>
                  <PieChart size={15} />
                </div>
              </div>
              <div className="kpi-val" style={{
                color: (cumulativeData?.summary?.delta || 0) < 0 ? '#ef4444' : (cumulativeData?.summary?.lossRate || 0) > 6 ? '#d97706' : '#2563eb'
              }}>
                {(cumulativeData?.summary?.delta || 0) > 0 ? '+' : ''}
                {cumulativeData?.summary?.delta?.toLocaleString() || 0}{' '}
                <span className="kpi-unit">{cumulativeData?.summary?.unit}</span>
              </div>
              <div className="kpi-sub" title={(cumulativeData?.summary?.delta || 0) >= 0 ? 'Lượng hao hụt / thất thoát' : 'Cảnh báo: Dùng vượt lượng cấp!'}>
                {(cumulativeData?.summary?.delta || 0) >= 0 ? 'Lượng hao hụt / thất thoát' : 'Dùng vượt lượng cấp!'}
              </div>
            </div>

            {/* Card 4: Tỷ Lệ Hao Hụt */}
            <div className="card cumulative-kpi-card" style={{
              borderLeft: `4px solid ${
                (cumulativeData?.summary?.lossRate || 0) > 6 ? '#ef4444' : (cumulativeData?.summary?.lossRate || 0) > 3 ? '#f59e0b' : '#10b981'
              }`
            }}>
              <div className="kpi-top">
                <span className="kpi-label" title="4. TỶ LỆ HAO HỤT (%)">4. TỶ LỆ HAO HỤT</span>
                <div className="kpi-icon-box" style={{
                  backgroundColor: (cumulativeData?.summary?.lossRate || 0) > 6 ? '#fef2f2' : '#f0fdf4',
                  color: (cumulativeData?.summary?.lossRate || 0) > 6 ? '#dc2626' : '#16a34a'
                }}>
                  <AlertTriangle size={15} />
                </div>
              </div>
              <div className="kpi-val" style={{
                color: (cumulativeData?.summary?.lossRate || 0) > 6 ? '#dc2626' : (cumulativeData?.summary?.lossRate || 0) > 3 ? '#d97706' : '#16a34a'
              }}>
                {cumulativeData?.summary?.lossRate || 0}%
              </div>
              <div className="kpi-sub" title={
                (cumulativeData?.summary?.lossRate || 0) <= 3
                  ? 'Mức an toàn (< 3%)'
                  : (cumulativeData?.summary?.lossRate || 0) <= 6
                  ? 'Mức tiêu chuẩn (3 - 6%)'
                  : 'Cảnh báo: Thất thoát cao (> 6%)'
              }>
                {(cumulativeData?.summary?.lossRate || 0) <= 3
                  ? 'Mức an toàn (< 3%)'
                  : (cumulativeData?.summary?.lossRate || 0) <= 6
                  ? 'Tiêu chuẩn (3 - 6%)'
                  : 'Cảnh báo cao (> 6%)'}
              </div>
            </div>

            {/* Card 5: Lượng nước tái sử dụng (Chỉ hiện khi xem nước) */}
            {cumulativeType === 'WATER' && (
              <div className="card cumulative-kpi-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
                <div className="kpi-top">
                  <span className="kpi-label" style={{ color: '#6b21a8' }} title="5. NƯỚC TÁI SỬ DỤNG (TIẾT KIỆM)">
                    5. NƯỚC TÁI SỬ DỤNG
                  </span>
                  <div className="kpi-icon-box" style={{ backgroundColor: '#f5f3ff', color: '#7c3aed' }}>
                    <RefreshCw size={15} />
                  </div>
                </div>
                <div className="kpi-val" style={{ color: '#6b21a8' }}>
                  {cumulativeData?.summary?.totalRecycled?.toLocaleString() || 0}{' '}
                  <span className="kpi-unit">m³</span>
                </div>
                <div className="kpi-sub" title={`Tỷ lệ tái sinh: ${cumulativeData?.summary?.recycleRate || 0}% (Không cộng vào tổng dùng)`}>
                  Tái sinh: <strong style={{ color: '#7c3aed' }}>{cumulativeData?.summary?.recycleRate || 0}%</strong> (Không cộng tổng)
                </div>
              </div>
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

          {/* 4. BẢNG TỔNG HỢP & XU HƯỚNG TIÊU THỤ THEO THỜI GIAN (MA TRẬN NGÀY / THÁNG / NĂM) */}
          <div className="card util-section-card trend-matrix-card" style={{ marginTop: '24px' }}>
            <div className="trend-card-header">
              <div className="trend-title-box">
                <h3 className="section-title">
                  <BarChart3 size={18} color="#059669" />
                  <span>BẢNG TỔNG HỢP & XU HƯỚNG TIÊU THỤ THEO THỜI GIAN</span>
                </h3>
                <p className="section-sub">
                  Chi tiết sản lượng tiêu thụ của từng vị trí / điểm đo qua các ngày trong tháng, các tháng trong năm hoặc so sánh giữa các năm.
                </p>
              </div>

              {/* Nút Chuyển Đổi Dạng Xem: Bảng Số Liệu <-> Biểu Đồ Trực Quan */}
              <div className="trend-view-type-pills">
                <button
                  type="button"
                  onClick={() => setTrendDisplayType('TABLE')}
                  className={`view-type-btn ${trendDisplayType === 'TABLE' ? 'active' : ''}`}
                  title="Xem dạng bảng ma trận số liệu chi tiết"
                >
                  <FileText size={13} />
                  <span>Dạng Bảng Số</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTrendDisplayType('CHART')}
                  className={`view-type-btn ${trendDisplayType === 'CHART' ? 'active' : ''}`}
                  title="Chuyển sang dạng biểu đồ đồ thị trực quan"
                >
                  <BarChart2 size={13} />
                  <span>Dạng Biểu Đồ</span>
                </button>
              </div>
            </div>

            {/* Thanh Công Cụ Điều Khiển & Bộ Lọc Tự Co Giãn Theo Màn Hình */}
            <div className="trend-toolbar">
              <div className="trend-toolbar-left">
                {/* 1. Nút chuyển chế độ: Giờ / Ngày / Tháng / Năm */}
                <div className="trend-mode-pills">
                  <button
                    type="button"
                    onClick={() => setTrendViewMode('HOURLY')}
                    className={`trend-mode-btn ${trendViewMode === 'HOURLY' ? 'active' : ''}`}
                    title="Xem chi tiết từng giờ trong ngày"
                  >
                    <Clock size={13} />
                    <span>Theo Giờ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrendViewMode('DAILY')}
                    className={`trend-mode-btn ${trendViewMode === 'DAILY' ? 'active' : ''}`}
                  >
                    <Calendar size={13} />
                    <span>Theo Ngày</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrendViewMode('MONTHLY')}
                    className={`trend-mode-btn ${trendViewMode === 'MONTHLY' ? 'active' : ''}`}
                  >
                    <CalendarDays size={13} />
                    <span>Theo Tháng</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrendViewMode('YEARLY')}
                    className={`trend-mode-btn ${trendViewMode === 'YEARLY' ? 'active' : ''}`}
                  >
                    <TrendingUp size={13} />
                    <span>Theo Năm</span>
                  </button>
                </div>

                {/* 2. Bộ chọn mốc thời gian */}
                {trendViewMode === 'HOURLY' && (
                  <div className="trend-date-selectors">
                    <select
                      value={trendDay}
                      onChange={(e) => setTrendDay(parseInt(e.target.value, 10))}
                      className="filter-select trend-select"
                      title="Chọn ngày"
                    >
                      {Array.from({ length: new Date(trendYear, trendMonth, 0).getDate() }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>Ngày {String(d).padStart(2, '0')}</option>
                      ))}
                    </select>
                    <select
                      value={trendMonth}
                      onChange={(e) => setTrendMonth(parseInt(e.target.value, 10))}
                      className="filter-select trend-select"
                      title="Chọn tháng"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>Tháng {String(m).padStart(2, '0')}</option>
                      ))}
                    </select>
                    <select
                      value={trendYear}
                      onChange={(e) => setTrendYear(parseInt(e.target.value, 10))}
                      className="filter-select trend-select"
                      title="Chọn năm"
                    >
                      {[2024, 2025, 2026, 2027].map((y) => (
                        <option key={y} value={y}>Năm {y}</option>
                      ))}
                    </select>
                  </div>
                )}

                {trendViewMode === 'DAILY' && (
                  <div className="trend-date-selectors">
                    <select
                      value={trendMonth}
                      onChange={(e) => setTrendMonth(parseInt(e.target.value, 10))}
                      className="filter-select trend-select"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>Tháng {String(m).padStart(2, '0')}</option>
                      ))}
                    </select>
                    <select
                      value={trendYear}
                      onChange={(e) => setTrendYear(parseInt(e.target.value, 10))}
                      className="filter-select trend-select"
                    >
                      {[2024, 2025, 2026, 2027].map((y) => (
                        <option key={y} value={y}>Năm {y}</option>
                      ))}
                    </select>
                  </div>
                )}

                {trendViewMode === 'MONTHLY' && (
                  <div className="trend-date-selectors">
                    <select
                      value={trendYear}
                      onChange={(e) => setTrendYear(parseInt(e.target.value, 10))}
                      className="filter-select trend-select"
                    >
                      {[2024, 2025, 2026, 2027].map((y) => (
                        <option key={y} value={y}>Năm {y}</option>
                      ))}
                    </select>
                  </div>
                )}

                {trendViewMode === 'YEARLY' && (
                  <div className="trend-date-selectors">
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Từ:</span>
                    <select
                      value={trendStartYear}
                      onChange={(e) => setTrendStartYear(parseInt(e.target.value, 10))}
                      className="filter-select trend-select"
                    >
                      {[2021, 2022, 2023, 2024].map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>đến:</span>
                    <select
                      value={trendEndYear}
                      onChange={(e) => setTrendEndYear(parseInt(e.target.value, 10))}
                      className="filter-select trend-select"
                    >
                      {[2024, 2025, 2026, 2027].map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="trend-toolbar-right">
                {/* 3. Bộ lọc điểm đo (Flat, không hard code) */}
                <div className="trend-filter-box">
                  <Filter size={13} className="trend-filter-icon" />
                  <select
                    value={trendFilter}
                    onChange={(e) => setTrendFilter(e.target.value)}
                    className="filter-select trend-filter-select"
                    title="Lọc vị trí / điểm đo hiển thị"
                  >
                    <option value="ALL">Tất cả điểm đo ({trendData?.pointRows?.length || 0})</option>
                    <option value="SUPPLY">Nguồn Tổng Cấp</option>
                    <option value="CONSUMPTION">Đo Tiêu Thụ</option>
                    {trendData?.pointRows?.some((r: any) => r.isRecycledWater) && (
                      <option value="RECYCLED">Nước Tái Sử Dụng</option>
                    )}
                    {trendData?.pointRows?.some((r: any) => r.isExcludedFromTotal) && (
                      <option value="EXCLUDED">Đo Đối Chứng</option>
                    )}
                    {(trendData?.pointRows || []).map((r: any) => (
                      <option key={r.pointId} value={r.pointId}>
                        {r.code} - {r.name}
                      </option>
                    ))}
                  </select>
                  {trendFilter !== 'ALL' && (
                    <button
                      type="button"
                      onClick={() => setTrendFilter('ALL')}
                      className="btn-trend-reset"
                      title="Đặt lại bộ lọc"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>


                {/* 5. Nút xuất CSV cho ma trận */}
                <button
                  type="button"
                  onClick={handleExportTrendCSV}
                  className="btn-export-csv trend-export-btn"
                  title="Tải xuống file CSV ma trận theo thời gian"
                >
                  <Download size={13} />
                  <span>Xuất CSV</span>
                </button>
              </div>
            </div>

            {/* HIỂN THỊ DẠNG BIỂU ĐỒ HOẶC DẠNG BẢNG MA TRẬN (CHUYỂN ĐỔI THEO NÚT BẤM) */}
            {trendDisplayType === 'CHART' ? (
              <UtilityTrendChart
                trendData={trendData}
                trendViewMode={trendViewMode}
                trendFilter={trendFilter}
                unit={cumulativeType === 'ELECTRICITY' ? 'kWh' : 'm³'}
              />
            ) : (
              <>
                {/* Thanh Hỗ Trợ Điều Hướng Nhanh & Trạng Thái Cuộn Ngang */}
                <div className="trend-nav-strip">
                  <div className="trend-nav-info">
                    <Calendar size={13} color="#059669" />
                    <span className="trend-nav-period-text">
                      {trendViewMode === 'HOURLY' ? `Ngày ${String(trendDay).padStart(2, '0')}/${String(trendMonth).padStart(2, '0')}/${trendYear} (24 giờ)` :
                       trendViewMode === 'DAILY' ? `Kỳ Tháng ${trendMonth}/${trendYear} (${trendData?.timeColumns?.length || 0} ngày)` :
                       trendViewMode === 'MONTHLY' ? `Năm ${trendYear} (12 tháng)` :
                       `Giai đoạn ${trendStartYear} - ${trendEndYear} (${trendData?.timeColumns?.length || 0} năm)`}
                    </span>
                    <span className="trend-scroll-guide">
                      • Cuộn chuột ngang hoặc nhấn nút để nhảy nhanh:
                    </span>
                  </div>

                  <div className="trend-nav-actions">
                    {trendViewMode === 'HOURLY' && (
                      <div className="trend-jump-group">
                        <button type="button" onClick={() => scrollToPeriod(0)} className="btn-jump-pill" title="Xem từ 00h đến 07h">
                          00h-07h
                        </button>
                        <button type="button" onClick={() => scrollToPeriod(0.5)} className="btn-jump-pill" title="Xem từ 08h đến 15h">
                          08h-15h
                        </button>
                        <button type="button" onClick={() => scrollToPeriod(1)} className="btn-jump-pill" title="Xem từ 16h đến 23h & Tổng">
                          16h-23h
                        </button>
                      </div>
                    )}
                    {trendViewMode === 'DAILY' && (
                      <div className="trend-jump-group">
                        <button type="button" onClick={() => scrollToPeriod(0)} className="btn-jump-pill" title="Xem từ ngày 01 đến 10">
                          01-10
                        </button>
                        <button type="button" onClick={() => scrollToPeriod(0.5)} className="btn-jump-pill" title="Xem từ ngày 11 đến 20">
                          11-20
                        </button>
                        <button type="button" onClick={() => scrollToPeriod(1)} className="btn-jump-pill" title="Xem các ngày cuối & Tổng">
                          21-Cuối
                        </button>
                      </div>
                    )}
                    <div className="trend-arrows-group">
                      <button type="button" onClick={() => scrollTrendTable(-300)} className="btn-arrow-pill" title="Cuộn sang trái">
                        <ChevronLeft size={14} />
                      </button>
                      <button type="button" onClick={() => scrollTrendTable(300)} className="btn-arrow-pill" title="Cuộn sang phải">
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bảng Ma Trận Cuộn Ngang (Horizontal Scroll Container với Sticky Columns) */}
                <div 
                  ref={trendTableContainerRef}
                  className="trend-matrix-table-container"
                >
                  <table className="custom-table trend-matrix-table">
                    <thead>
                      <tr>
                        <th className="trend-th-sticky trend-col-stt">STT</th>
                        <th className="trend-th-sticky trend-col-code">Mã Điểm Đo</th>
                        <th className="trend-th-sticky trend-col-name">Tên Điểm Đo & Vị Trí</th>

                        {/* Các cột mốc thời gian động */}
                        {(trendData?.timeColumns || []).map((col: any) => (
                          <th
                            key={col.key}
                            className={`trend-th-day ${col.subLabel === 'CN' ? 'sunday' : col.subLabel === 'T7' ? 'saturday' : ''}`}
                            title={col.label}
                          >
                            <div>{col.shortLabel}</div>
                            {col.subLabel && (
                              <span className={`trend-day-sub ${col.subLabel === 'CN' ? 'sunday' : col.subLabel === 'T7' ? 'saturday' : ''}`}>
                                {col.subLabel}
                              </span>
                            )}
                          </th>
                        ))}

                        <th className="trend-th-total">
                          Tổng Cộng ({trendData?.unit || (cumulativeType === 'ELECTRICITY' ? 'kWh' : 'm³')})
                        </th>
                        <th className="trend-th-avg">
                          Trung Bình
                        </th>
                        <th className="trend-th-trend">
                          Xu Hướng
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {trendLoading ? (
                        <tr>
                          <td colSpan={(trendData?.timeColumns?.length || 0) + 6} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                            Đang tổng hợp dữ liệu ma trận theo {trendViewMode === 'HOURLY' ? 'giờ' : trendViewMode === 'DAILY' ? 'ngày' : trendViewMode === 'MONTHLY' ? 'tháng' : 'năm'}...
                          </td>
                        </tr>
                      ) : !trendData?.timeColumns || trendData.timeColumns.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                            Không có dữ liệu trong khoảng thời gian đã chọn.
                          </td>
                        </tr>
                      ) : (
                        <>
                          {/* 1. HÀNG TỔNG HỢP NGUỒN CẤP VÀO */}
                          {trendData?.summaryRows?.totalSupply && (
                            <tr className="trend-row-summary supply">
                              <td className="trend-td-sticky trend-col-stt supply">Σ</td>
                              <td className="trend-td-sticky trend-col-code supply">NGUỒN CẤP</td>
                              <td className="trend-td-sticky trend-col-name supply">
                                1. TỔNG CẤP VÀO
                              </td>
                              {(trendData.timeColumns || []).map((col: any) => {
                                const val = trendData.summaryRows.totalSupply.values?.[col.key] || 0;
                                return (
                                  <td key={col.key} className="trend-td-val supply">
                                    {val > 0 ? formatVN(val) : '-'}
                                  </td>
                                );
                              })}
                              <td className="trend-td-total supply">
                                {formatVN(trendData.summaryRows.totalSupply.total)}
                              </td>
                              <td className="trend-td-avg supply">
                                {formatVN(trendData.summaryRows.totalSupply.average)}
                              </td>
                              <td className="trend-td-trend supply">-</td>
                            </tr>
                          )}

                          {/* 2. HÀNG TỔNG HỢP SỬ DỤNG NỘI BỘ */}
                          {trendData?.summaryRows?.totalConsumption && (
                            <tr className="trend-row-summary consumption">
                              <td className="trend-td-sticky trend-col-stt consumption">Σ</td>
                              <td className="trend-td-sticky trend-col-code consumption">TIÊU THỤ</td>
                              <td className="trend-td-sticky trend-col-name consumption">
                                2. TỔNG SỬ DỤNG NỘI BỘ
                              </td>
                              {(trendData.timeColumns || []).map((col: any) => {
                                const val = trendData.summaryRows.totalConsumption.values?.[col.key] || 0;
                                return (
                                  <td key={col.key} className="trend-td-val consumption">
                                    {val > 0 ? formatVN(val) : '-'}
                                  </td>
                                );
                              })}
                              <td className="trend-td-total consumption">
                                {formatVN(trendData.summaryRows.totalConsumption.total)}
                              </td>
                              <td className="trend-td-avg consumption">
                                {formatVN(trendData.summaryRows.totalConsumption.average)}
                              </td>
                              <td className="trend-td-trend consumption">-</td>
                            </tr>
                          )}

                          {/* 3. HÀNG TÁI SỬ DỤNG NƯỚC (NẾU CÓ) */}
                          {trendData?.summaryRows?.totalRecycled && (
                            <tr className="trend-row-summary recycled">
                              <td className="trend-td-sticky trend-col-stt recycled">Σ</td>
                              <td className="trend-td-sticky trend-col-code recycled">TÁI SỬ DỤNG</td>
                              <td className="trend-td-sticky trend-col-name recycled">
                                NƯỚC TÁI SỬ DỤNG (TIẾT KIỆM)
                              </td>
                              {(trendData.timeColumns || []).map((col: any) => {
                                const val = trendData.summaryRows.totalRecycled.values?.[col.key] || 0;
                                return (
                                  <td key={col.key} className="trend-td-val recycled">
                                    {val > 0 ? formatVN(val) : '-'}
                                  </td>
                                );
                              })}
                              <td className="trend-td-total recycled">
                                {formatVN(trendData.summaryRows.totalRecycled.total)}
                              </td>
                              <td className="trend-td-avg recycled">
                                {formatVN(trendData.summaryRows.totalRecycled.average)}
                              </td>
                              <td className="trend-td-trend recycled">-</td>
                            </tr>
                          )}

                          {/* 4. HÀNG CHÊNH LỆCH / HAO HỤT */}
                          {trendData?.summaryRows?.delta && (
                            <tr className="trend-row-summary delta">
                              <td className="trend-td-sticky trend-col-stt delta">Δ</td>
                              <td className="trend-td-sticky trend-col-code delta">CHÊNH LỆCH</td>
                              <td className="trend-td-sticky trend-col-name delta">
                                3. HAO HỤT / THẤT THOÁT
                              </td>
                              {(trendData.timeColumns || []).map((col: any) => {
                                const val = trendData.summaryRows.delta.values?.[col.key] || 0;
                                return (
                                  <td key={col.key} className="trend-td-val delta">
                                    {val !== 0 ? formatVN(val) : '-'}
                                  </td>
                                );
                              })}
                              <td className="trend-td-total delta">
                                {formatVN(trendData.summaryRows.delta.total)}
                              </td>
                              <td className="trend-td-avg delta">
                                {formatVN(trendData.summaryRows.delta.average)}
                              </td>
                              <td className="trend-td-trend delta">-</td>
                            </tr>
                          )}

                          {/* 5. CÁC HÀNG CHI TIẾT TỪNG ĐIỂM ĐO */}
                          {displayedTrendRows.length === 0 ? (
                            <tr>
                              <td colSpan={(trendData?.timeColumns?.length || 0) + 6} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                                Không có điểm đo nào khớp với bộ lọc đã chọn.
                              </td>
                            </tr>
                          ) : (
                            displayedTrendRows.map((r: any, idx: number) => (
                              <tr key={r.pointId} className="trend-row-point">
                                <td className="trend-td-sticky trend-col-stt point">
                                  {idx + 1}
                                </td>
                                <td className="trend-td-sticky trend-col-code point">
                                  <strong className="trend-point-code">{r.code}</strong>
                                </td>
                                <td className="trend-td-sticky trend-col-name point">
                                  <div className="trend-point-name">{r.name}</div>
                                  <div className="trend-point-loc">{r.location}</div>
                                </td>

                                {(trendData.timeColumns || []).map((col: any) => {
                                  const val = r.values?.[col.key] || 0;
                                  const isNonZero = val > 0;
                                  return (
                                    <td
                                      key={col.key}
                                      className={`trend-td-cell ${isNonZero ? (r.isSupplyMeter ? 'has-val-supply' : 'has-val-cons') : 'empty'}`}
                                    >
                                      {isNonZero ? formatVN(val) : '-'}
                                    </td>
                                  );
                                })}

                                <td className={`trend-td-total point ${r.isSupplyMeter ? 'supply' : r.isRecycledWater ? 'recycled' : r.isExcludedFromTotal ? 'excluded' : 'cons'}`}>
                                  {formatVN(r.total)}
                                </td>
                                <td className="trend-td-avg point">
                                  {formatVN(r.average)}
                                </td>
                                <td className="trend-td-trend point">
                                  {r.trendPercent > 0 ? (
                                    <span className="trend-badge up" title="Tăng so với mốc trước">
                                      <TrendingUp size={11} /> +{r.trendPercent}%
                                    </span>
                                  ) : r.trendPercent < 0 ? (
                                    <span className="trend-badge down" title="Giảm so với mốc trước">
                                      <TrendingDown size={11} /> {r.trendPercent}%
                                    </span>
                                  ) : (
                                    <span className="trend-badge flat">-</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL: THÊM / SỬA ĐIỂM ĐO */}
      {showPointModal && (
        <div className="util-modal-overlay">
          <div className="card util-modal-card">
            <h3 className="modal-title">
              {editingPoint ? 'CHỈNH SỬA ĐIỂM ĐO' : 'THÊM MỚI ĐIỂM ĐO / HỆ THỐNG'}
            </h3>

            <form onSubmit={handleSavePoint} className="modal-form-content">
              <div className="form-row-grid">
                <div>
                  <label className="modal-label required">Mã định danh (Code) *</label>
                  <input
                    type="text"
                    required
                    value={pointForm.code}
                    onChange={(e) => setPointForm({ ...pointForm, code: e.target.value })}
                    className="modal-input"
                  />
                </div>
                <div>
                  <label className="modal-label required">Loại tiện ích *</label>
                  <select
                    value={pointForm.type}
                    onChange={(e) => setPointForm({ ...pointForm, type: e.target.value })}
                    className="modal-select"
                  >
                    <option value="ELECTRICITY">Điện (Electricity)</option>
                    <option value="WATER">Nước (Water)</option>
                    <option value="SYSTEM_AUX">Hệ thống phụ trợ (HVAC, Chiller...)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="modal-label required">Tên hiển thị đồng hồ / hệ thống *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Tủ điện phân xưởng Mắt Mũi DB-01"
                  value={pointForm.name}
                  onChange={(e) => setPointForm({ ...pointForm, name: e.target.value })}
                  className="modal-input"
                />
              </div>

              <div>
                <label className="modal-label required">Vị trí lắp đặt *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Tầng 2, Xưởng Mắt Mũi"
                  value={pointForm.location}
                  onChange={(e) => setPointForm({ ...pointForm, location: e.target.value })}
                  className="modal-input"
                />
              </div>

              <div className="form-row-grid">
                <div>
                  <label className="modal-label">Hệ số nhân biến dòng (CT)</label>
                  <input
                    type="number"
                    step="any"
                    value={pointForm.multiplier}
                    onChange={(e) => setPointForm({ ...pointForm, multiplier: parseFloat(e.target.value) || 1.0 })}
                    className="modal-input"
                  />
                </div>
                <div>
                  <label className="modal-label">Đơn vị đo</label>
                  <input
                    type="text"
                    value={pointForm.unit}
                    onChange={(e) => setPointForm({ ...pointForm, unit: e.target.value })}
                    className="modal-input"
                  />
                </div>
              </div>

              <div style={{ padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="isSupplyMeterCheckbox"
                  checked={pointForm.isSupplyMeter}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setPointForm({
                      ...pointForm,
                      isSupplyMeter: checked,
                      ...(checked ? { isRecycledWater: false, isExcludedFromTotal: false } : {}),
                    });
                  }}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="isSupplyMeterCheckbox" style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', cursor: 'pointer', margin: 0 }}>
                  Đồng hồ nguồn tổng cấp (Nguồn cấp vào từ Điện lực / Thủy cục)
                </label>
              </div>

              {pointForm.type === 'WATER' && (
                <div style={{ padding: '10px 14px', backgroundColor: '#f5f3ff', borderRadius: '8px', border: '1px solid #ddd6fe', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    id="isRecycledWaterCheckbox"
                    checked={pointForm.isRecycledWater}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setPointForm({
                        ...pointForm,
                        isRecycledWater: checked,
                        ...(checked ? { isSupplyMeter: false, isExcludedFromTotal: false } : {}),
                      });
                    }}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="isRecycledWaterCheckbox" style={{ fontSize: '13px', fontWeight: 600, color: '#6b21a8', cursor: 'pointer', margin: 0 }}>
                    Đồng hồ đo nước tái sử dụng / tuần hoàn (Hệ thống tự động loại trừ khỏi Tổng sử dụng để tránh tính trùng 2 lần)
                  </label>
                </div>
              )}

              <div style={{ padding: '10px 14px', backgroundColor: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="isExcludedFromTotalCheckbox"
                  checked={pointForm.isExcludedFromTotal}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setPointForm({
                      ...pointForm,
                      isExcludedFromTotal: checked,
                      ...(checked ? { isSupplyMeter: false, isRecycledWater: false } : {}),
                    });
                  }}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="isExcludedFromTotalCheckbox" style={{ fontSize: '13px', fontWeight: 600, color: '#92400e', cursor: 'pointer', margin: 0 }}>
                  Đồng hồ đo đối chứng / trung gian nối tiếp (Không tính vào Tổng cấp & Không tính vào Tổng dùng)
                </label>
              </div>

              <div>
                <label className="modal-label">Ghi chú mô tả</label>
                <textarea
                  rows={2}
                  value={pointForm.description}
                  onChange={(e) => setPointForm({ ...pointForm, description: e.target.value })}
                  className="modal-textarea"
                />
              </div>

              <div className="modal-actions-row">
                <button
                  type="button"
                  onClick={() => setShowPointModal(false)}
                  className="btn-modal-cancel"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                >
                  {editingPoint ? 'Cập Nhật' : 'Lưu Điểm Đo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PREVIEW IN TEM MÃ QR */}
      {printPoint && (
        <div className="util-modal-overlay">
          <div className="card util-modal-card print-preview-card">
            <h3 className="modal-title">
              IN TEM MÃ QR DÁN ĐỒNG HỒ / TỦ ĐIỆN
            </h3>

            {/* Khung Tem QR chuẩn in */}
            <div id="printable-utility-qr-tag" className="qr-printable-tag">
              <div className="qr-tag-brand">DK PHARMA CMMS</div>
              <div className="qr-tag-name">{printPoint.name}</div>

              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(printPoint.code)}`}
                alt={`QR ${printPoint.code}`}
                className="qr-tag-img"
              />

              <div className="qr-tag-code">{printPoint.code}</div>
              <div className="qr-tag-loc">{printPoint.location}</div>
            </div>

            <div className="modal-actions-row" style={{ justifyContent: 'center' }}>
              <button
                onClick={() => setPrintPoint(null)}
                className="btn-modal-cancel"
              >
                Đóng
              </button>
              <button
                onClick={() => window.print()}
                className="btn-modal-submit print-btn"
              >
                <Printer size={16} />
                <span>In Tem Ngay</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ĐÁNH DẤU HỦY KẾT QUẢ GHI SAI (AUDIT TRAIL) */}
      {/* MODAL: HỦY KẾT QUẢ SAI */}
      {voidModalReading && (
        <div 
          className="modal-overlay" 
          style={{ zIndex: 1100, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)' }}
          onClick={() => {
            if (!voiding) {
              setVoidModalReading(null);
              setVoidReason('');
            }
          }}
        >
          <div 
            className="modal-content" 
            style={{ 
              maxWidth: '480px', 
              padding: '24px', 
              backgroundColor: '#ffffff', 
              borderRadius: '12px', 
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e2e8f0' 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid #fee2e2', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', borderRadius: '50%', backgroundColor: '#fee2e2', color: '#dc2626' }}>
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#991b1b' }}>
                    Xác nhận Hủy Kết Quả Ghi Sai
                  </h3>
                  <span style={{ fontSize: '11.5px', color: '#6b7280' }}>
                    Cơ chế Audit Trail: Dữ liệu được bảo toàn lưu vết, không bị xóa khỏi CSDL.
                  </span>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => { setVoidModalReading(null); setVoidReason(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
                title="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', marginBottom: '14px', fontSize: '12.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#64748b' }}>Điểm đo / Đồng hồ:</span>
                <strong>{voidModalReading.point?.name} ({voidModalReading.point?.code})</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#64748b' }}>Thời gian ghi:</span>
                <span>{new Date(voidModalReading.recordedAt).toLocaleString('vi-VN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#64748b' }}>Chỉ số ghi nhận:</span>
                <strong style={{ color: '#dc2626', fontSize: '14px' }}>
                  {voidModalReading.readingValue?.toLocaleString()} {voidModalReading.point?.unit}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Sản lượng tính sai:</span>
                <span style={{ color: '#b45309', fontWeight: 700 }}>
                  +{voidModalReading.consumption?.toLocaleString()} {voidModalReading.point?.unit}
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmVoidReading}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Lý do đánh dấu hủy <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  className="modal-textarea"
                  rows={3}
                  required
                  placeholder="Ví dụ: Nhân viên nhìn nhầm số hàng chục, nhập thừa số 0, hoặc ghi nhầm đồng hồ..."
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  style={{ width: '100%', borderColor: '#cbd5e1', fontSize: '13px' }}
                />
                <small style={{ color: '#64748b', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                  * Sau khi hủy, chỉ số đồng hồ sẽ tự động được hoàn nguyên về số hợp lệ gần nhất để NV tiếp tục ghi số đúng.
                </small>
              </div>

              <div className="modal-actions-row">
                <button
                  type="button"
                  onClick={() => {
                    setVoidModalReading(null);
                    setVoidReason('');
                  }}
                  className="btn-modal-cancel"
                  disabled={voiding}
                >
                  Đóng / Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={voiding || !voidReason.trim()}
                  style={{
                    backgroundColor: '#dc2626',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {voiding ? <RefreshCw size={14} className="animate-spin" /> : <Ban size={14} />}
                  <span>Xác nhận Hủy Kết Quả</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CHỈNH SỬA BẢN GHI CHỈ SỐ */}
      {editModalReading && (
        <div 
          className="modal-overlay" 
          style={{ zIndex: 1100, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)' }}
          onClick={() => {
            if (!savingEditReading) {
              setEditModalReading(null);
            }
          }}
        >
          <div 
            className="modal-content" 
            style={{ 
              maxWidth: '520px', 
              padding: '24px', 
              backgroundColor: '#ffffff', 
              borderRadius: '12px', 
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e2e8f0' 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#2563eb' }}>
                  <Edit2 size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Chỉnh Sửa Bản Ghi Chỉ Số
                  </h3>
                  <span style={{ fontSize: '11.5px', color: '#6b7280' }}>
                    Hệ thống sẽ tự động cập nhật sản lượng và liên kết lại chuỗi bản ghi.
                  </span>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setEditModalReading(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
                title="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            {/* Meter Info card */}
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px', fontSize: '12.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#64748b' }}>Đồng hồ / Điểm đo:</span>
                <strong>{editModalReading.point?.name} ({editModalReading.point?.code})</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#64748b' }}>Hệ số nhân (TI / TU):</span>
                <strong style={{ color: '#0284c7' }}>x{editModalReading.point?.multiplier ?? 1.0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Đơn vị đo:</span>
                <span style={{ fontWeight: 600 }}>{editModalReading.point?.unit || 'kWh'}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmEditReading}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Chỉ số trước (Số cũ) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    className="form-input"
                    value={editReadingForm.previousValue}
                    onChange={e => setEditReadingForm({ ...editReadingForm, previousValue: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Chỉ số ghi nhận (Số mới) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    className="form-input"
                    value={editReadingForm.readingValue}
                    onChange={e => setEditReadingForm({ ...editReadingForm, readingValue: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {/* Live preview consumption calculation */}
              <div style={{ 
                padding: '10px 12px', 
                backgroundColor: '#f0fdf4', 
                border: '1px solid #bbf7d0', 
                borderRadius: '6px', 
                marginBottom: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#166534' }}>Sản lượng tiêu thụ tính toán:</div>
                  <div style={{ fontSize: '11px', color: '#15803d', fontFamily: 'monospace' }}>
                    ({editReadingForm.readingValue} - {editReadingForm.previousValue}) × {editModalReading.point?.multiplier ?? 1.0}
                  </div>
                </div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#15803d' }}>
                  +{((Number(editReadingForm.readingValue) - Number(editReadingForm.previousValue)) * (editModalReading.point?.multiplier ?? 1.0)).toLocaleString()} {editModalReading.point?.unit}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Thời gian ghi số *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    className="form-input"
                    value={editReadingForm.recordedAt}
                    onChange={e => setEditReadingForm({ ...editReadingForm, recordedAt: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Ca làm việc
                  </label>
                  <select
                    className="form-input"
                    value={editReadingForm.shift}
                    onChange={e => setEditReadingForm({ ...editReadingForm, shift: e.target.value })}
                  >
                    <option value="ALL">Cả ngày / Tự động</option>
                    <option value="SHIFT_1">Ca 1</option>
                    <option value="SHIFT_2">Ca 2</option>
                    <option value="SHIFT_3">Ca 3</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Ghi chú điều chỉnh
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="VD: Điều chỉnh lại do nhập nhầm số hàng đơn vị hoặc cài lại hệ số..."
                  value={editReadingForm.notes}
                  onChange={e => setEditReadingForm({ ...editReadingForm, notes: e.target.value })}
                />
              </div>

              <div className="modal-actions-row">
                <button
                  type="button"
                  onClick={() => setEditModalReading(null)}
                  className="btn-modal-cancel"
                  disabled={savingEditReading}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={savingEditReading}
                  style={{ backgroundColor: '#2563eb' }}
                >
                  {savingEditReading ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESPONSIVE STYLESHEET */}
      <style>{`
        .util-page-root {
          padding: 0;
          width: 100%;
          max-width: 100%;
          margin: 0 auto;
          box-sizing: border-box;
          overflow-x: hidden;
        }

        .util-page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
          width: 100%;
          box-sizing: border-box;
        }

        .util-header-title-box {
          flex: 1;
          min-width: 0;
        }

        .util-header-title {
          font-size: 20px;
          font-weight: 800;
          margin: 0 0 4px 0;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
        }

        .util-header-subtitle {
          font-size: 13px;
          color: #64748b;
          margin: 0;
          line-height: 1.4;
        }

        .util-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .util-scan-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background-color: #2563eb;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          padding: 10px 16px;
          font-size: 13.5px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
          transition: background-color 0.15s ease;
          touch-action: manipulation;
          white-space: nowrap;
        }

        .util-scan-btn:hover {
          background-color: #1d4ed8;
        }

        .util-refresh-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background-color: #ffffff;
          cursor: pointer;
          color: #475569;
          flex-shrink: 0;
        }

        /* Tabs bar segmented style */
        .util-tabs-wrapper {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          margin-bottom: 16px;
        }
        .util-tabs-wrapper::-webkit-scrollbar {
          display: none;
        }

        .util-tabs-bar {
          display: inline-flex;
          padding: 4px;
          background-color: #f1f5f9;
          border-radius: 10px;
          gap: 4px;
          white-space: nowrap;
          min-width: 100%;
          box-sizing: border-box;
        }

        .util-tab-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border: none;
          background: none;
          color: #64748b;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          border-radius: 8px;
          white-space: nowrap;
          transition: all 0.15s ease;
          flex: 1;
          justify-content: center;
        }

        .util-tab-btn.active {
          background-color: #ffffff;
          color: #2563eb;
          font-weight: 700;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
        }

        .tab-label-short {
          display: none;
        }
        .tab-label-full {
          display: inline;
        }

        .util-tab-content {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
          box-sizing: border-box;
        }

        /* KPI Grid (Compact 6-Card Overview) */
        .util-kpi-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 10px;
          width: 100%;
          box-sizing: border-box;
        }

        .util-kpi-card {
          padding: 9px 11px;
          border-radius: 8px;
          background-color: #ffffff;
          box-sizing: border-box;
          min-width: 0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .util-kpi-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 3px 8px rgba(0,0,0,0.08);
        }

        .kpi-elec-supply  { border-left: 3.5px solid #eab308; }
        .kpi-elec-cons    { border-left: 3.5px solid #f97316; }
        .kpi-water-supply { border-left: 3.5px solid #0ea5e9; }
        .kpi-water-cons   { border-left: 3.5px solid #06b6d4; }
        .kpi-aux          { border-left: 3.5px solid #16a34a; }
        .kpi-points       { border-left: 3.5px solid #8b5cf6; }

        .util-kpi-card .kpi-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
        }

        .util-kpi-card .kpi-label {
          font-size: 10px;
          font-weight: 700;
          color: #64748b;
          letter-spacing: 0.2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .util-kpi-card .kpi-icon-box {
          width: 22px;
          height: 22px;
          padding: 0;
          border-radius: 5px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .util-kpi-card .kpi-val {
          font-size: 16.5px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .util-kpi-card .kpi-unit {
          font-size: 10.5px;
          font-weight: 600;
          color: #64748b;
        }

        .util-kpi-card .kpi-sub {
          font-size: 10px;
          color: #64748b;
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .kpi-count-tag {
          font-size: 9px;
          font-weight: 700;
          padding: 1px 4px;
          border-radius: 4px;
          background-color: #f1f5f9;
          color: #475569;
          border: 1px solid #cbd5e1;
          margin-left: 4px;
          vertical-align: middle;
        }

        .kpi-meter-list {
          display: flex;
          flex-direction: column;
          gap: 1.5px;
          margin-top: 3px;
          padding-top: 3px;
          border-top: 1px dashed #e2e8f0;
        }

        .kpi-meter-row {
          display: flex;
          align-items: center;
          gap: 3px;
          font-size: 9.5px;
          line-height: 1.25;
          color: #475569;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .kpi-meter-code {
          font-weight: 700;
          color: #1e293b;
          white-space: nowrap;
        }

        .kpi-meter-val {
          font-weight: 800;
          color: #0f172a;
          white-space: nowrap;
        }

        .kpi-meter-sub {
          font-size: 8.5px;
          color: #64748b;
          white-space: nowrap;
        }

        /* Cumulative Periodic Report KPI Grid */
        .cumulative-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          width: 100%;
          box-sizing: border-box;
        }
        .cumulative-kpi-grid.five-cols {
          grid-template-columns: repeat(5, minmax(0, 1fr));
        }
        .cumulative-kpi-card {
          padding: 10px 12px;
          border-radius: 8px;
          background-color: #ffffff;
          box-sizing: border-box;
          min-width: 0;
        }
        .cumulative-kpi-card .kpi-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
        }
        .cumulative-kpi-card .kpi-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .cumulative-kpi-card .kpi-icon-box {
          padding: 4px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .cumulative-kpi-card .kpi-val {
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .cumulative-kpi-card .kpi-unit {
          font-size: 11.5px;
          font-weight: 600;
          color: #64748b;
        }
        .cumulative-kpi-card .kpi-sub {
          font-size: 10.5px;
          color: #64748b;
          margin-top: 2px;
          line-height: 1.25;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .kpi-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }

        .kpi-label {
          font-size: 11.5px;
          font-weight: 700;
          color: #64748b;
          letter-spacing: 0.3px;
        }

        .kpi-icon-box {
          padding: 5px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .kpi-val {
          font-size: 22px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.2;
        }

        .kpi-unit {
          font-size: 12.5px;
          font-weight: 600;
          color: #64748b;
        }

        .kpi-sub {
          font-size: 11px;
          color: #64748b;
          margin-top: 3px;
        }

        .util-section-card {
          padding: 16px;
          border-radius: 12px;
          background-color: #ffffff;
          width: 100%;
          min-width: 0;
          max-width: 100%;
          overflow: hidden;
          box-sizing: border-box;
        }

        .table-responsive {
          width: 100%;
          max-width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          display: block;
          box-sizing: border-box;
        }

        .section-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
          gap: 10px;
          flex-wrap: wrap;
        }

        .section-title {
          font-size: 14.5px;
          font-weight: 800;
          margin: 0 0 2px 0;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .section-sub {
          font-size: 12px;
          color: #64748b;
          margin: 0;
        }

        .btn-action-outline {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 12px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background-color: #ffffff;
          color: #2563eb;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
          white-space: nowrap;
        }

        /* Aux Matrix (Compact High-Density Grid) */
        .aux-matrix-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 9px;
          width: 100%;
          box-sizing: border-box;
        }

        .aux-card {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 8px 10px;
          background-color: #ffffff;
          box-shadow: 0 1px 2px rgba(0,0,0,0.03);
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 96px;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .aux-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 3px 8px rgba(0,0,0,0.06);
        }

        .aux-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
          margin-bottom: 4px;
        }

        .aux-card-header-left {
          display: flex;
          align-items: center;
          gap: 4px;
          min-width: 0;
          overflow: hidden;
        }

        .aux-code {
          font-size: 11px;
          font-weight: 800;
          color: #0f172a;
          white-space: nowrap;
        }

        .aux-loc {
          font-size: 10.5px;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .aux-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 3.5px;
          padding: 1.5px 6px;
          border-radius: 999px;
          font-size: 9.5px;
          font-weight: 800;
          border: 1px solid;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .status-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
        }

        .aux-card-mid {
          display: flex;
          flex-direction: column;
          gap: 2px;
          margin-bottom: 6px;
        }

        .aux-name {
          font-size: 12.5px;
          font-weight: 700;
          margin: 0;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.3;
        }

        .aux-hour-inline {
          display: flex;
          align-items: center;
          gap: 4px;
          background-color: #f8fafc;
          border: 1px solid #f1f5f9;
          border-radius: 4px;
          padding: 2.5px 5px;
          margin-top: 2px;
        }

        .aux-hour-val {
          font-size: 11.5px;
          font-weight: 800;
          color: #0f172a;
          white-space: nowrap;
        }

        .aux-hour-delta {
          font-size: 9.5px;
          color: #15803d;
          font-weight: 700;
          background-color: #dcfce7;
          padding: 0 3.5px;
          border-radius: 3px;
          white-space: nowrap;
        }

        .aux-action-row {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .quick-btn {
          width: 100%;
          height: 24px;
          padding: 0 8px;
          border-radius: 5px;
          font-size: 10.5px;
          font-weight: 700;
          cursor: pointer;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          touch-action: manipulation;
          transition: background-color 0.15s ease;
        }

        .quick-btn.start {
          background-color: #16a34a;
          color: #ffffff;
        }
        .quick-btn.start:hover {
          background-color: #15803d;
        }

        .quick-btn.stop {
          background-color: #475569;
          color: #ffffff;
        }
        .quick-btn.stop:hover {
          background-color: #334155;
        }

        /* Filter Bar */
        .util-filter-bar {
          padding: 12px 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          border-radius: 10px;
          background-color: #ffffff;
          width: 100%;
          box-sizing: border-box;
        }

        .filter-search-box {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 10px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background-color: #ffffff;
          flex: 1;
          min-width: 180px;
          box-sizing: border-box;
        }

        .filter-search-input {
          border: none;
          outline: none;
          font-size: 12.5px;
          width: 100%;
        }

        .filter-select {
          padding: 7px 10px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background-color: #ffffff;
          font-size: 12.5px;
          outline: none;
          box-sizing: border-box;
        }

        .btn-export-csv {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 7px 12px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background-color: #ffffff;
          color: #0f172a;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
          margin-left: auto;
          white-space: nowrap;
          box-sizing: border-box;
        }

        /* Charts */
        .chart-bar-track {
          flex: 1;
          height: 10px;
          background-color: #f1f5f9;
          border-radius: 5px;
          overflow: hidden;
          min-width: 50px;
        }

        .chart-bar-fill {
          height: 100%;
          border-radius: 5px;
          transition: width 0.3s ease;
        }

        .chart-bar-fill.elec { background-color: #eab308; }
        .chart-bar-fill.water { background-color: #0ea5e9; }

        .delta-badge-table {
          font-weight: 800;
          color: #15803d;
          font-size: 12.5px;
          padding: 2px 6px;
          background-color: #f0fdf4;
          border-radius: 4px;
        }

        /* Dual-view helper: Table on desktop, Cards on mobile */
        .desktop-view-container {
          display: block;
        }
        .mobile-cards-feed {
          display: none;
        }

        /* Mobile Trend Cards */
        .mobile-trend-card {
          padding: 10px 12px;
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          margin-bottom: 8px;
        }
        .trend-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }
        .trend-date {
          font-weight: 700;
          font-size: 13px;
          color: #0f172a;
        }
        .trend-count {
          font-size: 11px;
          color: #64748b;
        }
        .trend-bar-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 4px;
        }
        .trend-bar-meta {
          width: 90px;
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
        }
        .trend-label {
          font-size: 10.5px;
          font-weight: 700;
        }
        .trend-label.elec { color: #854d0e; }
        .trend-label.water { color: #0369a1; }
        .trend-val {
          font-size: 11.5px;
          font-weight: 700;
          color: #0f172a;
        }

        /* Mobile Log Cards */
        .mobile-log-card, .mobile-point-card {
          padding: 12px 14px;
          border-radius: 10px;
          background-color: #ffffff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          margin-bottom: 8px;
          border: 1px solid #e2e8f0;
          box-sizing: border-box;
          width: 100%;
        }

        .mobile-log-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
          gap: 6px;
        }

        .mobile-log-point-name {
          font-weight: 800;
          font-size: 13.5px;
          color: #0f172a;
          word-break: break-word;
        }

        .log-time-badge {
          font-size: 11px;
          color: #64748b;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .mobile-log-meta {
          font-size: 11px;
          color: #64748b;
          margin-bottom: 8px;
        }

        .mobile-log-values-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 8px 10px;
          gap: 6px;
        }

        .mobile-val-box {
          display: flex;
          flex-direction: column;
        }

        .val-lbl {
          font-size: 10px;
          color: #64748b;
        }

        .val-txt {
          font-size: 12.5px;
          font-weight: 600;
          color: #475569;
        }

        .val-txt.new {
          font-weight: 800;
          color: #0f172a;
        }

        .mobile-val-delta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .val-txt-delta {
          font-size: 13.5px;
          font-weight: 800;
          color: #15803d;
        }

        .mobile-log-footer {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: #475569;
          margin-top: 6px;
          border-top: 1px dashed #e2e8f0;
          padding-top: 5px;
        }

        .btn-add-point {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 7px 14px;
          border-radius: 6px;
          border: none;
          background-color: #0f172a;
          color: #ffffff;
          font-weight: 700;
          font-size: 12.5px;
          cursor: pointer;
          white-space: nowrap;
        }

        .btn-qr-preview {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 5px 10px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background-color: #ffffff;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          color: #0f172a;
          white-space: nowrap;
        }

        .btn-icon-action {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background-color: #ffffff;
          cursor: pointer;
          color: #475569;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .btn-icon-action.danger {
          color: #dc2626;
          border-color: #fecaca;
        }

        /* Modal Styles */
        .util-modal-overlay {
          position: fixed;
          inset: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 12px;
        }

        .util-modal-card {
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          background-color: #ffffff;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.15);
          box-sizing: border-box;
        }

        .modal-title {
          font-size: 15.5px;
          font-weight: 800;
          margin: 0 0 14px 0;
          color: #0f172a;
        }

        .modal-form-content {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .form-row-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .modal-label {
          font-size: 12px;
          font-weight: 600;
          color: #334155;
          display: block;
          margin-bottom: 4px;
        }

        .modal-input, .modal-select {
          width: 100%;
          padding: 7px 10px;
          font-size: 13px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          box-sizing: border-box;
          outline: none;
        }

        .modal-textarea {
          width: 100%;
          padding: 7px 10px;
          font-size: 13px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          box-sizing: border-box;
          outline: none;
          font-family: inherit;
        }

        .modal-actions-row {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 10px;
        }

        .btn-modal-cancel {
          padding: 7px 14px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background-color: #ffffff;
          cursor: pointer;
          font-size: 12.5px;
        }

        .btn-modal-submit {
          padding: 7px 16px;
          border-radius: 6px;
          border: none;
          background-color: #0f172a;
          color: #ffffff;
          font-weight: 700;
          cursor: pointer;
          font-size: 12.5px;
        }

        .btn-modal-submit.print-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background-color: #2563eb;
        }

        .print-preview-card {
          max-width: 360px;
          text-align: center;
        }

        .qr-printable-tag {
          border: 2px solid #0f172a;
          border-radius: 8px;
          padding: 14px;
          background-color: #ffffff;
          margin: 0 auto 16px;
          width: 240px;
          max-width: 100%;
          box-sizing: border-box;
        }

        .qr-tag-brand {
          font-size: 11px;
          font-weight: 800;
          color: #b91c1c;
          letter-spacing: 1px;
          margin-bottom: 3px;
        }

        .qr-tag-name {
          font-size: 12.5px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 6px;
        }

        .qr-tag-img {
          width: 130px;
          height: 130px;
          margin: 0 auto 6px auto;
          display: block;
        }

        .qr-tag-code {
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.5px;
          color: #0f172a;
        }

        .qr-tag-loc {
          font-size: 10.5px;
          color: #64748b;
        }

        /* TREND MATRIX STYLES */
        .trend-matrix-card {
          padding: 16px;
          margin-top: 24px;
        }

        .trend-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }

        .trend-view-type-pills {
          display: inline-flex;
          border-radius: 8px;
          padding: 3px;
          background-color: #f1f5f9;
          border: 1px solid #e2e8f0;
          gap: 2px;
        }

        .view-type-btn {
          padding: 5px 12px;
          border-radius: 6px;
          border: none;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          background-color: transparent;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 5px;
          transition: all 0.15s ease;
          white-space: nowrap;
        }

        .view-type-btn:hover {
          color: #0f172a;
        }

        .view-type-btn.active {
          background-color: #ffffff;
          color: #0f172a;
          font-weight: 700;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        }

        .trend-title-box {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        /* Dedicated Responsive Toolbar */
        .trend-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 10px 12px;
          margin-bottom: 12px;
          width: 100%;
          box-sizing: border-box;
        }

        .trend-toolbar-left {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .trend-toolbar-right {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .trend-mode-pills {
          display: inline-flex;
          border-radius: 8px;
          padding: 3px;
          background-color: #e2e8f0;
          gap: 2px;
        }

        .trend-mode-btn {
          padding: 5px 12px;
          border-radius: 6px;
          border: none;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          background-color: transparent;
          color: #475569;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all 0.15s ease;
          white-space: nowrap;
        }

        .trend-mode-btn.active {
          background-color: #ffffff;
          color: #0f172a;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .trend-date-selectors {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .trend-select {
          padding: 6px 12px;
          font-size: 12.5px;
          font-weight: 600;
        }

        .trend-filter-box {
          position: relative;
          display: flex;
          align-items: center;
        }

        .trend-filter-icon {
          position: absolute;
          left: 10px;
          color: #64748b;
          pointer-events: none;
        }

        .trend-filter-select {
          padding: 6px 28px 6px 28px;
          font-size: 12.5px;
          font-weight: 600;
          min-width: 180px;
          max-width: 280px;
        }

        .btn-trend-reset {
          position: absolute;
          right: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: none;
          background-color: #e2e8f0;
          color: #475569;
          cursor: pointer;
        }

        .btn-trend-reset:hover {
          background-color: #cbd5e1;
        }

        .btn-trend-toggle-view {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          border: 1.5px solid #10b981;
          background-color: #ecfdf5;
          color: #065f46;
          transition: all 0.15s ease;
          white-space: nowrap;
          height: 34px;
          box-sizing: border-box;
        }

        .btn-trend-toggle-view:hover {
          background-color: #d1fae5;
          border-color: #059669;
          transform: translateY(-1px);
        }

        .btn-trend-toggle-view.active-chart {
          background-color: #059669;
          color: #ffffff;
          border-color: #047857;
          box-shadow: 0 2px 4px rgba(5, 150, 105, 0.25);
        }

        .trend-export-btn {
          padding: 6px 12px;
          font-size: 12px;
          height: 34px;
          margin-left: 0;
        }

        /* Navigation Jump Strip */
        .trend-nav-strip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          flex-wrap: wrap;
          padding: 7px 12px;
          background-color: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 8px;
          margin-bottom: 10px;
          font-size: 12px;
          box-sizing: border-box;
          width: 100%;
        }

        .trend-nav-info {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #166534;
          font-weight: 600;
        }

        .trend-nav-period-text {
          font-weight: 700;
          color: #166534;
        }

        .trend-scroll-guide {
          color: #64748b;
          font-size: 11px;
          font-weight: 400;
        }

        .trend-nav-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .trend-jump-group {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .btn-jump-pill {
          padding: 4px 8px;
          border-radius: 5px;
          border: 1px solid #cbd5e1;
          background-color: #ffffff;
          color: #0f172a;
          font-size: 11.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }

        .btn-jump-pill:hover {
          background-color: #e2e8f0;
        }

        .trend-arrows-group {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .btn-arrow-pill {
          width: 26px;
          height: 26px;
          border-radius: 5px;
          border: 1px solid #cbd5e1;
          background-color: #ffffff;
          color: #334155;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
        }

        .btn-arrow-pill:hover {
          background-color: #e2e8f0;
        }

        /* Matrix Table Container & Scrolling */
        .trend-matrix-table-container {
          width: 100%;
          max-width: 100%;
          max-height: 580px;
          overflow-x: auto;
          overflow-y: auto;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background-color: #ffffff;
          position: relative;
          -webkit-overflow-scrolling: touch;
          box-sizing: border-box;
        }

        .trend-matrix-table-container::-webkit-scrollbar {
          width: 8px;
          height: 10px;
        }

        .trend-matrix-table-container::-webkit-scrollbar-track {
          background: #f1f5f9;
        }

        .trend-matrix-table-container::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 5px;
        }

        .trend-matrix-table-container::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        /* Table Structure & Sticky Setup */
        .trend-matrix-table {
          border-collapse: separate;
          border-spacing: 0;
          width: max-content;
          min-width: 100%;
        }

        .trend-matrix-table th {
          position: sticky;
          top: 0;
          z-index: 10;
          background-color: #f8fafc;
          border-bottom: 2px solid #cbd5e1;
          white-space: nowrap;
        }

        .trend-matrix-table th.trend-th-sticky {
          z-index: 25;
          background-color: #f8fafc;
        }

        .trend-col-stt {
          width: 44px;
          min-width: 44px;
          max-width: 44px;
          left: 0;
          text-align: center;
        }

        .trend-col-code {
          width: 116px;
          min-width: 116px;
          max-width: 116px;
          left: 44px;
        }

        .trend-col-name {
          width: 200px;
          min-width: 200px;
          max-width: 240px;
          left: 160px;
          box-shadow: 3px 0 6px -2px rgba(0, 0, 0, 0.08);
        }

        .trend-th-day {
          text-align: right;
          min-width: 65px;
          font-size: 12px;
          padding: 8px 6px;
          background-color: #f8fafc;
        }

        .trend-th-day.sunday {
          background-color: #fef2f2 !important;
        }

        .trend-th-day.saturday {
          background-color: #eff6ff !important;
        }

        .trend-day-sub {
          font-size: 10px;
          font-weight: 500;
          color: #64748b;
          display: block;
        }

        .trend-day-sub.sunday {
          color: #dc2626;
        }

        .trend-day-sub.saturday {
          color: #2563eb;
        }

        .trend-th-total {
          text-align: right;
          min-width: 110px;
          font-weight: 800;
          background-color: #f1f5f9;
        }

        .trend-th-avg {
          text-align: right;
          min-width: 95px;
          font-weight: 700;
          background-color: #f8fafc;
        }

        .trend-th-trend {
          text-align: center;
          min-width: 85px;
          font-size: 11.5px;
          background-color: #f8fafc;
        }

        /* Sticky Row Cells */
        .trend-td-sticky {
          position: sticky;
          z-index: 5;
        }

        .trend-td-sticky.point {
          background-color: #ffffff;
        }

        .trend-td-sticky.supply {
          background-color: #eff6ff;
          color: #1d4ed8;
          font-weight: 700;
        }

        .trend-td-sticky.consumption {
          background-color: #f0fdf4;
          color: #047857;
          font-weight: 700;
        }

        .trend-td-sticky.recycled {
          background-color: #f5f3ff;
          color: #7c3aed;
          font-weight: 700;
        }

        .trend-td-sticky.delta {
          background-color: #fffbeb;
          color: #b45309;
          font-weight: 700;
        }

        /* Summary Rows */
        .trend-row-summary.supply {
          background-color: #eff6ff;
          font-weight: 700;
        }

        .trend-row-summary.consumption {
          background-color: #f0fdf4;
          font-weight: 700;
        }

        .trend-row-summary.recycled {
          background-color: #f5f3ff;
          font-weight: 700;
        }

        .trend-row-summary.delta {
          background-color: #fffbeb;
          font-weight: 600;
          border-bottom: 2px solid #cbd5e1;
        }

        .trend-td-val {
          text-align: right;
          font-size: 12px;
          font-weight: 700;
        }

        .trend-td-val.supply { color: #1d4ed8; }
        .trend-td-val.consumption { color: #047857; }
        .trend-td-val.recycled { color: #7c3aed; }
        .trend-td-val.delta { color: #b45309; }

        .trend-td-total {
          text-align: right;
          font-weight: 800;
        }

        .trend-td-total.supply { color: #1d4ed8; background-color: #dbeafe; }
        .trend-td-total.consumption { color: #047857; background-color: #dcfce7; }
        .trend-td-total.recycled { color: #7c3aed; background-color: #ede9fe; }
        .trend-td-total.delta { color: #b45309; background-color: #fef3c7; }

        .trend-td-avg {
          text-align: right;
          font-size: 12.5px;
        }

        .trend-td-avg.supply { color: #1e40af; background-color: #eff6ff; }
        .trend-td-avg.consumption { color: #065f46; background-color: #f0fdf4; }
        .trend-td-avg.recycled { color: #6d28d9; background-color: #f5f3ff; }
        .trend-td-avg.delta { color: #92400e; background-color: #fffbeb; }

        .trend-td-trend {
          text-align: center;
        }

        /* Point Row Styles */
        .trend-row-point {
          background-color: #ffffff;
        }

        .trend-point-code {
          color: #2563eb;
          font-size: 12.5px;
        }

        .trend-point-name {
          font-weight: 600;
          color: #0f172a;
          font-size: 12.5px;
        }

        .trend-point-loc {
          font-size: 11px;
          color: #64748b;
        }

        .trend-td-cell {
          text-align: right;
          font-size: 12px;
          font-family: monospace;
        }

        .trend-td-cell.has-val-supply {
          background-color: #eff6ff;
          color: #1d4ed8;
          font-weight: 600;
        }

        .trend-td-cell.has-val-cons {
          background-color: #f0fdf4;
          color: #047857;
          font-weight: 600;
        }

        .trend-td-cell.empty {
          color: #94a3b8;
        }

        .trend-td-total.point {
          font-size: 13px;
        }

        .trend-td-total.point.supply { color: #1d4ed8; }
        .trend-td-total.point.cons { color: #047857; }
        .trend-td-total.point.recycled { color: #7c3aed; }
        .trend-td-total.point.excluded { color: #b45309; }

        .trend-td-avg.point {
          color: #475569;
          font-weight: 600;
        }

        .trend-badge {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          font-weight: 700;
          font-size: 11.5px;
        }

        .trend-badge.up { color: #dc2626; }
        .trend-badge.down { color: #16a34a; }
        .trend-badge.flat { color: #94a3b8; }

        /* RESPONSIVE BREAKPOINTS */

        /* TABLET (<= 1024px) */
        @media (max-width: 1024px) {
          .util-kpi-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 10px;
          }
          .cumulative-kpi-grid,
          .cumulative-kpi-grid.five-cols {
            grid-template-columns: repeat(2, 1fr);
          }

          .trend-toolbar-left, .trend-toolbar-right {
            width: 100%;
            justify-content: space-between;
          }

          .trend-col-name {
            width: 160px;
            min-width: 160px;
            max-width: 180px;
          }
        }

        /* MOBILE (<= 768px) */
        @media (max-width: 768px) {
          .util-page-header {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
          }

          .util-header-title {
            font-size: 17px;
            white-space: normal;
          }

          .util-header-subtitle {
            display: none; /* Thu gọn header để tiết kiệm chiều cao trên điện thoại */
          }

          .util-header-actions {
            width: 100%;
          }

          .util-scan-btn {
            flex: 1;
            justify-content: center;
            padding: 10px 12px;
            font-size: 13px;
          }

          .tab-label-full {
            display: none;
          }
          .tab-label-short {
            display: inline;
          }

          .util-tab-btn {
            padding: 7px 10px;
            font-size: 12px;
          }

          .util-filter-bar {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .filter-search-box {
            width: 100%;
            min-width: 100%;
          }

          .filter-select {
            width: 100%;
          }

          .btn-export-csv {
            width: 100%;
            justify-content: center;
            margin-left: 0;
          }

          .trend-card-header {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
          }

          .trend-view-type-pills {
            width: 100%;
          }

          .view-type-btn {
            flex: 1;
            justify-content: center;
          }

          /* Trend Matrix Mobile Adjustments */
          .trend-toolbar {
            flex-direction: column;
            align-items: stretch;
            padding: 8px 10px;
          }

          .trend-toolbar-left, .trend-toolbar-right {
            flex-direction: column;
            align-items: stretch;
            width: 100%;
          }

          .trend-mode-pills {
            width: 100%;
          }

          .trend-mode-btn {
            flex: 1;
            justify-content: center;
          }

          .trend-date-selectors {
            display: flex;
            width: 100%;
          }

          .trend-date-selectors select {
            flex: 1;
          }

          .trend-filter-box {
            width: 100%;
          }

          .trend-filter-select {
            width: 100%;
            min-width: 100% !important;
            max-width: 100% !important;
          }

          .btn-trend-toggle-view {
            width: 100%;
            justify-content: center;
          }

          .trend-export-btn {
            width: 100%;
            justify-content: center;
          }

          .trend-nav-strip {
            flex-direction: column;
            align-items: stretch;
            gap: 6px;
          }

          .trend-nav-actions {
            justify-content: space-between;
          }

          .trend-scroll-guide {
            display: none;
          }

          /* Mobile Compact Sticky Columns */
          .trend-col-stt {
            width: 32px;
            min-width: 32px;
            max-width: 32px;
            left: 0;
            padding: 6px 2px;
            font-size: 11px;
          }

          .trend-col-code {
            width: 85px;
            min-width: 85px;
            max-width: 85px;
            left: 32px;
            padding: 6px 4px;
            font-size: 11.5px;
          }

          .trend-col-name {
            width: 120px;
            min-width: 120px;
            max-width: 130px;
            left: 117px;
            padding: 6px 4px;
          }

          .trend-point-name {
            font-size: 11.5px;
          }

          .trend-point-loc {
            display: none; /* Ẩn vị trí trên màn hình siêu nhỏ để tiết kiệm diện tích */
          }

          /* Chuyển hoàn toàn từ Table sang Card Feed */
          .desktop-view-container {
            display: none !important;
          }

          .mobile-cards-feed {
            display: block !important;
          }

          .aux-matrix-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
          }

          .btn-add-point {
            width: 100%;
            justify-content: center;
            padding: 9px;
          }

          .form-row-grid {
            grid-template-columns: 1fr;
            gap: 8px;
          }
        }

        /* SMALL MOBILE (<= 480px) */
        @media (max-width: 480px) {
          .util-kpi-grid,
          .cumulative-kpi-grid,
          .cumulative-kpi-grid.five-cols {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }

          .aux-matrix-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 6px;
          }

          .util-kpi-card {
            padding: 8px 9px;
          }

          .kpi-val {
            font-size: 15px;
          }

          .kpi-unit {
            font-size: 10px;
          }

          .kpi-sub {
            font-size: 9.5px;
          }

          .util-section-card {
            padding: 12px;
          }
        }
      `}</style>
    </div>
  );
};
