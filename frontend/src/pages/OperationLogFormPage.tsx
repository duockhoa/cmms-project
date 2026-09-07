import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { 
  ClipboardCheck, ArrowLeft, CheckCircle2, AlertTriangle, 
  MapPin, Cpu, Clock, RefreshCw, Sliders, ShieldAlert, Sparkles,
  Camera, ShieldCheck, QrCode
} from 'lucide-react';
import { useToast } from '../components/common/Toast';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface EquipmentParam {
  id: string;
  name: string;
  unit?: string | null;
  minSpec?: number | null;
  maxSpec?: number | null;
  standardValue?: number | null;
  isActive: boolean;
}

export function OperationLogFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const initialVerified = Boolean(location.state?.verifiedByQr);
  const [isVerified, setIsVerified] = useState(initialVerified);
  const [verifiedTime, setVerifiedTime] = useState<string>(
    location.state?.scannedAt || (initialVerified ? new Date().toISOString() : '')
  );
  const [scanError, setScanError] = useState<string | null>(null);

  const [equipment, setEquipment] = useState<any>(null);
  const [parameters, setParameters] = useState<EquipmentParam[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');

  // QR Scanner Verification Effect when not verified yet
  useEffect(() => {
    let scanner: any = null;
    if (!isVerified && equipment) {
      const timer = setTimeout(() => {
        try {
          scanner = new Html5QrcodeScanner(
            "op-log-qr-reader",
            { fps: 10, qrbox: { width: 230, height: 230 } },
            false
          );

          scanner.render(
            async (decodedText: string) => {
              try {
                let rawText = decodedText.trim();
                if (rawText.startsWith('{') && rawText.endsWith('}')) {
                  try {
                    const parsed = JSON.parse(rawText);
                    rawText = parsed.code || parsed.equipmentCode || parsed.equipmentId || parsed.id || rawText;
                  } catch (_) {}
                }

                if (rawText.includes('/equipment/')) {
                  const match = rawText.match(/\/equipment\/([^/?#]+)/);
                  if (match) rawText = match[1];
                } else {
                  rawText = rawText
                    .replace(/^cmms-equipment:/i, '')
                    .replace(/^equipment:/i, '')
                    .replace(/^equipment\//i, '')
                    .trim();
                }

                const matchesCurrent =
                  equipment.id?.toLowerCase() === rawText.toLowerCase() ||
                  equipment.code?.toLowerCase() === rawText.toLowerCase() ||
                  (equipment.accountingCode && equipment.accountingCode.toLowerCase() === rawText.toLowerCase());

                if (matchesCurrent) {
                  scanner.clear().catch(console.error);
                  setIsVerified(true);
                  setVerifiedTime(new Date().toISOString());
                  setScanError(null);
                  toast.success('Xác thực thành công', `Đã xác nhận bạn đang có mặt tại thiết bị ${equipment.code} - ${equipment.name}.`);
                } else {
                  setScanError(`Mã QR vừa quét ("${rawText}") không khớp với máy ${equipment.code}. Vui lòng quét đúng tem QR dán trên thân máy.`);
                }
              } catch (e: any) {
                console.error(e);
              }
            },
            () => {}
          );
        } catch (e) {
          console.error(e);
        }
      }, 200);

      return () => {
        clearTimeout(timer);
        if (scanner) {
          scanner.clear().catch(console.error);
        }
      };
    }
  }, [isVerified, equipment]);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const [eqRes, paramRes] = await Promise.all([
          api.getEquipmentById(id),
          api.getEquipmentParameters(id),
        ]);
        setEquipment(eqRes);
        const activeParams = (Array.isArray(paramRes) ? paramRes : []).filter(
          (p: any) => p.isActive !== false
        );
        setParameters(activeParams);
      } catch (error: any) {
        toast.error('Lỗi', 'Không thể tải thông tin thiết bị hoặc thông số vận hành.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleInputChange = (paramId: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [paramId]: value,
    }));
  };

  // Check if a specific parameter input value is out of spec
  const checkSpecStatus = (param: EquipmentParam, valueStr?: string) => {
    if (!valueStr || valueStr.trim() === '') return 'EMPTY';
    const val = parseFloat(valueStr);
    if (isNaN(val)) return 'INVALID';

    const hasMin = param.minSpec !== null && param.minSpec !== undefined;
    const hasMax = param.maxSpec !== null && param.maxSpec !== undefined;

    if (hasMin && val < (param.minSpec as number)) return 'OUT_OF_SPEC_LOW';
    if (hasMax && val > (param.maxSpec as number)) return 'OUT_OF_SPEC_HIGH';

    return 'NORMAL';
  };

  // Count total outliers in real-time
  const outlierCount = useMemo(() => {
    return parameters.filter((param) => {
      const status = checkSpecStatus(param, formData[param.id]);
      return status === 'OUT_OF_SPEC_LOW' || status === 'OUT_OF_SPEC_HIGH';
    }).length;
  }, [parameters, formData]);

  const onFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      setSubmitting(true);
      const logs = Object.keys(formData)
        .map((paramId) => ({
          parameterId: paramId,
          value: Number(formData[paramId]),
          notes: notes.trim() || undefined,
        }))
        .filter((log) => !isNaN(log.value));

      if (logs.length === 0) {
        toast.error('Chưa có số liệu', 'Vui lòng nhập ít nhất một giá trị thông số hợp lệ.');
        setSubmitting(false);
        return;
      }

      await api.submitOperationLogs(id, logs);
      toast.success('Thành công', 'Đã lưu thông số vận hành thành công vào Sổ vận hành!');
      
      // Navigate to operation logs page or stay
      navigate('/operation-logs');
    } catch (error: any) {
      toast.error('Lỗi lưu sổ vận hành', error.message || 'Không thể lưu thông số.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-secondary)' }}>
        <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
        <div style={{ fontSize: '14px' }}>Đang nạp thông số thiết bị từ hệ thống...</div>
      </div>
    );
  }

  if (!equipment) {
    return (
      <div style={{ maxWidth: '640px', margin: '40px auto', padding: '0 20px' }}>
        <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
          <AlertTriangle size={36} color="var(--danger, #dc2626)" style={{ margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Không tìm thấy thiết bị
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Mã QR hoặc đường dẫn thiết bị không tồn tại trong hệ thống.
          </p>
          <button className="btn btn-secondary" onClick={() => navigate('/operation-logs')}>
            <ArrowLeft size={15} /> Quay lại Sổ vận hành
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '720px', margin: '30px auto', padding: '0 16px' }}>
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'none',
          border: 'none',
          color: 'var(--text-secondary, #64748b)',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: '16px',
          padding: 0,
        }}
      >
        <ArrowLeft size={16} /> Quay lại
      </button>

      {/* MÀN HÌNH 1: BẮT BUỘC QUÉT MÃ QR TẠI HIỆN TRƯỜNG */}
      {!isVerified ? (
        <div
          className="card"
          style={{
            padding: '32px 24px',
            textAlign: 'center',
            borderRadius: '16px',
            backgroundColor: '#ffffff',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
            border: '1px solid #e2e8f0',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              padding: '14px',
              borderRadius: '50%',
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              marginBottom: '14px',
            }}
          >
            <Camera size={32} />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
            QUÉT MÃ QR XÁC THỰC HIỆN TRƯỜNG
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0', lineHeight: 1.5 }}>
            Quy định vận hành yêu cầu kỹ thuật viên phải <strong>có mặt trực tiếp tại vị trí thiết bị</strong> để ghi nhận số liệu. Vui lòng hướng camera vào tem mã QR dán trên thân máy:
          </p>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              marginBottom: '18px',
            }}
          >
            <span style={{ fontWeight: 800, fontSize: '13px', color: '#2563eb' }}>{equipment.code}</span>
            <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b' }}>{equipment.name}</span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>({equipment.location})</span>
          </div>

          {/* Camera Scanner Viewport */}
          <div
            style={{
              width: '100%',
              maxWidth: '340px',
              margin: '0 auto',
              borderRadius: '10px',
              overflow: 'hidden',
              border: '2px dashed #94a3b8',
              backgroundColor: '#f8fafc',
            }}
          >
            <div id="op-log-qr-reader" />
          </div>

          {scanError && (
            <div
              style={{
                marginTop: '16px',
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: '#fee2e2',
                border: '1px solid #fca5a5',
                color: '#dc2626',
                fontSize: '12.5px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                textAlign: 'left',
              }}
            >
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <span>{scanError}</span>
            </div>
          )}

          <div
            style={{
              marginTop: '22px',
              padding: '14px 16px',
              borderRadius: '10px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              textAlign: 'left',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
            }}
          >
            <ShieldCheck size={22} color="#15803d" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '12px', color: '#166534', lineHeight: 1.5 }}>
              <strong>Yêu cầu tuân thủ kiểm tra máy:</strong> Hệ thống không cho phép nhập số liệu ca từ xa. Mã QR xác thực việc kỹ thuật viên đã trực tiếp đến kiểm tra đồng hồ và các chỉ số trên máy.
            </div>
          </div>
        </div>
      ) : (
        /* MÀN HÌNH 2: FORM NHẬP KHI ĐÃ XÁC THỰC CÓ MẶT TẠI MÁY */
        <div
          className="card"
          style={{
            padding: '28px 32px',
            borderRadius: '12px',
            backgroundColor: 'var(--bg-secondary, #ffffff)',
            boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.07)',
            border: '1px solid var(--border-color, #e2e8f0)',
          }}
        >
          {/* Banner đã xác thực vị trí QR thành công */}
          <div
            style={{
              marginBottom: '18px',
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #86efac',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803d', fontSize: '12.5px', fontWeight: 700 }}>
              <ShieldCheck size={18} />
              <span>Đã xác thực vị trí có mặt tại thiết bị qua mã QR</span>
            </div>
            <div style={{ fontSize: '11.5px', color: '#166534', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={12} /> {verifiedTime ? new Date(verifiedTime).toLocaleTimeString('vi-VN') + ' ' + new Date(verifiedTime).toLocaleDateString('vi-VN') : 'Vừa xong'}
            </div>
          </div>

          {/* Title Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ClipboardCheck size={22} style={{ color: 'var(--accent-blue, #2563eb)' }} />
                Ghi nhận Thông số Vận hành
              </h2>
              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Thời điểm ghi nhận: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date().toLocaleDateString('vi-VN')}
              </div>
            </div>

            {parameters.length > 0 && (
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: '20px',
                  backgroundColor: 'rgba(37, 99, 235, 0.08)',
                  color: 'var(--accent-blue, #2563eb)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <Sliders size={13} /> {parameters.length} thông số theo dõi
              </span>
            )}
          </div>

          {/* Equipment Badge Summary */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              backgroundColor: 'var(--bg-primary, #f8fafc)',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #e2e8f0)',
              marginBottom: '24px',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: '#2563eb', color: '#ffffff', padding: '2px 6px', borderRadius: '4px' }}>
                  {equipment.code}
                </span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {equipment.name}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={12} /> {equipment.location || 'Chưa định vị'} • Loại: {equipment.category || 'N/A'}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Quy trình ca:</span>
              <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#10b981' }}>Đang hoạt động</div>
            </div>
          </div>

          {/* Real-time Outlier Alert Banner */}
          {outlierCount > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#dc2626',
                marginBottom: '20px',
                fontSize: '13px',
              }}
            >
              <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Cảnh báo thông số vượt ngưỡng:</strong> Đang có <strong>{outlierCount}</strong> chỉ số nằm ngoài khoảng tiêu chuẩn an toàn. Vui lòng kiểm tra lại thiết bị hoặc nhập giải trình vào phần ghi chú.
              </div>
            </div>
          )}

          {/* Form Inputs Grid */}
          {parameters.length === 0 ? (
            <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              Thiết bị này chưa được cấu hình thông số vận hành nào. Vui lòng vào <strong>Cài đặt &rarr; Thiết lập thông số máy</strong> để chỉ định các chỉ tiêu cần theo dõi.
            </div>
          ) : (
            <form onSubmit={onFinish}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {parameters.map((param) => {
                  const val = formData[param.id] || '';
                  const status = checkSpecStatus(param, val);
                  const isOutlier = status === 'OUT_OF_SPEC_LOW' || status === 'OUT_OF_SPEC_HIGH';

                  return (
                    <div
                      key={param.id}
                      style={{
                        padding: '14px',
                        borderRadius: '8px',
                        border: isOutlier
                          ? '1.5px solid #ef4444'
                          : val
                          ? '1.5px solid #10b981'
                          : '1px solid var(--border-color, #e2e8f0)',
                        backgroundColor: isOutlier
                          ? 'rgba(239, 68, 68, 0.03)'
                          : val
                          ? 'rgba(16, 185, 129, 0.02)'
                          : 'var(--bg-secondary, #ffffff)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                          {param.name}
                        </label>
                        {param.unit && (
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, backgroundColor: 'rgba(0,0,0,0.04)', padding: '1px 6px', borderRadius: '4px' }}>
                            {param.unit}
                          </span>
                        )}
                      </div>

                      {/* Standard Min - Max Range Spec */}
                      <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>Tiêu chuẩn:</span>
                        <strong style={{ color: 'var(--text-primary)' }}>
                          {param.minSpec !== null && param.minSpec !== undefined && param.maxSpec !== null && param.maxSpec !== undefined
                            ? `${param.minSpec} ~ ${param.maxSpec} ${param.unit || ''}`
                            : param.minSpec !== null && param.minSpec !== undefined
                            ? `≥ ${param.minSpec} ${param.unit || ''}`
                            : param.maxSpec !== null && param.maxSpec !== undefined
                            ? `≤ ${param.maxSpec} ${param.unit || ''}`
                            : 'Không giới hạn'}
                        </strong>
                      </div>

                      {/* Number Input */}
                      <div style={{ position: 'relative' }}>
                        <input
                          type="number"
                          step="any"
                          className="form-input"
                          placeholder={param.standardValue !== null && param.standardValue !== undefined ? `Chuẩn: ${param.standardValue}` : 'Nhập giá trị đo...'}
                          value={val}
                          onChange={(e) => handleInputChange(param.id, e.target.value)}
                          style={{
                            width: '100%',
                            fontSize: '14px',
                            fontWeight: 600,
                            paddingRight: isOutlier || (val && !isOutlier) ? '32px' : '10px',
                            borderColor: isOutlier ? '#ef4444' : undefined,
                          }}
                        />

                        {isOutlier && (
                          <AlertTriangle
                            size={16}
                            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#ef4444' }}
                          />
                        )}

                        {val && !isOutlier && (
                          <CheckCircle2
                            size={16}
                            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#10b981' }}
                          />
                        )}
                      </div>

                      {/* Validation Subtext */}
                      {isOutlier && (
                        <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '5px', fontWeight: 500 }}>
                          Vượt tiêu chuẩn an toàn
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Ghi chú ca */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Ghi chú tình trạng ca làm việc
                </label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Ghi chú thêm về tiếng ồn khác thường, rò rỉ, rung động, sự cố phát sinh (nếu có)..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ width: '100%', fontSize: '13px', resize: 'vertical' }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => navigate('/operation-logs')}
                  disabled={submitting}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '150px', justifyContent: 'center' }}
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Đang lưu...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} /> Lưu sổ vận hành
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

