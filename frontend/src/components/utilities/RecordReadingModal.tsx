import React from 'react';
import type { UtilitiesPageViewModel } from '../../hooks/useUtilitiesPage';
import { Edit2, X } from 'lucide-react';

interface UtilityModalProps {
  model: UtilitiesPageViewModel;
}

export const RecordReadingModal: React.FC<UtilityModalProps> = ({ model }) => {
  const { editModalReading, savingEditReading, setEditModalReading, editReadingForm, setEditReadingForm, handleConfirmEditReading } = model;

  return (
        <div 
          className="modal-overlay" 
          style={{ zIndex: 1100, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)' }}
          onClick={() => {
            if (!savingEditReading) {
              setEditModalReading(null);
            }
          }}
        >
          <div 
            className="modal-content" 
            style={{ 
              maxWidth: '520px', 
              padding: '24px', 
              backgroundColor: '#ffffff', 
              borderRadius: '12px', 
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e2e8f0' 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#2563eb' }}>
                  <Edit2 size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Chỉnh Sửa Bản Ghi Chỉ Số
                  </h3>
                  <span style={{ fontSize: '11.5px', color: '#6b7280' }}>
                    Hệ thống sẽ tự động cập nhật sản lượng và liên kết lại chuỗi bản ghi.
                  </span>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setEditModalReading(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
                title="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            {/* Meter Info card */}
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px', fontSize: '12.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#64748b' }}>Đồng hồ / Điểm đo:</span>
                <strong>{editModalReading.point?.name} ({editModalReading.point?.code})</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#64748b' }}>Hệ số nhân (TI / TU):</span>
                <strong style={{ color: '#0284c7' }}>x{editModalReading.point?.multiplier ?? 1.0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Đơn vị đo:</span>
                <span style={{ fontWeight: 600 }}>{editModalReading.point?.unit || 'kWh'}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmEditReading}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Chỉ số trước (Số cũ) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    className="form-input"
                    value={editReadingForm.previousValue}
                    onChange={e => setEditReadingForm({ ...editReadingForm, previousValue: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Chỉ số ghi nhận (Số mới) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    className="form-input"
                    value={editReadingForm.readingValue}
                    onChange={e => setEditReadingForm({ ...editReadingForm, readingValue: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {/* Live preview consumption calculation */}
              <div style={{ 
                padding: '10px 12px', 
                backgroundColor: '#f0fdf4', 
                border: '1px solid #bbf7d0', 
                borderRadius: '6px', 
                marginBottom: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#166534' }}>Sản lượng tiêu thụ tính toán:</div>
                  <div style={{ fontSize: '11px', color: '#15803d', fontFamily: 'monospace' }}>
                    ({editReadingForm.readingValue} - {editReadingForm.previousValue}) × {editModalReading.point?.multiplier ?? 1.0}
                  </div>
                </div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#15803d' }}>
                  +{((Number(editReadingForm.readingValue) - Number(editReadingForm.previousValue)) * (editModalReading.point?.multiplier ?? 1.0)).toLocaleString()} {editModalReading.point?.unit}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Thời gian ghi số *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    className="form-input"
                    value={editReadingForm.recordedAt}
                    onChange={e => setEditReadingForm({ ...editReadingForm, recordedAt: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Ca làm việc
                  </label>
                  <select
                    className="form-input"
                    value={editReadingForm.shift}
                    onChange={e => setEditReadingForm({ ...editReadingForm, shift: e.target.value })}
                  >
                    <option value="ALL">Cả ngày / Tự động</option>
                    <option value="SHIFT_1">Ca 1</option>
                    <option value="SHIFT_2">Ca 2</option>
                    <option value="SHIFT_3">Ca 3</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Ghi chú điều chỉnh
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="VD: Điều chỉnh lại do nhập nhầm số hàng đơn vị hoặc cài lại hệ số..."
                  value={editReadingForm.notes}
                  onChange={e => setEditReadingForm({ ...editReadingForm, notes: e.target.value })}
                />
              </div>

              <div className="modal-actions-row">
                <button
                  type="button"
                  onClick={() => setEditModalReading(null)}
                  className="btn-modal-cancel"
                  disabled={savingEditReading}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={savingEditReading}
                  style={{ backgroundColor: '#2563eb' }}
                >
                  {savingEditReading ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
  );
};
