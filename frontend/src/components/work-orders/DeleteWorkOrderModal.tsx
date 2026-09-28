import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Modal } from '../common/Modal';

interface DeleteWorkOrderModalProps {
  workOrder: any | null;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteWorkOrderModal: React.FC<DeleteWorkOrderModalProps> = ({ workOrder, deleting, onClose, onConfirm }) => (
  <Modal isOpen={Boolean(workOrder)} onClose={() => !deleting && onClose()} title="Xác nhận xóa phiếu sửa chữa" maxWidth="460px">
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px' }}>
        <AlertTriangle size={24} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
          Bạn có chắc chắn muốn xóa phiếu sửa chữa <strong style={{ color: '#ef4444' }}>{workOrder?.orderCode}</strong>?
          <div style={{ marginTop: '4px', color: 'var(--text-secondary)' }}>Tiêu đề: <strong>{workOrder?.title}</strong></div>
          {workOrder?.equipment?.name && <div style={{ color: 'var(--text-secondary)' }}>Thiết bị: <strong>{workOrder.equipment.name}</strong></div>}
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#dc2626' }}>
            ⚠️ Lưu ý: Mọi nhật ký thao tác, checklist và dữ liệu vật tư đính kèm sẽ bị xóa. Hành động này không thể hoàn tác!
          </div>
        </div>
      </div>
      <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
        <button type="button" className="btn btn-secondary" disabled={deleting} onClick={onClose}>Hủy bỏ</button>
        <button type="button" className="btn btn-danger" disabled={deleting} onClick={onConfirm} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Trash2 size={14} /> {deleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
        </button>
      </div>
    </div>
  </Modal>
);
