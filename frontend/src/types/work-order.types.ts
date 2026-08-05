export type WorkOrderStatus = 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'VERIFIED' | 'CLOSED' | 'CANCELLED';
export type WorkOrderPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface WorkOrder {
  id: string;
  orderCode: string;
  equipmentId: string;
  requestId?: string;
  title: string;
  description?: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  technicianName?: string;
  actualEndDate?: string;
  totalCost?: number;
  createdAt: string;
  version: number;
}

export interface WorkOrderItem {
  id: string;
  workOrderId: string;
  inventoryItemId: string;
  quantity: number;
  unitPrice?: number;
}
