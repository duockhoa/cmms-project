import React from 'react';
import { PriorityBadge, StatusBadge } from '../common/Badge';
import { Modal } from '../common/Modal';

interface WorkOrderSelectorModalProps {
  isOpen: boolean;
  workOrders: any[];
  onClose: () => void;
  onSelect: (workOrderId: string) => void;
}

export const WorkOrderSelectorModal: React.FC<WorkOrderSelectorModalProps> = ({ isOpen, workOrders, onClose, onSelect }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Chọn Work Order đang được phân công">
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
        Thiết bị có nhiều hơn 1 công việc được phân công cho bạn. Vui lòng chọn công việc để tiếp tục:
      </p>
      <div className="table-wrapper">
        <table className="custom-table" style={{ fontSize: '13px' }}>
          <thead><tr><th>Mã WO</th><th>Mô tả sự cố</th><th>Mức độ ưu tiên</th><th>Trạng thái</th><th>Ngày tạo</th><th>Thao tác</th></tr></thead>
          <tbody>
            {workOrders.map((workOrder) => (
              <tr key={workOrder.id}>
                <td style={{ fontWeight: 700 }}>{workOrder.orderCode}</td>
                <td>{workOrder.title}</td>
                <td><PriorityBadge priority={workOrder.priority} /></td>
                <td><StatusBadge status={workOrder.status} /></td>
                <td>{new Date(workOrder.createdAt).toLocaleDateString('vi-VN')}</td>
                <td><button className="btn btn-primary btn-sm" onClick={() => onSelect(workOrder.id)}>Chọn</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </Modal>
);
