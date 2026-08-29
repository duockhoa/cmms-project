import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { 
  ClipboardCheck, ArrowLeft, CheckCircle2, AlertTriangle, 
  MapPin, Cpu, Clock, RefreshCw, Sliders, ShieldAlert, Sparkles
} from 'lucide-react';
import { useToast } from '../components/common/Toast';

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
  const toast = useToast();

  const [equipment, setEquipment] = useState<any>(null);
  const [parameters, setParameters] = useState<EquipmentParam[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');

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
                borderRadius: '6px',
                backgroundColor: 'rgba(37, 99, 235, 0.08)',
                color: '#2563eb',
              }}
            >
              {parameters.length} thông số theo dõi
            </span>
          )}
        </div>

        {/* Equipment Info Banner */}
        <div
          style={{
            marginBottom: '24px',
            padding: '14px 18px',
            backgroundColor: 'var(--bg-primary, #f8fafc)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: '13px',
                  backgroundColor: 'rgba(37, 99, 235, 0.1)',
                  color: '#2563eb',
                  padding: '2px 8px',
                  borderRadius: '4px',
                }}
              >
                {equipment.code}
              </span>
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {equipment.name}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '16px', marginTop: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={12} /> {equipment.location || 'Chưa cập nhật xưởng'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Cpu size={12} /> {equipment.category || 'Thiết bị'}
              </span>
            </div>
          </div>

          <span
            style={{
              fontSize: '11.5px',
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: '10px',
              backgroundColor: '#dcfce7',
              color: '#16a34a',
            }}
          >
            Đang hoạt động
          </span>
        </div>

        {/* Outlier Alert Banner */}
        {outlierCount > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 16px',
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '8px',
              color: '#b45309',
              fontSize: '13px',
              marginBottom: '20px',
            }}
          >
            <ShieldAlert size={18} style={{ flexShrink: 0 }} />
            <span>
              Phát hiện <strong>{outlierCount}</strong> thông số nằm ngoài ngưỡng tiêu chuẩn Min/Max! Vui lòng kiểm tra lại thiết bị hoặc nhập ghi chú giải trình.
            </span>
          </div>
        )}

        {/* Empty state when no parameters configured */}
        {parameters.length === 0 ? (
          <div
            style={{
              padding: '36px 20px',
              textAlign: 'center',
              backgroundColor: 'var(--bg-primary, #f8fafc)',
              borderRadius: '8px',
              border: '1px dashed var(--border-color, #e2e8f0)',
            }}
          >
            <Sliders size={32} style={{ color: 'var(--accent-blue, #2563eb)', opacity: 0.7, margin: '0 auto 10px auto' }} />
            <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Thiết bị chưa được cấu hình thông số vận hành
            </h4>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto 16px auto' }}>
              Để nhập số liệu vận hành cho máy này, vui lòng gán các thông số đo (Nhiệt độ, Áp suất...) trong phần Cài đặt hệ thống.
            </p>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => navigate('/settings')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Sliders size={14} /> Đi đến Thiết lập thông số máy
            </button>
          </div>
        ) : (
          <form onSubmit={onFinish} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {parameters.map((param, index) => {
                const val = formData[param.id];
                const status = checkSpecStatus(param, val);
                const isOutlier = status === 'OUT_OF_SPEC_LOW' || status === 'OUT_OF_SPEC_HIGH';
                const isNormal = status === 'NORMAL';

                return (
                  <div
                    key={param.id}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '8px',
                      border: isOutlier
                        ? '1.5px solid #f59e0b'
                        : isNormal
                        ? '1.5px solid #10b981'
                        : '1px solid var(--border-color, #e2e8f0)',
                      backgroundColor: isOutlier
                        ? 'rgba(245, 158, 11, 0.03)'
                        : isNormal
                        ? 'rgba(16, 185, 129, 0.02)'
                        : 'var(--bg-secondary, #ffffff)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                      <label
                        htmlFor={`param-${param.id}`}
                        style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <span>{index + 1}. {param.name}</span>
                        {param.unit && (
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              backgroundColor: 'var(--bg-hover, #f1f5f9)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            ({param.unit})
                          </span>
                        )}
                      </label>

                      {/* Spec Range Badge */}
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Tiêu chuẩn:{' '}
                        <strong style={{ color: 'var(--text-primary)' }}>
                          {param.minSpec !== null && param.maxSpec !== null
                            ? `${param.minSpec} ~ ${param.maxSpec}`
                            : param.minSpec !== null
                            ? `≥ ${param.minSpec}`
                            : param.maxSpec !== null
                            ? `≤ ${param.maxSpec}`
                            : 'Không giới hạn'}
                          {param.unit ? ` ${param.unit}` : ''}
                        </strong>
                      </div>
                    </div>

                    {/* Input Field & Outlier Status Tag */}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <input
                          id={`param-${param.id}`}
                          type="number"
                          step="any"
                          className="form-input"
                          placeholder={`Nhập giá trị thực tế${param.unit ? ` (${param.unit})` : ''}...`}
                          value={val || ''}
                          onChange={(e) => handleInputChange(param.id, e.target.value)}
                          style={{
                            fontSize: '14.5px',
                            height: '42px',
                            fontWeight: 600,
                            borderColor: isOutlier ? '#f59e0b' : isNormal ? '#10b981' : undefined,
                          }}
                        />
                      </div>

                      {/* Status indicator badge */}
                      {isOutlier && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 700,
                            backgroundColor: '#fef3c7',
                            color: '#b45309',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <AlertTriangle size={14} /> Vượt ngưỡng
                        </span>
                      )}

                      {isNormal && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 700,
                            backgroundColor: '#dcfce7',
                            color: '#16a34a',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <CheckCircle2 size={14} /> Đạt chuẩn
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* General Notes Field */}
            <div className="form-group" style={{ marginTop: '8px' }}>
              <label className="form-label" style={{ fontWeight: 600 }}>
                Ghi chú / Tình trạng vận hành máy (tùy chọn)
              </label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Ghi chú thêm về tiếng ồn, nhiệt độ vỏ máy, tình trạng rung lắc hoặc giải trình nếu có thông số vượt chuẩn..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ resize: 'vertical', fontSize: '13px' }}
              />
            </div>

            {/* Submit Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border-color, #e2e8f0)',
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate('/operation-logs')}
                disabled={submitting}
              >
                Hủy
              </button>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 24px', fontSize: '14px' }}
              >
                {submitting ? <RefreshCw size={16} className="animate-spin" /> : <ClipboardCheck size={16} />}
                Lưu vào Sổ vận hành
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
