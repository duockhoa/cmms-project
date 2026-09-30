import React from 'react';
import type { UtilitiesPageViewModel } from '../../hooks/useUtilitiesPage';
import { Ban, Edit2, Printer, RefreshCw, ShieldAlert, X } from 'lucide-react';
import { printSingleQRTag } from '../../utils/qrPrintHelper';

interface UtilityModalProps {
  model: UtilitiesPageViewModel;
}

export const VoidReadingModal: React.FC<UtilityModalProps> = ({ model }) => {
  const { voidModalReading, voiding, setVoidModalReading, voidReason, setVoidReason, handleConfirmVoidReading } = model;

  return (
        <div 
          className="modal-overlay" 
          style={{ zIndex: 1100, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)' }}
          onClick={() => {
            if (!voiding) {
              setVoidModalReading(null);
              setVoidReason('');
            }
          }}
        >
          <div 
            className="modal-content" 
            style={{ 
              maxWidth: '480px', 
              padding: '24px', 
              backgroundColor: '#ffffff', 
              borderRadius: '12px', 
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e2e8f0' 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid #fee2e2', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', borderRadius: '50%', backgroundColor: '#fee2e2', color: '#dc2626' }}>
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#991b1b' }}>
                    Xác nhận Hủy Kết Quả Ghi Sai
                  </h3>
                  <span style={{ fontSize: '11.5px', color: '#6b7280' }}>
                    Cơ chế Audit Trail: Dữ liệu được bảo toàn lưu vết, không bị xóa khỏi CSDL.
                  </span>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => { setVoidModalReading(null); setVoidReason(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
                title="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', marginBottom: '14px', fontSize: '12.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#64748b' }}>Điểm đo / Đồng hồ:</span>
                <strong>{voidModalReading.point?.name} ({voidModalReading.point?.code})</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#64748b' }}>Thời gian ghi:</span>
                <span>{new Date(voidModalReading.recordedAt).toLocaleString('vi-VN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#64748b' }}>Chỉ số ghi nhận:</span>
                <strong style={{ color: '#dc2626', fontSize: '14px' }}>
                  {voidModalReading.readingValue?.toLocaleString()} {voidModalReading.point?.unit}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Sản lượng tính sai:</span>
                <span style={{ color: '#b45309', fontWeight: 700 }}>
                  +{voidModalReading.consumption?.toLocaleString()} {voidModalReading.point?.unit}
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmVoidReading}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Lý do đánh dấu hủy <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  className="modal-textarea"
                  rows={3}
                  required
                  placeholder="Ví dụ: Nhân viên nhìn nhầm số hàng chục, nhập thừa số 0, hoặc ghi nhầm đồng hồ..."
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  style={{ width: '100%', borderColor: '#cbd5e1', fontSize: '13px' }}
                />
                <small style={{ color: '#64748b', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                  * Sau khi hủy, chỉ số đồng hồ sẽ tự động được hoàn nguyên về số hợp lệ gần nhất để NV tiếp tục ghi số đúng.
                </small>
              </div>

              <div className="modal-actions-row">
                <button
                  type="button"
                  onClick={() => {
                    setVoidModalReading(null);
                    setVoidReason('');
                  }}
                  className="btn-modal-cancel"
                  disabled={voiding}
                >
                  Đóng / Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={voiding || !voidReason.trim()}
                  style={{
                    backgroundColor: '#dc2626',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {voiding ? <RefreshCw size={14} className="animate-spin" /> : <Ban size={14} />}
                  <span>Xác nhận Hủy Kết Quả</span>
                </button>
              </div>
            </form>
          </div>
        </div>
  );
};
