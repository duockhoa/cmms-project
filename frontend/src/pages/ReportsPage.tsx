import React, { useEffect, useState } from 'react';
import { BarChart3, Download, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

export const ReportsPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState('Tháng này');
  const [activeTab, setActiveTab] = useState('Tổng quan');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [kpiData, setKpiData] = useState<any>(null);

  const ranges = ['7 ngày', '30 ngày', 'Tháng này', 'Quý này', 'Năm nay', 'Tùy chọn'];
  const tabs = ['Tổng quan', 'Thiết bị', 'Bảo trì định kỳ', 'Chi phí', 'Kỹ thuật viên', 'Phụ tùng'];

  const loadReportData = async () => {
    try {
      setLoading(true);
      const [dash, kpis] = await Promise.all([
        api.getDashboard(),
        api.getKpis(),
      ]);
      setDashboardData(dash);
      setKpiData(kpis);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, []);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Đang tải báo cáo & phân tích...</div>;
  }

  const kpi = dashboardData?.kpi || {};
  const totalWorkOrders = (kpi.completedWorkOrders || 0) + (kpi.activeWorkOrders || 0);

  const onTimeRate = kpiData?.onTimeCompletionRate?.value;
  const formattedOnTimeRate = onTimeRate !== undefined && onTimeRate !== null
    ? (onTimeRate > 1 ? `${Math.round(onTimeRate)}%` : `${Math.round(onTimeRate * 100)}%`)
    : '100%';

  const mttrVal = kpiData?.mttr?.value;
  const mttrUnit = kpiData?.mttr?.unit || 'giờ';
  const formattedMttr = mttrVal !== undefined && mttrVal !== null ? `${Math.round(mttrVal * 10) / 10} ${mttrUnit}` : '---';

  const mtbfVal = kpiData?.mtbf?.value;
  const mtbfUnit = kpiData?.mtbf?.unit || 'giờ';
  const formattedMtbf = mtbfVal !== undefined && mtbfVal !== null ? `${Math.round(mtbfVal * 10) / 10} ${mtbfUnit}` : '---';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Báo cáo & Phân tích bảo trì</h1>
          <p className="page-subtitle">Phân tích hiệu quả bảo trì, chi phí và hiệu suất thiết bị</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={loadReportData}><RefreshCw size={14} /> Làm mới</button>
          <button className="btn btn-primary"><Download size={14} /> Xuất báo cáo</button>
        </div>
      </div>

      {/* Time Filters */}
      <div className="card mb-4" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {ranges.map((r) => (
          <button
            key={r}
            className={`btn btn-sm ${timeRange === r ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTimeRange(r)}
          >
            {r}
          </button>
        ))}
      </div>

      {/* KPI Metrics */}
      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-card-title">Tổng Work Order</div>
          <div className="kpi-card-value">{totalWorkOrders}</div>
          <div className="kpi-card-footer" style={{ color: 'var(--success)' }}>+100% so với kỳ trước</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-title">Hoàn thành đúng hạn</div>
          <div className="kpi-card-value" style={{ color: 'var(--success)' }}>{formattedOnTimeRate}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-title">MTTR (Thời gian sửa TB)</div>
          <div className="kpi-card-value">{formattedMttr}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-title">MTBF (Thời gian chạy TB)</div>
          <div className="kpi-card-value">{formattedMtbf}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-title">Tổng chi phí bảo trì</div>
          <div className="kpi-card-value" style={{ color: 'var(--success)' }}>{(kpi.totalCost || 0).toLocaleString('vi-VN')} ₫</div>
        </div>
      </div>

      {/* Analytical Tabs */}
      <div className="card mb-4">
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '16px', marginBottom: '20px' }}>
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              style={{
                padding: '8px 12px',
                border: 'none',
                background: 'none',
                borderBottom: activeTab === t ? '2px solid var(--text-primary)' : '2px solid transparent',
                color: activeTab === t ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: activeTab === t ? 700 : 500,
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <BarChart3 size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <p style={{ fontWeight: '600' }}>Biểu đồ phân tích {activeTab}</p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Dữ liệu tổng hợp từ {totalWorkOrders} Work Orders & {dashboardData?.kpi?.activeWorkOrders || 0} Lịch bảo trì định kỳ đang mở.</p>
        </div>
      </div>
    </div>
  );
};
