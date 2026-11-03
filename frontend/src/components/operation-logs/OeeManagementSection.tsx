import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Gauge,
  Clock,
  CheckCircle2,
  Award,
  Plus,
  Settings,
  Download,
  RefreshCw,
  QrCode,
  Ban,
  X,
  Save,
  Search,
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../common/Toast';
import { OeeShiftInputForm } from './OeeShiftInputForm';
import { businessDateKey } from '../../utils/oee-calculations';

interface OeeManagementSectionProps {
  defaultOpenRecordModal?: boolean;
}

export const OeeManagementSection: React.FC<OeeManagementSectionProps> = ({
  defaultOpenRecordModal = false,
}) => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [analytics, setAnalytics] = useState<any>(null);
  const [allEquipments, setAllEquipments] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const fetchSequence = useRef(0);

  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [calculationMethod, setCalculationMethod] = useState<'PA1' | 'PA2' | 'PA3'>('PA1');
  const [activityEquipmentId, setActivityEquipmentId] = useState('');
  const [activityStatus, setActivityStatus] = useState('');
  const [activityPage, setActivityPage] = useState(0);
  const [batchOeeFilter, setBatchOeeFilter] = useState('');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return businessDateKey(d);
  });
  const [endDate, setEndDate] = useState<string>(() => businessDateKey(new Date()));

  const [showRecordModal, setShowRecordModal] = useState<boolean>(defaultOpenRecordModal);
  const [selectedEquipmentForOee, setSelectedEquipmentForOee] = useState<any>(null);
  const [equipmentSearchQuery, setEquipmentSearchQuery] = useState<string>('');
  const [isEquipmentDropdownOpen, setIsEquipmentDropdownOpen] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsEquipmentDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [configSearch, setConfigSearch] = useState<string>('');
  const [savingConfigId, setSavingConfigId] = useState<string | null>(null);
  const [speedConfigEquipmentId, setSpeedConfigEquipmentId] = useState('');
  const [speedConfigRows, setSpeedConfigRows] = useState<Array<{ productGroup: string; speedPerHour: string }>>([]);
  const [loadingSpeedConfigs, setLoadingSpeedConfigs] = useState(false);
  const [editingConfigs, setEditingConfigs] = useState<
    Record<
      string,
      {
        isCritical: boolean;
        standardSpeedPerHour: string;
        outputUnit: string;
        plannedShiftMinutes: string;
        oeeTarget: string;
      }
    >
  >({});

  const fetchData = async () => {
    const sequence = ++fetchSequence.current;
    setLoading(true);
    try {
      const [analyticsRes, eqRes] = await Promise.all([
        api.getOeeAnalytics({
          startDate,
          endDate,
          department: selectedDepartment || undefined,
          criticalOnly: 'true',
          calculationMethod,
          batchOeeId: batchOeeFilter || undefined,
        }),
        api.getEquipment(),
      ]);

      if (sequence !== fetchSequence.current) return;
      setAnalytics(analyticsRes);
      const eqList = Array.isArray(eqRes) ? eqRes : eqRes?.data || [];
      setAllEquipments(eqList);

      const cfgMap: any = {};
      for (const eq of eqList) {
        cfgMap[eq.id] = {
          isCritical: Boolean(eq.isCritical),
          standardSpeedPerHour: String(eq.standardSpeedPerHour || 2400),
          outputUnit: eq.outputUnit || 'Đơn vị',
          plannedShiftMinutes: String(eq.plannedShiftMinutes || 480),
          oeeTarget: String(eq.oeeTarget || 85),
        };
      }
      setEditingConfigs(cfgMap);
    } catch (err: any) {
      if (sequence === fetchSequence.current) showToast('error', err?.message || 'Không thể tải dữ liệu OEE');
    } finally {
      if (sequence === fetchSequence.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, selectedDepartment, calculationMethod, batchOeeFilter]);

  const departments = Array.from(
    new Set(allEquipments.map((e) => e.department).filter(Boolean)),
  ).sort();

  const criticalEquipments = allEquipments.filter((e) => e.isCritical);

  const handleOpenRecordModal = (eq?: any) => {
    const target = eq || criticalEquipments[0] || allEquipments[0] || null;
    setSelectedEquipmentForOee(target);
    setEquipmentSearchQuery(target ? `${target.code} — ${target.name}` : '');
    setIsEquipmentDropdownOpen(false);
    setShowRecordModal(true);
  };

  const filteredModalEquipments = useMemo(() => {
    if (!equipmentSearchQuery.trim()) {
      return allEquipments.slice(0, 30);
    }
    const q = equipmentSearchQuery.toLowerCase().trim();
    return allEquipments
      .filter(
        (eq) =>
          eq.code?.toLowerCase().includes(q) ||
          eq.oldCode?.toLowerCase().includes(q) ||
          eq.name?.toLowerCase().includes(q) ||
          eq.department?.toLowerCase().includes(q) ||
          eq.location?.toLowerCase().includes(q),
      )
      .slice(0, 30);
  }, [allEquipments, equipmentSearchQuery]);

  const handleSaveEquipmentConfig = async (eqId: string) => {
    const cfg = editingConfigs[eqId];
    if (!cfg) return;
    setSavingConfigId(eqId);
    try {
      await api.updateEquipmentOeeConfig(eqId, {
        isCritical: cfg.isCritical,
        standardSpeedPerHour: Math.max(1, Number(cfg.standardSpeedPerHour) || 2400),
        outputUnit: cfg.outputUnit.trim() || 'Đơn vị',
        plannedShiftMinutes: Math.max(60, Number(cfg.plannedShiftMinutes) || 480),
        oeeTarget: Math.min(100, Math.max(10, Number(cfg.oeeTarget) || 85)),
      });
      showToast('success', 'Đã cập nhật định mức OEE');
      await fetchData();
    } catch (err: any) {
      showToast('error', err?.message || 'Lỗi khi lưu định mức OEE');
    } finally {
      setSavingConfigId(null);
    }
  };

  const handleVoidRecord = async (record: any) => {
    const reason = window.prompt(
      `Nhập lý do hủy bản ghi OEE ${record.recordCode} (${record.equipment?.name}):`,
      'Nhập sai số liệu sản lượng ca',
    );
    if (!reason || !reason.trim()) return;
    try {
      await api.voidOeeRecord(record.id, reason.trim());
      showToast('success', `Đã hủy phiếu OEE ${record.recordCode}`);
      fetchData();
    } catch (err: any) {
      showToast('error', err?.message || 'Không thể hủy bản ghi OEE');
    }
  };

  const openProductSpeeds = async (equipmentId: string) => {
    setLoadingSpeedConfigs(true);
    setSpeedConfigEquipmentId('');
    try {
      const context = await api.getOeeShiftContext(equipmentId);
      setSpeedConfigRows((context.productSpeedConfigs || []).map((config: any) => ({
        productGroup: config.productGroup, speedPerHour: String(config.speedPerHour),
      })));
      setSpeedConfigEquipmentId(equipmentId);
    } catch (err: any) {
      showToast('error', err?.message || 'Không thể tải định mức nhóm sản phẩm');
    } finally { setLoadingSpeedConfigs(false); }
  };

  const saveProductSpeeds = async () => {
    const equipment = allEquipments.find((eq) => eq.id === speedConfigEquipmentId);
    if (!equipment) return;
    if (speedConfigRows.some((row) => !row.productGroup.trim() || !Number.isFinite(Number(row.speedPerHour)) || Number(row.speedPerHour) <= 0)) {
      showToast('error', 'Nhập tên nhóm và tốc độ lớn hơn 0 cho từng dòng.');
      return;
    }
    setSavingConfigId(equipment.id);
    try {
      await api.updateEquipmentOeeConfig(equipment.id, {
        isCritical: Boolean(equipment.isCritical),
        productSpeedConfigs: speedConfigRows.map((row) => ({ productGroup: row.productGroup.trim(), speedPerHour: Number(row.speedPerHour) })),
      });
      showToast('success', 'Đã lưu định mức theo nhóm sản phẩm');
      setSpeedConfigEquipmentId('');
    } catch (err: any) { showToast('error', err?.message || 'Không thể lưu định mức'); }
    finally { setSavingConfigId(null); }
  };

  const handleExportExcelCsv = () => {
    if (!analytics) return;
    const rows: string[][] = [
      ['BÁO CÁO ĐO LƯỜNG OEE THIẾT BỊ'],
      [`Kỳ báo cáo: ${startDate} đến ${endDate}`, `Phương án: ${calculationMethod}`, `Ngày xuất: ${new Date().toLocaleString('vi-VN')}`],
      [`Ngày thực tính: ${analytics.startDate} đến ${analytics.endDate}`, 'Múi giờ: Asia/Bangkok',
        `Phiếu ước tính giờ: ${analytics.dataQuality?.estimatedTimeRecords || 0}`, `Phiếu ước tính sản lượng: ${analytics.dataQuality?.estimatedOutputRecords || 0}`],
      [],
      ['I. TỔNG HỢP CHỈ SỐ OEE'],
      ['OEE tổng hợp (%)', 'Availability (%)', 'Performance (%)', 'Quality (%)', 'Mục tiêu (%)', 'Số ca ghi nhận'],
      [
        String(analytics.summary?.avgOee || 0),
        String(analytics.summary?.avgAvailability || 0),
        String(analytics.summary?.avgPerformance || 0),
        String(analytics.summary?.avgQuality || 0),
        String(analytics.summary?.benchmarkTarget || 85),
        String(analytics.summary?.totalShiftsRecorded || 0),
      ],
      [],
      ['II. THEO DÕI OEE THEO THIẾT BỊ'],
      [
        'Mã hệ thống',
        'Mã nội bộ',
        'Tên thiết bị',
        'Bộ phận',
        'Công suất định mức (/giờ)',
        'Đơn vị',
        'Số ca',
        'A (%)',
        'P (%)',
        'Q (%)',
        'OEE (%)',
        'Mục tiêu (%)',
        'Đánh giá',
      ],
      ...(analytics.equipmentLeaderboard || []).map((eq: any) => [
        eq.code || '',
        eq.oldCode || '',
        eq.name || '',
        eq.department || '',
        String(eq.standardSpeedPerHour || ''),
        eq.outputUnit || '',
        String(eq.shiftsCount || 0),
        String(eq.availability || 0),
        String(eq.performance || 0),
        String(eq.quality || 0),
        String(eq.oee || 0),
        String(eq.oeeTarget || 85),
        eq.mainBottleneck || '',
      ]),
      [],
      ['III. NHẬT KÝ GHI NHẬN OEE THEO CA'],
      [
        'Mã phiếu',
        'Ngày SX',
        'Ca',
        'Mã máy',
        'Tên thiết bị',
        'Số lô',
        'Mã lô OEE', 'Mã sản phẩm', 'Nhóm sản phẩm',
        'TG Kế hoạch (Phút)',
        'TG Chạy (Phút)',
        'TG Dừng KH (Phút)',
        'TG Dừng Sự cố (Phút)',
        'Tổng sản lượng',
        'Sản lượng đạt',
        'Phế phẩm',
        'A (%)',
        'P (%)',
        'Q (%)',
        'OEE (%)',
        'Người ghi',
        'Chạy ghi gốc (phút)', 'Sản lượng ghi gốc', 'Có số liệu ước tính',
      ],
      ...(analytics.recentRecords || []).map((r: any) => [
        r.recordCode || '',
        new Date(r.recordDate).toLocaleDateString('vi-VN'),
        r.shift || '',
        r.equipment?.code || '',
        r.equipment?.name || '',
        r.batchNumber || '',
        r.batchOeeId || '', r.productCode || '', r.productGroup || '',
        String(r.planTimeMinutes ?? r.plannedProductionMinutes ?? 0),
        String(r.runTimeMinutes || 0),
        String(r.plannedDowntimeMinutes || 0),
        String(r.unplannedDowntimeMinutes || 0),
        String(r.totalOutput || 0),
        String(r.goodOutput || 0),
        String(r.defectOutput || 0),
        String(r.availability || 0),
        String(r.performance || 0),
        String(r.quality || 0),
        String(r.oee || 0),
        r.recordedBy?.name || '',
        String(r.recordedRunTimeMinutes ?? r.runTimeMinutes ?? 0), String(r.recordedTotalOutput ?? r.totalOutput ?? 0), r.allocationEstimated ? 'Có' : 'Không',
      ]),
      [],
      ['IV. TỔNG HỢP THEO LÔ OEE'],
      ['Mã lô OEE', 'Mã SP', 'Số lô', 'Số ca', 'Chạy (phút)', 'Kế hoạch (phút)', 'A (%)', 'P (%)', 'Q (%)', 'OEE (%)'],
      ...(analytics.batchSummary || []).map((batch: any) => [batch.batchOeeId, batch.productCode, batch.batchNumber,
        String(batch.shiftsCount), String(batch.runTimeMinutes), String(batch.planTimeMinutes),
        String(batch.availability), String(batch.performance), String(batch.quality), String(batch.oee)]),
      [],
      ['V. LỊCH THIẾT BỊ (KHÔNG PHỤ THUỘC LỌC LÔ)'],
      ['Ngày', 'Mã máy', 'Trạng thái', 'Số phiếu', 'Chạy cả ngày (phút)', 'Chạy 06:00–22:00 (phút)', 'Kế hoạch PA3 (phút)'],
      ...(analytics.equipmentDays || []).map((day: any) => [day.date,
        (analytics.equipmentLeaderboard || []).find((eq: any) => eq.id === day.equipmentId)?.code || day.equipmentId,
        activityLabels[day.status], String(day.recordsCount), String(day.runTimeMinutes), String(day.frameRunTimeMinutes), String(day.pa3PlanTimeMinutes)]),
    ];

    const csvContent =
      '\uFEFF' +
      rows
        .map((row) =>
          row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','),
        )
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bao_Cao_OEE_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', 'Đã xuất báo cáo OEE');
  };

  const summary = analytics?.summary || {
    criticalEquipmentCount: 0,
    measuredEquipmentCount: 0,
    totalShiftsRecorded: 0,
    avgAvailability: 0,
    avgPerformance: 0,
    avgQuality: 0,
    avgOee: 0,
    benchmarkTarget: 85,
    totalRunTimeHours: 0,
    totalPlannedDowntimeHours: 0,
    totalUnplannedDowntimeHours: 0,
    totalGoodQty: 0,
    totalDefectQty: 0,
  };

  const leaderboard: any[] = analytics?.equipmentLeaderboard || [];
  const downtimePareto: any[] = analytics?.downtimePareto || [];
  const recentRecords: any[] = analytics?.recentRecords || [];
  const activityRows: any[] = (analytics?.equipmentDays || []).filter((day: any) =>
    (!activityEquipmentId || day.equipmentId === activityEquipmentId) && (!activityStatus || day.status === activityStatus))
    .sort((left: any, right: any) => right.date.localeCompare(left.date) || left.equipmentId.localeCompare(right.equipmentId));
  useEffect(() => { setActivityPage(0); }, [activityEquipmentId, activityStatus, startDate, endDate, selectedDepartment]);
  const activityLabels: Record<string, string> = { RUNNING: 'Có chạy máy', RECORDED_STOP: 'Có phiếu, không chạy', NO_RECORD: 'Không có phiếu' };
  const minutes = (value: number) => Number((Number(value) || 0).toFixed(2)).toLocaleString('vi-VN');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* THANH CÔNG CỤ & BỘ LỌC */}
      <div
        className="card"
        style={{
          padding: '14px 18px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <select aria-label="Phương án OEE" className="form-input" value={calculationMethod}
            onChange={(e) => setCalculationMethod(e.target.value as 'PA1' | 'PA2' | 'PA3')}>
            <option value="PA1">PA1 — Thời gian ghi nhận</option>
            <option value="PA2">PA2 — Toàn ca mở rộng</option>
            <option value="PA3">PA3 — 06:00–22:00 mỗi ngày</option>
          </select>
          <select aria-label="Lọc mã lô OEE" className="form-input" value={batchOeeFilter}
            onChange={(e) => setBatchOeeFilter(e.target.value)}>
            <option value="">Tất cả lô OEE</option>
            {batchOeeFilter && !(analytics?.batchOptions || []).includes(batchOeeFilter) &&
              <option value={batchOeeFilter}>{batchOeeFilter}</option>}
            {(analytics?.batchOptions || []).map((batch: string) => <option key={batch} value={batch}>{batch}</option>)}
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Từ ngày:</span>
            <input
              type="date"
              className="form-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ padding: '6px 10px', fontSize: '12.5px' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Đến ngày:</span>
            <input
              type="date"
              className="form-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ padding: '6px 10px', fontSize: '12.5px' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Bộ phận:</span>
            <select
              className="form-input"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              style={{ padding: '6px 12px', fontSize: '12.5px', minWidth: '150px' }}
            >
              <option value="">Tất cả bộ phận</option>
              {departments.map((d: any) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchData}
            style={{ padding: '7px 12px', fontSize: '12.5px' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Làm mới
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowConfigModal(true)}
            style={{ padding: '7px 12px', fontSize: '12.5px' }}
          >
            <Settings size={14} /> Định mức thiết bị ({summary.criticalEquipmentCount})
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportExcelCsv}
            style={{ padding: '7px 12px', fontSize: '12.5px' }}
          >
            <Download size={14} /> Xuất Excel
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleOpenRecordModal()}
            style={{ padding: '7px 14px', fontSize: '12.5px', fontWeight: 700 }}
          >
            <Plus size={15} /> Ghi nhận OEE
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '12px 18px', fontSize: '12px', color: '#475569' }}>
        Thời gian ca/ngày được phân bổ giữa các lô trước khi lọc; các khoảng trùng chỉ tính một lần.
        {calculationMethod === 'PA3' && <> PA3 tính 960 phút/ngày từ ngày đầu có dữ liệu đến ngày báo cáo, gồm cả ngày không có phiếu.
          Sản lượng ngoài khung 06:00–22:00 được loại theo tỷ lệ thời gian chạy. Phần thời gian ngày không có phiếu không gán cho lô cụ thể.</>}
        {Boolean(analytics?.dataQuality?.estimatedTimeRecords) && <div style={{ marginTop: '5px', color: '#92400e' }}>
          {analytics.dataQuality.estimatedTimeRecords} phiếu thiếu khung giờ đầy đủ; vị trí thời gian đang được ước tính theo ca.
        </div>}
        {Boolean(analytics?.dataQuality?.estimatedOutputRecords) && <div style={{ marginTop: '5px', color: '#92400e' }}>
          {analytics.dataQuality.estimatedOutputRecords} phiếu có sản lượng trong PA3 được quy đổi theo thời gian chạy.
        </div>}
        {Boolean(analytics?.dataQuality?.reconciledRuntimeRecords) && <div style={{ marginTop: '5px', color: '#92400e' }}>
          {analytics.dataQuality.reconciledRuntimeRecords} phiếu cũ có runtime lưu khác bảng giờ; báo cáo dùng hợp khoảng chạy đã ghi.
        </div>}
        {analytics?.dataQuality?.overlappingRunMinutes > 0 && <div style={{ marginTop: '5px', color: '#92400e' }}>
          Dữ liệu có {minutes(analytics.dataQuality.overlappingRunMinutes)} phút chạy chồng nhau; đã chia thời gian trùng, giữ sản lượng khai báo. Cần đối chiếu các phiếu cũ.
        </div>}
        {analytics?.dataQuality?.estimatedRuntimeReductionMinutes > 0 && <div style={{ marginTop: '5px', color: '#92400e' }}>
          Các phiếu thiếu giờ ghi tổng thời gian chạy vượt sức chứa khung ca {minutes(analytics.dataQuality.estimatedRuntimeReductionMinutes)} phút; đã giới hạn và phân bổ theo tỷ lệ. Cần đối chiếu giờ thực tế.
        </div>}
      </div>

      {/* 4 THẺ CHỈ SỐ OEE */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '14px',
        }}
      >
        <div
          className="card"
          style={{
            padding: '16px 18px',
            borderRadius: '10px',
            borderLeft: '4px solid #2563eb',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>OEE TỔNG HỢP ({calculationMethod})</span>
            <Award size={18} color="#2563eb" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '6px 0 2px 0' }}>
            {summary.avgOee}%
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Mục tiêu: <strong>{summary.benchmarkTarget}%</strong> • <strong>{summary.totalShiftsRecorded}</strong> ca
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: '16px 18px',
            borderRadius: '10px',
            borderLeft: '4px solid #0284c7',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>AVAILABILITY (A)</span>
            <Clock size={18} color="#0284c7" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0284c7', margin: '6px 0 2px 0' }}>
            {summary.avgAvailability}%
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Chạy: <strong>{summary.totalRunTimeHours}h</strong> • Dừng sự cố: <strong style={{ color: '#dc2626' }}>{summary.totalUnplannedDowntimeHours}h</strong>
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: '16px 18px',
            borderRadius: '10px',
            borderLeft: '4px solid #16a34a',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>PERFORMANCE (P)</span>
            <Gauge size={18} color="#16a34a" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#16a34a', margin: '6px 0 2px 0' }}>
            {summary.avgPerformance}%
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Thiết bị đo lường: <strong>{summary.measuredEquipmentCount}/{summary.criticalEquipmentCount}</strong>
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: '16px 18px',
            borderRadius: '10px',
            borderLeft: '4px solid #d97706',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>QUALITY (Q)</span>
            <CheckCircle2 size={18} color="#d97706" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#d97706', margin: '6px 0 2px 0' }}>
            {summary.avgQuality}%
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Đạt: <strong>{(summary.totalGoodQty || 0).toLocaleString('vi-VN')}</strong> • Lỗi: <strong style={{ color: '#dc2626' }}>{(summary.totalDefectQty || 0).toLocaleString('vi-VN')}</strong>
          </div>
        </div>
      </div>

      {/* BẢNG THEO DÕI OEE THEO THIẾT BỊ */}
      <div className="card" style={{ padding: '18px 20px', borderRadius: '10px' }}>
        <h4 style={{ fontSize: '14.5px', fontWeight: 700, color: '#0f172a', margin: '0 0 12px 0' }}>
          Theo dõi OEE theo thiết bị
        </h4>

        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', fontSize: '12.5px' }}>
            <thead>
              <tr>
                <th>Mã máy</th>
                <th>Tên thiết bị</th>
                <th>Bộ phận</th>
                <th>Định mức</th>
                <th style={{ textAlign: 'center' }}>Số ca</th>
                <th style={{ textAlign: 'center' }}>A (%)</th>
                <th style={{ textAlign: 'center' }}>P (%)</th>
                <th style={{ textAlign: 'center' }}>Q (%)</th>
                <th style={{ textAlign: 'center' }}>OEE (%)</th>
                <th>Đánh giá</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                    Chưa có thiết bị trọng yếu nào.
                  </td>
                </tr>
              ) : (
                leaderboard.map((eq: any) => {
                  const hasData = eq.shiftsCount > 0 || calculationMethod === 'PA3' && eq.trackedDays > 0;
                  const badgeBg =
                    !hasData
                      ? '#f1f5f9'
                      : eq.oee >= (eq.oeeTarget || 85)
                      ? '#dcfce7'
                      : eq.oee >= 70
                      ? '#fef3c7'
                      : '#fee2e2';
                  const badgeColor =
                    !hasData
                      ? '#64748b'
                      : eq.oee >= (eq.oeeTarget || 85)
                      ? '#15803d'
                      : eq.oee >= 70
                      ? '#b45309'
                      : '#dc2626';

                  return (
                    <tr key={eq.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#2563eb' }}>{eq.code}</div>
                        {eq.oldCode && <div style={{ fontSize: '11px', color: '#64748b' }}>{eq.oldCode}</div>}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{eq.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{eq.location}</div>
                      </td>
                      <td>{eq.department || '—'}</td>
                      <td>
                        <strong>{(eq.standardSpeedPerHour || 2400).toLocaleString('vi-VN')}</strong>{' '}
                        <span style={{ color: '#64748b' }}>{eq.outputUnit || 'SP'}/h</span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{eq.shiftsCount}</td>
                      <td style={{ textAlign: 'center' }}>{hasData ? `${eq.availability}%` : '—'}</td>
                      <td style={{ textAlign: 'center' }}>{hasData ? `${eq.performance}%` : '—'}</td>
                      <td style={{ textAlign: 'center' }}>{hasData ? `${eq.quality}%` : '—'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: '999px',
                            fontWeight: 700,
                            backgroundColor: badgeBg,
                            color: badgeColor,
                          }}
                        >
                          {hasData ? `${eq.oee}%` : 'Chưa nhập'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: eq.shiftsCount > 0 ? '#334155' : '#94a3b8' }}>
                          {eq.mainBottleneck}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => handleOpenRecordModal(eq)}
                            style={{ padding: '4px 10px', fontSize: '11.5px', fontWeight: 600 }}
                          >
                            + Nhập ca
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => navigate(`/equipment/${eq.id}/operation-log-form?mode=oee`)}
                            title="Mở trang nhập OEE"
                            style={{ padding: '4px 8px', fontSize: '11.5px' }}
                          >
                            <QrCode size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PHÂN TÍCH THỜI GIAN DỪNG MÁY */}
      <div className="card" style={{ padding: '18px 20px', borderRadius: '10px' }}>
        <h4 style={{ fontSize: '14.5px', fontWeight: 700, color: '#0f172a', margin: '0 0 12px 0' }}>
          Phân tích thời gian dừng máy
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
          {downtimePareto.map((item: any) => (
            <div
              key={item.code}
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>{item.label}</span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 7px',
                    borderRadius: '999px',
                    backgroundColor: item.type === 'UNPLANNED' ? '#fee2e2' : '#dbeafe',
                    color: item.type === 'UNPLANNED' ? '#dc2626' : '#1d4ed8',
                  }}
                >
                  {item.minutes}p ({item.percentage}%)
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '6px',
                  backgroundColor: '#e2e8f0',
                  borderRadius: '999px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${Math.min(100, item.percentage)}%`,
                    height: '100%',
                    backgroundColor: item.type === 'UNPLANNED' ? '#ef4444' : '#3b82f6',
                    borderRadius: '999px',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: '18px 20px' }}>
        <h4 style={{ margin: '0 0 8px' }}>Lịch thiết bị từ ngày đầu có dữ liệu</h4>
        <div style={{ fontSize: '12px', color: '#475569', marginBottom: '10px' }}>
          {summary.trackedEquipmentDays || 0} ngày thiết bị • {summary.noRecordDays || 0} ngày không có phiếu • {summary.recordedStopDays || 0} ngày có phiếu nhưng không chạy.
          Lịch này không phụ thuộc bộ lọc lô. Ngày chưa có phiếu cần đối chiếu thực tế; chưa đủ căn cứ kết luận máy không hoạt động.
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <select className="form-input" aria-label="Thiết bị trong lịch" value={activityEquipmentId} onChange={(e) => setActivityEquipmentId(e.target.value)}>
            <option value="">Tất cả thiết bị</option>
            {leaderboard.map((eq: any) => <option key={eq.id} value={eq.id}>{eq.code} — {eq.name}</option>)}
          </select>
          <select className="form-input" aria-label="Trạng thái ngày thiết bị" value={activityStatus} onChange={(e) => setActivityStatus(e.target.value)}>
            <option value="">Tất cả trạng thái</option>
            {Object.entries(activityLabels).map(([status, label]) => <option key={status} value={status}>{label}</option>)}
          </select>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', fontSize: '12.5px' }}>
            <thead><tr><th>Ngày</th><th>Thiết bị</th><th>Trạng thái</th><th>Số phiếu</th><th>Chạy cả ngày (phút)</th><th>Chạy 06:00–22:00 (phút)</th><th>Kế hoạch PA3 (phút)</th></tr></thead>
            <tbody>{activityRows.slice(activityPage * 30, (activityPage + 1) * 30).map((day: any) => <tr key={`${day.equipmentId}-${day.date}`}>
              <td>{day.date}</td><td>{leaderboard.find((eq: any) => eq.id === day.equipmentId)?.code || day.equipmentId}</td>
              <td style={{ color: day.status === 'RUNNING' ? '#15803d' : day.status === 'NO_RECORD' ? '#92400e' : '#dc2626' }}>{activityLabels[day.status]}</td>
              <td>{day.recordsCount}</td><td>{minutes(day.runTimeMinutes)}</td><td>{minutes(day.frameRunTimeMinutes)}</td><td>{day.pa3PlanTimeMinutes}</td>
            </tr>)}</tbody>
          </table>
          {activityRows.length === 0 && <div style={{ padding: '15px', color: '#64748b' }}>Chưa có ngày theo dõi trong bộ lọc này.</div>}
        </div>
        {activityRows.length > 30 && <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
          <button type="button" className="btn btn-secondary" disabled={activityPage === 0} onClick={() => setActivityPage((page) => page - 1)}>Trước</button>
          <span style={{ fontSize: '12px' }}>Trang {activityPage + 1} / {Math.ceil(activityRows.length / 30)}</span>
          <button type="button" className="btn btn-secondary" disabled={(activityPage + 1) * 30 >= activityRows.length} onClick={() => setActivityPage((page) => page + 1)}>Sau</button>
        </div>}
      </div>

      {(analytics?.batchSummary || []).length > 0 && <div className="card" style={{ padding: '18px 20px', overflowX: 'auto' }}>
        <h4 style={{ margin: '0 0 12px' }}>OEE theo lô ({calculationMethod})</h4>
        <table className="table" style={{ width: '100%', fontSize: '12.5px' }}>
          <thead><tr><th>Mã lô OEE</th><th>Mã SP</th><th>Số lô</th><th>Số ca</th><th>Chạy / KH (phút)</th><th>A (%)</th><th>P (%)</th><th>Q (%)</th><th>OEE (%)</th></tr></thead>
          <tbody>{analytics.batchSummary.map((batch: any) => <tr key={batch.batchOeeId}>
            <td>{batch.batchOeeId}</td><td>{batch.productCode}</td><td>{batch.batchNumber}</td><td>{batch.shiftsCount}</td>
            <td>{minutes(batch.runTimeMinutes)} / {minutes(batch.planTimeMinutes)}</td><td>{batch.availability}</td><td>{batch.performance}</td><td>{batch.quality}</td><td>{batch.oee}</td>
          </tr>)}</tbody>
        </table>
      </div>}

      {/* NHẬT KÝ GHI NHẬN OEE */}
      <div className="card" style={{ padding: '18px 20px', borderRadius: '10px' }}>
        <h4 style={{ fontSize: '14.5px', fontWeight: 700, color: '#0f172a', margin: '0 0 12px 0' }}>
          Nhật ký ghi nhận OEE ({recentRecords.length})
        </h4>

        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', fontSize: '12.5px' }}>
            <thead>
              <tr>
                <th>Mã phiếu</th>
                <th>Ngày / Ca</th>
                <th>Thiết bị</th>
                <th>Số lô / SP</th>
                <th style={{ textAlign: 'center' }}>Chạy / KH</th>
                <th style={{ textAlign: 'center' }}>Dừng KH / Sự cố</th>
                <th style={{ textAlign: 'right' }}>Đạt / Tổng</th>
                <th style={{ textAlign: 'center' }}>A × P × Q</th>
                <th style={{ textAlign: 'center' }}>OEE (%)</th>
                <th>Người ghi</th>
                <th style={{ textAlign: 'right' }}>Hủy</th>
              </tr>
            </thead>
            <tbody>
              {recentRecords.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '28px', color: '#64748b' }}>
                    Chưa có bản ghi OEE nào trong kỳ này.
                  </td>
                </tr>
              ) : (
                recentRecords.map((r: any) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600, color: '#2563eb' }}>{r.recordCode}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{new Date(r.recordDate).toLocaleDateString('vi-VN')}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{r.shift}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.equipment?.name}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{r.equipment?.code}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.batchNumber || '—'}</div>
                      {r.productName && <div style={{ fontSize: '11px', color: '#64748b' }}>{r.productName}</div>}
                      {r.batchOeeId && <div style={{ fontSize: '11px', color: '#64748b' }}>{r.batchOeeId}</div>}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <strong>{minutes(r.runTimeMinutes)}p</strong> / {minutes(r.planTimeMinutes ?? r.plannedProductionMinutes)}p
                      {r.allocationEstimated && <div style={{ fontSize: '10px', color: '#92400e' }}>Có số liệu ước tính</div>}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ color: '#2563eb' }}>{r.plannedDowntimeMinutes}p</span> /{' '}
                      <strong style={{ color: r.unplannedDowntimeMinutes > 0 ? '#dc2626' : '#64748b' }}>
                        {r.unplannedDowntimeMinutes}p
                      </strong>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <strong>{Number(r.goodOutput).toLocaleString('vi-VN')}</strong> /{' '}
                      {Number(r.totalOutput).toLocaleString('vi-VN')} {r.outputUnit}
                    </td>
                    <td style={{ textAlign: 'center', fontSize: '11.5px', color: '#475569' }}>
                      {r.availability}% × {r.performance}% × {r.quality}%
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: '999px',
                          fontWeight: 700,
                          backgroundColor: r.oee >= 85 ? '#dcfce7' : r.oee >= 70 ? '#fef3c7' : '#fee2e2',
                          color: r.oee >= 85 ? '#15803d' : r.oee >= 70 ? '#b45309' : '#dc2626',
                        }}
                      >
                        {r.oee}%
                      </span>
                    </td>
                    <td>{r.recordedBy?.name || '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleVoidRecord(r)}
                        title="Hủy bản ghi"
                        style={{
                          border: 'none',
                          background: 'none',
                          color: '#dc2626',
                          cursor: 'pointer',
                          padding: '4px',
                        }}
                      >
                        <Ban size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL GHI NHẬN OEE */}
      {showRecordModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '860px',
              maxHeight: '92vh',
              overflowY: 'auto',
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              padding: '20px 24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '14px',
                paddingBottom: '10px',
                borderBottom: '1px solid #e2e8f0',
              }}
            >
              <h3 style={{ fontSize: '15.5px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Ghi nhận OEE theo ca
              </h3>
              <button
                type="button"
                onClick={() => setShowRecordModal(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Bộ tìm kiếm & chọn Thiết bị */}
            <div ref={searchContainerRef} style={{ marginBottom: '16px', position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
                Chọn thiết bị ghi nhận OEE *
              </label>

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    color: '#64748b',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Tìm theo mã máy (VD: TBSX 607), tên thiết bị hoặc phân xưởng..."
                  value={equipmentSearchQuery}
                  onChange={(e) => {
                    setEquipmentSearchQuery(e.target.value);
                    setIsEquipmentDropdownOpen(true);
                  }}
                  onFocus={() => setIsEquipmentDropdownOpen(true)}
                  style={{
                    width: '100%',
                    paddingLeft: '34px',
                    paddingRight: equipmentSearchQuery ? '32px' : '12px',
                    fontWeight: selectedEquipmentForOee ? 600 : 400,
                  }}
                />
                {equipmentSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setEquipmentSearchQuery('');
                      setSelectedEquipmentForOee(null);
                      setIsEquipmentDropdownOpen(true);
                    }}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0,
                    }}
                    title="Xóa để tìm máy khác"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Danh sách kết quả gợi ý tìm kiếm */}
              {isEquipmentDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 1200,
                    marginTop: '4px',
                    maxHeight: '260px',
                    overflowY: 'auto',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  {filteredModalEquipments.length === 0 ? (
                    <div style={{ padding: '12px 14px', fontSize: '12.5px', color: '#64748b', textAlign: 'center' }}>
                      Không tìm thấy thiết bị phù hợp với "{equipmentSearchQuery}"
                    </div>
                  ) : (
                    filteredModalEquipments.map((eq) => {
                      const isSelected = selectedEquipmentForOee?.id === eq.id;
                      return (
                        <div
                          key={eq.id}
                          onClick={() => {
                            setSelectedEquipmentForOee(eq);
                            setEquipmentSearchQuery(`${eq.code} — ${eq.name}`);
                            setIsEquipmentDropdownOpen(false);
                          }}
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                            borderBottom: '1px solid #f1f5f9',
                            transition: 'background-color 0.1s',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 700, fontSize: '13px', color: '#2563eb' }}>
                                {eq.code}
                              </span>
                              {eq.oldCode && (
                                <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                                  ({eq.oldCode})
                                </span>
                              )}
                              <span style={{ fontWeight: 600, fontSize: '12.5px', color: '#0f172a' }}>
                                {eq.name}
                              </span>
                              {eq.isCritical && (
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    padding: '1px 6px',
                                    borderRadius: '999px',
                                    backgroundColor: '#fef08a',
                                    color: '#854d0e',
                                  }}
                                >
                                  ★ Trọng yếu
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                              {eq.department ? `Bộ phận: ${eq.department}` : ''}
                              {eq.location ? ` • Khu vực: ${eq.location}` : ''}
                            </div>
                          </div>
                          {isSelected && (
                            <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#2563eb' }}>Đang chọn</span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {selectedEquipmentForOee ? (
              <OeeShiftInputForm
                equipment={selectedEquipmentForOee}
                recordedVia="WEB_APP"
                onSuccess={() => {
                  setShowRecordModal(false);
                  fetchData();
                }}
                onCancel={() => setShowRecordModal(false)}
              />
            ) : (
              <div
                style={{
                  padding: '36px 20px',
                  textAlign: 'center',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px dashed #cbd5e1',
                  color: '#64748b',
                  fontSize: '13px',
                }}
              >
                Vui lòng tìm kiếm và chọn thiết bị ở ô trên để nhập dữ liệu OEE.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL ĐỊNH MỨC THIẾT BỊ */}
      {showConfigModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '920px',
              maxHeight: '90vh',
              overflowY: 'auto',
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              padding: '20px 24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '14px',
                paddingBottom: '10px',
                borderBottom: '1px solid #e2e8f0',
              }}
            >
              <h3 style={{ fontSize: '15.5px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                Thiết lập định mức OEE thiết bị
              </h3>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Search size={16} color="#64748b" />
              <input
                type="text"
                className="form-input"
                placeholder="Tìm mã máy, tên máy hoặc bộ phận..."
                value={configSearch}
                onChange={(e) => setConfigSearch(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            {speedConfigEquipmentId && <div style={{ padding: '12px', marginBottom: '12px', background: '#f8fafc', borderRadius: '8px' }}>
              <strong>Định mức nhóm sản phẩm — {allEquipments.find((eq) => eq.id === speedConfigEquipmentId)?.code}</strong>
              {speedConfigRows.map((row, index) => <div key={index} style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <input className="form-input" aria-label="Tên nhóm sản phẩm" placeholder="Nhóm sản phẩm" value={row.productGroup}
                  onChange={(e) => setSpeedConfigRows((rows) => rows.map((r, i) => i === index ? { ...r, productGroup: e.target.value } : r))} />
                <input className="form-input" type="number" min="0.01" step="any" aria-label="Tốc độ theo giờ" placeholder="SP/giờ" value={row.speedPerHour}
                  onChange={(e) => setSpeedConfigRows((rows) => rows.map((r, i) => i === index ? { ...r, speedPerHour: e.target.value } : r))} />
                <button type="button" className="btn btn-secondary" onClick={() => setSpeedConfigRows((rows) => rows.filter((_, i) => i !== index))}>Xóa</button>
              </div>)}
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSpeedConfigRows((rows) => [...rows, { productGroup: '', speedPerHour: '' }])}>Thêm nhóm</button>
                <button type="button" className="btn btn-primary" disabled={savingConfigId === speedConfigEquipmentId} onClick={saveProductSpeeds}>Lưu nhóm</button>
                <button type="button" className="btn btn-secondary" onClick={() => setSpeedConfigEquipmentId('')}>Đóng</button>
              </div>
            </div>}
            <div style={{ overflowX: 'auto', maxHeight: '60vh' }}>
              <table className="table" style={{ width: '100%', fontSize: '12.5px' }}>
                <thead>
                  <tr>
                    <th>Trọng yếu</th>
                    <th>Thiết bị</th>
                    <th>Bộ phận</th>
                    <th>Công suất (/giờ)</th>
                    <th>Đơn vị</th>
                    <th>Ca chuẩn (Phút)</th>
                    <th>Mục tiêu (%)</th>
                    <th style={{ textAlign: 'right' }}>Lưu</th>
                  </tr>
                </thead>
                <tbody>
                  {allEquipments
                    .filter((eq) => {
                      if (!configSearch.trim()) return true;
                      const q = configSearch.toLowerCase();
                      return (
                        eq.code?.toLowerCase().includes(q) ||
                        eq.oldCode?.toLowerCase().includes(q) ||
                        eq.name?.toLowerCase().includes(q) ||
                        eq.department?.toLowerCase().includes(q)
                      );
                    })
                    .slice(0, 50)
                    .map((eq) => {
                      const cfg = editingConfigs[eq.id] || {
                        isCritical: Boolean(eq.isCritical),
                        standardSpeedPerHour: String(eq.standardSpeedPerHour || 2400),
                        outputUnit: eq.outputUnit || 'Đơn vị',
                        plannedShiftMinutes: String(eq.plannedShiftMinutes || 480),
                        oeeTarget: String(eq.oeeTarget || 85),
                      };

                      const updateField = (field: string, value: any) => {
                        setEditingConfigs((prev) => ({
                          ...prev,
                          [eq.id]: {
                            ...cfg,
                            [field]: value,
                          },
                        }));
                      };

                      return (
                        <tr key={eq.id} style={{ backgroundColor: cfg.isCritical ? '#fffbeb' : undefined }}>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={cfg.isCritical}
                              onChange={(e) => updateField('isCritical', e.target.checked)}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>
                              {eq.code} — {eq.name}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{eq.category}</div>
                            <button type="button" className="btn btn-secondary" disabled={loadingSpeedConfigs}
                              onClick={() => openProductSpeeds(eq.id)} style={{ padding: '3px 6px', fontSize: '11px' }}>Định mức nhóm SP</button>
                          </td>
                          <td>{eq.department || eq.location}</td>
                          <td>
                            <input
                              type="number"
                              className="form-input"
                              value={cfg.standardSpeedPerHour}
                              onChange={(e) => updateField('standardSpeedPerHour', e.target.value)}
                              style={{ width: '110px', padding: '4px 8px' }}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="form-input"
                              value={cfg.outputUnit}
                              onChange={(e) => updateField('outputUnit', e.target.value)}
                              style={{ width: '90px', padding: '4px 8px' }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="form-input"
                              value={cfg.plannedShiftMinutes}
                              onChange={(e) => updateField('plannedShiftMinutes', e.target.value)}
                              style={{ width: '80px', padding: '4px 8px' }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="form-input"
                              value={cfg.oeeTarget}
                              onChange={(e) => updateField('oeeTarget', e.target.value)}
                              style={{ width: '75px', padding: '4px 8px' }}
                            />
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="btn btn-primary"
                              disabled={savingConfigId === eq.id}
                              onClick={() => handleSaveEquipmentConfig(eq.id)}
                              style={{ padding: '5px 10px', fontSize: '11.5px' }}
                            >
                              {savingConfigId === eq.id ? '...' : <Save size={14} />}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default OeeManagementSection;
