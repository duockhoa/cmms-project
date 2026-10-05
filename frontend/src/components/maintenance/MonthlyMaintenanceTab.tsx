import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  CheckCircle,
  Clock,
  AlertTriangle,
  PlayCircle,
  FileText,
  Filter,
  ArrowRight,
  User,
  Wrench,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useToast } from '../common/Toast';
import { TableSkeleton } from '../common/Skeleton';
import { EmptyState } from '../common';
import { CreateAdHocMaintenanceModal } from './CreateAdHocMaintenanceModal';

interface MonthlyMaintenanceTabProps {
  equipmentList: any[];
  technicians: any[];
  checklistTemplates: any[];
  onRefreshHistory?: () => void;
}

interface MaintenanceItem {
  id: string;
  sourceType: 'SCHEDULED' | 'ADHOC';
  code: string;
  title: string;
  description?: string;
  equipmentId: string;
  equipmentName: string;
  equipmentCode: string;
  location?: string;
  scheduledDate: Date;
  dateStr: string;
  dayOfMonth: number;
  priority: string;
  technicianName?: string;
  technicianId?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'READY_TO_GENERATE';
  statusText: string;
  workOrderId?: string;
  workOrderCode?: string;
  scheduleId?: string;
  scheduleVersion?: number;
  isOverdue: boolean;
}

