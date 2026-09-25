import React, { useEffect, useState, useMemo } from 'react';
import { api, fetchWithAuth, API_HOST as API_BASE } from '../services/api';
import { Modal } from '../components/common/Modal';
import {
  Calendar,
  History,
  Plus,
  PlayCircle,
  PauseCircle,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Wrench,
  CheckSquare,
} from 'lucide-react';
import { useToast, useConfirmDialog } from '../components/common/Toast';
import { TableSkeleton } from '../components/common/Skeleton';
import { useDebounce } from '../hooks/useDebounce';
import { Pagination } from '../components/common/Pagination';

export const MaintenancePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'schedules' | 'history'>('schedules');

  // --- STATE FOR TAB 1: SCHEDULES ---
  const [schedules, setSchedules] = useState<any[]>([]);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [checklistTemplates, setChecklistTemplates] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [processingDue, setProcessingDue] = useState(false);

  // Filters & Search for Schedules
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState('');
  const [freqFilter, setFreqFilter] = useState('');
  const [overdueFilter, setOverdueFilter] = useState(false);

  // Modals for Schedules
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);

  // Action Modals
  const [pauseTarget, setPauseTarget] = useState<any | null>(null);
  const [completeTarget, setCompleteTarget] = useState<any | null>(null);
  const [cancelTarget, setCancelTarget] = useState<any | null>(null);
  const [actionReason, setActionReason] = useState('');

  // History Timeline Modal
  const [historyTarget, setHistoryTarget] = useState<any | null>(null);
  const [historyTimeline, setHistoryTimeline] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Schedule Form Data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    equipmentId: '',
    frequencyType: 'MONTHLY',
    frequencyInterval: 1,
    startDate: new Date().toISOString().split('T')[0],
    estimatedDurationMinutes: 120,
    defaultPriority: 'MEDIUM',
    assignedTechnicianId: '',
    autoGenerate: true,
    leadTimeDays: 3,
    notes: '',
    checklistJson: '',
  });

  // --- STATE FOR TAB 2: COMPLETED WORK ORDERS HISTORY ---
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const toast = useToast();
  const { confirm } = useConfirmDialog();

  // Load catalogs ONCE
  const loadCatalogs = async () => {
    try {
      const [eqRes, userRes, chkRes] = await Promise.all([
        api.getEquipment().catch(() => []),
        api.getUsers().catch(() => []),
        api.getChecklistTemplates().catch(() => []),
      ]);
      setEquipmentList(eqRes);
      setUsers(userRes);
      setTechnicians(userRes.filter((u: any) => u.role === 'TECHNICIAN' || u.role === 'ADMIN' || u.role === 'MANAGER'));
      setChecklistTemplates(chkRes);
      if (eqRes.length > 0 && !formData.equipmentId) {
        setFormData((prev) => ({ ...prev, equipmentId: eqRes[0].id }));
      }
    } catch (err) {
      console.error('Failed to load catalogs:', err);
    }
  };

  // Load schedules list
  const loadSchedules = async () => {
    try {
      setLoadingSchedules(true);
      const res = await api.getSchedules({
        search: debouncedSearch,
        status: statusFilter,
        frequencyType: freqFilter,
        overdue: overdueFilter,
      });
      const data = res && Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
      setSchedules(data);
    } catch (err) {
      console.error('Failed to load schedules:', err);
    } finally {
      setLoadingSchedules(false);
    }
  };

  // Load completed work orders history
  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const url = new URL(`${API_BASE}/api/v1/work-orders`);
      url.searchParams.append('page', page.toString());
      url.searchParams.append('limit', limit.toString());
      url.searchParams.append('status', 'COMPLETED');

      const response = await fetchWithAuth(url.toString());
      if (!response.ok) throw new Error('Không thể tải lịch sử bảo trì');
      const result = await response.json();

      if (result && result.data && Array.isArray(result.data)) {
        const completed = result.data.filter((wo: any) => ['COMPLETED', 'VERIFIED', 'CLOSED'].includes(wo.status));
        setHistory(completed);
        setTotal(result.meta.total);
        setTotalPages(result.meta.totalPages);
      } else if (Array.isArray(result)) {
        const completed = result.filter((wo: any) => ['COMPLETED', 'VERIFIED', 'CLOSED'].includes(wo.status));
        setHistory(completed);
        setTotal(completed.length);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadCatalogs();
  }, []);

  useEffect(() => {
    loadSchedules();
  }, [debouncedSearch, statusFilter, freqFilter, overdueFilter]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, page]);

  const getActiveUserId = () => {
    const active = users.find((u: any) => u.isActive);
    return active ? active.id : (users[0]?.id || 'user-id');
  };

  // --- ACTIONS FOR SCHEDULES ---
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createSchedule({
        ...formData,
        startDate: new Date(formData.startDate).toISOString(),
        frequencyInterval: Number(formData.frequencyInterval),
        estimatedDurationMinutes: Number(formData.estimatedDurationMinutes),
        leadTimeDays: Number(formData.leadTimeDays),
        createdById: getActiveUserId(),
      });
      setIsAddOpen(false);
      toast.success('Thành công', 'Tạo kế hoạch bảo trì định kỳ thành công!');
      loadSchedules();
    } catch (err: any) {
      toast.error('Lỗi tạo lịch bảo trì', err.message || 'Không thể thực hiện');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    try {
      await api.updateSchedule(editTarget.id, {
        title: formData.title,
        description: formData.description,
        frequencyType: formData.frequencyType,
        frequencyInterval: Number(formData.frequencyInterval),
        startDate: new Date(formData.startDate).toISOString(),
        estimatedDurationMinutes: Number(formData.estimatedDurationMinutes),
        defaultPriority: formData.defaultPriority,
        assignedTechnicianId: formData.assignedTechnicianId || null,
        autoGenerate: formData.autoGenerate,
        leadTimeDays: Number(formData.leadTimeDays),
        notes: formData.notes,
        checklistJson: formData.checklistJson || null,
        expectedVersion: editTarget.version,
        actedById: getActiveUserId(),
      });
      setEditTarget(null);
      toast.success('Thành công', 'Cập nhật kế hoạch bảo trì thành công!');
      loadSchedules();
    } catch (err: any) {
      if (err.message?.includes('409') || err.message?.includes('Xung đột')) {
        toast.warning('Xung đột dữ liệu', 'Dữ liệu lịch bảo trì đã bị người khác cập nhật! Vui lòng tải lại dữ liệu.');
        setEditTarget(null);
        loadSchedules();
      } else {
        toast.error('Lỗi cập nhật', err.message || 'Không thể thực hiện');
      }
    }
  };

  const handleActivate = async (sch: any) => {
    try {
      await api.activateSchedule(sch.id, {
        expectedVersion: sch.version,
        actedById: getActiveUserId(),
      });
      toast.success('Thành công', 'Đã kích hoạt kế hoạch bảo trì thành công!');
      loadSchedules();
    } catch (err: any) {
      toast.error('Lỗi kích hoạt', err.message || 'Không thể thực hiện');
    }
  };

  const handlePauseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pauseTarget) return;
    try {
      await api.pauseSchedule(pauseTarget.id, {
        reason: actionReason.trim(),
        expectedVersion: pauseTarget.version,
        actedById: getActiveUserId(),
      });
      setPauseTarget(null);
      toast.success('Thành công', 'Đã tạm dừng kế hoạch bảo trì thành công!');
      loadSchedules();
    } catch (err: any) {
      toast.error('Lỗi tạm dừng', err.message || 'Không thể thực hiện');
    }
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeTarget) return;
    try {
      await api.completeSchedule(completeTarget.id, {
        reason: actionReason.trim(),
        expectedVersion: completeTarget.version,
        actedById: getActiveUserId(),
      });
      setCompleteTarget(null);
      toast.success('Thành công', 'Đã hoàn thành kế hoạch bảo trì thành công!');
      loadSchedules();
    } catch (err: any) {
      toast.error('Lỗi hoàn thành', err.message || 'Không thể thực hiện');
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelTarget) return;
    try {
      await api.cancelSchedule(cancelTarget.id, {
        reason: actionReason.trim(),
        expectedVersion: cancelTarget.version,
        actedById: getActiveUserId(),
      });
      setCancelTarget(null);
      toast.success('Thành công', 'Đã hủy kế hoạch bảo trì thành công!');
      loadSchedules();
    } catch (err: any) {
      toast.error('Lỗi hủy kế hoạch', err.message || 'Không thể thực hiện');
    }
  };

  const handleGenerateWO = async (sch: any) => {
    const isHours = sch.frequencyType === 'OPERATING_HOURS';
    const currentHours = sch.equipment?.currentOperatingHours || 0;
    const targetHours = sch.nextDueMeter || 0;
    const isEarlyHours = isHours && currentHours < targetHours;

    let confirmMsg = `Phát sinh ngay 1 Phiếu bảo trì (Work Order) từ kế hoạch [${sch.scheduleCode}] cho thiết bị "${sch.equipment?.name || sch.equipmentId}"?`;
    let confirmBtnText = 'Sinh phiếu ngay';
    let confirmType: 'info' | 'warning' = 'info';

    if (isEarlyHours) {
      confirmMsg = `Thiết bị "${sch.equipment?.name || sch.equipmentId}" hiện mới ghi nhận ${currentHours}/${targetHours} giờ vận hành (chưa đạt định mức đến hạn). Bạn có muốn phát sinh Phiếu bảo trì TRƯỚC HẠN không?`;
      confirmBtnText = 'Xác nhận sinh trước hạn';
      confirmType = 'warning';
    }

    const ok = await confirm(
      'Phát sinh Phiếu Bảo trì',
      confirmMsg,
      { confirmText: confirmBtnText, type: confirmType }
    );
    if (ok) {
      try {
        const res = await api.generateWorkOrderFromSchedule(sch.id, {
          expectedVersion: sch.version,
          actedById: getActiveUserId(),
          force: true,
        });
        toast.success('Thành công', `Đã tự động tạo Phiếu bảo trì ${res.orderCode || ''}!`);
        loadSchedules();
      } catch (err: any) {
        toast.error('Lỗi sinh phiếu', err.message || 'Không thể thực hiện');
      }
    }
  };

  const handleProcessDue = async () => {
    try {
      setProcessingDue(true);
      const summary = await api.processDueSchedules(getActiveUserId());
      toast.success(
        'Quét lịch tự động hoàn tất',
        `Đã quét: ${summary.scanned} kế hoạch. Đã sinh mới: ${summary.generated} phiếu bảo trì. Bỏ qua (chưa đến hạn): ${summary.skipped}.`
      );
      loadSchedules();
    } catch (err: any) {
      toast.error('Lỗi quét lịch', err.message || 'Không thể thực hiện');
    } finally {
      setProcessingDue(false);
    }
  };

  const openHistory = async (sch: any) => {
    setHistoryTarget(sch);
    setHistoryLoading(true);
    try {
      const res = await api.getScheduleHistory(sch.id);
      setHistoryTimeline(res || []);
    } catch (err) {
      console.error(err);
      setHistoryTimeline([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openEditModal = (sch: any) => {
    setEditTarget(sch);
    setFormData({
      title: sch.title || '',
      description: sch.description || '',
      equipmentId: sch.equipmentId,
      frequencyType: sch.frequencyType,
      frequencyInterval: sch.frequencyInterval,
      startDate: sch.startDate ? sch.startDate.split('T')[0] : new Date().toISOString().split('T')[0],
      estimatedDurationMinutes: sch.estimatedDurationMinutes || 120,
      defaultPriority: sch.defaultPriority || 'MEDIUM',
      assignedTechnicianId: sch.assignedTechnicianId || '',
      autoGenerate: sch.autoGenerate !== undefined ? sch.autoGenerate : true,
      leadTimeDays: sch.leadTimeDays || 3,
      notes: sch.notes || '',
      checklistJson: sch.checklistJson || '',
    });
  };

  const getFrequencyLabel = (type: string, interval: number) => {
    switch (type) {
      case 'DAILY':
        return interval === 1 ? 'Hàng ngày' : `Mỗi ${interval} ngày`;
      case 'WEEKLY':
        return interval === 1 ? 'Hàng tuần' : `Mỗi ${interval} tuần`;
      case 'MONTHLY':
        return interval === 1 ? 'Hàng tháng' : `Mỗi ${interval} tháng`;
      case 'QUARTERLY':
        return interval === 1 ? 'Hàng quý' : `Mỗi ${interval} quý`;
      case 'YEARLY':
        return interval === 1 ? 'Hàng năm' : `Mỗi ${interval} năm`;
      case 'OPERATING_HOURS':
        return `Mỗi ${interval} giờ vận hành`;
      default:
        return `${type} (${interval})`;
    }
  };

  // Single-pass reduction for KPI
  const { activeCount, pausedCount, draftCount, overdueCount } = useMemo(() => {
    let active = 0;
    let paused = 0;
    let draft = 0;
    let overdue = 0;
    const now = new Date();

    for (const s of schedules || []) {
      if (s.status === 'ACTIVE') {
        active++;
        if (s.nextDueDate && new Date(s.nextDueDate) < now) {
          overdue++;
        }
      } else if (s.status === 'PAUSED') {
        paused++;
      } else if (s.status === 'DRAFT') {
        draft++;
      }
    }
    return { activeCount: active, pausedCount: paused, draftCount: draft, overdueCount: overdue };
  }, [schedules]);

  // History Tab KPIs
  const totalCost = useMemo(() => history.reduce((sum, item) => sum + (item.totalCost || 0), 0), [history]);
  const totalHours = useMemo(() => {
    return history.reduce((sum, item) => {
      if (item.actualEndDate && item.actualStartDate) {
        const hrs = (new Date(item.actualEndDate).getTime() - new Date(item.actualStartDate).getTime()) / (1000 * 60 * 60);
        return sum + (hrs > 0 ? hrs : 2);
      }
      return sum + 2;
    }, 0);
  }, [history]);

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '16px' }}>
        <div>
          <h1 className="page-title">Kế hoạch Bảo trì & Lịch sử</h1>
          <p className="page-subtitle">Quản lý kế hoạch bảo dưỡng phòng ngừa định kỳ (PM) và tra cứu lịch sử thực hiện</p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          className={`btn ${activeTab === 'schedules' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('schedules')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <Calendar size={15} /> Kế hoạch Bảo trì ({schedules.length})
        </button>
        <button
          className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('history')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <History size={15} /> Lịch sử thực hiện & Chi phí ({total})
        </button>
      </div>

      {/* ===================== TAB 1: SCHEDULES ===================== */}
      {activeTab === 'schedules' && (
        <div>
          {/* Top KPI row */}
          <div className="kpi-row kpi-grid-4" style={{ marginBottom: '16px' }}>
            <div className="kpi-card">
              <div className="kpi-card-title">Đang chạy (ACTIVE)</div>
              <div className="kpi-card-value" style={{ color: 'var(--success, #16a34a)' }}>{activeCount}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-card-title">Cảnh báo Quá hạn</div>
              <div className="kpi-card-value" style={{ color: 'var(--danger, #dc2626)' }}>{overdueCount}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-card-title">Tạm dừng (PAUSED)</div>
              <div className="kpi-card-value" style={{ color: 'var(--warning, #d97706)' }}>{pausedCount}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-card-title">Bản nháp (DRAFT)</div>
              <div className="kpi-card-value">{draftCount}</div>
            </div>
          </div>

          {/* Action Toolbar & Filters */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '16px',
              padding: '12px 16px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
            }}
          >
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: 1, alignItems: 'center' }}>
              <input
                type="text"
                className="form-input"
                style={{ width: '220px' }}
                placeholder="Tìm mã lịch, tên máy..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <select
                className="form-select"
                style={{ width: '150px' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="ACTIVE">Đang chạy (ACTIVE)</option>
                <option value="PAUSED">Tạm dừng (PAUSED)</option>
                <option value="DRAFT">Bản nháp (DRAFT)</option>
                <option value="COMPLETED">Đã hoàn thành</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>

              <select
                className="form-select"
                style={{ width: '150px' }}
                value={freqFilter}
                onChange={(e) => setFreqFilter(e.target.value)}
              >
                <option value="">Tất cả chu kỳ</option>
                <option value="DAILY">Hàng ngày</option>
                <option value="WEEKLY">Hàng tuần</option>
                <option value="MONTHLY">Hàng tháng</option>
                <option value="QUARTERLY">Hàng quý</option>
                <option value="YEARLY">Hàng năm</option>
                <option value="OPERATING_HOURS">Giờ vận hành</option>
              </select>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                <input type="checkbox" checked={overdueFilter} onChange={(e) => setOverdueFilter(e.target.checked)} />
                Chỉ xem Quá hạn
              </label>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-secondary"
                disabled={processingDue}
                onClick={handleProcessDue}
                title="Quét toàn bộ lịch bảo trì đến hạn và tự động sinh phiếu bảo trì"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={14} className={processingDue ? 'spin' : ''} />
                {processingDue ? 'Đang quét...' : 'Quét lịch đến hạn'}
              </button>

              <button
                className="btn btn-primary"
                onClick={() => {
                  setFormData({
                    title: '',
                    description: '',
                    equipmentId: equipmentList[0]?.id || '',
                    frequencyType: 'MONTHLY',
                    frequencyInterval: 1,
                    startDate: new Date().toISOString().split('T')[0],
                    estimatedDurationMinutes: 120,
                    defaultPriority: 'MEDIUM',
                    assignedTechnicianId: '',
                    autoGenerate: true,
                    leadTimeDays: 3,
                    notes: '',
                    checklistJson: '',
                  });
                  setIsAddOpen(true);
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={15} /> Lập Kế hoạch mới
              </button>
            </div>
          </div>

          {/* Schedules Table */}
          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Mã Lịch</th>
                  <th>Thiết bị</th>
                  <th>Công việc bảo dưỡng</th>
                  <th>Chu kỳ</th>
                  <th>Hạn tiếp theo</th>
                  <th>Kỹ thuật viên</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loadingSchedules ? (
                  <TableSkeleton columns={8} rows={5} />
                ) : schedules.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '36px' }}>
                      Chưa có kế hoạch bảo trì nào. Nhấn <strong>"Lập Kế hoạch mới"</strong> để thiết lập lịch bảo dưỡng định kỳ cho thiết bị.
                    </td>
                  </tr>
                ) : (
                  schedules.map((sch) => {
                    const now = new Date();
                    const nextDate = sch.nextDueDate ? new Date(sch.nextDueDate) : null;
                    const leadMs = (sch.leadTimeDays || 0) * 24 * 60 * 60 * 1000;
                    const isOverdue = sch.status === 'ACTIVE' && nextDate && nextDate < now;
                    const isDueSoon = sch.status === 'ACTIVE' && nextDate && nextDate >= now && nextDate.getTime() <= now.getTime() + leadMs;

                    return (
                      <tr key={sch.id}>
                        <td style={{ fontWeight: 700, color: 'var(--primary, #2563eb)' }}>{sch.scheduleCode}</td>
                        <td style={{ fontWeight: 600 }}>{sch.equipment?.name || sch.equipmentId}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{sch.title}</div>
                          {sch.description && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{sch.description}</div>}
                        </td>
                        <td>
                          <span className="badge badge-info">{getFrequencyLabel(sch.frequencyType, sch.frequencyInterval)}</span>
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {sch.frequencyType === 'OPERATING_HOURS'
                            ? `${sch.nextDueMeter} giờ (Hiện tại: ${sch.equipment?.currentOperatingHours || 0})`
                            : sch.nextDueDate
                            ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ color: isOverdue ? 'var(--danger, #dc2626)' : 'inherit' }}>
                                    {new Date(sch.nextDueDate).toLocaleDateString('vi-VN')}
                                  </span>
                                  {isOverdue && (
                                    <span className="badge badge-danger" style={{ fontSize: '10px', padding: '2px 5px' }}>
                                      Quá hạn
                                    </span>
                                  )}
                                  {isDueSoon && (
                                    <span className="badge badge-warning" style={{ fontSize: '10px', padding: '2px 5px' }}>
                                      Sắp đến
                                    </span>
                                  )}
                                </div>
                              )
                            : '---'}
                        </td>
                        <td>{sch.assignedTechnician?.name || <span style={{ color: 'var(--text-muted)' }}>Chưa phân công</span>}</td>
                        <td>
                          <span
                            className={`badge ${
                              sch.status === 'ACTIVE'
                                ? 'badge-success'
                                : sch.status === 'PAUSED'
                                ? 'badge-warning'
                                : sch.status === 'DRAFT'
                                ? 'badge-secondary'
                                : 'badge-danger'
                            }`}
                          >
                            {sch.status === 'ACTIVE'
                              ? 'Đang chạy'
                              : sch.status === 'PAUSED'
                              ? 'Tạm dừng'
                              : sch.status === 'DRAFT'
                              ? 'Bản nháp'
                              : sch.status === 'COMPLETED'
                              ? 'Hoàn thành'
                              : 'Đã hủy'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            {sch.status === 'DRAFT' && (
                              <>
                                <button className="btn btn-secondary btn-sm" title="Chỉnh sửa" onClick={() => openEditModal(sch)}>
                                  <Edit2 size={13} />
                                </button>
                                <button className="btn btn-success btn-sm" title="Kích hoạt lịch" onClick={() => handleActivate(sch)}>
                                  <PlayCircle size={13} /> Kích hoạt
                                </button>
                              </>
                            )}

                            {sch.status === 'ACTIVE' && (
                              <>
                                <button
                                  className="btn btn-primary btn-sm"
                                  title="Phát sinh ngay 1 Phiếu Bảo trì (Work Order)"
                                  onClick={() => handleGenerateWO(sch)}
                                >
                                  <Wrench size={13} /> Sinh phiếu
                                </button>
                                <button
                                  className="btn btn-warning btn-sm"
                                  title="Tạm dừng kế hoạch"
                                  onClick={() => {
                                    setPauseTarget(sch);
                                    setActionReason('');
                                  }}
                                >
                                  <PauseCircle size={13} />
                                </button>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  title="Chỉnh sửa"
                                  onClick={() => openEditModal(sch)}
                                >
                                  <Edit2 size={13} />
                                </button>
                              </>
                            )}

                            {sch.status === 'PAUSED' && (
                              <>
                                <button className="btn btn-success btn-sm" title="Tiếp tục chạy" onClick={() => handleActivate(sch)}>
                                  <PlayCircle size={13} /> Tiếp tục
                                </button>
                                <button className="btn btn-secondary btn-sm" title="Chỉnh sửa" onClick={() => openEditModal(sch)}>
                                  <Edit2 size={13} />
                                </button>
                              </>
                            )}

                            <button className="btn btn-secondary btn-sm" title="Xem lịch sử thay đổi" onClick={() => openHistory(sch)}>
                              <History size={13} />
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
      )}

      {/* ===================== TAB 2: COMPLETED WORK ORDERS HISTORY ===================== */}
      {activeTab === 'history' && (
        <div>
          {/* History KPIs */}
          <div className="kpi-row kpi-grid-3" style={{ marginBottom: '16px' }}>
            <div className="kpi-card">
              <div className="kpi-card-title">Tổng chi phí bảo trì</div>
              <div className="kpi-card-value" style={{ color: 'var(--success, #16a34a)' }}>
                {totalCost.toLocaleString('vi-VN')} ₫
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-card-title">Tổng thời gian bảo trì</div>
              <div className="kpi-card-value">{Math.round(totalHours * 10) / 10} giờ</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-card-title">Số lần bảo trì hoàn thành</div>
              <div className="kpi-card-value">{total}</div>
            </div>
          </div>

          {/* History Table */}
          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Ngày hoàn thành</th>
                  <th>Mã phiếu</th>
                  <th>Thiết bị</th>
                  <th>Nội dung công việc</th>
                  <th>Kỹ thuật viên</th>
                  <th>Thời gian</th>
                  <th>Chi phí</th>
                </tr>
              </thead>
              <tbody>
                {loadingHistory ? (
                  <TableSkeleton columns={7} rows={5} />
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '36px' }}>
                      Chưa có lịch sử bảo trì hoàn thành nào.
                    </td>
                  </tr>
                ) : (
                  history.map((wo) => (
                    <tr key={wo.id}>
                      <td>
                        {wo.completedAt
                          ? new Date(wo.completedAt).toLocaleDateString('vi-VN')
                          : new Date(wo.updatedAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--primary, #2563eb)' }}>{wo.orderCode}</td>
                      <td style={{ fontWeight: 600 }}>{wo.equipment?.name || '---'}</td>
                      <td>{wo.title}</td>
                      <td>{wo.technicianName || '---'}</td>
                      <td>
                        {wo.actualEndDate && wo.actualStartDate
                          ? `${Math.round(((new Date(wo.actualEndDate).getTime() - new Date(wo.actualStartDate).getTime()) / (1000 * 60 * 60)) * 10) / 10} giờ`
                          : '2 giờ'}
                      </td>
                      <td style={{ color: 'var(--success, #16a34a)', fontWeight: 600 }}>
                        {(wo.totalCost || 0).toLocaleString('vi-VN')} ₫
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Responsive Pagination */}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={limit}
            itemName="phiếu bảo trì hoàn thành"
            onPageChange={setPage}
          />
        </div>
      )}

      {/* ===================== MODALS ===================== */}

      {/* Modal Add / Edit Schedule */}
      {(isAddOpen || editTarget) && (
        <Modal
          isOpen={isAddOpen || !!editTarget}
          onClose={() => {
            setIsAddOpen(false);
            setEditTarget(null);
          }}
          title={editTarget ? `Chỉnh sửa kế hoạch: ${editTarget.scheduleCode}` : 'Lập Kế hoạch Bảo trì Định kỳ mới'}
        >
          <form onSubmit={editTarget ? handleUpdate : handleCreate}>
            <div className="form-group">
              <label className="form-label">Tên Kế hoạch Bảo trì *</label>
              <input
                type="text"
                className="form-input"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ví dụ: Bảo dưỡng định kỳ máy dập viên hàng tháng..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mô tả quy trình bảo dưỡng</label>
              <textarea
                className="form-textarea"
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Mô tả các hạng mục kiểm tra, bôi trơn, siết ốc, vệ sinh..."
              />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Thiết bị áp dụng *</label>
                <select
                  className="form-select"
                  required
                  disabled={!!editTarget && editTarget.status !== 'DRAFT'}
                  value={formData.equipmentId}
                  onChange={(e) => setFormData({ ...formData, equipmentId: e.target.value })}
                >
                  {equipmentList.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      [{eq.code}] {eq.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Loại Chu kỳ *</label>
                <select
                  className="form-select"
                  value={formData.frequencyType}
                  onChange={(e) => setFormData({ ...formData, frequencyType: e.target.value })}
                >
                  <option value="DAILY">Hàng ngày</option>
                  <option value="WEEKLY">Hàng tuần</option>
                  <option value="MONTHLY">Hàng tháng</option>
                  <option value="QUARTERLY">Hàng quý (3 tháng)</option>
                  <option value="YEARLY">Hàng năm</option>
                  <option value="OPERATING_HOURS">Theo giờ vận hành máy</option>
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Khoảng lặp (Interval) *</label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  required
                  value={formData.frequencyInterval}
                  onChange={(e) => setFormData({ ...formData, frequencyInterval: Math.max(1, Number(e.target.value)) })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Ngày bắt đầu áp dụng *</label>
                <input
                  type="date"
                  className="form-input"
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Mẫu Checklist đính kèm</label>
                <select
                  className="form-select"
                  value={formData.checklistJson}
                  onChange={(e) => setFormData({ ...formData, checklistJson: e.target.value })}
                >
                  <option value="">-- Không đính kèm checklist --</option>
                  {checklistTemplates.map((chk: any) => (
                    <option key={chk.id} value={chk.id}>
                      [{chk.code}] {chk.name} ({chk.items?.length || 0} mục kiểm tra)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Kỹ thuật viên phụ trách</label>
                <select
                  className="form-select"
                  value={formData.assignedTechnicianId}
                  onChange={(e) => setFormData({ ...formData, assignedTechnicianId: e.target.value })}
                >
                  <option value="">-- Chưa phân công --</option>
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.name} ({tech.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Tự động sinh phiếu (Auto Generate)</label>
                <select
                  className="form-select"
                  value={formData.autoGenerate ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, autoGenerate: e.target.value === 'true' })}
                >
                  <option value="true">Có (Tự động sinh Work Order khi đến hạn)</option>
                  <option value="false">Không (Chỉ sinh Work Order khi bấm thủ công)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Báo trước ngày đến hạn (Lead Time - ngày)</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  value={formData.leadTimeDays}
                  onChange={(e) => setFormData({ ...formData, leadTimeDays: Math.max(0, Number(e.target.value)) })}
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Thời gian dự kiến (phút)</label>
                <input
                  type="number"
                  min="15"
                  step="15"
                  className="form-input"
                  value={formData.estimatedDurationMinutes}
                  onChange={(e) => setFormData({ ...formData, estimatedDurationMinutes: Number(e.target.value) })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mức ưu tiên mặc định</label>
                <select
                  className="form-select"
                  value={formData.defaultPriority}
                  onChange={(e) => setFormData({ ...formData, defaultPriority: e.target.value })}
                >
                  <option value="LOW">Thấp</option>
                  <option value="MEDIUM">Trung bình</option>
                  <option value="HIGH">Cao</option>
                  <option value="URGENT">Khẩn cấp</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Ghi chú lưu ý khi thực hiện</label>
              <input
                type="text"
                className="form-input"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Lưu ý an toàn điện, ngắt nguồn máy, mang bảo hộ lao động..."
              />
            </div>

            <div className="modal-footer" style={{ padding: 0, marginTop: '20px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setIsAddOpen(false);
                  setEditTarget(null);
                }}
              >
                Hủy
              </button>
              <button type="submit" className="btn btn-primary">
                {editTarget ? 'Lưu thay đổi' : 'Tạo Kế hoạch'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Pause Schedule */}
      {pauseTarget && (
        <Modal
          isOpen={!!pauseTarget}
          onClose={() => setPauseTarget(null)}
          title={`Tạm dừng kế hoạch: ${pauseTarget.scheduleCode}`}
        >
          <form onSubmit={handlePauseSubmit}>
            <div className="form-group">
              <label className="form-label">Lý do tạm dừng kế hoạch *</label>
              <input
                type="text"
                className="form-input"
                required
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Ví dụ: Thiết bị ngừng sản xuất, đang chờ linh kiện thay thế..."
              />
            </div>
            <div className="modal-footer" style={{ padding: 0, marginTop: '20px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setPauseTarget(null)}>
                Hủy
              </button>
              <button type="submit" className="btn btn-warning">
                Xác nhận Tạm Dừng
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal History Timeline */}
      {historyTarget && (
        <Modal
          isOpen={!!historyTarget}
          onClose={() => setHistoryTarget(null)}
          title={`Lịch sử kế hoạch: ${historyTarget.scheduleCode}`}
        >
          <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
            {historyLoading ? (
              <div style={{ textAlign: 'center', padding: '24px' }}>Đang tải dòng thời gian...</div>
            ) : historyTimeline.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                Chưa có nhật ký hoạt động nào cho kế hoạch này.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {historyTimeline.map((h: any) => (
                  <div
                    key={h.id}
                    style={{
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: '6px',
                      borderLeft: '3px solid var(--primary, #2563eb)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '13px' }}>{h.action}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {new Date(h.createdAt).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    {h.reason && (
                      <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                        {h.reason}
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Người thực hiện: {h.actedBy?.name || 'Hệ thống'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
