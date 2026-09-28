import React from 'react';
import { CheckCircle, Clock, WalletCards } from 'lucide-react';
import { EmptyState, KpiCard } from '../common';
import { Pagination } from '../common/Pagination';
import { TableSkeleton } from '../common/Skeleton';

interface MaintenanceHistoryTabProps {
  history: any[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  totalCost: number;
  totalHours: number;
  onPageChange: (page: number) => void;
}

export const MaintenanceHistoryTab: React.FC<MaintenanceHistoryTabProps> = ({
  history,
  loading,
  page,
  pageSize,
  total,
  totalPages,
  totalCost,
  totalHours,
  onPageChange,
}) => (
  <div>
    <div className="kpi-row kpi-grid-3" style={{ marginBottom: '16px' }}>
      <KpiCard title="Tổng chi phí bảo trì" value={`${totalCost.toLocaleString('vi-VN')} ₫`} icon={WalletCards} variant="success" />
      <KpiCard title="Tổng thời gian bảo trì" value={`${Math.round(totalHours * 10) / 10} giờ`} icon={Clock} variant="info" />
      <KpiCard title="Số lần bảo trì hoàn thành" value={total} icon={CheckCircle} variant="primary" />
    </div>

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
          {loading ? (
            <TableSkeleton columns={7} rows={5} />
          ) : history.length === 0 ? (
            <EmptyState colSpan={7} compact minHeight={160} title="Chưa có lịch sử bảo trì hoàn thành" />
          ) : (
            history.map((workOrder) => (
              <tr key={workOrder.id}>
                <td>{new Date(workOrder.completedAt || workOrder.updatedAt).toLocaleDateString('vi-VN')}</td>
                <td style={{ fontWeight: 700, color: 'var(--primary, #2563eb)' }}>{workOrder.orderCode}</td>
                <td style={{ fontWeight: 600 }}>{workOrder.equipment?.name || '---'}</td>
                <td>{workOrder.title}</td>
                <td>{workOrder.technicianName || '---'}</td>
                <td>
                  {workOrder.actualEndDate && workOrder.actualStartDate
                    ? `${Math.round(((new Date(workOrder.actualEndDate).getTime() - new Date(workOrder.actualStartDate).getTime()) / 3_600_000) * 10) / 10} giờ`
                    : '2 giờ'}
                </td>
                <td style={{ color: 'var(--success, #16a34a)', fontWeight: 600 }}>
                  {(workOrder.totalCost || 0).toLocaleString('vi-VN')} ₫
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>

    <Pagination
      currentPage={page}
      totalPages={totalPages}
      totalItems={total}
      pageSize={pageSize}
      itemName="phiếu bảo trì hoàn thành"
      onPageChange={onPageChange}
    />
  </div>
);
