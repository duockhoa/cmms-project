import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast, useConfirmDialog } from '../components/common/Toast';
import { usePermissions } from './usePermissions';
import { printBatchQRTags } from '../utils/qrPrintHelper';

export const useUtilitiesPage = () => {
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

  // Mảng năm động tự động theo năm hiện tại (không hardcode)
  const dynamicYears = useMemo(() => {
    const cur = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, i) => cur - 3 + i);
  }, []);

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
  const [selectedPointIds, setSelectedPointIds] = useState<Set<string>>(new Set());

  const toggleSelectOnePoint = (pointId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPointIds(prev => {
      const next = new Set(prev);
      if (next.has(pointId)) next.delete(pointId);
      else next.add(pointId);
      return next;
    });
  };

  const isAllPointsSelected = points.length > 0 && points.every(p => selectedPointIds.has(p.id));
  const toggleSelectAllPoints = () => {
    if (isAllPointsSelected) {
      setSelectedPointIds(new Set());
    } else {
      setSelectedPointIds(new Set(points.map(p => p.id)));
    }
  };

  const [isPrintingPoints, setIsPrintingPoints] = useState(false);

  // In toàn bộ điểm đo (hoặc chỉ các điểm đo được tick chọn)
  const handlePrintBatchPoints = async (onlySelected: boolean = false) => {
    try {
      const targetPoints = (onlySelected && selectedPointIds.size > 0)
        ? points.filter(p => selectedPointIds.has(p.id))
        : points;

      if (targetPoints.length === 0) {
        toast.error('Không có điểm đo nào để in!');
        return;
      }

      setIsPrintingPoints(true);
      toast.info('Đang chuẩn bị tem...', `Đang tạo ${targetPoints.length} tem mã QR điểm đo offline...`);

      const printItems = targetPoints.map(p => ({
        name: p.name,
        code: p.code,
        location: p.location || '',
        qrPayload: p.code,
      }));

      await printBatchQRTags({
        title: (onlySelected && selectedPointIds.size > 0)
          ? `Danh sách Mã QR Điểm Đo Đã Chọn (${printItems.length} điểm đo)`
          : `Danh sách Mã QR Toàn Bộ Điểm Đo Tiện Ích (${printItems.length} điểm đo)`,
        items: printItems,
        columns: 3,
      });
      toast.success('Đã mở cửa sổ in', `Sẵn sàng in ${printItems.length} tem điểm đo trên khổ A4.`);
    } catch (err: any) {
      console.error('Lỗi khi in tem điểm đo:', err);
      toast.error('Lỗi in ấn', err?.message || 'Không thể tạo danh sách tem in.');
    } finally {
      setIsPrintingPoints(false);
    }
  };

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
      throw new Error('Không có dữ liệu ma trận để xuất file.');
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

    return {
      rawCsv: csv,
      filename: `Ma_tran_xu_huong_${trendData.type.toLowerCase()}_${trendViewMode.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`,
    };
  };

  // Xuất file CSV báo cáo tích lũy
  const handleExportCumulativeCSV = () => {
    if (!cumulativeData) {
      throw new Error('Vui lòng chờ tải dữ liệu báo cáo xong.');
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

    return {
      rawCsv: csv,
      filename: `Bao_cao_tich_luy_${type.toLowerCase()}_ky_${month}_${year}.csv`,
    };
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
      throw new Error('Không có bản ghi nào để xuất file.');
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
    return {
      rawCsv: csvContent,
      filename: `So_ghi_dien_nuoc_${new Date().toISOString().slice(0, 10)}.csv`,
    };
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

  const utilityViewModel = {
    navigate, toast, can, isAdmin, loading, points, readings, setReadings, statusLogs, analytics,
    cumulativeType, setCumulativeType, cumulativeMonth, setCumulativeMonth,
    cumulativeYear, setCumulativeYear, cumulativeData, cumulativeLoading,
    cumulativeFilter, setCumulativeFilter, trendViewMode, setTrendViewMode,
    trendDay, setTrendDay, trendMonth, setTrendMonth, trendYear, setTrendYear,
    trendStartYear, setTrendStartYear, trendEndYear, setTrendEndYear,
    trendFilter, setTrendFilter, trendData, trendLoading, trendDisplayType,
    setTrendDisplayType, trendTableContainerRef, dynamicYears, scrollTrendTable,
    scrollToPeriod, filterCategory, setFilterCategory, filterPointId, setFilterPointId, filterSearch,
    setFilterSearch, filterStatus, setFilterStatus, recalculating, setVoidModalReading,
    setVoidReason, setEditModalReading, setPrintPoint, selectedPointIds,
    toggleSelectOnePoint, isAllPointsSelected, toggleSelectAllPoints, isPrintingPoints,
    handlePrintBatchPoints, getLiveHourMeter, loadCumulativeReport, handleExportTrendCSV,
    handleExportCumulativeCSV, handleOpenAddPoint, handleOpenEditPoint,
    handleDeletePoint, handleQuickToggleStatus, handleRecalculateAll,
    handleExportReadingsCSV, filteredPointsForSelect, handleCategoryChange,
    filteredReadings, displayedCumulativeMeters, displayedTrendRows,
    handleOpenEditReading, editingPoint, pointForm, setPointForm, handleSavePoint,
    setShowPointModal, printPoint, voidModalReading, voiding, voidReason,
    handleConfirmVoidReading, editModalReading, savingEditReading,
    editReadingForm, setEditReadingForm, handleConfirmEditReading,
  };


  return {
    navigate, activeTab, setActiveTab, loadData, loading, filteredReadings,
    statusLogs, points, utilityViewModel, showPointModal, printPoint,
    voidModalReading, editModalReading,
  };
};

export type UtilitiesPageViewModel = ReturnType<typeof useUtilitiesPage>['utilityViewModel'];
