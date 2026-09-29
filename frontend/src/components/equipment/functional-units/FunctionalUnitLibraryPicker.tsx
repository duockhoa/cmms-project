import React from 'react';
import { Search, Sparkles } from 'lucide-react';

export const FunctionalUnitLibraryPicker: React.FC<any> = ({
  allCategories, editingUnit, equipmentCode, filteredLibrary, formData,
  handleDeselectAllLibrary, handleSelectAllFilteredLibrary,
  handleToggleLibraryItem, libCategory, libSearch, modalMode,
  selectedLibItems, setFormData, setLibCategory, setLibSearch, units,
}) => (
  <>
            {/* ==================================================== */}
            {/* TAB 1: CHỌN TỪ THƯ VIỆN CÓ SẴN (CHỌN ĐƯỢC NHIỀU CỤM) */}
            {/* ==================================================== */}
            {!editingUnit && modalMode === 'LIBRARY' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Thanh tìm kiếm & lọc nhóm */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      className="form-input"
                      style={{ paddingLeft: '30px', fontSize: '13px' }}
                      placeholder="Tìm cụm trong thư viện..."
                      value={libSearch}
                      onChange={(e) => setLibSearch(e.target.value)}
                    />
                  </div>

                  <select
                    className="form-select"
                    style={{ width: '170px', fontSize: '13px' }}
                    value={libCategory}
                    onChange={(e) => setLibCategory(e.target.value)}
                  >
                    {allCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Thanh thao tác chọn nhanh */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', padding: '0 2px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {filteredLibrary.length} cụm trong danh mục
                    {selectedLibItems.length > 0 && (
                      <strong style={{ color: '#2563eb', marginLeft: '6px' }}>
                        (Đã chọn {selectedLibItems.length})
                      </strong>
                    )}
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-sm"
                      style={{ fontSize: '11px', padding: '3px 8px', height: 'auto', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '4px' }}
                      onClick={handleSelectAllFilteredLibrary}
                    >
                      Chọn tất cả ({filteredLibrary.filter(item => !units.some(u => u.name.toLowerCase().trim() === item.name.toLowerCase().trim())).length})
                    </button>
                    {selectedLibItems.length > 0 && (
                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{ fontSize: '11px', padding: '3px 8px', height: 'auto', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-muted)', cursor: 'pointer', borderRadius: '4px' }}
                        onClick={handleDeselectAllLibrary}
                      >
                        Bỏ chọn
                      </button>
                    )}
                  </div>
                </div>

                {/* Danh sách thẻ cụm trong thư viện có checkbox chọn nhiều */}
                <div style={{
                  maxHeight: '220px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  backgroundColor: 'var(--bg-secondary)',
                }}>
                  {filteredLibrary.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-muted)', fontSize: '13px' }}>
                      Không tìm thấy cụm chức năng nào phù hợp. Hãy chuyển sang tab <strong>"Tạo cụm mới độc lập"</strong> để nhập cụm đặc thù.
                    </div>
                  ) : (
                    filteredLibrary.map(item => {
                      const isAlreadyOnMachine = units.some(u => u.name.toLowerCase().trim() === item.name.toLowerCase().trim());
                      const isSelected = selectedLibItems.some(i => i.id === item.id);

                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            if (!isAlreadyOnMachine) {
                              handleToggleLibraryItem(item);
                            }
                          }}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            cursor: isAlreadyOnMachine ? 'not-allowed' : 'pointer',
                            backgroundColor: isSelected 
                              ? 'rgba(37, 99, 235, 0.12)' 
                              : isAlreadyOnMachine 
                              ? 'var(--bg-secondary)' 
                              : 'var(--bg-primary)',
                            border: isSelected 
                              ? '1px solid #2563eb' 
                              : '1px solid var(--border-color)',
                            opacity: isAlreadyOnMachine ? 0.6 : 1,
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={isAlreadyOnMachine}
                              onChange={() => handleToggleLibraryItem(item)}
                              onClick={(e) => e.stopPropagation()}
                              style={{ cursor: isAlreadyOnMachine ? 'not-allowed' : 'pointer', width: '15px', height: '15px' }}
                            />
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: '13px', color: isSelected ? '#2563eb' : 'var(--text-primary)' }}>
                                {item.name}
                              </div>
                              {item.description && (
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {item.description}
                                </div>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}>
                            {isAlreadyOnMachine ? (
                              <span className="badge" style={{ fontSize: '11px', backgroundColor: 'rgba(100, 116, 139, 0.15)', color: 'var(--text-muted)' }}>
                                ✓ Đã có trên máy
                              </span>
                            ) : (
                              <span className="badge" style={{ fontSize: '11px' }}>
                                {item.category || 'Cơ khí'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Danh sách nhãn các cụm đã chọn */}
                {selectedLibItems.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Đã chọn ({selectedLibItems.length} cụm):
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '90px', overflowY: 'auto' }}>
                      {selectedLibItems.map(item => (
                        <span
                          key={item.id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            backgroundColor: 'rgba(37, 99, 235, 0.1)',
                            color: '#2563eb',
                            border: '1px solid rgba(37, 99, 235, 0.25)',
                            padding: '3px 8px',
                            borderRadius: '16px',
                            fontSize: '12px',
                            fontWeight: 500,
                          }}
                        >
                          {item.name}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleLibraryItem(item);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#2563eb',
                              cursor: 'pointer',
                              padding: 0,
                              fontSize: '14px',
                              lineHeight: 1,
                              fontWeight: 700,
                            }}
                            title="Bỏ chọn"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tùy biến khi chọn 1 cụm vs nhiều cụm */}
                {selectedLibItems.length === 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
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
                      </div>
                    </div>

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

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Mô tả nhiệm vụ / Thông số cụm này trên máy</label>
                      <textarea
                        className="form-textarea"
                        rows={2}
                        placeholder="VD: Buồng gia nhiệt, màng lọc HEPA và quạt thổi khí..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {selectedLibItems.length > 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600 }}>
                        Trạng thái hoạt động chung cho {selectedLibItems.length} cụm
                      </label>
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

                    <div style={{ 
                      padding: '10px 12px', 
                      backgroundColor: 'rgba(37, 99, 235, 0.06)', 
                      borderRadius: '6px', 
                      border: '1px solid rgba(37, 99, 235, 0.15)',
                      fontSize: '12px',
                      color: '#1e40af',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}>
                      <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Sparkles size={14} /> Tự động sinh mã & kế thừa thông tin:
                      </div>
                      <div style={{ color: 'var(--text-secondary)' }}>
                        Mã cụm trên máy sẽ được tự động đánh số thứ tự liên tiếp (VD: <code>{equipmentCode ? `${equipmentCode}-CU${(units.length + 1).toString().padStart(2, '0')}` : `CU-${(units.length + 1).toString().padStart(2, '0')}`}</code>, <code>CU{(units.length + 2).toString().padStart(2, '0')}</code>...). Sau khi gán, bạn có thể chỉnh sửa riêng từng cụm bất cứ lúc nào.
                      </div>
                    </div>
                  </div>
                )}

                {selectedLibItems.length === 0 && (
                  <div style={{ 
                    padding: '12px', 
                    textAlign: 'center', 
                    color: 'var(--text-muted)', 
                    fontSize: '12px', 
                    border: '1px dashed var(--border-color)', 
                    borderRadius: '6px' 
                  }}>
                    👈 Hãy tích chọn một hoặc nhiều cụm chức năng từ danh sách phía trên để gán vào thiết bị.
                  </div>
                )}
              </div>
            )}
  </>
);
