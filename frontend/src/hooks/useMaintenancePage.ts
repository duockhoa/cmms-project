import React, { useEffect, useMemo, useState } from 'react';
import { api, fetchWithAuth, API_HOST as API_BASE } from '../services/api';
import { useToast, useConfirmDialog } from '../components/common/Toast';

export const useMaintenancePage = () => {
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
        search,
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
  }, [search, statusFilter, freqFilter, overdueFilter]);

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

  const openCreateModal = () => {
    setEditTarget(null);
    setFormData({
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
    setIsAddOpen(true);
  };

  const closeScheduleModal = () => {
    setIsAddOpen(false);
    setEditTarget(null);
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

  const maintenanceViewModel = {
    activeTab, setActiveTab, schedules, loadingSchedules, processingDue,
    search, setSearch, statusFilter, setStatusFilter, freqFilter, setFreqFilter,
    overdueFilter, setOverdueFilter, activeCount, overdueCount, pausedCount,
    draftCount, handleProcessDue, openCreateModal, openEditModal, handleActivate,
    handleGenerateWO, setPauseTarget, setActionReason, openHistory, history,
    loadingHistory, page, setPage, limit, total, totalPages, totalCost, totalHours,
    isAddOpen, editTarget, formData, setFormData, equipmentList,
    checklistTemplates, technicians, closeScheduleModal, handleCreate, handleUpdate,
    pauseTarget, actionReason, handlePauseSubmit, historyTarget, historyTimeline,
    historyLoading, setHistoryTarget,
  };


  return maintenanceViewModel;
};
