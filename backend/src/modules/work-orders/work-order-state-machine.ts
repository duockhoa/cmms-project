import { ConflictException } from '@nestjs/common';

export type WorkOrderStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'INSPECTION'
  | 'VERIFIED'
  | 'CLOSED'
  | 'CANCELLED';

export class WorkOrderStateMachine {
  private static readonly transitions: Record<WorkOrderStatus, WorkOrderStatus[]> = {
    PENDING: ['ASSIGNED', 'CANCELLED', 'PENDING'],
    ASSIGNED: ['IN_PROGRESS', 'CANCELLED', 'PENDING', 'ASSIGNED'],
    IN_PROGRESS: ['ON_HOLD', 'COMPLETED', 'PENDING', 'CANCELLED', 'IN_PROGRESS'],
    ON_HOLD: ['IN_PROGRESS', 'PENDING', 'CANCELLED', 'ON_HOLD'],
    COMPLETED: ['INSPECTION', 'VERIFIED', 'IN_PROGRESS', 'CANCELLED'],
    INSPECTION: ['VERIFIED', 'IN_PROGRESS', 'CANCELLED'],
    VERIFIED: ['CLOSED'],
    CLOSED: [],
    CANCELLED: [],
  };

  static canTransition(from: WorkOrderStatus, to: WorkOrderStatus): boolean {
    const allowed = this.transitions[from] || [];
    return allowed.includes(to);
  }

  static assertTransition(from: WorkOrderStatus, to: WorkOrderStatus): void {
    if (!this.canTransition(from, to)) {
      throw new ConflictException(
        `Không thể chuyển đổi trạng thái Work Order từ "${from}" sang "${to}"`
      );
    }
  }

  static getAllowedTransitions(status: WorkOrderStatus): WorkOrderStatus[] {
    return this.transitions[status] || [];
  }
}
