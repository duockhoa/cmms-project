import React from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { Modal } from '../common/Modal';

interface RequestDeleteModalProps {
  request: any | null;
  locked: boolean;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const RequestDeleteModal: React.FC<RequestDeleteModalProps> = ({
  request,
  locked,
  deleting,
  onClose,
  onConfirm,
}) => {
  if (!request) return null;

  return (
    <Modal isOpen onClose={onClose} title="Xác nhận xóa Yêu cầu sự cố">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 16px', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
          <AlertTriangle size={24} style={{ color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '13px', color: '#991b1b' }}>
            <strong>Cảnh báo:</strong> Hành động này sẽ xóa vĩnh viễn yêu cầu sự cố và lịch sử liên quan khỏi hệ thống. Hành động này không thể hoàn tác!
          </div>
        </div>

        {locked && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 14px', backgroundColor: '#fffbeb', borderRadius: '8px', border: '1px solid #fef3c7', fontSize: '12px', color: '#b45309' }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Dữ liệu đã đóng / có phiếu sửa chữa:</strong> Với quyền Quản trị viên (ADMIN), thao tác xóa này sẽ tự động dọn dẹp sạch toàn bộ phiếu sửa chữa (Work Order) và dữ liệu liên quan đi kèm.
            </div>
          </div>
        )}

        <div style={{ padding: '12px 16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '13px', border: '1px solid var(--border-color)' }}>
          <div><strong>Mã yêu cầu:</strong> <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{request.requestCode}</span></div>
          <div style={{ marginTop: '4px' }}><strong>Tiêu đề:</strong> {request.title}</div>
          <div style={{ marginTop: '4px' }}><strong>Thiết bị:</strong> {request.equipment?.name} ({request.equipment?.code})</div>
          <div style={{ marginTop: '4px' }}><strong>Người báo:</strong> {request.reporterName}</div>
        </div>

        <div className="modal-footer" style={{ padding: 0, marginTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={deleting}>
            Hủy bỏ
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={deleting}
            style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none' }}
          >
            {deleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
