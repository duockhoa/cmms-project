import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../components/common/Toast';
import { 
  Camera, ArrowLeft, Zap, Droplets, Cpu, 
  CheckCircle2, AlertTriangle, Clock, RefreshCw, 
  ChevronRight
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export const UtilityScanPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();

  const [points, setPoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPoint, setSelectedPoint] = useState<any | null>(null);
  const [scanning, setScanning] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State cho Điện & Nước
  const [readingValue, setReadingValue] = useState<string>('');
  const [normalValue, setNormalValue] = useState<string>('');
  const [peakValue, setPeakValue] = useState<string>('');
  const [offPeakValue, setOffPeakValue] = useState<string>('');
  const [powerKw, setPowerKw] = useState<string>('');
  const [powerFactor, setPowerFactor] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Form State cho Hệ thống phụ trợ (Bật / Tắt)
  const [systemStatus, setSystemStatus] = useState<string>('RUNNING');
  const [runningHours, setRunningHours] = useState<string>('');
  const [statusReason, setStatusReason] = useState<string>('');

  // Tải danh sách điểm đo khi khởi động
  useEffect(() => {
    const fetchPoints = async () => {
      try {
        setLoading(true);
        const data = await api.getUtilityPoints({ isActive: true });
        const list = Array.isArray(data) ? data : [];
        setPoints(list);

        // Nếu có query param code hoặc id, tự động chọn
        const queryCode = searchParams.get('code') || searchParams.get('id');
        if (queryCode) {
          const match = list.find((p) => p.code === queryCode || p.id === queryCode);
          if (match) {
            handleSelectPoint(match);
            setScanning(false);
          }
        }
      } catch (err) {
        console.error('Lỗi khi tải danh sách điểm đo:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPoints();
  }, [searchParams]);

  // Setup camera scanner
  useEffect(() => {
    let scanner: any = null;
    if (scanning && !selectedPoint) {
      const timer = setTimeout(() => {
        try {
          scanner = new Html5QrcodeScanner(
            'utility-qr-reader',
            { fps: 10, qrbox: { width: 220, height: 220 } },
            false,
          );

          scanner.render(
            async (decodedText: string) => {
              try {
                scanner.clear().catch(console.error);
                setScanning(false);
                let text = decodedText.trim();
                
                // Hỗ trợ format JSON nếu QR in theo JSON: { "code": "ELEC-MSB-01" }
                if (text.startsWith('{') && text.endsWith('}')) {
                  try {
                    const parsed = JSON.parse(text);
                    text = parsed.code || parsed.id || text;
                  } catch (e) {}
                }

                // Xóa tiền tố nếu có (VD: UTILITY:ELEC:MSB-01 -> ELEC-MSB-01)
                const cleanCode = text.replace(/^UTILITY:(ELEC|WATER|SYS):/i, '');

                const found = points.find(
                  (p) =>
                    p.code.toUpperCase() === cleanCode.toUpperCase() ||
                    p.code.toUpperCase() === text.toUpperCase() ||
                    p.id === text,
                );

                if (found) {
                  handleSelectPoint(found);
                } else {
                  try {
                    const res = await api.getUtilityPointByIdOrCode(cleanCode);
                    if (res) {
                      handleSelectPoint(res);
                    }
                  } catch (e) {
                    toast.error('Không tìm thấy', `Mã QR [${cleanCode}] chưa được đăng ký trong hệ thống tiện ích.`);
                    setScanning(true);
                  }
                }
              } catch (e) {
                console.error(e);
              }
            },
            () => {},
          );
        } catch (e) {
          console.error('Lỗi khởi tạo máy quét:', e);
        }
      }, 300);

      return () => {
        clearTimeout(timer);
        if (scanner) {
          scanner.clear().catch(console.error);
        }
      };
    }
  }, [scanning, selectedPoint, points]);

  const handleSelectPoint = (point: any) => {
    setSelectedPoint(point);
    setScanning(false);
    setReadingValue('');
    setNormalValue('');
    setPeakValue('');
    setOffPeakValue('');
    setPowerKw('');
    setPowerFactor('');
    setNotes('');
    setSystemStatus(point.currentStatus || 'RUNNING');
    setRunningHours(point.lastReadingValue ? point.lastReadingValue.toString() : '');
    setStatusReason('');
  };

  // Tính toán sản lượng tiêu thụ tức thời
  const previousValue = selectedPoint ? selectedPoint.lastReadingValue || 0 : 0;
  const multiplier = selectedPoint ? selectedPoint.multiplier || 1.0 : 1.0;
  const currentNum = parseFloat(readingValue);
  const diff = !isNaN(currentNum) ? currentNum - previousValue : 0;
  const calculatedConsumption = diff >= 0 ? diff * multiplier : 0;
  const isOutlierOrReverse = !isNaN(currentNum) && (diff < 0 || (previousValue > 0 && diff > previousValue * 1.5));

  // Gửi form ghi số Điện / Nước
  const handleSubmitReading = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoint) return;
    if (isNaN(parseFloat(readingValue))) {
      toast.error('Thiếu thông tin', 'Vui lòng nhập chỉ số mới hợp lệ.');
      return;
    }

    try {
      setSubmitting(true);
      await api.recordUtilityReading({
        pointId: selectedPoint.id,
        readingValue: parseFloat(readingValue),
        normalValue: normalValue ? parseFloat(normalValue) : undefined,
        peakValue: peakValue ? parseFloat(peakValue) : undefined,
        offPeakValue: offPeakValue ? parseFloat(offPeakValue) : undefined,
        powerKw: powerKw ? parseFloat(powerKw) : undefined,
        powerFactorCosPhi: powerFactor ? parseFloat(powerFactor) : undefined,
        notes,
      });

      toast.success(
        'Thành công',
        `Đã ghi nhận chỉ số ${selectedPoint.name}: ${readingValue} ${selectedPoint.unit} (Tiêu thụ: +${calculatedConsumption.toLocaleString()} ${selectedPoint.unit}).`,
      );

      setSelectedPoint(null);
      setScanning(true);
    } catch (error: any) {
      toast.error('Lỗi lưu chỉ số', error?.message || 'Có lỗi xảy ra khi lưu chỉ số.');
    } finally {
      setSubmitting(false);
    }
  };

  // Gửi form cập nhật trạng thái Bật / Tắt hệ thống
  const handleSubmitSystemStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoint) return;

    try {
      setSubmitting(true);
      await api.recordUtilitySystemStatus({
        pointId: selectedPoint.id,
        status: systemStatus as any,
        runningHours: runningHours ? parseFloat(runningHours) : undefined,
        reason: statusReason,
      });

      toast.success(
        'Thành công',
        `Đã cập nhật trạng thái ${selectedPoint.name} thành [${systemStatus}].`,
      );

      setSelectedPoint(null);
      setScanning(true);
    } catch (error: any) {
      toast.error('Lỗi cập nhật', error?.message || 'Có lỗi xảy ra khi cập nhật trạng thái.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="utility-scan-container">
      {/* Header Điều hướng */}
      <div className="utility-scan-header">
        <button
          onClick={() => navigate('/utilities')}
          className="scan-back-btn"
        >
          <ArrowLeft size={18} />
          <span>Bảng Quản Lý Tiện Ích</span>
        </button>

        {selectedPoint && (
          <button
            onClick={() => {
              setSelectedPoint(null);
              setScanning(true);
            }}
            className="scan-other-btn"
          >
            <Camera size={16} />
            <span>Quét Mã Khác</span>
          </button>
        )}
      </div>

      {/* 1. MÀN HÌNH QUÉT CAMERA QR */}
      {scanning && !selectedPoint && (
        <div className="card scan-card">
          <div className="scan-icon-circle">
            <Camera size={30} />
          </div>
          <h2 className="scan-title">
            QUÉT MÃ QR TIỆN ÍCH / NĂNG LƯỢNG
          </h2>
          <p className="scan-subtitle">
            Hướng camera vào tem mã QR dán trên mặt đồng hồ điện, nước hoặc tủ máy.
          </p>

          {/* Camera Scanner Box */}
          <div className="scanner-viewport-wrapper">
            <div id="utility-qr-reader" />
          </div>

          {/* Hoặc chọn thủ công từ danh sách */}
          <div className="scan-manual-list-wrapper">
            <span className="scan-manual-title">
              HOẶC CHỌN ĐIỂM ĐO TỪ DANH SÁCH:
            </span>
            <div className="scan-points-list">
              {points.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleSelectPoint(p)}
                  className="scan-point-item"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {p.type === 'ELECTRICITY' && <Zap size={18} color="#eab308" />}
                    {p.type === 'WATER' && <Droplets size={18} color="#0ea5e9" />}
                    {p.type === 'SYSTEM_AUX' && <Cpu size={18} color="#8b5cf6" />}
                    <div>
                      <div className="point-item-name">{p.name}</div>
                      <div className="point-item-sub">
                        {p.code} • {p.location}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={16} color="#94a3b8" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
                  {previousValue.toLocaleString()} {selectedPoint.unit}
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
                  className={`scan-number-input ${isOutlierOrReverse ? 'error' : ''}`}
                  autoFocus
                />
              </div>

              {/* Hộp Realtime: Tính toán sản lượng tiêu thụ */}
              {readingValue && !isNaN(currentNum) && (
                <div className={`consumption-box ${isOutlierOrReverse ? 'outlier' : 'normal'}`}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 600 }}>
                      Sản lượng tiêu thụ:
                    </span>
                    <span className="consumption-number">
                      +{calculatedConsumption.toLocaleString()} {selectedPoint.unit}
                    </span>
                  </div>
                  {diff < 0 && (
                    <div className="consumption-warning">
                      <AlertTriangle size={15} />
                      <span>Cảnh báo: Chỉ số mới nhỏ hơn chỉ số cũ! Vui lòng kiểm tra lại.</span>
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
                disabled={submitting || !readingValue}
                className="scan-submit-btn"
              >
                {submitting ? <RefreshCw size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                <span>XÁC NHẬN LƯU CHỈ SỐ</span>
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

      {/* Responsive Styles */}
      <style>{`
        .utility-scan-container {
          max-width: 640px;
          margin: 0 auto;
          padding: 16px;
          min-height: 85vh;
        }

        .utility-scan-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          gap: 8px;
        }

        .scan-back-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          color: var(--text-secondary, #64748b);
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          padding: 6px 0;
        }

        .scan-other-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          background-color: #f1f5f9;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 6px 12px;
          font-size: 12.5px;
          font-weight: 600;
          color: #0f172a;
          cursor: pointer;
          white-space: nowrap;
        }

        .scan-card {
          padding: 24px 20px;
          border-radius: 12px;
          text-align: center;
          background-color: #ffffff;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        .scan-icon-circle {
          display: inline-flex;
          padding: 12px;
          border-radius: 50%;
          background-color: #eff6ff;
          color: #2563eb;
          margin-bottom: 12px;
        }

        .scan-title {
          font-size: 17px;
          font-weight: 700;
          margin: 0 0 6px 0;
          color: #0f172a;
        }

        .scan-subtitle {
          font-size: 13px;
          color: #64748b;
          margin: 0 0 16px 0;
          line-height: 1.4;
        }

        .scanner-viewport-wrapper {
          width: 100%;
          max-width: 340px;
          margin: 0 auto;
          border-radius: 10px;
          overflow: hidden;
          border: 2px dashed #94a3b8;
          background-color: #f8fafc;
        }

        .scan-manual-list-wrapper {
          margin-top: 24px;
          border-top: 1px solid #e2e8f0;
          padding-top: 16px;
          text-align: left;
        }

        .scan-manual-title {
          font-size: 12px;
          font-weight: 700;
          color: #64748b;
          display: block;
          margin-bottom: 10px;
          letter-spacing: 0.3px;
        }

        .scan-points-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 240px;
          overflow-y: auto;
        }

        .scan-point-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          cursor: pointer;
          background-color: #ffffff;
          transition: background-color 0.15s ease;
        }

        .scan-point-item:hover, .scan-point-item:active {
          background-color: #f8fafc;
        }

        .point-item-name {
          font-weight: 700;
          font-size: 13.5px;
          color: #0f172a;
        }

        .point-item-sub {
          font-size: 11.5px;
          color: #64748b;
        }

        .scan-form-container {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .scan-selected-card {
          padding: 16px 18px;
          border-radius: 12px;
          background-color: #ffffff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }

        .selected-point-title {
          font-size: 16px;
          font-weight: 700;
          margin: 0 0 4px 0;
          color: #0f172a;
        }

        .selected-point-loc {
          font-size: 12px;
          color: #64748b;
          margin: 0;
        }

        .last-reading-box {
          margin-top: 12px;
          padding: 10px 14px;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .last-reading-value {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
        }

        .scan-input-card {
          padding: 18px;
          border-radius: 12px;
          background-color: #ffffff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }

        .form-card-title {
          font-size: 14.5px;
          font-weight: 700;
          margin: 0 0 14px 0;
          color: #0f172a;
        }

        .form-label-scan {
          font-size: 12.5px;
          font-weight: 600;
          color: #334155;
          display: block;
          margin-bottom: 6px;
        }

        .shift-buttons-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .shift-btn {
          padding: 10px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background-color: #ffffff;
          color: #475569;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          touch-action: manipulation;
        }

        .shift-btn.active {
          border: 2px solid #2563eb;
          background-color: #eff6ff;
          color: #1e40af;
        }

        .scan-number-input {
          width: 100%;
          padding: 12px 14px;
          font-size: 18px;
          font-weight: 700;
          border-radius: 8px;
          border: 2px solid #cbd5e1;
          outline: none;
          box-sizing: border-box;
          background-color: #ffffff;
          transition: border-color 0.15s ease;
        }

        .scan-number-input:focus {
          border-color: #2563eb;
        }

        .scan-number-input.error {
          border-color: #dc2626;
        }

        .consumption-box {
          padding: 12px 14px;
          border-radius: 8px;
          margin-bottom: 14px;
        }

        .consumption-box.normal {
          background-color: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #166534;
        }

        .consumption-box.outlier {
          background-color: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
        }

        .consumption-number {
          font-size: 17px;
          font-weight: 800;
        }

        .consumption-box.normal .consumption-number {
          color: #15803d;
        }

        .consumption-box.outlier .consumption-number {
          color: #dc2626;
        }

        .consumption-warning {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 6px;
          font-size: 12px;
          color: #dc2626;
          font-weight: 600;
        }

        .three-phase-box {
          padding: 12px;
          background-color: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          margin-bottom: 14px;
        }

        .three-phase-title {
          font-size: 12px;
          font-weight: 700;
          color: #475569;
          display: block;
          margin-bottom: 8px;
        }

        .three-phase-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .three-phase-grid label {
          font-size: 11px;
          color: #64748b;
          display: block;
          margin-bottom: 2px;
        }

        .three-phase-grid input {
          width: 100%;
          padding: 8px;
          font-size: 13px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          box-sizing: border-box;
        }

        .status-buttons-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }

        .status-btn {
          padding: 12px 10px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-weight: 700;
          font-size: 12.5px;
          cursor: pointer;
          text-align: center;
          touch-action: manipulation;
          transition: all 0.15s ease;
        }

        .scan-input {
          width: 100%;
          padding: 10px 12px;
          font-size: 15px;
          font-weight: 600;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          outline: none;
          box-sizing: border-box;
        }

        .scan-textarea {
          width: 100%;
          padding: 10px 12px;
          font-size: 13px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          box-sizing: border-box;
          outline: none;
          font-family: inherit;
        }

        .scan-submit-btn {
          width: 100%;
          padding: 14px;
          background-color: #0f172a;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-size: 14.5px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          touch-action: manipulation;
        }

        .scan-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Mobile Adjustments */
        @media (max-width: 480px) {
          .utility-scan-container {
            padding: 10px 8px;
          }
          .scan-card, .scan-input-card, .scan-selected-card {
            padding: 14px 12px;
          }
          .three-phase-grid {
            grid-template-columns: 1fr;
            gap: 6px;
          }
          .status-buttons-grid {
            grid-template-columns: 1fr;
            gap: 6px;
          }
          .status-btn {
            padding: 10px 8px;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
};
