import React from 'react';
import type { UtilitiesPageViewModel } from '../../hooks/useUtilitiesPage';

interface UtilityModalProps {
  model: UtilitiesPageViewModel;
}

export const UtilityPointModal: React.FC<UtilityModalProps> = ({ model }) => {
  const { editingPoint, pointForm, setPointForm, handleSavePoint, setShowPointModal } = model;

  return (
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

              <div style={{ padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="isSupplyMeterCheckbox"
                  checked={pointForm.isSupplyMeter}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setPointForm({
                      ...pointForm,
                      isSupplyMeter: checked,
                      ...(checked ? { isRecycledWater: false, isExcludedFromTotal: false } : {}),
                    });
                  }}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="isSupplyMeterCheckbox" style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', cursor: 'pointer', margin: 0 }}>
                  Đồng hồ nguồn tổng cấp (Nguồn cấp vào từ Điện lực / Thủy cục)
                </label>
              </div>

              {pointForm.type === 'WATER' && (
                <div style={{ padding: '10px 14px', backgroundColor: '#f5f3ff', borderRadius: '8px', border: '1px solid #ddd6fe', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    id="isRecycledWaterCheckbox"
                    checked={pointForm.isRecycledWater}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setPointForm({
                        ...pointForm,
                        isRecycledWater: checked,
                        ...(checked ? { isSupplyMeter: false, isExcludedFromTotal: false } : {}),
                      });
                    }}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="isRecycledWaterCheckbox" style={{ fontSize: '13px', fontWeight: 600, color: '#6b21a8', cursor: 'pointer', margin: 0 }}>
                    Đồng hồ đo nước tái sử dụng / tuần hoàn (Hệ thống tự động loại trừ khỏi Tổng sử dụng để tránh tính trùng 2 lần)
                  </label>
                </div>
              )}

              <div style={{ padding: '10px 14px', backgroundColor: '#fffbeb', borderRadius: '8px', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="isExcludedFromTotalCheckbox"
                  checked={pointForm.isExcludedFromTotal}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setPointForm({
                      ...pointForm,
                      isExcludedFromTotal: checked,
                      ...(checked ? { isSupplyMeter: false, isRecycledWater: false } : {}),
                    });
                  }}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="isExcludedFromTotalCheckbox" style={{ fontSize: '13px', fontWeight: 600, color: '#92400e', cursor: 'pointer', margin: 0 }}>
                  Đồng hồ đo đối chứng / trung gian nối tiếp (Không tính vào Tổng cấp & Không tính vào Tổng dùng)
                </label>
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
  );
};
