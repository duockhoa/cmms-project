import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../components/common/Toast';
import { 
  Zap, Droplets, Cpu, QrCode, Plus, Search, Filter, 
  Download, RefreshCw, Clock, CheckCircle2, AlertTriangle, 
  ChevronRight, Calendar, Printer, BarChart3, Settings, ShieldAlert,
  FileText
} from 'lucide-react';

export const UtilitiesPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'readings' | 'statusLogs' | 'points'>('overview');
  const [loading, setLoading] = useState(true);

  // Dữ liệu từ Backend
  const [points, setPoints] = useState<any[]>([]);
  const [readings, setReadings] = useState<any[]>([]);
  const [statusLogs, setStatusLogs] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);

  // Bộ lọc cho Tab Sổ Ghi
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterShift, setFilterShift] = useState<string>('ALL');
  const [filterSearch, setFilterSearch] = useState<string>('');

  // Modal Thêm / Sửa Điểm Đo
  const [showPointModal, setShowPointModal] = useState(false);
  const [editingPoint, setEditingPoint] = useState<any | null>(null);
  const [pointForm, setPointForm] = useState({
    code: '',
    name: '',
    type: 'ELECTRICITY',
    location: '',
    tariffType: 'SINGLE',
    multiplier: 1,
    unit: 'kWh',
    description: '',
  });

  // Modal In Tem Mã QR
  const [printPoint, setPrintPoint] = useState<any | null>(null);

  // Tải dữ liệu
  const loadData = async () => {
    try {
      setLoading(true);
      const [pts, rds, stLogs, anl] = await Promise.all([
        api.getUtilityPoints(),
        api.getUtilityReadings({ limit: 100 }),
        api.getUtilityStatusLogs({ limit: 100 }),
        api.getUtilityAnalytics({ days: 7 }),
      ]);
      setPoints(Array.isArray(pts) ? pts : []);
      setReadings(rds?.items || (Array.isArray(rds) ? rds : []));
      setStatusLogs(stLogs?.items || (Array.isArray(stLogs) ? stLogs : []));
      setAnalytics(anl);
    } catch (error: any) {
      console.error('Lỗi khi tải dữ liệu tiện ích:', error);
      toast.error('Lỗi tải dữ liệu', 'Không thể kết nối đến máy chủ quản lý tiện ích.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Xử lý lưu điểm đo mới / sửa
  const handleSavePoint = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPoint) {
        await api.updateUtilityPoint(editingPoint.id, pointForm);
        toast.success('Thành công', 'Đã cập nhật thông tin điểm đo.');
      } else {
        await api.createUtilityPoint(pointForm);
        toast.success('Thành công', 'Đã thêm điểm đo tiện ích mới.');
      }
      setShowPointModal(false);
      setEditingPoint(null);
      loadData();
    } catch (error: any) {
      toast.error('Lỗi lưu điểm đo', error?.message || 'Có lỗi xảy ra khi lưu.');
    }
  };

  // Mở modal tạo mới
  const handleOpenCreateModal = () => {
    setEditingPoint(null);
    setPointForm({
      code: '',
      name: '',
      type: 'ELECTRICITY',
      location: '',
      tariffType: 'SINGLE',
      multiplier: 1,
      unit: 'kWh',
      description: '',
    });
    setShowPointModal(true);
  };

  // Mở modal chỉnh sửa
  const handleOpenEditModal = (point: any) => {
    setEditingPoint(point);
    setPointForm({
      code: point.code,
      name: point.name,
      type: point.type,
      location: point.location,
      tariffType: point.tariffType || 'SINGLE',
      multiplier: point.multiplier || 1,
      unit: point.unit,
      description: point.description || '',
    });
    setShowPointModal(true);
  };

  // Xóa điểm đo
  const handleDeletePoint = async (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa điểm đo "${name}"? Thao tác này không thể hoàn tác.`)) {
      return;
    }
    try {
      await api.deleteUtilityPoint(id);
      toast.success('Thành công', 'Đã xóa điểm đo.');
      loadData();
    } catch (error: any) {
      toast.error('Lỗi', error?.message || 'Không thể xóa điểm đo.');
    }
  };

  // Xuất file CSV cho tab Sổ Ghi
  const handleExportCSV = () => {
    if (readings.length === 0) {
      toast.info('Không có dữ liệu', 'Chưa có bản ghi nào để xuất file.');
      return;
    }

    const headers = ['Thời Gian', 'Mã Điểm', 'Tên Điểm Đo', 'Vị Trí', 'Loại', 'Ca', 'Chỉ Số Cũ', 'Chỉ Số Mới', 'Tiêu Thụ', 'Đơn Vị', 'Người Ghi', 'Ghi Chú'];
    const rows = filteredReadings.map((r) => [
      new Date(r.recordedAt).toLocaleString('vi-VN'),
      r.point?.code || '',
      `"${(r.point?.name || '').replace(/"/g, '""')}"`,
      `"${(r.point?.location || '').replace(/"/g, '""')}"`,
      r.point?.type || '',
      r.shift || '',
      r.previousValue,
      r.readingValue,
      r.consumption,
      r.point?.unit || '',
      `"${(r.recordedByName || '').replace(/"/g, '""')}"`,
      `"${(r.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `So_Ghi_Dien_Nuoc_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Dữ liệu lọc cho Tab Readings
  const filteredReadings = useMemo(() => {
    return readings.filter((r) => {
      if (filterType !== 'ALL' && r.point?.type !== filterType) return false;
      if (filterShift !== 'ALL' && r.shift !== filterShift) return false;
      if (filterSearch.trim()) {
        const q = filterSearch.toLowerCase();
        const matchCode = r.point?.code?.toLowerCase().includes(q);
        const matchName = r.point?.name?.toLowerCase().includes(q);
        const matchLoc = r.point?.location?.toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchLoc) return false;
      }
      return true;
    });
  }, [readings, filterType, filterShift, filterSearch]);

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* 1. Header Trang & Nút Quét QR */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 6px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Zap size={26} color="#eab308" />
            <span>QUẢN LÝ TIỆN ÍCH & NĂNG LƯỢNG NHÀ MÁY</span>
          </h1>
          <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0 }}>
            Theo dõi chỉ số Điện, Nước và Giám sát trạng thái Bật/Tắt các hệ thống phụ trợ (HVAC, Chiller, Nồi hơi, Máy nén khí).
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Nút Quét QR Lớn Nổi Bật cho Nhân Viên Trực Ca */}
          <button
            onClick={() => navigate('/utilities/scan')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 18px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
              transition: 'background-color 0.15s ease',
            }}
          >
            <QrCode size={18} />
            <span>QUÉT MÃ QR CA TRỰC</span>
          </button>

          <button
            onClick={loadData}
            title="Làm mới dữ liệu"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              cursor: 'pointer',
              color: '#475569',
            }}
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* 2. Thanh Tabs Điều Hướng */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '20px',
          overflowX: 'auto',
        }}
      >
        {[
          { key: 'overview', label: 'Tổng Quan & Giám Sát', icon: BarChart3 },
          { key: 'readings', label: `Sổ Ghi Điện & Nước (${readings.length})`, icon: FileText },
          { key: 'statusLogs', label: `Lịch Sử Bật / Tắt (${statusLogs.length})`, icon: Cpu },
          { key: 'points', label: `Danh Mục Điểm Đo & Tem QR (${points.length})`, icon: Settings },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                border: 'none',
                background: 'none',
                borderBottom: isActive ? '3px solid #2563eb' : '3px solid transparent',
                color: isActive ? '#2563eb' : '#64748b',
                fontWeight: isActive ? 700 : 500,
                fontSize: '14px',
                cursor: 'pointer',
                marginBottom: '-2px',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={17} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. NỘI DUNG THEO TAB */}

      {/* TAB 1: TỔNG QUAN & GIÁM SÁT */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            {/* Card 1: Điện hôm nay */}
            <div className="card" style={{ padding: '18px 20px', borderRadius: '12px', backgroundColor: '#ffffff', borderLeft: '4px solid #eab308' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>ĐIỆN TIÊU THỤ HÔM NAY</span>
                <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#fef9c3', color: '#854d0e' }}>
                  <Zap size={20} />
                </div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
                {analytics?.summary?.electricityToday?.toLocaleString() || 0} <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>kWh</span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                7 ngày qua: <strong>{analytics?.summary?.electricityPeriod?.toLocaleString() || 0} kWh</strong>
              </div>
            </div>

            {/* Card 2: Nước hôm nay */}
            <div className="card" style={{ padding: '18px 20px', borderRadius: '12px', backgroundColor: '#ffffff', borderLeft: '4px solid #0ea5e9' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>NƯỚC TIÊU THỤ HÔM NAY</span>
                <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#e0f2fe', color: '#0369a1' }}>
                  <Droplets size={20} />
                </div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
                {analytics?.summary?.waterToday?.toLocaleString() || 0} <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>m³</span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                7 ngày qua: <strong>{analytics?.summary?.waterPeriod?.toLocaleString() || 0} m³</strong>
              </div>
            </div>

            {/* Card 3: Hệ thống đang vận hành */}
            <div className="card" style={{ padding: '18px 20px', borderRadius: '12px', backgroundColor: '#ffffff', borderLeft: '4px solid #16a34a' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>HỆ THỐNG PHỤ TRỢ ĐANG CHẠY</span>
                <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                  <Cpu size={20} />
                </div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#16a34a' }}>
                {analytics?.systemStatusCounts?.RUNNING || 0} / {analytics?.systemStatusCounts?.TOTAL || 0}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Tắt: {analytics?.systemStatusCounts?.OFF || 0} • Chờ: {analytics?.systemStatusCounts?.STANDBY || 0} • Sự cố: {analytics?.systemStatusCounts?.FAULT || 0}
              </div>
            </div>

            {/* Card 4: Tổng điểm đo */}
            <div className="card" style={{ padding: '18px 20px', borderRadius: '12px', backgroundColor: '#ffffff', borderLeft: '4px solid #8b5cf6' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>ĐIỂM ĐO & HỆ THỐNG</span>
                <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: '#f3e8ff', color: '#6b21a8' }}>
                  <QrCode size={20} />
                </div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
                {points.length} <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Điểm</span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Điện: {analytics?.metersCount?.electricity || 0} • Nước: {analytics?.metersCount?.water || 0} • Phụ trợ: {analytics?.metersCount?.aux || 0}
              </div>
            </div>
          </div>

          {/* Ma trận Trạng thái Hệ thống Phụ trợ Thời gian thực */}
          <div className="card" style={{ padding: '20px', borderRadius: '12px', backgroundColor: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Cpu size={20} color="#2563eb" />
                <span>GIÁM SÁT TRẠNG THÁI HỆ THỐNG PHỤ TRỢ NHÀ MÁY (REAL-TIME)</span>
              </h3>
              <button
                onClick={() => navigate('/utilities/scan')}
                style={{
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#2563eb',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>Cập nhật trạng thái bằng QR</span>
                <ChevronRight size={14} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              {(analytics?.auxSystems || []).map((sys: any) => {
                const isRunning = sys.status === 'RUNNING';
                const isFault = sys.status === 'FAULT';
                const isStandby = sys.status === 'STANDBY';

                const statusColor = isRunning ? '#16a34a' : isFault ? '#dc2626' : isStandby ? '#ea580c' : '#64748b';
                const statusBg = isRunning ? '#f0fdf4' : isFault ? '#fef2f2' : isStandby ? '#fff7ed' : '#f8fafc';

                return (
                  <div
                    key={sys.id}
                    style={{
                      padding: '16px',
                      borderRadius: '10px',
                      border: `1px solid ${isRunning ? '#bbf7d0' : '#e2e8f0'}`,
                      backgroundColor: '#ffffff',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>{sys.code}</span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backgroundColor: statusBg,
                          color: statusColor,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: statusColor }} />
                        {sys.status}
                      </span>
                    </div>

                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                      {sys.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
                      Vị trí: {sys.location}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                      <span style={{ color: '#64748b' }}>Số giờ chạy tích lũy:</span>
                      <strong style={{ color: '#0f172a' }}>{sys.lastRunningHours ? `${sys.lastRunningHours.toLocaleString()} Giờ` : 'Chưa ghi nhận'}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Biểu đồ Xu hướng Tiêu thụ 7 ngày gần nhất */}
          {analytics?.dailyTrends && (
            <div className="card" style={{ padding: '20px', borderRadius: '12px', backgroundColor: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart3 size={20} color="#eab308" />
                <span>BIỂU ĐỒ XU HƯỚNG TIÊU THỤ 7 NGÀY GẦN NHẤT</span>
              </h3>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '10px 14px' }}>Ngày</th>
                      <th style={{ padding: '10px 14px' }}>Điện Tiêu Thụ (kWh)</th>
                      <th style={{ padding: '10px 14px' }}>Thanh Biểu Đồ Điện</th>
                      <th style={{ padding: '10px 14px' }}>Nước Tiêu Thụ (m³)</th>
                      <th style={{ padding: '10px 14px' }}>Thanh Biểu Đồ Nước</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.dailyTrends.map((d: any) => {
                      const maxElec = Math.max(...analytics.dailyTrends.map((t: any) => t.electricity), 100);
                      const maxWater = Math.max(...analytics.dailyTrends.map((t: any) => t.water), 10);
                      const elecPercent = Math.min(100, Math.round((d.electricity / maxElec) * 100));
                      const waterPercent = Math.min(100, Math.round((d.water / maxWater) * 100));

                      return (
                        <tr key={d.date} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a' }}>{d.date}</td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: '#854d0e' }}>
                            {d.electricity.toLocaleString()} kWh
                          </td>
                          <td style={{ padding: '10px 14px', width: '220px' }}>
                            <div style={{ width: '100%', backgroundColor: '#f1f5f9', borderRadius: '4px', height: '12px', overflow: 'hidden' }}>
                              <div style={{ width: `${elecPercent}%`, backgroundColor: '#eab308', height: '100%' }} />
                            </div>
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0369a1' }}>
                            {d.water.toLocaleString()} m³
                          </td>
                          <td style={{ padding: '10px 14px', width: '220px' }}>
                            <div style={{ width: '100%', backgroundColor: '#f1f5f9', borderRadius: '4px', height: '12px', overflow: 'hidden' }}>
                              <div style={{ width: `${waterPercent}%`, backgroundColor: '#0ea5e9', height: '100%' }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SỔ GHI CHỈ SỐ ĐIỆN & NƯỚC */}
      {activeTab === 'readings' && (
        <div className="card" style={{ padding: '20px', borderRadius: '12px', backgroundColor: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          {/* Thanh công cụ lọc */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
              {/* Tìm kiếm */}
              <div style={{ position: 'relative', minWidth: '220px' }}>
                <input
                  type="text"
                  placeholder="Tìm mã hoặc tên điểm đo..."
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>

              {/* Lọc loại */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#ffffff' }}
              >
                <option value="ALL">Tất cả Tiện ích</option>
                <option value="ELECTRICITY">Chỉ xem Điện</option>
                <option value="WATER">Chỉ xem Nước</option>
              </select>

              {/* Lọc ca */}
              <select
                value={filterShift}
                onChange={(e) => setFilterShift(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#ffffff' }}
              >
                <option value="ALL">Tất cả Ca trực</option>
                <option value="Ca 1">Ca 1</option>
                <option value="Ca 2">Ca 2</option>
                <option value="Ca 3">Ca 3</option>
              </select>
            </div>

            {/* Nút Xuất Excel */}
            <button
              onClick={handleExportCSV}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                backgroundColor: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#0f172a',
                cursor: 'pointer',
              }}
            >
              <Download size={16} />
              <span>Xuất Excel / CSV</span>
            </button>
          </div>

          {/* Bảng Dữ liệu */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '10px 12px' }}>Thời Gian</th>
                  <th style={{ padding: '10px 12px' }}>Mã & Điểm Đo</th>
                  <th style={{ padding: '10px 12px' }}>Vị Trí</th>
                  <th style={{ padding: '10px 12px' }}>Ca</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Chỉ Số Cũ</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Chỉ Số Mới</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Tiêu Thụ (Δ)</th>
                  <th style={{ padding: '10px 12px' }}>Người Ghi</th>
                  <th style={{ padding: '10px 12px' }}>Ghi Chú</th>
                </tr>
              </thead>
              <tbody>
                {filteredReadings.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                      Chưa có bản ghi nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredReadings.map((r) => {
                    const isElec = r.point?.type === 'ELECTRICITY';
                    return (
                      <tr key={r.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '10px 12px', color: '#64748b', fontSize: '12px' }}>
                          {new Date(r.recordedAt).toLocaleString('vi-VN')}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {isElec ? <Zap size={14} color="#eab308" /> : <Droplets size={14} color="#0ea5e9" />}
                            <span>{r.point?.name}</span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{r.point?.code}</div>
                        </td>
                        <td style={{ padding: '10px 12px', color: '#475569' }}>{r.point?.location}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ fontSize: '11.5px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#f1f5f9' }}>
                            {r.shift || 'Ca Ngày'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b' }}>
                          {r.previousValue?.toLocaleString()}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                          {r.readingValue?.toLocaleString()}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, color: isElec ? '#854d0e' : '#0369a1' }}>
                          +{r.consumption?.toLocaleString()} {r.point?.unit}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#334155' }}>{r.recordedByName || 'KTV'}</td>
                        <td style={{ padding: '10px 12px', color: '#64748b', fontSize: '12px' }}>{r.notes || '-'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: LỊCH SỬ BẬT / TẮT HỆ THỐNG */}
      {activeTab === 'statusLogs' && (
        <div className="card" style={{ padding: '20px', borderRadius: '12px', backgroundColor: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Cpu size={20} color="#8b5cf6" />
            <span>NHẬT KÝ THEO DÕI BẬT / TẮT & GIỜ CHẠY MÁY PHỤ TRỢ</span>
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '10px 12px' }}>Thời Gian</th>
                  <th style={{ padding: '10px 12px' }}>Hệ Thống Phụ Trợ</th>
                  <th style={{ padding: '10px 12px' }}>Vị Trí</th>
                  <th style={{ padding: '10px 12px' }}>Trạng Thái Mới</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Số Giờ Chạy (Hour Meter)</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Giờ Chạy Tăng Thêm</th>
                  <th style={{ padding: '10px 12px' }}>Lý Do / Mô Tả</th>
                  <th style={{ padding: '10px 12px' }}>Người Thực Hiện</th>
                </tr>
              </thead>
              <tbody>
                {statusLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                      Chưa có nhật ký bật/tắt nào được ghi nhận.
                    </td>
                  </tr>
                ) : (
                  statusLogs.map((log) => {
                    const isRunning = log.status === 'RUNNING';
                    const isFault = log.status === 'FAULT';
                    const isStandby = log.status === 'STANDBY';
                    const color = isRunning ? '#16a34a' : isFault ? '#dc2626' : isStandby ? '#ea580c' : '#64748b';
                    const bg = isRunning ? '#f0fdf4' : isFault ? '#fef2f2' : isStandby ? '#fff7ed' : '#f8fafc';

                    return (
                      <tr key={log.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '10px 12px', color: '#64748b', fontSize: '12px' }}>
                          {new Date(log.recordedAt).toLocaleString('vi-VN')}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{log.point?.name}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{log.point?.code}</div>
                        </td>
                        <td style={{ padding: '10px 12px', color: '#475569' }}>{log.point?.location}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ fontSize: '11.5px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', backgroundColor: bg, color }}>
                            {log.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                          {log.runningHours ? `${log.runningHours.toLocaleString()} h` : '-'}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#16a34a', fontWeight: 700 }}>
                          {log.runningDelta ? `+${log.runningDelta.toLocaleString()} h` : '-'}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#64748b', fontSize: '12px' }}>{log.reason || '-'}</td>
                        <td style={{ padding: '10px 12px', color: '#334155' }}>{log.recordedByName || 'KTV'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: QUẢN LÝ ĐIỂM ĐO & IN TEM MÃ QR */}
      {activeTab === 'points' && (
        <div className="card" style={{ padding: '20px', borderRadius: '12px', backgroundColor: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              DANH SÁCH ĐỒNG HỒ & HỆ THỐNG TIỆN ÍCH
            </h3>
            <button
              onClick={handleOpenCreateModal}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                backgroundColor: '#0f172a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Plus size={16} />
              <span>Thêm Điểm Đo Mới</span>
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '10px 12px' }}>Mã Điểm</th>
                  <th style={{ padding: '10px 12px' }}>Tên Đồng Hồ / Hệ Thống</th>
                  <th style={{ padding: '10px 12px' }}>Loại Tiện Ích</th>
                  <th style={{ padding: '10px 12px' }}>Vị Trí Đặt</th>
                  <th style={{ padding: '10px 12px' }}>Hệ Số Nhân (CT)</th>
                  <th style={{ padding: '10px 12px' }}>Đơn Vị</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Chỉ Số Gần Nhất</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {points.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0f172a' }}>{p.code}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>{p.name}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: p.type === 'ELECTRICITY' ? '#fef9c3' : p.type === 'WATER' ? '#e0f2fe' : '#f3e8ff',
                          color: p.type === 'ELECTRICITY' ? '#854d0e' : p.type === 'WATER' ? '#0369a1' : '#6b21a8',
                        }}
                      >
                        {p.type === 'ELECTRICITY' ? 'ĐIỆN' : p.type === 'WATER' ? 'NƯỚC' : 'PHỤ TRỢ'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#475569' }}>{p.location}</td>
                    <td style={{ padding: '10px 12px', color: '#334155' }}>
                      {p.multiplier > 1 ? `x${p.multiplier}` : '1.0'}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#64748b' }}>{p.unit}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                      {p.lastReadingValue ? p.lastReadingValue.toLocaleString() : 0}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        {/* Nút In Tem QR */}
                        <button
                          onClick={() => setPrintPoint(p)}
                          title="In tem mã QR"
                          style={{
                            padding: '6px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#ffffff',
                            cursor: 'pointer',
                            color: '#2563eb',
                          }}
                        >
                          <Printer size={15} />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(p)}
                          title="Chỉnh sửa"
                          style={{
                            padding: '6px 10px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#ffffff',
                            cursor: 'pointer',
                            fontSize: '12px',
                            color: '#475569',
                          }}
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDeletePoint(p.id, p.name)}
                          title="Xóa"
                          style={{
                            padding: '6px 10px',
                            borderRadius: '4px',
                            border: '1px solid #fecaca',
                            backgroundColor: '#fef2f2',
                            cursor: 'pointer',
                            fontSize: '12px',
                            color: '#dc2626',
                          }}
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: THÊM / SỬA ĐIỂM ĐO */}
      {showPointModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: '520px', backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 16px 0', color: '#0f172a' }}>
              {editingPoint ? 'CHỈNH SỬA ĐIỂM ĐO TIỆN ÍCH' : 'THÊM ĐIỂM ĐO TIỆN ÍCH MỚI'}
            </h3>

            <form onSubmit={handleSavePoint} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Mã định danh (In trên tem QR) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: ELEC-MSB-01, WATER-MAIN, SYS-CHILLER-01"
                  value={pointForm.code}
                  onChange={(e) => setPointForm({ ...pointForm, code: e.target.value.toUpperCase() })}
                  disabled={Boolean(editingPoint)}
                  style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Tên điểm đo / Hệ thống <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Tủ điện tổng Trạm biến áp MSB-01"
                  value={pointForm.name}
                  onChange={(e) => setPointForm({ ...pointForm, name: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Loại tiện ích
                  </label>
                  <select
                    value={pointForm.type}
                    onChange={(e) => {
                      const t = e.target.value;
                      setPointForm({
                        ...pointForm,
                        type: t,
                        unit: t === 'ELECTRICITY' ? 'kWh' : t === 'WATER' ? 'm3' : 'Giờ',
                      });
                    }}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="ELECTRICITY">Điện (Electricity)</option>
                    <option value="WATER">Nước (Water)</option>
                    <option value="SYSTEM_AUX">Hệ thống Phụ trợ (Auxiliary)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Vị trí đặt
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Trạm biến áp ngoài trời"
                    value={pointForm.location}
                    onChange={(e) => setPointForm({ ...pointForm, location: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Hệ số nhân (CT Ratio)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={pointForm.multiplier}
                    onChange={(e) => setPointForm({ ...pointForm, multiplier: parseFloat(e.target.value) || 1 })}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Đơn vị đo
                  </label>
                  <input
                    type="text"
                    value={pointForm.unit}
                    onChange={(e) => setPointForm({ ...pointForm, unit: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Ghi chú mô tả
                </label>
                <textarea
                  rows={2}
                  value={pointForm.description}
                  onChange={(e) => setPointForm({ ...pointForm, description: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowPointModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: 'pointer', fontSize: '13px' }}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', backgroundColor: '#0f172a', color: '#ffffff', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}
                >
                  {editingPoint ? 'Cập Nhật' : 'Lưu Điểm Đo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PREVIEW IN TEM MÃ QR */}
      {printPoint && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: '420px', backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 16px 0', color: '#0f172a' }}>
              IN TEM MÃ QR DÁN ĐỒNG HỒ / TỦ ĐIỆN
            </h3>

            {/* Khung Tem QR chuẩn in */}
            <div
              id="printable-utility-qr-tag"
              style={{
                border: '2px solid #0f172a',
                borderRadius: '8px',
                padding: '16px',
                backgroundColor: '#ffffff',
                margin: '0 auto 20px',
                width: '260px',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#b91c1c', letterSpacing: '1px', marginBottom: '4px' }}>
                DK PHARMA CMMS
              </div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                {printPoint.name}
              </div>

              {/* QR Code Image thông qua Google Chart API hoặc QR server */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(printPoint.code)}`}
                alt={`QR ${printPoint.code}`}
                style={{ width: '140px', height: '140px', margin: '0 auto 8px auto', display: 'block' }}
              />

              <div style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '0.5px', color: '#0f172a' }}>
                {printPoint.code}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>{printPoint.location}</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <button
                onClick={() => setPrintPoint(null)}
                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: 'pointer', fontSize: '13px' }}
              >
                Đóng
              </button>
              <button
                onClick={() => window.print()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                <Printer size={16} />
                <span>In Tem Ngay</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
