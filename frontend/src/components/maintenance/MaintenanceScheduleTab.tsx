import React from 'react';
import { AlertCircle, Edit2, History, PauseCircle, PlayCircle, Plus, RefreshCw, Wrench } from 'lucide-react';
import { EmptyState, FilterBar, KpiCard, SearchInput } from '../common';
import { FrequencyBadge } from '../common/Badge';
import { TableSkeleton } from '../common/Skeleton';

interface MaintenanceScheduleTabProps {
  schedules: any[];
  loading: boolean;
  processingDue: boolean;
  search: string;
  statusFilter: string;
  frequencyFilter: string;
  overdueOnly: boolean;
  counts: { active: number; overdue: number; paused: number; draft: number };
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onFrequencyChange: (value: string) => void;
  onOverdueChange: (value: boolean) => void;
  onResetFilters: () => void;
  onProcessDue: () => void;
  onCreate: () => void;
  onEdit: (schedule: any) => void;
  onActivate: (schedule: any) => void;
  onGenerateWorkOrder: (schedule: any) => void;
  onPause: (schedule: any) => void;
  onViewHistory: (schedule: any) => void;
}

const statusLabels: Record<string, string> = {
  ACTIVE: 'Đang chạy',
  PAUSED: 'Tạm dừng',
  DRAFT: 'Bản nháp',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

const statusClasses: Record<string, string> = {
  ACTIVE: 'badge-success',
  PAUSED: 'badge-warning',
  DRAFT: 'badge-secondary',
  COMPLETED: 'badge-success',
  CANCELLED: 'badge-danger',
};

export const MaintenanceScheduleTab: React.FC<MaintenanceScheduleTabProps> = ({
  schedules,
  loading,
  processingDue,
  search,
  statusFilter,
  frequencyFilter,
  overdueOnly,
  counts,
  onSearchChange,
  onStatusChange,
  onFrequencyChange,
  onOverdueChange,
  onResetFilters,
  onProcessDue,
  onCreate,
  onEdit,
  onActivate,
  onGenerateWorkOrder,
  onPause,
  onViewHistory,
}) => (
  <div>
    <div className="kpi-row kpi-grid-4" style={{ marginBottom: '16px' }}>
      <KpiCard title="Đang chạy (ACTIVE)" value={counts.active} icon={PlayCircle} variant="success" />
      <KpiCard title="Cảnh báo Quá hạn" value={counts.overdue} icon={AlertCircle} variant="danger" />
      <KpiCard title="Tạm dừng (PAUSED)" value={counts.paused} icon={PauseCircle} variant="warning" />
      <KpiCard title="Bản nháp (DRAFT)" value={counts.draft} icon={Edit2} variant="default" />
    </div>

    <FilterBar
      hasActiveFilters={Boolean(search || statusFilter || frequencyFilter || overdueOnly)}
      onReset={onResetFilters}
    >
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: 1, alignItems: 'center' }}>
        <SearchInput placeholder="Tìm mã lịch, tên máy..." value={search} onChange={onSearchChange} />
        <select className="form-select" style={{ width: '150px' }} value={statusFilter} onChange={(event) => onStatusChange(event.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="ACTIVE">Đang chạy (ACTIVE)</option>
          <option value="PAUSED">Tạm dừng (PAUSED)</option>
          <option value="DRAFT">Bản nháp (DRAFT)</option>
          <option value="COMPLETED">Đã hoàn thành</option>
          <option value="CANCELLED">Đã hủy</option>
        </select>
        <select className="form-select" style={{ width: '150px' }} value={frequencyFilter} onChange={(event) => onFrequencyChange(event.target.value)}>
          <option value="">Tất cả chu kỳ</option>
          <option value="DAILY">Hàng ngày</option>
          <option value="WEEKLY">Hàng tuần</option>
          <option value="MONTHLY">Hàng tháng</option>
          <option value="QUARTERLY">Hàng quý</option>
          <option value="YEARLY">Hàng năm</option>
          <option value="OPERATING_HOURS">Giờ vận hành</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
          <input type="checkbox" checked={overdueOnly} onChange={(event) => onOverdueChange(event.target.checked)} />
          Chỉ xem Quá hạn
        </label>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button className="btn btn-secondary" disabled={processingDue} onClick={onProcessDue} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <RefreshCw size={14} className={processingDue ? 'spin' : ''} />
          {processingDue ? 'Đang quét...' : 'Quét lịch đến hạn'}
        </button>
        <button className="btn btn-primary" onClick={onCreate} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={15} /> Lập Kế hoạch mới
        </button>
      </div>
    </FilterBar>

    <div className="table-wrapper">
      <table className="custom-table">
        <thead>
          <tr>
            <th>Mã Lịch</th><th>Thiết bị</th><th>Công việc bảo dưỡng</th><th>Chu kỳ</th>
            <th>Hạn tiếp theo</th><th>Kỹ thuật viên</th><th>Trạng thái</th><th style={{ textAlign: 'center' }}>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <TableSkeleton columns={8} rows={5} />
          ) : schedules.length === 0 ? (
            <EmptyState
              colSpan={8}
              compact
              minHeight={170}
              title="Chưa có kế hoạch bảo trì"
              description="Lập kế hoạch định kỳ để chủ động theo dõi lịch bảo dưỡng thiết bị."
              action={{ label: 'Lập kế hoạch mới', onClick: onCreate, icon: Plus }}
            />
          ) : schedules.map((schedule) => {
            const now = new Date();
            const nextDate = schedule.nextDueDate ? new Date(schedule.nextDueDate) : null;
            const leadTime = (schedule.leadTimeDays || 0) * 86_400_000;
            const overdue = schedule.status === 'ACTIVE' && nextDate && nextDate < now;
            const dueSoon = schedule.status === 'ACTIVE' && nextDate && nextDate >= now && nextDate.getTime() <= now.getTime() + leadTime;
            return (
              <tr key={schedule.id}>
                <td style={{ fontWeight: 700, color: 'var(--primary, #2563eb)' }}>{schedule.scheduleCode}</td>
                <td style={{ fontWeight: 600 }}>{schedule.equipment?.name || schedule.equipmentId}</td>
                <td>
                  <div style={{ fontWeight: 600 }}>{schedule.title}</div>
                  {schedule.description && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{schedule.description}</div>}
                </td>
                <td><FrequencyBadge frequency={schedule.frequencyType} interval={schedule.frequencyInterval} /></td>
                <td style={{ fontWeight: 600 }}>
                  {schedule.frequencyType === 'OPERATING_HOURS'
                    ? `${schedule.nextDueMeter} giờ (Hiện tại: ${schedule.equipment?.currentOperatingHours || 0})`
                    : nextDate ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: overdue ? 'var(--danger, #dc2626)' : 'inherit' }}>{nextDate.toLocaleDateString('vi-VN')}</span>
                        {overdue && <span className="badge badge-danger" style={{ fontSize: '10px', padding: '2px 5px' }}>Quá hạn</span>}
                        {dueSoon && <span className="badge badge-warning" style={{ fontSize: '10px', padding: '2px 5px' }}>Sắp đến</span>}
                      </div>
                    ) : '---'}
                </td>
                <td>{schedule.assignedTechnician?.name || <span style={{ color: 'var(--text-muted)' }}>Chưa phân công</span>}</td>
                <td><span className={`badge ${statusClasses[schedule.status] || 'badge-danger'}`}>{statusLabels[schedule.status] || schedule.status}</span></td>
                <td style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    {schedule.status === 'DRAFT' && <>
                      <button className="btn btn-secondary btn-sm" title="Chỉnh sửa" onClick={() => onEdit(schedule)}><Edit2 size={13} /></button>
                      <button className="btn btn-success btn-sm" title="Kích hoạt lịch" onClick={() => onActivate(schedule)}><PlayCircle size={13} /> Kích hoạt</button>
                    </>}
                    {schedule.status === 'ACTIVE' && <>
                      <button className="btn btn-primary btn-sm" title="Phát sinh phiếu bảo trì" onClick={() => onGenerateWorkOrder(schedule)}><Wrench size={13} /> Sinh phiếu</button>
                      <button className="btn btn-warning btn-sm" title="Tạm dừng kế hoạch" onClick={() => onPause(schedule)}><PauseCircle size={13} /></button>
                      <button className="btn btn-secondary btn-sm" title="Chỉnh sửa" onClick={() => onEdit(schedule)}><Edit2 size={13} /></button>
                    </>}
                    {schedule.status === 'PAUSED' && <>
                      <button className="btn btn-success btn-sm" title="Tiếp tục chạy" onClick={() => onActivate(schedule)}><PlayCircle size={13} /> Tiếp tục</button>
                      <button className="btn btn-secondary btn-sm" title="Chỉnh sửa" onClick={() => onEdit(schedule)}><Edit2 size={13} /></button>
                    </>}
                    <button className="btn btn-secondary btn-sm" title="Xem lịch sử thay đổi" onClick={() => onViewHistory(schedule)}><History size={13} /></button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);
