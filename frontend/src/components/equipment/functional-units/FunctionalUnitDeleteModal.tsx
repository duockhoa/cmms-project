import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Modal } from '../../common/Modal';

export const FunctionalUnitDeleteModal: React.FC<any> = ({
  handleConfirmDelete, isDeleting, setUnitToDelete, unitToDelete,
}) => (
  <>
      {/* MODAL XÁC NHẬN XÓA CỤM CHỨC NĂNG                     */}
      {/* ==================================================== */}
      {unitToDelete && (
        <Modal
          isOpen={Boolean(unitToDelete)}
          onClose={() => !isDeleting && setUnitToDelete(null)}
          title="Xác nhận xóa cụm chức năng"
          maxWidth="440px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: '12px', 
              padding: '12px', 
              backgroundColor: 'rgba(239, 68, 68, 0.08)', 
              border: '1px solid rgba(239, 68, 68, 0.2)', 
              borderRadius: '8px' 
            }}>
              <AlertTriangle size={24} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                Bạn có chắc chắn muốn xóa cụm chức năng <strong style={{ color: '#ef4444' }}>{unitToDelete.name}</strong> ({unitToDelete.code}) khỏi thiết bị này?
                <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Lưu ý: Thao tác này chỉ gỡ cụm ra khỏi thiết bị, không xóa mẫu trong Thư viện dùng chung.
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={isDeleting}
                onClick={() => setUnitToDelete(null)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Trash2 size={14} /> {isDeleting ? 'Đang xóa...' : 'Xóa cụm chức năng'}
              </button>
            </div>
          </div>
        </Modal>
      )}
  </>
);
