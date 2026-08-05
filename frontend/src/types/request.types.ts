export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'RETURNED' | 'CANCELLED';
export type RequestPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface MaintenanceRequest {
  id: string;
  requestCode: string;
  equipmentId: string;
  title: string;
  description: string;
  priority: RequestPriority;
  status: RequestStatus;
  reporterName: string;
  department?: string;
  rejectedReason?: string;
  returnedReason?: string;
  cancelledReason?: string;
  cancelledAt?: string;
  cancelledById?: string;
  createdAt: string;
  version: number;
}
