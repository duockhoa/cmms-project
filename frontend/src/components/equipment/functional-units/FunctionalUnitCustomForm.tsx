import React from 'react';

export const FunctionalUnitCustomForm: React.FC<any> = ({
  allCategories, editingUnit, formData, modalMode, setFormData,
}) => (
  <>
            {/* ==================================================== */}
            {/* TAB 2: TẠO CỤM MỚI ĐỘC LẬP / CHỈNH SỬA CỤM HIỆN CÓ  */}
            {/* ==================================================== */}
            {(editingUnit || modalMode === 'CUSTOM') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Tên cụm chức năng *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="VD: Cụm bơm áp lực, Cụm băng tải nạp..."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    autoFocus
                  />
                  {!editingUnit && (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
                      💡 <strong>Tự động học:</strong> Sau khi tạo, cụm này sẽ được tự động lưu vào <strong>Thư viện dùng chung</strong> để các máy khác có thể chọn sử dụng.
                    </div>
                  )}
                </div>

                {/* Mã cụm & Phân nhóm */}
                <div className="grid-2">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Mã cụm trên máy (Tùy chọn)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Để trống tự sinh (VD: CU-01)"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Phân nhóm kỹ thuật</label>
                    <input
                      type="text"
                      className="form-input"
                      list="fu-tab-categories-datalist"
                      placeholder="Chọn gợi ý hoặc gõ nhóm mới..."
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    />
                    <datalist id="fu-tab-categories-datalist">
                      {allCategories.filter(c => c !== 'Tất cả').map(cat => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* Trạng thái hoạt động */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Trạng thái hoạt động</label>
                  <select
                    className="form-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="OPERATIONAL">🟢 Hoạt động tốt</option>
                    <option value="WARNING">🟡 Cần theo dõi / bảo dưỡng</option>
                    <option value="INCIDENT">🔴 Đang có sự cố hỏng</option>
                    <option value="INACTIVE">⚪ Ngừng hoạt động</option>
                  </select>
                </div>

                {/* Mô tả chi tiết */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Mô tả nhiệm vụ / Thông số cụm này trên máy</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    placeholder="VD: Bơm dung dịch rửa áp lực 5-8 bar, motor 3kW..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>
            )}
  </>
);
