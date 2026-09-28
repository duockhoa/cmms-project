import React from 'react';
import { ChecklistManager } from '../common/ChecklistManager';
import { Modal } from '../common/Modal';

interface WorkOrderChecklistModalProps {
  isOpen: boolean;
  workOrder: any | null;
  onClose: () => void;
}

export const WorkOrderChecklistModal: React.FC<WorkOrderChecklistModalProps> = ({ isOpen, workOrder, onClose }) => (
  <Modal isOpen={isOpen && Boolean(workOrder)} onClose={onClose} title={`Thực thi checklist: ${workOrder?.orderCode || ''}`}>
    {workOrder && <ChecklistManager workOrderId={workOrder.id} workOrderStatus={workOrder.status} />}
  </Modal>
);