export const MonthlyMaintenanceTab: React.FC<MonthlyMaintenanceTabProps> = ({
  equipmentList,
  technicians,
  checklistTemplates,
  onRefreshHistory,
}) => {
  const navigate = useNavigate();
  const toast = useToast();

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1); // 1 - 12

  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'SCHEDULED' | 'ADHOC'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [technicianFilter, setTechnicianFilter] = useState<string>('ALL');

  // Ad-hoc Modal
  const [isAdHocModalOpen, setIsAdHocModalOpen] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  // Month navigation
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  const handleToday = () => {
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth() + 1);
  };

  // Load Data
  const loadData = async () => {
    try {
      setLoading(true);
      const [schRes, woRes] = await Promise.all([
        api.getSchedules().catch(() => []),
        api.getWorkOrders().catch(() => []),
      ]);

      setSchedules(Array.isArray(schRes) ? schRes : (schRes?.data || []));
      setWorkOrders(Array.isArray(woRes) ? woRes : (woRes?.data || []));
    } catch (err) {
      console.error('Failed to load monthly maintenance data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute Items for Selected Month
  const monthlyItems = useMemo<MaintenanceItem[]>(() => {
    const items: MaintenanceItem[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthStart = new Date(selectedYear, selectedMonth - 1, 1, 0, 0, 0);
    const monthEnd = new Date(selectedYear, selectedMonth, 0, 23, 59, 59);

    // 1. Process Work Orders that fall in this month (both ad-hoc and generated PM work orders)
    workOrders.forEach((wo) => {
      // We are interested in preventive / maintenance work orders (either from schedule or without incident request)
      const isPreventiveOrAdHoc = Boolean(wo.scheduleId) || !wo.requestId;
      if (!isPreventiveOrAdHoc) return;

      const dateField = wo.plannedStartDate || wo.scheduledDueDate || wo.createdAt;
      if (!dateField) return;

      const itemDate = new Date(dateField);
      if (itemDate < monthStart || itemDate > monthEnd) return;

      const isCompleted = ['COMPLETED', 'VERIFIED', 'CLOSED'].includes(wo.status);
      const isInProgress = wo.status === 'IN_PROGRESS';
      const isOverdue = !isCompleted && itemDate < today;

      let status: MaintenanceItem['status'] = 'PENDING';
      let statusText = 'Chờ thực hiện';

      if (isCompleted) {
        status = 'COMPLETED';
        statusText = 'Đã hoàn thành';
      } else if (isInProgress) {
        status = 'IN_PROGRESS';
        statusText = 'Đang thực hiện';
      } else if (isOverdue) {
        status = 'OVERDUE';
        statusText = 'Quá hạn';
      }

      items.push({
        id: `wo-${wo.id}`,
        sourceType: wo.scheduleId ? 'SCHEDULED' : 'ADHOC',
        code: wo.orderCode,
        title: wo.title,
        description: wo.description,
        equipmentId: wo.equipmentId,
        equipmentName: wo.equipment?.name || '---',
        equipmentCode: wo.equipment?.code || '---',
        location: wo.equipment?.location,
        scheduledDate: itemDate,
        dateStr: itemDate.toLocaleDateString('vi-VN'),
        dayOfMonth: itemDate.getDate(),
        priority: wo.priority || 'MEDIUM',
        technicianName: wo.technicianName || wo.assignedTechnician?.name,
        technicianId: wo.assignedTechnicianId || wo.assignedTechnician?.id,
        status,
        statusText,
        workOrderId: wo.id,
        workOrderCode: wo.orderCode,
        scheduleId: wo.scheduleId,
        isOverdue,
      });
    });

    // 2. Process Active Schedules that have nextDueDate or planned cycle in this month but haven't generated work order yet
    schedules.forEach((sch) => {
      if (sch.status === 'CANCELLED' || sch.status === 'COMPLETED') return;

      // Check if nextDueDate is in this month
      if (sch.nextDueDate) {
        const dueDate = new Date(sch.nextDueDate);
        if (dueDate >= monthStart && dueDate <= monthEnd) {
          // Check if there is already a work order for this schedule on this due date in our list
          const alreadyHasWO = items.some(
            (it) => it.scheduleId === sch.id && Math.abs(it.scheduledDate.getTime() - dueDate.getTime()) < 86400000
          );

          if (!alreadyHasWO) {
            const isOverdue = dueDate < today;
            items.push({
              id: `sch-${sch.id}`,
              sourceType: 'SCHEDULED',
              code: sch.scheduleCode,
              title: sch.title,
              description: sch.description,
              equipmentId: sch.equipmentId,
              equipmentName: sch.equipment?.name || '---',
              equipmentCode: sch.equipment?.code || '---',
              location: sch.equipment?.location,
              scheduledDate: dueDate,
              dateStr: dueDate.toLocaleDateString('vi-VN'),
              dayOfMonth: dueDate.getDate(),
              priority: sch.defaultPriority || 'MEDIUM',
              technicianName: sch.assignedTechnician?.name,
              technicianId: sch.assignedTechnicianId || sch.assignedTechnician?.id,
              status: isOverdue ? 'OVERDUE' : 'READY_TO_GENERATE',
              statusText: isOverdue ? 'Quá hạn (Chưa sinh phiếu)' : 'Đến hạn (Chờ sinh phiếu)',
              scheduleId: sch.id,
              scheduleVersion: sch.version,
              isOverdue,
            });
          }
        }
      }
    });

    // Sort by day of month ascending
    return items.sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
  }, [workOrders, schedules, selectedYear, selectedMonth]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return monthlyItems.filter((item) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = item.title?.toLowerCase().includes(q);
        const matchCode = item.code?.toLowerCase().includes(q);
        const matchEqName = item.equipmentName?.toLowerCase().includes(q);
        const matchEqCode = item.equipmentCode?.toLowerCase().includes(q);
        const matchTech = item.technicianName?.toLowerCase().includes(q);
        if (!matchTitle && !matchCode && !matchEqName && !matchEqCode && !matchTech) return false;
      }

      // Type Filter
      if (typeFilter !== 'ALL' && item.sourceType !== typeFilter) return false;

      // Status Filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'OVERDUE' && !item.isOverdue) return false;
        if (statusFilter === 'COMPLETED' && item.status !== 'COMPLETED') return false;
        if (statusFilter === 'IN_PROGRESS' && item.status !== 'IN_PROGRESS') return false;
        if (statusFilter === 'PENDING' && !['PENDING', 'READY_TO_GENERATE'].includes(item.status)) return false;
      }

      // Technician Filter
      if (technicianFilter !== 'ALL') {
        if (technicianFilter === 'UNASSIGNED') {
          if (item.technicianId || item.technicianName) return false;
        } else if (item.technicianId !== technicianFilter) {
          return false;
        }
      }

      return true;
    });
  }, [monthlyItems, search, typeFilter, statusFilter, technicianFilter]);

  // KPIs for the selected month
  const stats = useMemo(() => {
    const total = monthlyItems.length;
    const completed = monthlyItems.filter((i) => i.status === 'COMPLETED').length;
    const inProgress = monthlyItems.filter((i) => i.status === 'IN_PROGRESS').length;
    const pending = monthlyItems.filter((i) => i.status === 'PENDING' || i.status === 'READY_TO_GENERATE').length;
    const overdue = monthlyItems.filter((i) => i.isOverdue).length;
    return { total, completed, inProgress, pending, overdue };
  }, [monthlyItems]);

  // Handle Generate Work Order from Schedule
  const handleGenerateWorkOrder = async (item: MaintenanceItem) => {
    if (!item.scheduleId) return;
    setGeneratingId(item.id);
    try {
      const activeTechId = technicians[0]?.id;
      const res = await api.generateWorkOrderFromSchedule(item.scheduleId, {
        actedById: activeTechId,
        expectedVersion: item.scheduleVersion,
      });
      toast.success('Sinh phiếu thành công', `Đã sinh phiếu bảo trì ${res?.orderCode || ''} cho thiết bị.`);
      loadData();
      if (onRefreshHistory) onRefreshHistory();
    } catch (err: any) {
      console.error(err);
      toast.error('Lỗi sinh phiếu', err.message || 'Không thể sinh phiếu sửa chữa');
    } finally {
      setGeneratingId(null);
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'URGENT':
        return { text: 'Khẩn cấp', bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
      case 'HIGH':
        return { text: 'Ưu tiên cao', bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' };
      case 'LOW':
        return { text: 'Thấp', bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' };
      case 'MEDIUM':
      default:
        return { text: 'Bình thường', bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' };
    }
  };

  const getStatusBadge = (item: MaintenanceItem) => {
    if (item.status === 'COMPLETED') {
      return { text: 'Đã hoàn thành', bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
    }
    if (item.status === 'IN_PROGRESS') {
      return { text: 'Đang thực hiện', bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' };
    }
    if (item.status === 'OVERDUE') {
      return { text: 'Quá hạn', bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
    }
    if (item.status === 'READY_TO_GENERATE') {
      return { text: 'Đến hạn (Chưa sinh phiếu)', bg: '#fffbeb', color: '#b45309', border: '#fde68a' };
    }
    return { text: 'Chờ thực hiện', bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' };
  };

  const isCurrentMonth = selectedMonth === now.getMonth() + 1 && selectedYear === now.getFullYear();

  return (
    <div>
      {/* ── TOP BAR: MONTH SELECTOR & ACTION BUTTONS ── */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          marginBottom: '20px',
          backgroundColor: 'var(--bg-card, #ffffff)',
          borderRadius: '10px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        {/* Month Navigator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handlePrevMonth}
              title="Tháng trước"
              style={{ padding: '6px 10px' }}
            >
              <ChevronLeft size={16} />
            </button>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                backgroundColor: 'var(--bg-primary, #f8fafc)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                minWidth: '180px',
                justifyContent: 'center',
              }}
            >
              <Calendar size={16} color="#2563eb" />
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Tháng {selectedMonth < 10 ? `0${selectedMonth}` : selectedMonth} / {selectedYear}
              </span>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleNextMonth}
              title="Tháng sau"
              style={{ padding: '6px 10px' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {!isCurrentMonth && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleToday}
              style={{ fontSize: '12.5px', color: '#2563eb' }}
            >
              Về tháng hiện tại
            </button>
          )}

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadData}
            disabled={loading}
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Action Button: Create Ad-Hoc Maintenance Job */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsAdHocModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600,
              fontSize: '13.5px',
            }}
          >
            <Plus size={16} /> Tạo lịch bảo trì
          </button>
        </div>
      </div>

      {/* ── KPI STRIP IN THE SELECTED MONTH ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            padding: '14px 18px',
            backgroundColor: 'var(--bg-card, #ffffff)',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            borderLeft: '4px solid #2563eb',
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>TỔNG VIỆC BẢO TRÌ TRONG THÁNG</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
            {stats.total}
          </div>
        </div>

        <div
          style={{
            padding: '14px 18px',
            backgroundColor: 'var(--bg-card, #ffffff)',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            borderLeft: '4px solid #16a34a',
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>ĐÃ HOÀN THÀNH</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>
            {stats.completed}
          </div>
        </div>

        <div
          style={{
            padding: '14px 18px',
            backgroundColor: 'var(--bg-card, #ffffff)',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            borderLeft: '4px solid #2563eb',
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>ĐANG THỰC HIỆN</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#2563eb', marginTop: '4px' }}>
            {stats.inProgress}
          </div>
        </div>

        <div
          style={{
            padding: '14px 18px',
            backgroundColor: 'var(--bg-card, #ffffff)',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            borderLeft: '4px solid #f59e0b',
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>CHỜ THỰC HIỆN</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#b45309', marginTop: '4px' }}>
            {stats.pending}
          </div>
        </div>

        <div
          style={{
            padding: '14px 18px',
            backgroundColor: 'var(--bg-card, #ffffff)',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            borderLeft: '4px solid #dc2626',
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>CẢNH BÁO QUÁ HẠN</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>
            {stats.overdue}
          </div>
        </div>
      </div>

      {/* ── FILTER TOOLBAR ── */}
      <div
        className="card"
        style={{
          padding: '12px 16px',
          marginBottom: '16px',
          backgroundColor: 'var(--bg-card, #ffffff)',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '240px', maxWidth: '380px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '32px', fontSize: '13px' }}
              placeholder="Tìm thiết bị, mã, nội dung..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Lọc loại */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Loại:</span>
            <select
              className="form-select form-select-sm"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              style={{ fontSize: '12.5px' }}
            >
              <option value="ALL">Tất cả nguồn</option>
              <option value="SCHEDULED">📅 Định kỳ (Kế hoạch)</option>
              <option value="ADHOC">⚡ Đột xuất (Ngẫu nhiên)</option>
            </select>
          </div>

          {/* Lọc trạng thái */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Trạng thái:</span>
            <select
              className="form-select form-select-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ fontSize: '12.5px' }}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING">Chờ thực hiện</option>
              <option value="IN_PROGRESS">Đang thực hiện</option>
              <option value="COMPLETED">Đã hoàn thành</option>
              <option value="OVERDUE">Quá hạn</option>
            </select>
          </div>

          {/* Lọc kỹ thuật viên */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Kỹ thuật viên:</span>
            <select
              className="form-select form-select-sm"
              value={technicianFilter}
              onChange={(e) => setTechnicianFilter(e.target.value)}
              style={{ fontSize: '12.5px', maxWidth: '170px' }}
            >
              <option value="ALL">Tất cả KTV</option>
              <option value="UNASSIGNED">Chưa phân công</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {(search || typeFilter !== 'ALL' || statusFilter !== 'ALL' || technicianFilter !== 'ALL') && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSearch('');
                setTypeFilter('ALL');
                setStatusFilter('ALL');
                setTechnicianFilter('ALL');
              }}
              style={{ fontSize: '12px' }}
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* ── MAIN TABLE: MONTHLY MAINTENANCE JOBS ── */}
      <div className="table-wrapper">
        <table className="custom-table" style={{ fontSize: '13px' }}>
          <thead>
            <tr>
              <th style={{ width: '110px' }}>Ngày thực hiện</th>
              <th style={{ width: '130px' }}>Mã công việc</th>
              <th style={{ minWidth: '160px' }}>Thiết bị</th>
              <th style={{ minWidth: '220px' }}>Nội dung bảo trì</th>
              <th style={{ width: '140px' }}>Phân loại</th>
              <th style={{ width: '130px' }}>Kỹ thuật viên</th>
              <th style={{ width: '110px' }}>Mức ưu tiên</th>
              <th style={{ width: '140px' }}>Trạng thái</th>
              <th style={{ width: '140px', textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton columns={9} rows={6} />
            ) : filteredItems.length === 0 ? (
              <EmptyState
                colSpan={9}
                compact
                minHeight={200}
                title={`Không có lịch bảo trì nào trong Tháng ${selectedMonth < 10 ? `0${selectedMonth}` : selectedMonth}/${selectedYear}`}
                action={{
                  label: '+ Tạo lịch bảo trì',
                  onClick: () => setIsAdHocModalOpen(true),
                }}
              />
            ) : (
              filteredItems.map((item) => {
                const pBadge = getPriorityBadge(item.priority);
                const sBadge = getStatusBadge(item);
                const isGenerating = generatingId === item.id;

                return (
                  <tr key={item.id}>
                    {/* Ngày thực hiện */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <strong style={{ fontSize: '13.5px', color: item.isOverdue ? '#dc2626' : 'var(--text-primary)' }}>
                          {item.dateStr}
                        </strong>
                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                          Ngày {item.dayOfMonth}
                        </span>
                      </div>
                    </td>

                    {/* Mã */}
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--primary, #2563eb)' }}>
                        {item.code}
                      </span>
                    </td>

                    {/* Thiết bị */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>{item.equipmentName}</strong>
                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                          {item.equipmentCode} {item.location ? `• ${item.location}` : ''}
                        </span>
                      </div>
                    </td>

                    {/* Nội dung công việc */}
                    <td>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.title}</div>
                        {item.description && (
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.3 }}>
                            {item.description.length > 80 ? `${item.description.substring(0, 80)}...` : item.description}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Phân loại */}
                    <td>
                      {item.sourceType === 'SCHEDULED' ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                            fontSize: '11.5px',
                            fontWeight: 600,
                          }}
                        >
                          📅 Định kỳ
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: '#faf5ff',
                            color: '#7e22ce',
                            border: '1px solid #e9d5ff',
                            fontSize: '11.5px',
                            fontWeight: 600,
                          }}
                        >
                          ⚡ Đột xuất
                        </span>
                      )}
                    </td>

                    {/* Kỹ thuật viên */}
                    <td>
                      {item.technicianName ? (
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{item.technicianName}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '12px' }}>Chưa phân công</span>
                      )}
                    </td>

                    {/* Độ ưu tiên */}
                    <td>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: pBadge.bg,
                          color: pBadge.color,
                          border: `1px solid ${pBadge.border}`,
                        }}
                      >
                        {pBadge.text}
                      </span>
                    </td>

                    {/* Trạng thái */}
                    <td>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: sBadge.bg,
                          color: sBadge.color,
                          border: `1px solid ${sBadge.border}`,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {sBadge.text}
                      </span>
                    </td>

                    {/* Thao tác */}
                    <td style={{ textAlign: 'center' }}>
                      {item.workOrderId ? (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => navigate('/work-orders')}
                          title="Xem chi tiết phiếu sửa chữa"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                          }}
                        >
                          <FileText size={13} color="#2563eb" /> Xem phiếu
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handleGenerateWorkOrder(item)}
                          disabled={isGenerating}
                          title="Sinh phiếu sửa chữa bảo trì ngay"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                          }}
                        >
                          {isGenerating ? (
                            <RefreshCw size={12} className="animate-spin" />
                          ) : (
                            <PlayCircle size={13} />
                          )}
                          Sinh phiếu
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── CREATE AD-HOC MAINTENANCE MODAL ── */}
      <CreateAdHocMaintenanceModal
        isOpen={isAdHocModalOpen}
        onClose={() => setIsAdHocModalOpen(false)}
        onSuccess={() => {
          loadData();
          if (onRefreshHistory) onRefreshHistory();
        }}
        equipmentList={equipmentList}
        technicians={technicians}
        checklistTemplates={checklistTemplates}
        defaultDate={`${selectedYear}-${selectedMonth < 10 ? `0${selectedMonth}` : selectedMonth}-01`}
      />
    </div>
  );
};
