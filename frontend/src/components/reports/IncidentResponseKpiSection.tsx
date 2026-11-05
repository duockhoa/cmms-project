import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, AlertTriangle, ShieldAlert, Building2, Wrench, RefreshCw, Download } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../common/Toast';

export const IncidentResponseKpiSection: React.FC = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [supportDept, setSupportDept] = useState('');

  const loadKpiData = async () => {
    setLoading(true);
    try {
      const res = await api.getIncidentResponseKpiReport({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        supportDepartment: supportDept || undefined,
      });
      setData(res);
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi khi tải báo cáo KPI phản hồi sự cố');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKpiData();
  }, [startDate, endDate, supportDept]);

  const overall = data?.overall || {
    totalIncidents: 0,
    respondedWithin4hCount: 0,
    overdueResponseCount: 0,
    responseRateWithin4h: 100,
    averageResponseHours: 0,
    targetRate: 95,
    status: 'EXCELLENT',
  };

  const getStatusBadge = (rate: number, target: number = 95) => {
    if (rate >= 98) {
      return <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, backgroundColor: '#dcfce7', color: '#15803d' }}>Xuất sắc (≥98%)</span>;
    }
    if (rate >= target) {
      return <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, backgroundColor: '#dbeafe', color: '#1d4ed8' }}>Đạt chỉ tiêu (≥95%)</span>;
    }
    if (rate >= 90) {
      return <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, backgroundColor: '#fef3c7', color: '#b45309' }}>Cảnh báo (90-95%)</span>;
    }
    return <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, backgroundColor: '#fee2e2', color: '#b91c1c' }}>Không đạt (&lt;90%)</span>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Bộ lọc */}
      <div className="card" style={{ padding: '18px 22px', borderRadius: '12px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              🎯 KPI Phản hồi sự cố thiết bị trong 4 giờ
            </h3>
            <p style={{ fontSize: '12.5px', color: '#64748b', margin: '3px 0 0 0' }}>
              Đo lường thời gian từ lúc xưởng gửi yêu cầu đến khi KTV có mặt điền Form đánh giá sơ bộ (Mục tiêu: ≥ 95%)
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadKpiData}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 600 }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Làm mới
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Từ ngày
            </label>
            <input
              type="date"
              className="form-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ width: '100%', fontSize: '12.5px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Đến ngày
            </label>
            <input
              type="date"
              className="form-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ width: '100%', fontSize: '12.5px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Bộ phận hỗ trợ
            </label>
            <select
              className="form-input"
              value={supportDept}
              onChange={(e) => setSupportDept(e.target.value)}
              style={{ width: '100%', fontSize: '12.5px' }}
            >
              <option value="">Tất cả bộ phận hỗ trợ</option>
              <option value="Cơ điện">Xưởng Cơ điện</option>
              <option value="Bảo trì">Tổ Bảo trì</option>
              <option value="Kỹ thuật">Phòng Kỹ thuật</option>
              <option value="Tiện ích">Bộ phận Tiện ích</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {/* Tỉ lệ KPI % */}
        <div className="card" style={{ padding: '18px 20px', borderRadius: '12px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>Tỉ lệ phản hồi ≤ 4h (Chấm KPI)</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: overall.responseRateWithin4h >= 95 ? '#15803d' : '#dc2626', margin: '4px 0' }}>
            {overall.responseRateWithin4h}%
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {getStatusBadge(overall.responseRateWithin4h)}
          </div>
        </div>

        {/* Tổng sự cố */}
        <div className="card" style={{ padding: '18px 20px', borderRadius: '12px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>Tổng sự cố phát sinh</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
            {overall.totalIncidents}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Trong khoảng thời gian chọn
          </div>
        </div>

        {/* Phản hồi đúng hạn */}
        <div className="card" style={{ padding: '18px 20px', borderRadius: '12px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>Phản hồi đúng hạn (≤ 4h)</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#15803d', margin: '4px 0' }}>
            {overall.respondedWithin4hCount}
          </div>
          <div style={{ fontSize: '12px', color: '#15803d', fontWeight: 600 }}>
            {overall.totalIncidents > 0 ? Math.round((overall.respondedWithin4hCount / overall.totalIncidents) * 100) : 100}% tổng sự cố
          </div>
        </div>

        {/* Trễ hạn / Quá 4h */}
        <div className="card" style={{ padding: '18px 20px', borderRadius: '12px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>Trễ hạn (&gt; 4h)</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#dc2626', margin: '4px 0' }}>
            {overall.overdueResponseCount}
          </div>
          <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>
            Cần giải trình trừ điểm KPI
          </div>
        </div>

        {/* Thời gian TB */}
        <div className="card" style={{ padding: '18px 20px', borderRadius: '12px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>Thời gian phản hồi TB</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0284c7', margin: '4px 0' }}>
            {overall.averageResponseHours}h
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Kể từ lúc xưởng gửi yêu cầu
          </div>
        </div>
      </div>

      {/* Bảng chấm điểm KPI theo Bộ phận hỗ trợ */}
      <div className="card" style={{ padding: '20px 24px', borderRadius: '12px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
        <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
          📋 Bảng chấm điểm KPI theo Bộ phận hỗ trợ
        </h4>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', color: '#0f172a' }}>
                <th style={{ textAlign: 'left' }}>Bộ phận hỗ trợ</th>
                <th style={{ textAlign: 'center' }}>Tổng sự cố</th>
                <th style={{ textAlign: 'center' }}>Đúng hạn (≤4h)</th>
                <th style={{ textAlign: 'center' }}>Trễ hạn (&gt;4h)</th>
                <th style={{ textAlign: 'center' }}>Tỉ lệ đúng hạn (%)</th>
                <th style={{ textAlign: 'center' }}>TG phản hồi TB</th>
                <th style={{ textAlign: 'center' }}>Đánh giá KPI (≥95%)</th>
              </tr>
            </thead>
            <tbody>
              {data?.bySupportDepartment?.length > 0 ? (
                data.bySupportDepartment.map((dept: any) => (
                  <tr key={dept.department}>
                    <td style={{ fontWeight: 700, color: '#1e293b' }}>{dept.department}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{dept.totalIncidents}</td>
                    <td style={{ textAlign: 'center', color: '#15803d', fontWeight: 700 }}>{dept.respondedWithin4hCount}</td>
                    <td style={{ textAlign: 'center', color: dept.overdueResponseCount > 0 ? '#dc2626' : '#64748b', fontWeight: 700 }}>
                      {dept.overdueResponseCount}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <strong style={{ fontSize: '14px', color: dept.responseRateWithin4h >= 95 ? '#15803d' : '#dc2626' }}>
                        {dept.responseRateWithin4h}%
                      </strong>
                    </td>
                    <td style={{ textAlign: 'center' }}>{dept.averageResponseHours} giờ</td>
                    <td style={{ textAlign: 'center' }}>
                      {getStatusBadge(dept.responseRateWithin4h)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
                    Chưa có dữ liệu sự cố trong khoảng thời gian này
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Danh sách sự cố trễ hạn > 4h */}
      {data?.overdueIncidents?.length > 0 && (
        <div className="card" style={{ padding: '20px 24px', borderRadius: '12px', backgroundColor: '#ffffff', border: '1px solid #fee2e2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <AlertTriangle size={18} color="#dc2626" />
            <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#991b1b', margin: 0 }}>
              ⚠️ Danh sách sự cố trễ hạn phản hồi (&gt; 4 giờ) — Cần đối soát giải trình
            </h4>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ backgroundColor: '#fef2f2', color: '#991b1b' }}>
                  <th>Mã sự cố</th>
                  <th>Thiết bị</th>
                  <th>Xưởng báo</th>
                  <th>Bộ phận hỗ trợ</th>
                  <th>Thời điểm báo</th>
                  <th>Thời gian chờ</th>
                  <th>Hiện trạng / Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {data.overdueIncidents.map((inc: any) => (
                  <tr key={inc.requestId}>
                    <td style={{ fontWeight: 700, color: '#2563eb' }}>{inc.requestCode}</td>
                    <td>
                      <strong>{inc.equipmentCode}</strong> - {inc.equipmentName}
                    </td>
                    <td>{inc.workshop}</td>
                    <td><strong>{inc.supportDepartment}</strong></td>
                    <td>{new Date(inc.requestCreatedAt).toLocaleString('vi-VN')}</td>
                    <td style={{ color: '#dc2626', fontWeight: 800 }}>{inc.hoursWaited} giờ</td>
                    <td>
                      <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '11px', backgroundColor: '#fee2e2', color: '#991b1b', fontWeight: 600 }}>
                        {inc.status}
                      </span>
                    </td>
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

