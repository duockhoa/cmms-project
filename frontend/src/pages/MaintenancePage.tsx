import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/Badge';
import { Calendar, History } from 'lucide-react';

export const MaintenancePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'history'>('schedule');
  const [schedules, setSchedules] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    api.getSchedules().then((res) => {
      if (res && Array.isArray(res)) {
        setSchedules(res);
      } else if (res && Array.isArray(res.data)) {
        setSchedules(res.data);
      }
    });

    api.getWorkOrders().then((res) => {
      if (res && Array.isArray(res)) {
        const completed = res.filter((wo: any) => ['COMPLETED', 'VERIFIED', 'CLOSED'].includes(wo.status));
        setHistory(completed);
      } else if (res && res.data && Array.isArray(res.data)) {
        const completed = res.data.filter((wo: any) => ['COMPLETED', 'VERIFIED', 'CLOSED'].includes(wo.status));
        setHistory(completed);
      }
    });
  }, []);

  const activeSchedulesCount = schedules.filter((s: any) => s.status === 'ACTIVE').length;
  const overdueCount = schedules.filter((s: any) => s.status === 'ACTIVE' && s.nextDueDate && new Date(s.nextDueDate) < new Date()).length;
  const pendingCount = Math.max(0, activeSchedulesCount - overdueCount);

  const totalCost = history.reduce((sum, item) => sum + (item.totalCost || 0), 0);
  const totalHours = history.reduce((sum, item) => {
    if (item.actualEndDate && item.actualStartDate) {
      const hrs = (new Date(item.actualEndDate).getTime() - new Date(item.actualStartDate).getTime()) / (1000 * 60 * 60);
      return sum + (hrs > 0 ? hrs : 2);
    }
    return sum + 2; // Default 2 hours estimate if missing
  }, 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Lịch bảo trì & Lịch sử</h1>
          <p className="page-subtitle">Quản lý lịch bảo trì định kỳ và theo dõi lịch sử</p>
        </div>
      </div>

      {/* Tabs Header */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          className={`btn ${activeTab === 'schedule' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('schedule')}
        >
          <Calendar size={14} /> Lịch bảo trì ({schedules.length})
        </button>
        <button
          className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={14} /> Lịch sử ({history.length})
        </button>
      </div>

      {activeTab === 'schedule' ? (
        <div>
          <div className="kpi-row">
            <div className="kpi-card">
              <div className="kpi-card-title">Chờ xử lý</div>
              <div className="kpi-card-value" style={{ color: 'var(--warning)' }}>{pendingCount}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-card-title">Quá hạn</div>
              <div className="kpi-card-value" style={{ color: 'var(--danger)' }}>{overdueCount}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-card-title">Tổng lịch trình</div>
              <div className="kpi-card-value">{schedules.length}</div>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Thiết bị</th>
                  <th>Loại bảo trì</th>
                  <th>Tần suất</th>
                  <th>Ngày đến hạn</th>
                  <th>Phân công</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.equipment?.name || '---'}</td>
                    <td>{s.title}</td>
                    <td>{s.frequencyType}</td>
                    <td style={{ color: 'var(--warning)', fontWeight: 600 }}>
                      {s.nextDueDate 
                        ? new Date(s.nextDueDate).toLocaleDateString('vi-VN') 
                        : (s.nextDueMeter ? `${s.nextDueMeter} giờ` : '---')}
                    </td>
                    <td>{s.assignedTechnician?.name || 'Chưa phân công'}</td>
                    <td>
                      <span className={`badge badge-${s.status === 'ACTIVE' ? 'success' : s.status === 'PAUSED' ? 'warning' : 'neutral'}`}>
                        {s.status === 'ACTIVE' ? 'Đang chạy' : s.status === 'PAUSED' ? 'Tạm dừng' : s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div>
          <div className="kpi-row">
            <div className="kpi-card">
              <div className="kpi-card-title">Tổng chi phí</div>
              <div className="kpi-card-value" style={{ color: 'var(--success)' }}>{totalCost.toLocaleString('vi-VN')} ₫</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-card-title">Tổng thời gian</div>
              <div className="kpi-card-value">{Math.round(totalHours * 10) / 10} giờ</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-card-title">Số lần bảo trì</div>
              <div className="kpi-card-value">{history.length}</div>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Ngày hoàn thành</th>
                  <th>Thiết bị</th>
                  <th>Công việc</th>
                  <th>Kỹ thuật viên</th>
                  <th>Thời gian</th>
                  <th>Chi phí</th>
                </tr>
              </thead>
              <tbody>
                {history.map((wo) => (
                  <tr key={wo.id}>
                    <td>{wo.completedAt ? new Date(wo.completedAt).toLocaleDateString('vi-VN') : new Date(wo.updatedAt).toLocaleDateString('vi-VN')}</td>
                    <td style={{ fontWeight: 600 }}>{wo.equipment?.name || '---'}</td>
                    <td>{wo.title}</td>
                    <td>{wo.technicianName || '---'}</td>
                    <td>
                      {wo.actualEndDate && wo.actualStartDate 
                        ? `${Math.round((new Date(wo.actualEndDate).getTime() - new Date(wo.actualStartDate).getTime()) / (1000 * 60 * 60) * 10) / 10} giờ` 
                        : '2 giờ'}
                    </td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>{(wo.totalCost || 0).toLocaleString('vi-VN')} ₫</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
