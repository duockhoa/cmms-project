import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/Badge';
import { Cpu, AlertTriangle, Calendar, CheckCircle2, ArrowUpRight, BellRing } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboard().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Đang tải dữ liệu...</div>;
  }

  const { kpi, recentRequests, urgentWorkOrders } = data;

  const completionRate = kpi.completedWorkOrders + kpi.activeWorkOrders > 0
    ? Math.round((kpi.completedWorkOrders / (kpi.completedWorkOrders + kpi.activeWorkOrders)) * 100)
    : 0;

  const operationalRate = kpi.totalEquipment > 0
    ? Math.round((kpi.operationalEquipment / kpi.totalEquipment) * 100)
    : 0;

  const offlineEquipment = Math.max(0, kpi.totalEquipment - kpi.operationalEquipment - kpi.underMaintenanceEquipment - kpi.incidentEquipment);

  const pendingUrgentRequestsCount = recentRequests.filter((r: any) => r.priority === 'URGENT' || r.priority === 'HIGH').length;

  return (
    <div>
      {/* Title */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Tổng quan</h1>
          <p className="page-subtitle">Theo dõi tình hình bảo trì và vận hành thiết bị</p>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="kpi-row">
        <div className="kpi-card">
          <div className="flex-between">
            <span className="kpi-card-title">Tổng thiết bị</span>
            <Cpu size={16} color="var(--text-muted)" />
          </div>
          <div className="kpi-card-value">{kpi.totalEquipment}</div>
          <div className="kpi-card-footer">{kpi.operationalEquipment} hoạt động</div>
        </div>

        <div className="kpi-card">
          <div className="flex-between">
            <span className="kpi-card-title">Yêu cầu chờ duyệt</span>
            <AlertTriangle size={16} color="var(--warning)" />
          </div>
          <div className="kpi-card-value">{kpi.pendingRequests}</div>
          <div className="kpi-card-footer" style={{ color: 'var(--danger)' }}>{pendingUrgentRequestsCount} khẩn cấp</div>
        </div>

        <div className="kpi-card">
          <div className="flex-between">
            <span className="kpi-card-title">Work Order đang mở</span>
            <Calendar size={16} color="var(--info)" />
          </div>
          <div className="kpi-card-value">{kpi.activeWorkOrders}</div>
          <div className="kpi-card-footer" style={{ color: 'var(--warning)' }}>{kpi.lowStockItems} phụ tùng sắp hết</div>
        </div>

        <div className="kpi-card">
          <div className="flex-between">
            <span className="kpi-card-title">Tỷ lệ hoàn thành</span>
            <CheckCircle2 size={16} color="var(--success)" />
          </div>
          <div className="kpi-card-value">{completionRate}%</div>
          <div className="kpi-card-footer">{kpi.completedWorkOrders} đã hoàn thành</div>
        </div>
      </div>

      {/* Charts & Status Section */}
      <div className="grid-3 mb-4">
        {/* Yêu cầu theo trạng thái */}
        <div className="card">
          <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>Yêu cầu gần đây</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="flex-between" style={{ fontSize: '13px' }}>
              <span>Chờ phê duyệt</span>
              <span className="badge badge-warning">{recentRequests.filter((r: any) => r.status === 'PENDING').length}</span>
            </div>
            <div className="flex-between" style={{ fontSize: '13px' }}>
              <span>Đã phê duyệt</span>
              <span className="badge badge-info">{recentRequests.filter((r: any) => r.status === 'APPROVED').length}</span>
            </div>
            <div className="flex-between" style={{ fontSize: '13px' }}>
              <span>Từ chối / Hủy</span>
              <span className="badge badge-danger">{recentRequests.filter((r: any) => r.status === 'REJECTED' || r.status === 'CANCELLED').length}</span>
            </div>
            <div className="flex-between" style={{ fontSize: '13px' }}>
              <span>Yêu cầu sửa lại</span>
              <span className="badge badge-neutral">{recentRequests.filter((r: any) => r.status === 'RETURNED').length}</span>
            </div>
          </div>
        </div>

        {/* Tình trạng thiết bị */}
        <div className="card">
          <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>Tình trạng thiết bị</h4>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--success)', marginBottom: '12px' }}>
            {operationalRate}% <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>hoạt động</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
            <div className="flex-between"><span>Hoạt động:</span> <strong>{kpi.operationalEquipment}</strong></div>
            <div className="flex-between"><span>Đang bảo trì:</span> <strong style={{ color: 'var(--warning)' }}>{kpi.underMaintenanceEquipment}</strong></div>
            <div className="flex-between"><span>Gặp sự cố:</span> <strong style={{ color: 'var(--danger)' }}>{kpi.incidentEquipment}</strong></div>
            <div className="flex-between"><span>Ngoại tuyến:</span> <strong>{offlineEquipment}</strong></div>
          </div>
        </div>

        {/* Thông báo gần đây */}
        <div className="card">
          <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BellRing size={16} /> Thông báo gần đây
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
            {kpi.overdueIncidents4hCount > 0 && (
              <div style={{ borderLeft: '3px solid var(--danger)', paddingLeft: '8px', backgroundColor: 'rgba(239, 68, 68, 0.05)', padding: '6px' }}>
                <strong style={{ color: 'var(--danger)' }}>Cảnh báo sự cố quá hạn 4h!</strong>
                <div style={{ color: 'var(--text-primary)' }}>Có {kpi.overdueIncidents4hCount} sự cố khẩn cấp đã quá 4 giờ kể từ khi Operator báo cáo chưa hoàn thành xử lý.</div>
              </div>
            )}
            {urgentWorkOrders.length > 0 ? (
              <div style={{ borderLeft: '3px solid var(--danger)', paddingLeft: '8px' }}>
                <strong>Yêu cầu khẩn cấp!</strong>
                <div style={{ color: 'var(--text-secondary)' }}>{urgentWorkOrders[0].title} ({urgentWorkOrders[0].equipment?.name})</div>
              </div>
            ) : (
              <div style={{ borderLeft: '3px solid var(--success)', paddingLeft: '8px' }}>
                <strong>Hệ thống ổn định</strong>
                <div style={{ color: 'var(--text-secondary)' }}>Không có sự cố khẩn cấp nào chưa xử lý.</div>
              </div>
            )}
            {kpi.lowStockItems > 0 && (
              <div style={{ borderLeft: '3px solid var(--warning)', paddingLeft: '8px' }}>
                <strong>Cảnh báo kho</strong>
                <div style={{ color: 'var(--text-secondary)' }}>Có {kpi.lowStockItems} phụ tùng sắp hết hàng dưới mức an toàn!</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tables Section */}
      <div className="grid-2">
        <div className="card">
          <div className="flex-between mb-4">
            <h4 style={{ fontSize: '14px', fontWeight: 700 }}>Yêu cầu sửa chữa gần đây</h4>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/work-orders')}>Xem tất cả</button>
          </div>
          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Yêu cầu</th>
                  <th>Thiết bị</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {recentRequests.map((r: any) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.title}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.requestCode}</div>
                    </td>
                    <td>{r.equipment?.name || '---'}</td>
                    <td><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="flex-between mb-4">
            <h4 style={{ fontSize: '14px', fontWeight: 700 }}>Lịch bảo trì sắp tới</h4>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/maintenance')}>Xem tất cả</button>
          </div>
          <div className="table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Thiết bị</th>
                  <th>Công việc</th>
                  <th>Hạn bảo trì</th>
                </tr>
              </thead>
              <tbody>
                {urgentWorkOrders.map((w: any) => (
                  <tr key={w.id}>
                    <td style={{ fontWeight: 600 }}>{w.equipment?.name || 'Haas VF-2'}</td>
                    <td>{w.title}</td>
                    <td style={{ color: 'var(--warning)', fontWeight: 600 }}>2026-08-20</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
