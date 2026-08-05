import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/Badge';
import { Calendar, History, ChevronLeft, ChevronRight } from 'lucide-react';

const API_BASE = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

const fetchWithAuth = async (url: string | URL, options: RequestInit = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    'x-user-id': 'tech-demo-id',
    'x-test-user-id': 'tech-demo-id',
    ...options.headers
  };
  return fetch(url, { ...options, headers });
};

export const MaintenancePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'history'>('schedule');
  const [schedules, setSchedules] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination states for history list
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadData = async () => {
    try {
      setLoading(true);

      // Fetch dynamic active schedules
      const res = await api.getSchedules();
      if (res && Array.isArray(res)) {
        setSchedules(res);
      } else if (res && Array.isArray(res.data)) {
        setSchedules(res.data);
      }

      // Fetch work orders with pagination
      const url = new URL(`${API_BASE}/api/work-orders`);
      url.searchParams.append('page', page.toString());
      url.searchParams.append('limit', limit.toString());
      url.searchParams.append('status', 'COMPLETED'); // Filtering done in client legacy or endpoint query

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
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, activeTab]);

  const activeSchedulesCount = schedules.filter((s: any) => s.status === 'ACTIVE').length;
  const overdueCount = schedules.filter((s: any) => s.status === 'ACTIVE' && s.nextDueDate && new Date(s.nextDueDate) < new Date()).length;
  const pendingCount = Math.max(0, activeSchedulesCount - overdueCount);

  const totalCost = history.reduce((sum, item) => sum + (item.totalCost || 0), 0);
  const totalHours = history.reduce((sum, item) => {
    if (item.actualEndDate && item.actualStartDate) {
      const hrs = (new Date(item.actualEndDate).getTime() - new Date(item.actualStartDate).getTime()) / (1000 * 60 * 60);
      return sum + (hrs > 0 ? hrs : 2);
    }
    return sum + 2;
  }, 0);

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

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
          <History size={14} /> Lịch sử ({total})
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Đang tải dữ liệu...</div>
      ) : activeTab === 'schedule' ? (
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
              <div className="kpi-card-value">{total}</div>
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
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                      Chưa có lịch sử bảo trì hoàn thành nào
                    </td>
                  </tr>
                ) : history.map((wo) => (
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

          {/* Pagination Controls */}
          {total > 0 && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginTop: '16px', 
              padding: '12px 16px', 
              border: '1px solid var(--border-color)', 
              borderRadius: '8px', 
              backgroundColor: 'var(--bg-secondary)' 
            }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Hiển thị <strong>{startItem}-{endItem}</strong> trong tổng số <strong>{total}</strong> phiếu bảo trì hoàn thành
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button 
                  className="btn btn-secondary btn-sm" 
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 12px', gap: '4px' }}
                >
                  <ChevronLeft size={14} /> Trang trước
                </button>
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pNum) => (
                  <button 
                    key={pNum} 
                    className={`btn btn-sm ${page === pNum ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setPage(pNum)}
                    style={{ 
                      minWidth: '32px', 
                      height: '32px', 
                      padding: 0, 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      backgroundColor: page === pNum ? '#2563eb' : 'transparent',
                      color: page === pNum ? '#ffffff' : 'var(--text-primary)',
                      border: page === pNum ? 'none' : '1px solid var(--border-color)'
                    }}
                  >
                    {pNum}
                  </button>
                ))}
                <button 
                  className="btn btn-secondary btn-sm" 
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                  style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 12px', gap: '4px' }}
                >
                  Trang sau <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
