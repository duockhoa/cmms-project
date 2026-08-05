import { ConflictException } from '@nestjs/common';

export type WorkOrderStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'VERIFIED'
  | 'CLOSED'
  | 'CANCELLED';

export class WorkOrderStateMachine {
  private static readonly transitions: Record<WorkOrderStatus, WorkOrderStatus[]> = {
    PENDING: ['ASSIGNED', 'CANCELLED'],
    ASSIGNED: ['IN_PROGRESS', 'CANCELLED'],
    IN_PROGRESS: ['ON_HOLD', 'COMPLETED'],
    ON_HOLD: ['IN_PROGRESS'],
    COMPLETED: ['VERIFIED', 'IN_PROGRESS'],
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
