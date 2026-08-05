export declare class CreateWorkOrderDto {
    title: string;
    equipmentId: string;
    requestId?: string;
    description: string;
    priority?: string;
    technicianName?: string;
    plannedStartDate?: string;
    plannedEndDate?: string;
}
export declare class AssignWorkOrderDto {
    technicianName: string;
    expectedVersion: number;
}
export declare class StartWorkOrderDto {
    expectedVersion: number;
}
export declare class PauseWorkOrderDto {
    reason: string;
    expectedVersion: number;
}
export declare class ResumeWorkOrderDto {
    expectedVersion: number;
}
export declare class CompleteWorkOrderDto {
    expectedVersion: number;
    failureCause?: string;
    solution?: string;
}
export declare class VerifyWorkOrderDto {
    expectedVersion: number;
    comment?: string;
}
export declare class CloseWorkOrderDto {
    expectedVersion: number;
}
export declare class CancelWorkOrderDto {
    reason: string;
    expectedVersion: number;
}
export declare class AddWorkOrderItemDto {
    inventoryItemId: string;
    quantity: number;
}
