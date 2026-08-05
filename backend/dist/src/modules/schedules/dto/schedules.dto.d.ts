export declare class CreateScheduleDto {
    title: string;
    description?: string;
    equipmentId: string;
    frequencyType: string;
    frequencyInterval: number;
    startDate: string;
    estimatedDurationMinutes?: number;
    defaultPriority?: string;
    assignedTechnicianId?: string;
    createdById: string;
    autoGenerate?: boolean;
    leadTimeDays?: number;
    notes?: string;
    checklistJson?: any;
}
export declare class UpdateScheduleDto {
    title?: string;
    description?: string;
    frequencyType?: string;
    frequencyInterval?: number;
    startDate?: string;
    estimatedDurationMinutes?: number;
    defaultPriority?: string;
    assignedTechnicianId?: string;
    autoGenerate?: boolean;
    leadTimeDays?: number;
    notes?: string;
    expectedVersion: number;
    actedById: string;
}
export declare class ActivateScheduleDto {
    expectedVersion: number;
    actedById: string;
}
export declare class PauseScheduleDto {
    reason: string;
    expectedVersion: number;
    actedById: string;
}
export declare class CompleteScheduleDto {
    reason: string;
    expectedVersion: number;
    actedById: string;
}
export declare class CancelScheduleDto {
    reason: string;
    expectedVersion: number;
    actedById: string;
}
export declare class GenerateWorkOrderDto {
    expectedVersion: number;
    actedById: string;
    dueDate?: string;
}
