import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast, useConfirmDialog } from '../components/common/Toast';
import { 
  Zap, Droplets, Cpu, QrCode, BarChart3, 
  RefreshCw, Plus, Edit2, Trash2, 
  Printer, Download, Search, CheckCircle2, 
  Clock, Settings, FileText, ArrowRight
} from 'lucide-react';

export const UtilitiesPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { confirm } = useConfirmDialog();

  const [activeTab, setActiveTab] = useState<'overview' | 'readings' | 'statusLogs' | 'points'>('overview');
  const [loading, setLoading] = useState(false);

  // Dữ liệu chính
  const [points, setPoints] = useState<any[]>([]);
  const [readings, setReadings] = useState<any[]>([]);
  const [statusLogs, setStatusLogs] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);

  // Bộ lọc
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterSearch, setFilterSearch] = useState<string>('');

  // Modal State cho Thêm/Sửa Điểm đo
  const [showPointModal, setShowPointModal] = useState(false);
  const [editingPoint, setEditingPoint] = useState<any | null>(null);
  const [pointForm, setPointForm] = useState({
    code: '',
    name: '',
    type: 'ELECTRICITY',
    location: '',
    tariffType: 'SINGLE',
    multiplier: 1.0,
    unit: 'kWh',
    description: '',
  });

  // Modal Xem & In mã QR
  const [printPoint, setPrintPoint] = useState<any | null>(null);

  // Tải toàn bộ dữ liệu tiện ích
  const loadData = async () => {
    setLoading(true);
    try {
      const [pointsRes, readingsRes, logsRes, analyticsRes] = await Promise.all([
        api.getUtilityPoints(),
        api.getUtilityReadings({ limit: 100 }),
        api.getUtilityStatusLogs({ limit: 100 }),
        api.getUtilityAnalytics({ days: 7 }),
      ]);

      setPoints(Array.isArray(pointsRes) ? pointsRes : []);
      setReadings(Array.isArray(readingsRes) ? readingsRes : []);
      setStatusLogs(Array.isArray(logsRes) ? logsRes : []);
      setAnalytics(analyticsRes || null);
    } catch (err: any) {
      console.error('Lỗi khi tải dữ liệu tiện ích:', err);
      toast.error('Lỗi tải dữ liệu', err?.message || 'Không thể tải dữ liệu tiện ích.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Mở modal thêm điểm đo
  const handleOpenAddPoint = () => {
    setEditingPoint(null);
    setPointForm({
      code: `ELEC-DB-${Math.floor(10 + Math.random() * 90)}`,
      name: '',
      type: 'ELECTRICITY',
      location: '',
      tariffType: 'SINGLE',
      multiplier: 1.0,
      unit: 'kWh',
      description: '',
    });
    setShowPointModal(true);
  };

  // Mở modal sửa điểm đo
  const handleOpenEditPoint = (point: any) => {
    setEditingPoint(point);
    setPointForm({
      code: point.code,
      name: point.name,
      type: point.type,
      location: point.location,
      tariffType: point.tariffType || 'SINGLE',
      multiplier: point.multiplier || 1.0,
      unit: point.unit || 'kWh',
      description: point.description || '',
    });
    setShowPointModal(true);
  };

  // Lưu điểm đo (Thêm hoặc Sửa)
  const handleSavePoint = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPoint) {
        await api.updateUtilityPoint(editingPoint.id, pointForm);
        toast.success('Thành công', 'Đã cập nhật thông tin điểm đo.');
      } else {
        await api.createUtilityPoint(pointForm);
        toast.success('Thành công', 'Đã thêm mới điểm đo/hệ thống tiện ích.');
      }
      setShowPointModal(false);
      loadData();
    } catch (err: any) {
      toast.error('Lỗi lưu điểm đo', err?.message || 'Không thể lưu điểm đo.');
    }
  };

  // Xóa điểm đo
  const handleDeletePoint = async (point: any) => {
    const ok = await confirm(
      'Xóa điểm đo',
      `Bạn có chắc muốn xóa điểm đo [${point.code} - ${point.name}]? Tất cả dữ liệu lịch sử đo liên quan sẽ bị xóa!`,
      { type: 'danger' }
    );
    if (!ok) return;

    try {
      await api.deleteUtilityPoint(point.id);
      toast.success('Đã xóa', `Đã xóa điểm đo [${point.code}].`);
      loadData();
    } catch (err: any) {
      toast.error('Lỗi xóa điểm đo', err?.message || 'Không thể xóa điểm đo.');
    }
  };

  // Đổi trạng thái nhanh của Hệ thống phụ trợ
  const handleQuickToggleStatus = async (point: any, nextStatus: string) => {
    try {
      await api.recordUtilitySystemStatus({
        pointId: point.id,
        status: nextStatus as any,
        reason: `Chuyển trạng thái nhanh trên Dashboard sang ${nextStatus}`,
      });
      toast.success('Thành công', `Đã cập nhật trạng thái ${point.name} thành [${nextStatus}].`);
      loadData();
    } catch (err: any) {
      toast.error('Lỗi cập nhật', err?.message || 'Không thể đổi trạng thái.');
    }
  };

  // Xuất file CSV danh sách ghi số
  const handleExportReadingsCSV = () => {
    if (readings.length === 0) {
      toast.warning('Chưa có dữ liệu', 'Không có bản ghi nào để xuất file.');
      return;
    }

    const headers = [
      'Thời gian ghi',
      'Mã điểm đo',
      'Tên điểm đo',
      'Vị trí',
      'Loại tiện ích',
      'Chỉ số trước',
      'Chỉ số mới',
      'Sản lượng tiêu thụ',
      'Đơn vị',
      'Người ghi',
      'Ghi chú',
    ];

    const rows = filteredReadings.map((r) => [
      new Date(r.recordedAt).toLocaleString('vi-VN'),
      `"${r.point?.code || ''}"`,
      `"${r.point?.name || ''}"`,
      `"${r.point?.location || ''}"`,
      r.point?.type === 'ELECTRICITY' ? 'Điện' : 'Nước',
      r.previousValue,
      r.readingValue,
      r.consumptionDelta,
      r.point?.unit || '',
      `"${r.recordedBy?.name || ''}"`,
      `"${(r.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `So_ghi_dien_nuoc_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Xuất file thành công', 'Đã tải xuống file CSV danh sách ghi chỉ số.');
  };

  // Danh sách ghi số đã lọc
  const filteredReadings = useMemo(() => {
    return readings.filter((r) => {
      if (filterType !== 'ALL' && r.point?.type !== filterType) return false;
      if (filterSearch.trim()) {
        const q = filterSearch.toLowerCase();
        const matchCode = r.point?.code?.toLowerCase().includes(q);
        const matchName = r.point?.name?.toLowerCase().includes(q);
        const matchLoc = r.point?.location?.toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchLoc) return false;
      }
      return true;
    });
  }, [readings, filterType, filterSearch]);

  return (
    <div className="util-page-root">
      {/* 1. Header Trang & Nút Quét QR */}
      <div className="util-page-header">
        <div className="util-header-title-box">
          <h1 className="util-header-title">
            <Zap size={22} color="#eab308" className="util-title-icon" />
            <span>TIỆN ÍCH & NĂNG LƯỢNG</span>
          </h1>
          <p className="util-header-subtitle">
            Theo dõi Điện, Nước và Giám sát Bật/Tắt hệ thống phụ trợ.
          </p>
        </div>

        <div className="util-header-actions">
          {/* Nút Quét QR Lớn Nổi Bật cho Nhân Viên */}
          <button
            onClick={() => navigate('/utilities/scan')}
            className="util-scan-btn"
          >
            <QrCode size={18} />
            <span>QUÉT MÃ QR ĐO ĐẾM</span>
          </button>

          <button
            onClick={loadData}
            title="Làm mới dữ liệu"
            className="util-refresh-btn"
          >
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* 2. Thanh Tabs Điều Hướng */}
      <div className="util-tabs-wrapper">
        <div className="util-tabs-bar">
          {[
            { key: 'overview', label: 'Tổng Quan', fullLabel: 'Tổng Quan & Giám Sát', icon: BarChart3 },
            { key: 'readings', label: `Sổ Ghi (${readings.length})`, fullLabel: `Sổ Ghi Điện & Nước (${readings.length})`, icon: FileText },
            { key: 'statusLogs', label: `Bật / Tắt (${statusLogs.length})`, fullLabel: `Lịch Sử Bật / Tắt (${statusLogs.length})`, icon: Cpu },
            { key: 'points', label: `Điểm Đo (${points.length})`, fullLabel: `Danh Mục Điểm Đo & Tem (${points.length})`, icon: Settings },
          ].map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key as any)}
                className={`util-tab-btn ${isActive ? 'active' : ''}`}
              >
                <Icon size={15} />
                <span className="tab-label-short">{t.label}</span>
                <span className="tab-label-full">{t.fullLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. NỘI DUNG THEO TAB */}

      {/* TAB 1: TỔNG QUAN & GIÁM SÁT */}
      {activeTab === 'overview' && (
        <div className="util-tab-content">
          {/* 4 Thẻ KPI Cards */}
          <div className="util-kpi-grid">
            {/* Card 1: Điện hôm nay */}
            <div className="card util-kpi-card kpi-elec">
              <div className="kpi-top">
                <span className="kpi-label">ĐIỆN HÔM NAY</span>
                <div className="kpi-icon-box" style={{ backgroundColor: '#fef9c3', color: '#854d0e' }}>
                  <Zap size={16} />
                </div>
              </div>
              <div className="kpi-val">
                {analytics?.summary?.electricityToday?.toLocaleString() || 0} <span className="kpi-unit">kWh</span>
              </div>
              <div className="kpi-sub">
                7 ngày: <strong>{analytics?.summary?.electricityPeriod?.toLocaleString() || 0} kWh</strong>
              </div>
            </div>

            {/* Card 2: Nước hôm nay */}
            <div className="card util-kpi-card kpi-water">
              <div className="kpi-top">
                <span className="kpi-label">NƯỚC HÔM NAY</span>
                <div className="kpi-icon-box" style={{ backgroundColor: '#e0f2fe', color: '#0369a1' }}>
                  <Droplets size={16} />
                </div>
              </div>
              <div className="kpi-val">
                {analytics?.summary?.waterToday?.toLocaleString() || 0} <span className="kpi-unit">m³</span>
              </div>
              <div className="kpi-sub">
                7 ngày: <strong>{analytics?.summary?.waterPeriod?.toLocaleString() || 0} m³</strong>
              </div>
            </div>

            {/* Card 3: Hệ thống đang vận hành */}
            <div className="card util-kpi-card kpi-aux">
              <div className="kpi-top">
                <span className="kpi-label">HỆ THỐNG CHẠY</span>
                <div className="kpi-icon-box" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                  <Cpu size={16} />
                </div>
              </div>
              <div className="kpi-val" style={{ color: '#16a34a' }}>
                {analytics?.systemStatusCounts?.RUNNING || 0} / {analytics?.systemStatusCounts?.TOTAL || 0}
              </div>
              <div className="kpi-sub">
                Tắt: {analytics?.systemStatusCounts?.OFF || 0} • Chờ: {analytics?.systemStatusCounts?.STANDBY || 0}
              </div>
            </div>

            {/* Card 4: Tổng điểm đo */}
            <div className="card util-kpi-card kpi-points">
              <div className="kpi-top">
                <span className="kpi-label">TỔNG ĐIỂM ĐO</span>
                <div className="kpi-icon-box" style={{ backgroundColor: '#f3e8ff', color: '#6b21a8' }}>
                  <QrCode size={16} />
                </div>
              </div>
              <div className="kpi-val">
                {points.length} <span className="kpi-unit">Điểm</span>
              </div>
              <div className="kpi-sub">
                Điện: {analytics?.metersCount?.electricity || 0} • Nước: {analytics?.metersCount?.water || 0}
              </div>
            </div>
          </div>

          {/* Ma trận Giám sát Realtime Hệ thống Phụ trợ */}
          <div className="card util-section-card">
            <div className="section-card-header">
              <div>
                <h3 className="section-title">
                  <Cpu size={18} color="#8b5cf6" />
                  <span>TRẠNG THÁI HỆ THỐNG PHỤ TRỢ (REAL-TIME)</span>
                </h3>
                <p className="section-sub">
                  Giám sát Bật/Tắt, Chế độ chờ và Giờ chạy máy (Chiller, HVAC, Nồi hơi, Máy nén khí).
                </p>
              </div>
              <button
                onClick={() => navigate('/utilities/scan')}
                className="btn-action-outline"
              >
                <QrCode size={15} />
                <span>Quét Cập Nhật</span>
              </button>
            </div>

            <div className="aux-matrix-grid">
              {points.filter((p) => p.type === 'SYSTEM_AUX').map((sys) => {
                const statusColor =
                  sys.currentStatus === 'RUNNING' ? '#16a34a' : sys.currentStatus === 'OFF' ? '#64748b' : sys.currentStatus === 'STANDBY' ? '#ea580c' : '#dc2626';
                const statusBg =
                  sys.currentStatus === 'RUNNING' ? '#f0fdf4' : sys.currentStatus === 'OFF' ? '#f8fafc' : sys.currentStatus === 'STANDBY' ? '#fff7ed' : '#fef2f2';
                const statusText =
                  sys.currentStatus === 'RUNNING' ? 'ĐANG CHẠY' : sys.currentStatus === 'OFF' ? 'ĐANG TẮT' : sys.currentStatus === 'STANDBY' ? 'CHỜ' : 'SỰ CỐ';

                return (
                  <div
                    key={sys.id}
                    className="aux-card"
                    style={{ borderTop: `4px solid ${statusColor}` }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span className="aux-code">{sys.code}</span>
                      <span
                        className="aux-status-badge"
                        style={{ backgroundColor: statusBg, color: statusColor, borderColor: statusColor }}
                      >
                        <span className="status-dot" style={{ backgroundColor: statusColor }} />
                        {statusText}
                      </span>
                    </div>

                    <h4 className="aux-name">{sys.name}</h4>
                    <p className="aux-loc">{sys.location}</p>

                    <div className="aux-hour-box">
                      <div>
                        <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Đồng hồ giờ chạy (Hour meter):</span>
                        <span className="aux-hour-val">
                          {sys.lastReadingValue?.toLocaleString() || 0} Giờ
                        </span>
                      </div>
                      <Clock size={16} color="#94a3b8" />
                    </div>

                    {/* Nút thao tác nhanh trạng thái */}
                    <div className="aux-action-row">
                      {sys.currentStatus !== 'RUNNING' ? (
                        <button
                          onClick={() => handleQuickToggleStatus(sys, 'RUNNING')}
                          className="quick-btn start"
                        >
                          ▶ BẬT MÁY
                        </button>
                      ) : (
                        <button
                          onClick={() => handleQuickToggleStatus(sys, 'OFF')}
                          className="quick-btn stop"
                        >
                          ⏹ TẮT MÁY
                        </button>
                      )}

                      <button
                        onClick={() => setPrintPoint(sys)}
                        className="quick-btn qr"
                        title="Xem tem QR"
                      >
                        <QrCode size={14} /> Tem QR
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Biểu đồ xu hướng 7 ngày gần nhất */}
          {analytics?.dailyTrends && analytics.dailyTrends.length > 0 && (
            <div className="card util-section-card">
              <h3 className="section-title" style={{ marginBottom: '14px' }}>
                <BarChart3 size={18} color="#2563eb" />
                <span>XU HƯỚNG TIÊU THỤ (7 NGÀY GẦN NHẤT)</span>
              </h3>

              {/* Desktop Table View */}
              <div className="desktop-view-container">
                <div className="table-responsive">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th style={{ width: '130px' }}>Ngày</th>
                        <th>Điện tiêu thụ (kWh)</th>
                        <th>Nước tiêu thụ (m³)</th>
                        <th style={{ width: '100px', textAlign: 'center' }}>Số lượt ghi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.dailyTrends.map((d: any) => {
                        const maxElec = Math.max(...analytics.dailyTrends.map((x: any) => x.electricity || 1), 1);
                        const maxWater = Math.max(...analytics.dailyTrends.map((x: any) => x.water || 1), 1);
                        const pctElec = Math.min(100, Math.round((d.electricity / maxElec) * 100));
                        const pctWater = Math.min(100, Math.round((d.water / maxWater) * 100));

                        return (
                          <tr key={d.date}>
                            <td style={{ fontWeight: 600, fontSize: '13px' }}>
                              {new Date(d.date).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '70px', fontWeight: 700, fontSize: '13px', color: '#854d0e' }}>
                                  {d.electricity.toLocaleString()}
                                </span>
                                <div className="chart-bar-track">
                                  <div className="chart-bar-fill elec" style={{ width: `${pctElec}%` }} />
                                </div>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '50px', fontWeight: 700, fontSize: '13px', color: '#0369a1' }}>
                                  {d.water.toLocaleString()}
                                </span>
                                <div className="chart-bar-track">
                                  <div className="chart-bar-fill water" style={{ width: `${pctWater}%` }} />
                                </div>
                              </div>
                            </td>
                            <td style={{ textAlign: 'center', fontSize: '12.5px', color: '#64748b' }}>
                              {d.readingsCount} lần
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Card/List View */}
              <div className="mobile-cards-feed">
                {analytics.dailyTrends.map((d: any) => {
                  const maxElec = Math.max(...analytics.dailyTrends.map((x: any) => x.electricity || 1), 1);
                  const maxWater = Math.max(...analytics.dailyTrends.map((x: any) => x.water || 1), 1);
                  const pctElec = Math.min(100, Math.round((d.electricity / maxElec) * 100));
                  const pctWater = Math.min(100, Math.round((d.water / maxWater) * 100));

                  return (
                    <div key={d.date} className="mobile-trend-card">
                      <div className="trend-top-row">
                        <span className="trend-date">
                          {new Date(d.date).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                        </span>
                        <span className="trend-count">{d.readingsCount} lần ghi</span>
                      </div>

                      <div className="trend-bar-row">
                        <div className="trend-bar-meta">
                          <span className="trend-label elec">Điện:</span>
                          <span className="trend-val">{d.electricity.toLocaleString()} kWh</span>
                        </div>
                        <div className="chart-bar-track">
                          <div className="chart-bar-fill elec" style={{ width: `${pctElec}%` }} />
                        </div>
                      </div>

                      <div className="trend-bar-row">
                        <div className="trend-bar-meta">
                          <span className="trend-label water">Nước:</span>
                          <span className="trend-val">{d.water.toLocaleString()} m³</span>
                        </div>
                        <div className="chart-bar-track">
                          <div className="chart-bar-fill water" style={{ width: `${pctWater}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SỔ GHI ĐIỆN & NƯỚC */}
      {activeTab === 'readings' && (
        <div className="util-tab-content">
          {/* Bộ lọc đa năng */}
          <div className="card util-filter-bar">
            <div className="filter-search-box">
              <Search size={16} color="#94a3b8" />
              <input
                type="text"
                placeholder="Tìm mã hoặc tên điểm đo..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="filter-search-input"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="filter-select"
            >
              <option value="ALL">Tất cả tiện ích</option>
              <option value="ELECTRICITY">Điện (kWh)</option>
              <option value="WATER">Nước (m³)</option>
            </select>

            <button
              onClick={handleExportReadingsCSV}
              className="btn-export-csv"
            >
              <Download size={15} />
              <span>Xuất Excel / CSV</span>
            </button>
          </div>

          {/* DUAL-VIEW: 1) DESKTOP TABLE VIEW */}
          <div className="desktop-view-container card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Điểm đo / Đồng hồ</th>
                    <th>Vị trí</th>
                    <th>Chỉ số trước</th>
                    <th>Chỉ số mới</th>
                    <th>Tiêu thụ (Δ)</th>
                    <th>Người ghi</th>
                    <th>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReadings.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                        Chưa có bản ghi số điện/nước nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredReadings.map((r) => (
                      <tr key={r.id}>
                        <td style={{ fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                          {new Date(r.recordedAt).toLocaleString('vi-VN', {
                            hour: '2-digit', minute: '2-digit',
                            day: '2-digit', month: '2-digit', year: 'numeric',
                          })}
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {r.point?.type === 'ELECTRICITY' ? <Zap size={14} color="#eab308" /> : <Droplets size={14} color="#0ea5e9" />}
                            <span>{r.point?.name}</span>
                          </div>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>{r.point?.code}</span>
                        </td>
                        <td style={{ fontSize: '12px', color: '#475569' }}>{r.point?.location}</td>
                        <td style={{ fontSize: '12.5px', color: '#64748b' }}>
                          {r.previousValue?.toLocaleString()} {r.point?.unit}
                        </td>
                        <td style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                          {r.readingValue?.toLocaleString()} {r.point?.unit}
                        </td>
                        <td>
                          <span className="delta-badge-table">
                            +{r.consumptionDelta?.toLocaleString()} {r.point?.unit}
                          </span>
                        </td>
                        <td style={{ fontSize: '12.5px' }}>{r.recordedBy?.name || '---'}</td>
                        <td style={{ fontSize: '12px', color: '#64748b', maxWidth: '180px' }}>
                          {r.notes || '---'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* DUAL-VIEW: 2) MOBILE CARD FEED VIEW */}
          <div className="mobile-cards-feed">
            {filteredReadings.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                Chưa có bản ghi số điện/nước nào.
              </div>
            ) : (
              filteredReadings.map((r) => (
                <div key={r.id} className="card mobile-log-card">
                  <div className="mobile-log-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
                      {r.point?.type === 'ELECTRICITY' ? <Zap size={16} color="#eab308" /> : <Droplets size={16} color="#0ea5e9" />}
                      <span className="mobile-log-point-name">{r.point?.name}</span>
                    </div>
                    <span className="log-time-badge">
                      {new Date(r.recordedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>

                  <div className="mobile-log-meta">
                    <span>{r.point?.code} • {r.point?.location}</span>
                  </div>

                  <div className="mobile-log-values-row">
                    <div className="mobile-val-box">
                      <span className="val-lbl">Số cũ</span>
                      <span className="val-txt">{r.previousValue?.toLocaleString()}</span>
                    </div>
                    <ArrowRight size={14} color="#94a3b8" />
                    <div className="mobile-val-box">
                      <span className="val-lbl">Số mới</span>
                      <span className="val-txt new">{r.readingValue?.toLocaleString()}</span>
                    </div>
                    <div className="mobile-val-delta">
                      <span className="val-lbl">Tiêu thụ</span>
                      <span className="val-txt-delta">+{r.consumptionDelta?.toLocaleString()} {r.point?.unit}</span>
                    </div>
                  </div>

                  {(r.notes || r.recordedBy?.name) && (
                    <div className="mobile-log-footer">
                      {r.recordedBy?.name && <span>KTV: <strong>{r.recordedBy.name}</strong></span>}
                      {r.notes && <span style={{ color: '#64748b' }}>• {r.notes}</span>}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: LỊCH SỬ BẬT / TẮT HỆ THỐNG */}
      {activeTab === 'statusLogs' && (
        <div className="util-tab-content">
          {/* Desktop Table View */}
          <div className="desktop-view-container card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Hệ thống</th>
                    <th>Vị trí</th>
                    <th>Trạng thái mới</th>
                    <th>Đồng hồ giờ chạy</th>
                    <th>Giờ tăng thêm (Δ)</th>
                    <th>Lý do / Mô tả</th>
                    <th>Kỹ thuật viên</th>
                  </tr>
                </thead>
                <tbody>
                  {statusLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                        Chưa có lịch sử chuyển đổi trạng thái nào.
                      </td>
                    </tr>
                  ) : (
                    statusLogs.map((log) => {
                      const color =
                        log.status === 'RUNNING' ? '#16a34a' : log.status === 'OFF' ? '#64748b' : log.status === 'STANDBY' ? '#ea580c' : '#dc2626';
                      const bg =
                        log.status === 'RUNNING' ? '#f0fdf4' : log.status === 'OFF' ? '#f8fafc' : log.status === 'STANDBY' ? '#fff7ed' : '#fef2f2';

                      return (
                        <tr key={log.id}>
                          <td style={{ fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                            {new Date(log.recordedAt).toLocaleString('vi-VN')}
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, fontSize: '13px' }}>{log.point?.name}</div>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>{log.point?.code}</span>
                          </td>
                          <td style={{ fontSize: '12px', color: '#475569' }}>{log.point?.location}</td>
                          <td>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                backgroundColor: bg,
                                color: color,
                                border: `1px solid ${color}`,
                              }}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td style={{ fontSize: '13px', fontWeight: 600 }}>
                            {log.runningHours ? `${log.runningHours.toLocaleString()} h` : '---'}
                          </td>
                          <td>
                            {log.runningDelta ? (
                              <span style={{ fontWeight: 700, color: '#16a34a', fontSize: '12.5px' }}>
                                +{log.runningDelta.toLocaleString()} h
                              </span>
                            ) : (
                              '---'
                            )}
                          </td>
                          <td style={{ fontSize: '12.5px', color: '#475569', maxWidth: '240px' }}>
                            {log.reason || '---'}
                          </td>
                          <td style={{ fontSize: '12.5px' }}>{log.recordedBy?.name || '---'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Feed View */}
          <div className="mobile-cards-feed">
            {statusLogs.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                Chưa có lịch sử bật/tắt nào.
              </div>
            ) : (
              statusLogs.map((log) => {
                const color =
                  log.status === 'RUNNING' ? '#16a34a' : log.status === 'OFF' ? '#64748b' : log.status === 'STANDBY' ? '#ea580c' : '#dc2626';
                const bg =
                  log.status === 'RUNNING' ? '#f0fdf4' : log.status === 'OFF' ? '#f8fafc' : log.status === 'STANDBY' ? '#fff7ed' : '#fef2f2';

                return (
                  <div key={log.id} className="card mobile-log-card">
                    <div className="mobile-log-header">
                      <span className="mobile-log-point-name">{log.point?.name}</span>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: bg,
                          color: color,
                          border: `1px solid ${color}`,
                        }}
                      >
                        {log.status}
                      </span>
                    </div>

                    <div className="mobile-log-meta">
                      <span>{log.point?.code} • {log.point?.location}</span>
                      <span>{new Date(log.recordedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: '#f8fafc', borderRadius: '6px', margin: '8px 0' }}>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>Đồng hồ: <strong>{log.runningHours ? `${log.runningHours.toLocaleString()} h` : '---'}</strong></span>
                      {log.runningDelta && (
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a' }}>
                          Tăng: +{log.runningDelta} h
                        </span>
                      )}
                    </div>

                    {log.reason && (
                      <div style={{ fontSize: '12px', color: '#334155', marginTop: '4px' }}>
                        Lý do: <em>"{log.reason}"</em>
                      </div>
                    )}

                    <div className="mobile-log-footer" style={{ marginTop: '8px' }}>
                      <span>KTV: <strong>{log.recordedBy?.name || '---'}</strong></span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 4: DANH MỤC ĐIỂM ĐO & IN TEM QR */}
      {activeTab === 'points' && (
        <div className="util-tab-content">
          <div className="card util-section-card">
            <div className="section-card-header">
              <div>
                <h3 className="section-title">
                  <Settings size={18} color="#2563eb" />
                  <span>DANH MỤC ĐIỂM ĐO ĐIỆN, NƯỚC & HỆ THỐNG PHỤ TRỢ</span>
                </h3>
                <p className="section-sub">
                  Quản lý danh sách đồng hồ, hệ số nhân (CT) và in tem QR dán tại hiện trường.
                </p>
              </div>

              <button
                onClick={handleOpenAddPoint}
                className="btn-add-point"
              >
                <Plus size={16} />
                <span>Thêm Điểm Đo</span>
              </button>
            </div>

            {/* Desktop Table View */}
            <div className="desktop-view-container">
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th style={{ width: '120px' }}>Mã điểm đo</th>
                      <th>Tên đồng hồ / Hệ thống</th>
                      <th>Loại</th>
                      <th>Vị trí lắp đặt</th>
                      <th>Hệ số (CT)</th>
                      <th>Chỉ số gần nhất</th>
                      <th>Mã QR</th>
                      <th style={{ width: '130px', textAlign: 'center' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {points.map((p) => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 700, fontSize: '13px' }}>{p.code}</td>
                        <td style={{ fontWeight: 600, fontSize: '13px' }}>{p.name}</td>
                        <td>
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
                            {p.type === 'ELECTRICITY' ? 'Điện' : p.type === 'WATER' ? 'Nước' : 'Phụ trợ'}
                          </span>
                        </td>
                        <td style={{ fontSize: '12.5px', color: '#475569' }}>{p.location}</td>
                        <td style={{ fontSize: '12.5px' }}>x{p.multiplier || 1}</td>
                        <td style={{ fontSize: '13px', fontWeight: 700 }}>
                          {p.lastReadingValue?.toLocaleString() || 0} {p.unit}
                        </td>
                        <td>
                          <button
                            onClick={() => setPrintPoint(p)}
                            className="btn-qr-preview"
                          >
                            <QrCode size={13} />
                            <span>In Tem QR</span>
                          </button>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              onClick={() => handleOpenEditPoint(p)}
                              className="btn-icon-action"
                              title="Chỉnh sửa"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeletePoint(p)}
                              className="btn-icon-action danger"
                              title="Xóa điểm đo"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards List View */}
            <div className="mobile-cards-feed">
              {points.map((p) => (
                <div key={p.id} className="card mobile-point-card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 800, fontSize: '13.5px', color: '#0f172a' }}>{p.code}</span>
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
                      {p.type === 'ELECTRICITY' ? 'Điện' : p.type === 'WATER' ? 'Nước' : 'Phụ trợ'}
                    </span>
                  </div>

                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b', marginBottom: '2px' }}>{p.name}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                    Vị trí: <strong>{p.location}</strong> {p.multiplier > 1 ? `• CT: x${p.multiplier}` : ''}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: '#f8fafc', borderRadius: '6px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '11.5px', color: '#64748b' }}>Chỉ số gần nhất:</span>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                      {p.lastReadingValue?.toLocaleString() || 0} {p.unit}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setPrintPoint(p)}
                      className="btn-qr-preview"
                      style={{ flex: 1, justifyContent: 'center', padding: '8px' }}
                    >
                      <QrCode size={15} />
                      <span>In Tem QR</span>
                    </button>
                    <button
                      onClick={() => handleOpenEditPoint(p)}
                      className="btn-icon-action"
                      style={{ width: '36px', height: '36px' }}
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => handleDeletePoint(p)}
                      className="btn-icon-action danger"
                      style={{ width: '36px', height: '36px' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: THÊM / SỬA ĐIỂM ĐO */}
      {showPointModal && (
        <div className="util-modal-overlay">
          <div className="card util-modal-card">
            <h3 className="modal-title">
              {editingPoint ? 'CHỈNH SỬA ĐIỂM ĐO' : 'THÊM MỚI ĐIỂM ĐO / HỆ THỐNG'}
            </h3>

            <form onSubmit={handleSavePoint} className="modal-form-content">
              <div className="form-row-grid">
                <div>
                  <label className="modal-label required">Mã định danh (Code) *</label>
                  <input
                    type="text"
                    required
                    value={pointForm.code}
                    onChange={(e) => setPointForm({ ...pointForm, code: e.target.value })}
                    className="modal-input"
                  />
                </div>
                <div>
                  <label className="modal-label required">Loại tiện ích *</label>
                  <select
                    value={pointForm.type}
                    onChange={(e) => setPointForm({ ...pointForm, type: e.target.value })}
                    className="modal-select"
                  >
                    <option value="ELECTRICITY">Điện (Electricity)</option>
                    <option value="WATER">Nước (Water)</option>
                    <option value="SYSTEM_AUX">Hệ thống phụ trợ (HVAC, Chiller...)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="modal-label required">Tên hiển thị đồng hồ / hệ thống *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Tủ điện phân xưởng Mắt Mũi DB-01"
                  value={pointForm.name}
                  onChange={(e) => setPointForm({ ...pointForm, name: e.target.value })}
                  className="modal-input"
                />
              </div>

              <div>
                <label className="modal-label required">Vị trí lắp đặt *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Tầng 2, Xưởng Mắt Mũi"
                  value={pointForm.location}
                  onChange={(e) => setPointForm({ ...pointForm, location: e.target.value })}
                  className="modal-input"
                />
              </div>

              <div className="form-row-grid">
                <div>
                  <label className="modal-label">Hệ số nhân biến dòng (CT)</label>
                  <input
                    type="number"
                    step="any"
                    value={pointForm.multiplier}
                    onChange={(e) => setPointForm({ ...pointForm, multiplier: parseFloat(e.target.value) || 1.0 })}
                    className="modal-input"
                  />
                </div>
                <div>
                  <label className="modal-label">Đơn vị đo</label>
                  <input
                    type="text"
                    value={pointForm.unit}
                    onChange={(e) => setPointForm({ ...pointForm, unit: e.target.value })}
                    className="modal-input"
                  />
                </div>
              </div>

              <div>
                <label className="modal-label">Ghi chú mô tả</label>
                <textarea
                  rows={2}
                  value={pointForm.description}
                  onChange={(e) => setPointForm({ ...pointForm, description: e.target.value })}
                  className="modal-textarea"
                />
              </div>

              <div className="modal-actions-row">
                <button
                  type="button"
                  onClick={() => setShowPointModal(false)}
                  className="btn-modal-cancel"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
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
        <div className="util-modal-overlay">
          <div className="card util-modal-card print-preview-card">
            <h3 className="modal-title">
              IN TEM MÃ QR DÁN ĐỒNG HỒ / TỦ ĐIỆN
            </h3>

            {/* Khung Tem QR chuẩn in */}
            <div id="printable-utility-qr-tag" className="qr-printable-tag">
              <div className="qr-tag-brand">DK PHARMA CMMS</div>
              <div className="qr-tag-name">{printPoint.name}</div>

              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(printPoint.code)}`}
                alt={`QR ${printPoint.code}`}
                className="qr-tag-img"
              />

              <div className="qr-tag-code">{printPoint.code}</div>
              <div className="qr-tag-loc">{printPoint.location}</div>
            </div>

            <div className="modal-actions-row" style={{ justifyContent: 'center' }}>
              <button
                onClick={() => setPrintPoint(null)}
                className="btn-modal-cancel"
              >
                Đóng
              </button>
              <button
                onClick={() => window.print()}
                className="btn-modal-submit print-btn"
              >
                <Printer size={16} />
                <span>In Tem Ngay</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESPONSIVE STYLESHEET */}
      <style>{`
        .util-page-root {
          padding: 0;
          width: 100%;
          max-width: 100%;
          margin: 0 auto;
          box-sizing: border-box;
          overflow-x: hidden;
        }

        .util-page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 16px;
          width: 100%;
          box-sizing: border-box;
        }

        .util-header-title-box {
          flex: 1;
          min-width: 0;
        }

        .util-header-title {
          font-size: 20px;
          font-weight: 800;
          margin: 0 0 4px 0;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
        }

        .util-header-subtitle {
          font-size: 13px;
          color: #64748b;
          margin: 0;
          line-height: 1.4;
        }

        .util-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .util-scan-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background-color: #2563eb;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          padding: 10px 16px;
          font-size: 13.5px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
          transition: background-color 0.15s ease;
          touch-action: manipulation;
          white-space: nowrap;
        }

        .util-scan-btn:hover {
          background-color: #1d4ed8;
        }

        .util-refresh-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background-color: #ffffff;
          cursor: pointer;
          color: #475569;
          flex-shrink: 0;
        }

        /* Tabs bar segmented style */
        .util-tabs-wrapper {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          margin-bottom: 16px;
        }
        .util-tabs-wrapper::-webkit-scrollbar {
          display: none;
        }

        .util-tabs-bar {
          display: inline-flex;
          padding: 4px;
          background-color: #f1f5f9;
          border-radius: 10px;
          gap: 4px;
          white-space: nowrap;
          min-width: 100%;
          box-sizing: border-box;
        }

        .util-tab-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border: none;
          background: none;
          color: #64748b;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          border-radius: 8px;
          white-space: nowrap;
          transition: all 0.15s ease;
          flex: 1;
          justify-content: center;
        }

        .util-tab-btn.active {
          background-color: #ffffff;
          color: #2563eb;
          font-weight: 700;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
        }

        .tab-label-short {
          display: none;
        }
        .tab-label-full {
          display: inline;
        }

        .util-tab-content {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
          box-sizing: border-box;
        }

        /* KPI Grid */
        .util-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          width: 100%;
          box-sizing: border-box;
        }

        .util-kpi-card {
          padding: 14px 16px;
          border-radius: 10px;
          background-color: #ffffff;
          box-sizing: border-box;
        }
        .kpi-elec { border-left: 4px solid #eab308; }
        .kpi-water { border-left: 4px solid #0ea5e9; }
        .kpi-aux { border-left: 4px solid #16a34a; }
        .kpi-points { border-left: 4px solid #8b5cf6; }

        .kpi-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }

        .kpi-label {
          font-size: 11.5px;
          font-weight: 700;
          color: #64748b;
          letter-spacing: 0.3px;
        }

        .kpi-icon-box {
          padding: 5px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .kpi-val {
          font-size: 22px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.2;
        }

        .kpi-unit {
          font-size: 12.5px;
          font-weight: 600;
          color: #64748b;
        }

        .kpi-sub {
          font-size: 11px;
          color: #64748b;
          margin-top: 3px;
        }

        .util-section-card {
          padding: 16px;
          border-radius: 12px;
          background-color: #ffffff;
          width: 100%;
          box-sizing: border-box;
        }

        .section-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
          gap: 10px;
          flex-wrap: wrap;
        }

        .section-title {
          font-size: 14.5px;
          font-weight: 800;
          margin: 0 0 2px 0;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .section-sub {
          font-size: 12px;
          color: #64748b;
          margin: 0;
        }

        .btn-action-outline {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 12px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background-color: #ffffff;
          color: #2563eb;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
          white-space: nowrap;
        }

        /* Aux Matrix */
        .aux-matrix-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 12px;
          width: 100%;
          box-sizing: border-box;
        }

        .aux-card {
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 14px;
          background-color: #ffffff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          box-sizing: border-box;
        }

        .aux-code {
          font-size: 11.5px;
          font-weight: 700;
          color: #64748b;
        }

        .aux-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 7px;
          border-radius: 999px;
          font-size: 10.5px;
          font-weight: 800;
          border: 1px solid;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .aux-name {
          font-size: 13.5px;
          font-weight: 700;
          margin: 0 0 2px 0;
          color: #0f172a;
        }

        .aux-loc {
          font-size: 11.5px;
          color: #64748b;
          margin: 0 0 10px 0;
        }

        .aux-hour-box {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 10px;
          background-color: #f8fafc;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          margin-bottom: 10px;
        }

        .aux-hour-val {
          font-size: 14px;
          font-weight: 800;
          color: #0f172a;
        }

        .aux-action-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .quick-btn {
          flex: 1;
          padding: 7px;
          border-radius: 6px;
          font-size: 11.5px;
          font-weight: 700;
          cursor: pointer;
          border: none;
          text-align: center;
          touch-action: manipulation;
        }

        .quick-btn.start {
          background-color: #16a34a;
          color: #ffffff;
        }

        .quick-btn.stop {
          background-color: #64748b;
          color: #ffffff;
        }

        .quick-btn.qr {
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          gap: 4px;
          background-color: #f1f5f9;
          color: #0f172a;
          border: 1px solid #cbd5e1;
        }

        /* Filter Bar */
        .util-filter-bar {
          padding: 12px 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          border-radius: 10px;
          background-color: #ffffff;
          width: 100%;
          box-sizing: border-box;
        }

        .filter-search-box {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 10px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background-color: #ffffff;
          flex: 1;
          min-width: 180px;
          box-sizing: border-box;
        }

        .filter-search-input {
          border: none;
          outline: none;
          font-size: 12.5px;
          width: 100%;
        }

        .filter-select {
          padding: 7px 10px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background-color: #ffffff;
          font-size: 12.5px;
          outline: none;
          box-sizing: border-box;
        }

        .btn-export-csv {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 7px 12px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background-color: #ffffff;
          color: #0f172a;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
          margin-left: auto;
          white-space: nowrap;
          box-sizing: border-box;
        }

        /* Charts */
        .chart-bar-track {
          flex: 1;
          height: 10px;
          background-color: #f1f5f9;
          border-radius: 5px;
          overflow: hidden;
          min-width: 50px;
        }

        .chart-bar-fill {
          height: 100%;
          border-radius: 5px;
          transition: width 0.3s ease;
        }

        .chart-bar-fill.elec { background-color: #eab308; }
        .chart-bar-fill.water { background-color: #0ea5e9; }

        .delta-badge-table {
          font-weight: 800;
          color: #15803d;
          font-size: 12.5px;
          padding: 2px 6px;
          background-color: #f0fdf4;
          border-radius: 4px;
        }

        /* Dual-view helper: Table on desktop, Cards on mobile */
        .desktop-view-container {
          display: block;
        }
        .mobile-cards-feed {
          display: none;
        }

        /* Mobile Trend Cards */
        .mobile-trend-card {
          padding: 10px 12px;
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          margin-bottom: 8px;
        }
        .trend-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }
        .trend-date {
          font-weight: 700;
          font-size: 13px;
          color: #0f172a;
        }
        .trend-count {
          font-size: 11px;
          color: #64748b;
        }
        .trend-bar-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 4px;
        }
        .trend-bar-meta {
          width: 90px;
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
        }
        .trend-label {
          font-size: 10.5px;
          font-weight: 700;
        }
        .trend-label.elec { color: #854d0e; }
        .trend-label.water { color: #0369a1; }
        .trend-val {
          font-size: 11.5px;
          font-weight: 700;
          color: #0f172a;
        }

        /* Mobile Log Cards */
        .mobile-log-card, .mobile-point-card {
          padding: 12px 14px;
          border-radius: 10px;
          background-color: #ffffff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          margin-bottom: 8px;
          border: 1px solid #e2e8f0;
          box-sizing: border-box;
          width: 100%;
        }

        .mobile-log-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
          gap: 6px;
        }

        .mobile-log-point-name {
          font-weight: 800;
          font-size: 13.5px;
          color: #0f172a;
          word-break: break-word;
        }

        .log-time-badge {
          font-size: 11px;
          color: #64748b;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .mobile-log-meta {
          font-size: 11px;
          color: #64748b;
          margin-bottom: 8px;
        }

        .mobile-log-values-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 8px 10px;
          gap: 6px;
        }

        .mobile-val-box {
          display: flex;
          flex-direction: column;
        }

        .val-lbl {
          font-size: 10px;
          color: #64748b;
        }

        .val-txt {
          font-size: 12.5px;
          font-weight: 600;
          color: #475569;
        }

        .val-txt.new {
          font-weight: 800;
          color: #0f172a;
        }

        .mobile-val-delta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .val-txt-delta {
          font-size: 13.5px;
          font-weight: 800;
          color: #15803d;
        }

        .mobile-log-footer {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: #475569;
          margin-top: 6px;
          border-top: 1px dashed #e2e8f0;
          padding-top: 5px;
        }

        .btn-add-point {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 7px 14px;
          border-radius: 6px;
          border: none;
          background-color: #0f172a;
          color: #ffffff;
          font-weight: 700;
          font-size: 12.5px;
          cursor: pointer;
          white-space: nowrap;
        }

        .btn-qr-preview {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 5px 10px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background-color: #ffffff;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          color: #0f172a;
          white-space: nowrap;
        }

        .btn-icon-action {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background-color: #ffffff;
          cursor: pointer;
          color: #475569;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .btn-icon-action.danger {
          color: #dc2626;
          border-color: #fecaca;
        }

        /* Modal Styles */
        .util-modal-overlay {
          position: fixed;
          inset: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 12px;
        }

        .util-modal-card {
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          background-color: #ffffff;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.15);
          box-sizing: border-box;
        }

        .modal-title {
          font-size: 15.5px;
          font-weight: 800;
          margin: 0 0 14px 0;
          color: #0f172a;
        }

        .modal-form-content {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .form-row-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .modal-label {
          font-size: 12px;
          font-weight: 600;
          color: #334155;
          display: block;
          margin-bottom: 4px;
        }

        .modal-input, .modal-select {
          width: 100%;
          padding: 7px 10px;
          font-size: 13px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          box-sizing: border-box;
          outline: none;
        }

        .modal-textarea {
          width: 100%;
          padding: 7px 10px;
          font-size: 13px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          box-sizing: border-box;
          outline: none;
          font-family: inherit;
        }

        .modal-actions-row {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 10px;
        }

        .btn-modal-cancel {
          padding: 7px 14px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background-color: #ffffff;
          cursor: pointer;
          font-size: 12.5px;
        }

        .btn-modal-submit {
          padding: 7px 16px;
          border-radius: 6px;
          border: none;
          background-color: #0f172a;
          color: #ffffff;
          font-weight: 700;
          cursor: pointer;
          font-size: 12.5px;
        }

        .btn-modal-submit.print-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background-color: #2563eb;
        }

        .print-preview-card {
          max-width: 360px;
          text-align: center;
        }

        .qr-printable-tag {
          border: 2px solid #0f172a;
          border-radius: 8px;
          padding: 14px;
          background-color: #ffffff;
          margin: 0 auto 16px;
          width: 240px;
          max-width: 100%;
          box-sizing: border-box;
        }

        .qr-tag-brand {
          font-size: 11px;
          font-weight: 800;
          color: #b91c1c;
          letter-spacing: 1px;
          margin-bottom: 3px;
        }

        .qr-tag-name {
          font-size: 12.5px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 6px;
        }

        .qr-tag-img {
          width: 130px;
          height: 130px;
          margin: 0 auto 6px auto;
          display: block;
        }

        .qr-tag-code {
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.5px;
          color: #0f172a;
        }

        .qr-tag-loc {
          font-size: 10.5px;
          color: #64748b;
        }

        /* RESPONSIVE BREAKPOINTS */

        /* TABLET (<= 1024px) */
        @media (max-width: 1024px) {
          .util-kpi-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        /* MOBILE (<= 768px) */
        @media (max-width: 768px) {
          .util-page-header {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
          }

          .util-header-title {
            font-size: 17px;
            white-space: normal;
          }

          .util-header-subtitle {
            display: none; /* Thu gọn header để tiết kiệm chiều cao trên điện thoại */
          }

          .util-header-actions {
            width: 100%;
          }

          .util-scan-btn {
            flex: 1;
            justify-content: center;
            padding: 10px 12px;
            font-size: 13px;
          }

          .tab-label-full {
            display: none;
          }
          .tab-label-short {
            display: inline;
          }

          .util-tab-btn {
            padding: 7px 10px;
            font-size: 12px;
          }

          .util-filter-bar {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .filter-search-box {
            width: 100%;
            min-width: 100%;
          }

          .filter-select {
            width: 100%;
          }

          .btn-export-csv {
            width: 100%;
            justify-content: center;
            margin-left: 0;
          }

          /* Chuyển hoàn toàn từ Table sang Card Feed */
          .desktop-view-container {
            display: none !important;
          }

          .mobile-cards-feed {
            display: block !important;
          }

          .aux-matrix-grid {
            grid-template-columns: 1fr;
          }

          .btn-add-point {
            width: 100%;
            justify-content: center;
            padding: 9px;
          }

          .form-row-grid {
            grid-template-columns: 1fr;
            gap: 8px;
          }
        }

        /* SMALL MOBILE (<= 480px) */
        @media (max-width: 480px) {
          .util-kpi-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }

          .util-kpi-card {
            padding: 10px 12px;
          }

          .kpi-val {
            font-size: 18px;
          }

          .kpi-unit {
            font-size: 11px;
          }

          .kpi-sub {
            font-size: 10px;
          }

          .util-section-card {
            padding: 12px;
          }
        }
      `}</style>
    </div>
  );
};
