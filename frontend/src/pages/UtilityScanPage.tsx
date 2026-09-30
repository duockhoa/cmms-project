import React, { useCallback, useState } from 'react';
import { useUtilityPointScanner } from '../hooks/useUtilityPointScanner';
import { useUtilityScanForm } from '../hooks/useUtilityScanForm';
import { 
  Zap, Droplets, Cpu,
  CheckCircle2, AlertTriangle, Clock, RefreshCw, 
  ChevronRight, QrCode
} from 'lucide-react';
import { formatVN } from '../utils/formatters';
import { UtilityScanHeader } from '../components/utilities/UtilityScanHeader';
import { UtilityQrScannerPanel } from '../components/utilities/UtilityQrScannerPanel';
import './UtilityScanPage.css';

export const UtilityScanPage: React.FC = () => {
  const [selectedPoint, setSelectedPoint] = useState<any | null>(null);

  const handleSelectPoint = useCallback((point: any) => {
    setSelectedPoint(point);
  }, []);

  const { scanning, setScanning } = useUtilityPointScanner({
    selectedPoint,
    onSelectPoint: handleSelectPoint,
  });

  const {
    submitting, readingValue, setReadingValue, normalValue, setNormalValue,
    peakValue, setPeakValue, offPeakValue, setOffPeakValue, powerKw, setPowerKw,
    powerFactor, setPowerFactor, notes, setNotes, systemStatus, setSystemStatus,
    runningHours, setRunningHours, statusReason, setStatusReason, previousValue,
    currentNum, calculatedConsumption, isSmallerThanPrevious, isOutlier,
    handleSubmitReading, handleSubmitSystemStatus,
  } = useUtilityScanForm({
    selectedPoint,
    setSelectedPoint,
    resumeScanning: () => setScanning(true),
  });

  return (
    <div className="utility-scan-container">
      <UtilityScanHeader
        hasSelectedPoint={Boolean(selectedPoint)}
        onScanOther={() => {
          setSelectedPoint(null);
          setScanning(true);
        }}
      />

      {scanning && !selectedPoint && <UtilityQrScannerPanel />}

      {/* 2. MÀN HÌNH FORM NHẬP KHI ĐÃ CHỌN ĐIỂM ĐO */}
      {selectedPoint && (
        <div className="scan-form-container">
          {/* Card Tóm tắt Thiết bị được chọn */}
          <div
            className="card scan-selected-card"
            style={{
              borderLeft: selectedPoint.type === 'ELECTRICITY' ? '5px solid #eab308' : selectedPoint.type === 'WATER' ? '5px solid #0ea5e9' : '5px solid #8b5cf6',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  backgroundColor: selectedPoint.type === 'ELECTRICITY' ? '#fef9c3' : selectedPoint.type === 'WATER' ? '#e0f2fe' : '#f3e8ff',
                  color: selectedPoint.type === 'ELECTRICITY' ? '#854d0e' : selectedPoint.type === 'WATER' ? '#0369a1' : '#6b21a8',
                }}
              >
                {selectedPoint.type === 'ELECTRICITY' ? 'Đồng Hồ Điện' : selectedPoint.type === 'WATER' ? 'Đồng Hồ Nước' : 'Hệ Thống Phụ Trợ'}
              </span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>{selectedPoint.code}</span>
            </div>

            <h3 className="selected-point-title">
              {selectedPoint.name}
            </h3>
            <p className="selected-point-loc">
              Vị trí: <strong>{selectedPoint.location}</strong> {selectedPoint.multiplier > 1 ? `• CT: x${selectedPoint.multiplier}` : ''}
            </p>

            {/* Chỉ số lần trước để đối chiếu */}
            <div className="last-reading-box">
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Chỉ số ghi nhận gần nhất:</span>
                <span className="last-reading-value">
                  {formatVN(previousValue)} {selectedPoint.unit}
                </span>
              </div>
              <Clock size={20} color="#94a3b8" />
            </div>
          </div>

          {/* FORM 1: NHẬP SỐ ĐIỆN HOẶC SỐ NƯỚC */}
          {(selectedPoint.type === 'ELECTRICITY' || selectedPoint.type === 'WATER') && (
            <form onSubmit={handleSubmitReading} className="card scan-input-card">
              <h4 className="form-card-title">
                GHI NHẬN CHỈ SỐ ĐỒNG HỒ
              </h4>

              {/* Ô nhập chỉ số mới */}
              <div style={{ marginBottom: '14px' }}>
                <label className="form-label-scan required">
                  Chỉ số mới trên đồng hồ ({selectedPoint.unit}) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  required
                  placeholder={`Ví dụ: ${previousValue + 10}`}
                  value={readingValue}
                  onChange={(e) => setReadingValue(e.target.value)}
                  className={`scan-number-input ${isSmallerThanPrevious ? 'error' : isOutlier ? 'error' : ''}`}
                  style={isSmallerThanPrevious ? { borderColor: '#ef4444', backgroundColor: '#fef2f2', color: '#b91c1c' } : undefined}
                  autoFocus
                />
              </div>

              {/* Hộp Cảnh báo CHẶN nếu số sau < số trước */}
              {isSmallerThanPrevious && (
                <div
                  style={{
                    backgroundColor: '#fef2f2',
                    border: '1.5px solid #f87171',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    marginBottom: '14px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    color: '#991b1b',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    boxShadow: '0 2px 6px rgba(239, 68, 68, 0.1)',
                  }}
                >
                  <AlertTriangle size={22} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13.5px', marginBottom: '3px', color: '#b91c1c' }}>
                      ⛔ CẢNH BÁO CHẶN: Số sau không được nhỏ hơn số trước!
                    </div>
                    <div>
                      Chỉ số vừa nhập (<strong>{currentNum}</strong>) nhỏ hơn chỉ số kỳ trước (<strong>{formatVN(previousValue)} {selectedPoint.unit}</strong>). Chỉ số đồng hồ không được phép giảm. Nút lưu đã bị khóa, vui lòng kiểm tra lại mặt đồng hồ thực tế!
                    </div>
                  </div>
                </div>
              )}

              {/* Hộp Realtime: Tính toán sản lượng tiêu thụ khi chỉ số hợp lệ */}
              {readingValue && !isNaN(currentNum) && !isSmallerThanPrevious && (
                <div className={`consumption-box ${isOutlier ? 'outlier' : 'normal'}`}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 600 }}>
                      Sản lượng tiêu thụ:
                    </span>
                    <span className="consumption-number">
                      +{formatVN(calculatedConsumption)} {selectedPoint.unit}
                    </span>
                  </div>
                  {isOutlier && (
                    <div className="consumption-warning">
                      <AlertTriangle size={15} />
                      <span>Cảnh báo: Sản lượng tăng đột biến (&gt; 150% so với kỳ trước). Vui lòng kiểm tra lại.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Nếu là điện 3 giá: Mở rộng nhập T1, T2, T3 */}
              {selectedPoint.tariffType === 'THREE_PHASE' && (
                <div className="three-phase-box">
                  <span className="three-phase-title">
                    Chi tiết 3 biểu giá (Tùy chọn):
                  </span>
                  <div className="three-phase-grid">
                    <div>
                      <label>T1 (Bình thường)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        placeholder="kWh"
                        value={normalValue}
                        onChange={(e) => setNormalValue(e.target.value)}
                      />
                    </div>
                    <div>
                      <label>T2 (Cao điểm)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        placeholder="kWh"
                        value={peakValue}
                        onChange={(e) => setPeakValue(e.target.value)}
                      />
                    </div>
                    <div>
                      <label>T3 (Thấp điểm)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        placeholder="kWh"
                        value={offPeakValue}
                        onChange={(e) => setOffPeakValue(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Ghi chú */}
              <div style={{ marginBottom: '18px' }}>
                <label className="form-label-scan">
                  Ghi chú / Hiện tượng bất thường (nếu có)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ví dụ: Đồng hồ chạy êm, không rung giật..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="scan-textarea"
                />
              </div>

              {/* Nút gửi */}
              <button
                type="submit"
                disabled={submitting || !readingValue || isSmallerThanPrevious}
                className="scan-submit-btn"
                style={isSmallerThanPrevious ? { opacity: 0.6, cursor: 'not-allowed', backgroundColor: '#9ca3af' } : undefined}
              >
                {submitting ? <RefreshCw size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                <span>{isSmallerThanPrevious ? 'ĐÃ KHÓA (SỐ SAU < SỐ TRƯỚC)' : 'XÁC NHẬN LƯU CHỈ SỐ'}</span>
              </button>
            </form>
          )}

          {/* FORM 2: THEO DÕI BẬT / TẮT HỆ THỐNG PHỤ TRỢ */}
          {selectedPoint.type === 'SYSTEM_AUX' && (
            <form onSubmit={handleSubmitSystemStatus} className="card scan-input-card">
              <h4 className="form-card-title">
                THEO DÕI BẬT / TẮT & GIỜ CHẠY MÁY
              </h4>

              {/* Chọn trạng thái máy */}
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label-scan">
                  Trạng thái vận hành hiện tại:
                </label>
                <div className="status-buttons-grid">
                  {[
                    { key: 'RUNNING', label: 'BẬT MÁY (RUNNING)', color: '#16a34a', bg: '#f0fdf4' },
                    { key: 'OFF', label: 'TẮT MÁY (OFF)', color: '#64748b', bg: '#f8fafc' },
                    { key: 'STANDBY', label: 'CHẾ ĐỘ CHỜ (STANDBY)', color: '#ea580c', bg: '#fff7ed' },
                    { key: 'FAULT', label: 'BÁO SỰ CỐ (FAULT)', color: '#dc2626', bg: '#fef2f2' },
                  ].map((s) => (
                    <button
                      type="button"
                      key={s.key}
                      onClick={() => setSystemStatus(s.key)}
                      className={`status-btn ${systemStatus === s.key ? 'active' : ''}`}
                      style={{
                        borderColor: systemStatus === s.key ? s.color : '#cbd5e1',
                        backgroundColor: systemStatus === s.key ? s.bg : '#ffffff',
                        color: systemStatus === s.key ? s.color : '#475569',
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Số giờ chạy tích lũy (Hour meter) */}
              <div style={{ marginBottom: '14px' }}>
                <label className="form-label-scan">
                  Số giờ chạy trên đồng hồ (Hour meter):
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  placeholder="Ví dụ: 3450 Giờ"
                  value={runningHours}
                  onChange={(e) => setRunningHours(e.target.value)}
                  className="scan-input"
                />
              </div>

              {/* Lý do bật / tắt */}
              <div style={{ marginBottom: '18px' }}>
                <label className="form-label-scan">
                  Lý do / Mô tả chi tiết (nếu tắt hoặc có sự cố)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ví dụ: Bật cấp lạnh cho xưởng sản xuất, hoặc Tắt máy do hết ca..."
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="scan-textarea"
                />
              </div>

              {/* Nút gửi */}
              <button
                type="submit"
                disabled={submitting}
                className="scan-submit-btn"
              >
                {submitting ? <RefreshCw size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                <span>CẬP NHẬT TRẠNG THÁI HỆ THỐNG</span>
              </button>
            </form>
          )}
        </div>
      )}

    </div>
  );
};
