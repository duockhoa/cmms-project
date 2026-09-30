import React from 'react';
import type { UtilitiesPageViewModel } from '../../hooks/useUtilitiesPage';
import { Activity, BarChart3, Clock, Cpu, Droplets, Play, QrCode, Square, Zap } from 'lucide-react';
import { KpiCard } from '../common';

interface UtilityTabProps {
  model: UtilitiesPageViewModel;
}

export const UtilityOverviewTab: React.FC<UtilityTabProps> = ({ model }) => {
  const {
    navigate, points, analytics, getLiveHourMeter, handleQuickToggleStatus,
  } = model;

  return (
        <div className="util-tab-content">
          {/* 6 Thẻ KPI Cards Thu Gọn (Điện Cấp, Điện Dùng, Nước Cấp, Nước Dùng, Phụ Trợ, Điểm Đo) */}
          <div className="util-kpi-grid">
            <KpiCard title="Điện cấp hôm nay" value={`${analytics?.summary?.electricitySupplyToday?.toLocaleString() || 0} kWh`} icon={Zap} variant="warning" footer={`7 ngày: ${analytics?.summary?.electricitySupplyPeriod?.toLocaleString() || 0} kWh`} />
            <KpiCard title="Đã dùng điện" value={`${analytics?.summary?.electricityConsumptionToday?.toLocaleString() || 0} kWh`} icon={Activity} variant="danger" footer={`7 ngày: ${analytics?.summary?.electricityConsumptionPeriod?.toLocaleString() || 0} kWh`} />
            <KpiCard title="Nước cấp hôm nay" value={`${analytics?.summary?.waterSupplyToday?.toLocaleString() || 0} m³`} icon={Droplets} variant="primary" footer={`7 ngày: ${analytics?.summary?.waterSupplyPeriod?.toLocaleString() || 0} m³`} />
            <KpiCard title="Đã dùng nước" value={`${analytics?.summary?.waterConsumptionToday?.toLocaleString() || 0} m³`} icon={Droplets} variant="info" footer={`7 ngày: ${analytics?.summary?.waterConsumptionPeriod?.toLocaleString() || 0} m³`} />
            <KpiCard title="Hệ thống chạy" value={`${analytics?.systemStatusCounts?.RUNNING || 0} / ${analytics?.systemStatusCounts?.TOTAL || 0}`} icon={Cpu} variant="success" footer={`Tắt: ${analytics?.systemStatusCounts?.OFF || 0} • Chờ: ${analytics?.systemStatusCounts?.STANDBY || 0}`} />
            <KpiCard title="Tổng điểm đo" value={`${points.length} điểm`} icon={QrCode} variant="purple" footer={`Điện: ${analytics?.metersCount?.electricity || 0} • Nước: ${analytics?.metersCount?.water || 0}`} />
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
                const liveHour = getLiveHourMeter(sys);
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
                    style={{ borderTop: `3px solid ${statusColor}` }}
                  >
                    {/* Dòng 1: Mã thiết bị, vị trí và Huy hiệu trạng thái */}
                    <div className="aux-card-top">
                      <div className="aux-card-header-left">
                        <span className="aux-code">{sys.code}</span>
                        {sys.location && (
                          <span className="aux-loc" title={sys.location}>• {sys.location}</span>
                        )}
                      </div>
                      <span
                        className="aux-status-badge"
                        style={{ backgroundColor: statusBg, color: statusColor, borderColor: statusColor }}
                      >
                        <span className="status-dot" style={{ backgroundColor: statusColor }} />
                        {statusText}
                      </span>
                    </div>

                    {/* Dòng 2: Tên thiết bị và Đồng hồ giờ chạy thu gọn */}
                    <div className="aux-card-mid">
                      <h4 className="aux-name" title={sys.name}>{sys.name}</h4>
                      <div className="aux-hour-inline">
                        <Clock size={12} color={liveHour.isRunning ? '#16a34a' : '#94a3b8'} style={{ flexShrink: 0 }} />
                        <span className="aux-hour-val">
                          {liveHour.total.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}h
                        </span>
                        {liveHour.isRunning && (
                          <span className="aux-hour-delta" title="Giờ chạy lũy kế ca này">
                            (+{liveHour.sessionDelta.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}h)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dòng 3: Nút Bật/Tắt nhanh */}
                    <div className="aux-action-row">
                      {sys.currentStatus !== 'RUNNING' ? (
                        <button
                          onClick={() => handleQuickToggleStatus(sys, 'RUNNING')}
                          className="quick-btn start"
                          title="Bật máy"
                        >
                          <Play size={10} fill="currentColor" /> BẬT MÁY
                        </button>
                      ) : (
                        <button
                          onClick={() => handleQuickToggleStatus(sys, 'OFF')}
                          className="quick-btn stop"
                          title="Tắt máy"
                        >
                          <Square size={9} fill="currentColor" /> TẮT MÁY
                        </button>
                      )}
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
  );
};
