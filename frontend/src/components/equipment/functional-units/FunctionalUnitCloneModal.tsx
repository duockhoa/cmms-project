import React from 'react';
import { Copy } from 'lucide-react';
import { Modal } from '../../common/Modal';

export const FunctionalUnitCloneModal: React.FC<any> = ({
  allEquipments, cloning, equipmentCode, equipmentName, handleDeselectAllUnits, handleExecuteClone,
  handleSelectAllUnits, handleSelectSourceEquipment, handleToggleUnitSelect,
  isCloneModalOpen, loadingSourceUnits, selectedSourceEqId, selectedUnitIds,
  setIsCloneModalOpen, sourceUnits, units,
}) => (
  <>
      {/* ==================================================== */}
      {/* MODAL SAO CHÉP CỤM CHỨC NĂNG TỪ THIẾT BỊ KHÁC        */}
      {/* ==================================================== */}
      {isCloneModalOpen && (
        <Modal
          isOpen={isCloneModalOpen}
          onClose={() => !cloning && setIsCloneModalOpen(false)}
          title="Sao chép cụm chức năng từ thiết bị khác"
          maxWidth="600px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Chọn một thiết bị tương tự có sẵn để sao chép nhanh toàn bộ hoặc một số cụm chức năng sang <strong>{equipmentName || equipmentCode}</strong>.
            </div>

            {/* Dropdown chọn thiết bị nguồn */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>Chọn thiết bị nguồn *</label>
              <select
                className="form-select"
                value={selectedSourceEqId}
                onChange={(e) => handleSelectSourceEquipment(e.target.value)}
                autoFocus
              >
                <option value="">-- Chọn thiết bị để sao chép cụm chức năng --</option>
                {allEquipments.map((eq: any) => (
                  <option key={eq.id} value={eq.id}>
                    [{eq.code}] {eq.name} {eq.category ? `(${eq.category})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Danh sách các cụm của thiết bị nguồn */}
            {selectedSourceEqId && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label" style={{ fontWeight: 700, margin: 0 }}>
                    Danh sách cụm chức năng ({sourceUnits.length})
                  </label>
                  {sourceUnits.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '11px', padding: '2px 8px' }}
                        onClick={handleSelectAllUnits}
                      >
                        Chọn tất cả
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '11px', padding: '2px 8px' }}
                        onClick={handleDeselectAllUnits}
                      >
                        Bỏ chọn
                      </button>
                    </div>
                  )}
                </div>

                {loadingSourceUnits ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    Đang tải danh sách cụm...
                  </div>
                ) : sourceUnits.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '13px' }}>
                    Thiết bị này chưa có cụm chức năng nào để sao chép.
                  </div>
                ) : (
                  <div style={{
                    maxHeight: '220px',
                    overflowY: 'auto',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-secondary)',
                    padding: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    {sourceUnits.map((su) => {
                      const currentNames = new Set(units.map(u => u.name.toLowerCase().trim()));
                      const isAlreadyExists = currentNames.has(su.name.toLowerCase().trim());
                      const isChecked = selectedUnitIds.includes(su.id);

                      return (
                        <div
                          key={su.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            backgroundColor: isAlreadyExists ? 'var(--bg-tertiary)' : (isChecked ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-primary)'),
                            border: isChecked && !isAlreadyExists ? '1px solid #2563eb' : '1px solid var(--border-color)',
                            opacity: isAlreadyExists ? 0.6 : 1,
                          }}
                        >
                          <input
                            type="checkbox"
                            disabled={isAlreadyExists}
                            checked={isChecked && !isAlreadyExists}
                            onChange={() => handleToggleUnitSelect(su.id)}
                            style={{ cursor: isAlreadyExists ? 'not-allowed' : 'pointer', width: '16px', height: '16px' }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                              {su.name} <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-muted)' }}>({su.code})</span>
                            </div>
                            {su.description && (
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                {su.description}
                              </div>
                            )}
                          </div>
                          {isAlreadyExists && (
                            <span className="badge" style={{ fontSize: '11px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                              Đã có trên máy
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={cloning}
                onClick={() => setIsCloneModalOpen(false)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={cloning || selectedUnitIds.length === 0}
                onClick={handleExecuteClone}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Copy size={14} /> {cloning ? 'Đang sao chép...' : `Sao chép (${selectedUnitIds.length}) cụm`}
              </button>
            </div>
          </div>
        </Modal>
      )}
  </>
);
