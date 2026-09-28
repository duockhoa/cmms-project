import React from 'react';
import { Pause } from 'lucide-react';
import { Modal } from '../common/Modal';

const pauseReasons = ['Chờ phụ tùng', 'Chờ dừng máy sản xuất', 'Chờ bàn giao ca', 'Cần chuyên gia kỹ thuật hỗ trợ'];

interface WorkOrderStatusModalProps {
  workOrder: any | null;
  reason: string;
  submitting: boolean;
  onReasonChange: (reason: string) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
}

export const WorkOrderStatusModal: React.FC<WorkOrderStatusModalProps> = ({
  workOrder,
  reason,
  submitting,
  onReasonChange,
  onClose,
  onSubmit,
}) => (
  <Modal
    isOpen={Boolean(workOrder)}
    onClose={() => !submitting && onClose()}
    title={`Tạm dừng phiếu: ${workOrder?.orderCode || ''}`}
    maxWidth="480px"
  >
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <p style={{ fontSize: '14px', marginBottom: '8px', color: 'var(--text-primary)' }}>
          Vui lòng cung cấp lý do tạm dừng thực hiện công việc bảo trì cho thiết bị <strong>{workOrder?.equipment?.name || '---'}</strong>:
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
          {pauseReasons.map((preset) => (
            <button
              key={preset}
              type="button"
              className="btn btn-secondary btn-sm"
              style={{
                fontSize: '12px',
                padding: '4px 10px',
                borderRadius: '14px',
                borderColor: reason === preset ? '#f59e0b' : undefined,
                backgroundColor: reason === preset ? 'rgba(245, 158, 11, 0.15)' : undefined,
                color: reason === preset ? '#d97706' : undefined,
                fontWeight: reason === preset ? 600 : 400,
              }}
              onClick={() => onReasonChange(preset)}
            >
              {preset}
            </button>
          ))}
        </div>
        <textarea
          className="form-input"
          rows={3}
          placeholder="Nhập chi tiết lý do tạm dừng..."
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
          style={{ width: '100%', resize: 'vertical' }}
          autoFocus
        />
      </div>
      <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
        <button type="button" className="btn btn-secondary" disabled={submitting} onClick={onClose}>Hủy bỏ</button>
        <button type="submit" className="btn btn-warning" disabled={submitting || !reason.trim()} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Pause size={14} /> {submitting ? 'Đang cập nhật...' : 'Xác nhận tạm dừng'}
        </button>
      </div>
    </form>
  </Modal>
);
