import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../components/common/Toast';
import { 
  Camera, X, ArrowLeft, Zap, Droplets, Cpu, 
  CheckCircle2, AlertTriangle, Clock, RefreshCw, 
  Search, ShieldAlert, FileText, ChevronRight
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
  const [shift, setShift] = useState<string>('Ca 1');
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
      // Delay nhỏ để DOM render phần tử "utility-qr-reader"
      const timer = setTimeout(() => {
        try {
          scanner = new Html5QrcodeScanner(
            'utility-qr-reader',
            { fps: 10, qrbox: { width: 250, height: 250 } },
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
                  // Thử gọi backend tìm kiếm
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
            (error: any) => {
              // Ignore scan frame error
            },
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
    // Reset inputs
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
        shift,
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

      // Reset để quét điểm tiếp theo
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
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '16px', minHeight: '85vh' }}>
      {/* Header Điều hướng */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <button
          onClick={() => navigate('/utilities')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary, #64748b)',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            padding: '6px 0',
          }}
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
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#0f172a',
              cursor: 'pointer',
            }}
          >
            <Camera size={16} />
            <span>Quét Mã Khác</span>
          </button>
        )}
      </div>

      {/* 1. MÀN HÌNH QUÉT CAMERA QR */}
      {scanning && !selectedPoint && (
        <div className="card" style={{ padding: '20px', borderRadius: '12px', textAlign: 'center', backgroundColor: '#ffffff', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#2563eb', marginBottom: '12px' }}>
            <Camera size={32} />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 6px 0', color: '#0f172a' }}>
            QUÉT MÃ QR TIỆN ÍCH / NĂNG LƯỢNG
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0' }}>
            Hướng camera vào tem mã QR dán trên mặt đồng hồ điện, đồng hồ nước hoặc tủ điều khiển hệ thống máy.
          </p>

          {/* Camera Scanner Box */}
          <div
            id="utility-qr-reader"
            style={{
              width: '100%',
              maxWidth: '360px',
              margin: '0 auto',
              borderRadius: '10px',
              overflow: 'hidden',
              border: '2px dashed #94a3b8',
              backgroundColor: '#f8fafc',
            }}
          />

          {/* Hoặc chọn thủ công từ danh sách */}
          <div style={{ marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '10px' }}>
              HOẶC CHỌN TRỰC TIẾP TỪ DANH SÁCH ĐIỂM ĐO:
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
              {points.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleSelectPoint(p)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    backgroundColor: '#ffffff',
                    transition: 'background-color 0.15s ease',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {p.type === 'ELECTRICITY' && <Zap size={18} color="#eab308" />}
                    {p.type === 'WATER' && <Droplets size={18} color="#0ea5e9" />}
                    {p.type === 'SYSTEM_AUX' && <Cpu size={18} color="#8b5cf6" />}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#0f172a' }}>{p.name}</div>
                      <div style={{ fontSize: '11.5px', color: '#64748b' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Card Tóm tắt Thiết bị được chọn */}
          <div
            className="card"
            style={{
              padding: '16px 20px',
              borderRadius: '12px',
              backgroundColor: '#ffffff',
              borderLeft: selectedPoint.type === 'ELECTRICITY' ? '5px solid #eab308' : selectedPoint.type === 'WATER' ? '5px solid #0ea5e9' : '5px solid #8b5cf6',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
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

            <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 4px 0', color: '#0f172a' }}>
              {selectedPoint.name}
            </h3>
            <p style={{ fontSize: '12.5px', color: '#64748b', margin: 0 }}>
              Vị trí: <strong>{selectedPoint.location}</strong> {selectedPoint.multiplier > 1 ? `• Hệ số nhân CT: x${selectedPoint.multiplier}` : ''}
            </p>

            {/* Chỉ số lần trước để đối chiếu */}
            <div
              style={{
                marginTop: '12px',
                padding: '10px 14px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Chỉ số ghi nhận gần nhất:</span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                  {previousValue.toLocaleString()} {selectedPoint.unit}
                </span>
              </div>
              <Clock size={20} color="#94a3b8" />
            </div>
          </div>

          {/* FORM 1: NHẬP SỐ ĐIỆN HOẶC SỐ NƯỚC */}
          {(selectedPoint.type === 'ELECTRICITY' || selectedPoint.type === 'WATER') && (
            <form onSubmit={handleSubmitReading} className="card" style={{ padding: '20px', borderRadius: '12px', backgroundColor: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 16px 0', color: '#0f172a' }}>
                GHI NHẬN CHỈ SỐ THEO CA
              </h4>

              {/* Ca trực */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Ca trực
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {['Ca 1', 'Ca 2', 'Ca 3'].map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setShift(c)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: shift === c ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        backgroundColor: shift === c ? '#eff6ff' : '#ffffff',
                        color: shift === c ? '#1e40af' : '#475569',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ô nhập chỉ số mới */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                  Chỉ số mới trên đồng hồ ({selectedPoint.unit}) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder={`Ví dụ: ${previousValue + 10}`}
                  value={readingValue}
                  onChange={(e) => setReadingValue(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    fontSize: '18px',
                    fontWeight: 700,
                    borderRadius: '8px',
                    border: isOutlierOrReverse ? '2px solid #dc2626' : '2px solid #cbd5e1',
                    outline: 'none',
                    boxSizing: 'border-box',
                    backgroundColor: '#ffffff',
                  }}
                  autoFocus
                />
              </div>

              {/* Hộp Realtime: Tính toán sản lượng tiêu thụ */}
              {readingValue && !isNaN(currentNum) && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    backgroundColor: isOutlierOrReverse ? '#fef2f2' : '#f0fdf4',
                    border: isOutlierOrReverse ? '1px solid #fecaca' : '1px solid #bbf7d0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12.5px', color: isOutlierOrReverse ? '#991b1b' : '#166534', fontWeight: 600 }}>
                      Sản lượng tiêu thụ ca này:
                    </span>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: isOutlierOrReverse ? '#dc2626' : '#15803d' }}>
                      +{calculatedConsumption.toLocaleString()} {selectedPoint.unit}
                    </span>
                  </div>
                  {diff < 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>
                      <AlertTriangle size={15} />
                      <span>Cảnh báo: Chỉ số mới nhỏ hơn chỉ số cũ! Vui lòng kiểm tra lại.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Nếu là điện 3 giá: Mở rộng nhập T1, T2, T3 */}
              {selectedPoint.tariffType === 'THREE_PHASE' && (
                <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '8px' }}>
                    Chi tiết 3 biểu giá (Tùy chọn):
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: '#64748b' }}>T1 (Bình thường)</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="kWh"
                        value={normalValue}
                        onChange={(e) => setNormalValue(e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#64748b' }}>T2 (Cao điểm)</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="kWh"
                        value={peakValue}
                        onChange={(e) => setPeakValue(e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#64748b' }}>T3 (Thấp điểm)</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="kWh"
                        value={offPeakValue}
                        onChange={(e) => setOffPeakValue(e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Ghi chú */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Ghi chú / Hiện tượng bất thường (nếu có)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ví dụ: Đồng hồ chạy êm, không rung giật..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              {/* Nút gửi */}
              <button
                type="submit"
                disabled={submitting || !readingValue}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting || !readingValue ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {submitting ? <RefreshCw size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                <span>XÁC NHẬN LƯU CHỈ SỐ CA</span>
              </button>
            </form>
          )}

          {/* FORM 2: THEO DÕI BẬT / TẮT HỆ THỐNG PHỤ TRỢ */}
          {selectedPoint.type === 'SYSTEM_AUX' && (
            <form onSubmit={handleSubmitSystemStatus} className="card" style={{ padding: '20px', borderRadius: '12px', backgroundColor: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <h4 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 16px 0', color: '#0f172a' }}>
                THEO DÕI BẬT / TẮT & GIỜ CHẠY MÁY
              </h4>

              {/* Chọn trạng thái máy */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>
                  Trạng thái vận hành hiện tại:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
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
                      style={{
                        padding: '12px 10px',
                        borderRadius: '8px',
                        border: systemStatus === s.key ? `2px solid ${s.color}` : '1px solid #cbd5e1',
                        backgroundColor: systemStatus === s.key ? s.bg : '#ffffff',
                        color: systemStatus === s.key ? s.color : '#475569',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Số giờ chạy tích lũy (Hour meter) */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '6px' }}>
                  Số giờ chạy trên đồng hồ (Hour meter):
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="Ví dụ: 3450 Giờ"
                  value={runningHours}
                  onChange={(e) => setRunningHours(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '16px',
                    fontWeight: 700,
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Lý do bật / tắt */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Lý do / Mô tả chi tiết (nếu tắt hoặc có sự cố)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ví dụ: Bật cấp lạnh cho xưởng sản xuất, hoặc Tắt máy do hết ca..."
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              {/* Nút gửi */}
              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
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
