import React from 'react';
import { 
  ClipboardCheck, CheckCircle2, AlertTriangle, 
  MapPin, Clock, RefreshCw, Sliders, ShieldAlert,
  ShieldCheck 
} from 'lucide-react';
import { PageHeader } from '../common';
import { EquipmentParam, checkSpecStatus } from '../../hooks/useOperationLogForm';

interface OperationLogInputFormProps {
  equipment: any;
  parameters: EquipmentParam[];
  verifiedTime: string;
  formData: Record<string, string>;
  notes: string;
  setNotes: (notes: string) => void;
  outlierCount: number;
  submitting: boolean;
  handleInputChange: (paramId: string, value: string) => void;
  onFinish: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export const OperationLogInputForm: React.FC<OperationLogInputFormProps> = ({
  equipment,
  parameters,
  verifiedTime,
  formData,
  notes,
  setNotes,
  outlierCount,
  submitting,
  handleInputChange,
  onFinish,
  onCancel,
}) => {
  return (
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
      <PageHeader
        title="Ghi nhận Thông số Vận hành"
        subtitle={`Thời điểm ghi nhận: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date().toLocaleDateString('vi-VN')}`}
        badge={(
          <>
            <ClipboardCheck size={22} style={{ color: 'var(--accent-blue, #2563eb)' }} />
            {parameters.length > 0 && (
              <span className="badge badge-info">
                <Sliders size={13} /> {parameters.length} thông số theo dõi
              </span>
            )}
          </>
        )}
      />

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
              onClick={onCancel}
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
  );
};
