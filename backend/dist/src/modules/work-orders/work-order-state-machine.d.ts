export type WorkOrderStatus = 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'VERIFIED' | 'CLOSED' | 'CANCELLED';
export declare class WorkOrderStateMachine {
    private static readonly transitions;
    static canTransition(from: WorkOrderStatus, to: WorkOrderStatus): boolean;
    static assertTransition(from: WorkOrderStatus, to: WorkOrderStatus): void;
    static getAllowedTransitions(status: WorkOrderStatus): WorkOrderStatus[];
}
