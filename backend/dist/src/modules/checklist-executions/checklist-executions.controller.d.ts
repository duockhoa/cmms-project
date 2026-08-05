import { ChecklistExecutionsService } from './checklist-executions.service';
import { CreateChecklistExecutionDto } from './dto/create-checklist-execution.dto';
import { PatchChecklistItemDto } from './dto/patch-checklist-item.dto';
import { CompleteChecklistExecutionDto } from './dto/complete-checklist-execution.dto';
import { CancelChecklistExecutionDto } from './dto/cancel-checklist-execution.dto';
export declare class ChecklistExecutionsController {
    private readonly checklistService;
    constructor(checklistService: ChecklistExecutionsService);
    createExecution(workOrderId: string, dto: CreateChecklistExecutionDto): Promise<{
        items: {
            id: string;
            status: import(".prisma/client").$Enums.ChecklistItemStatus;
            createdAt: Date;
            executionId: string;
            itemIndex: number;
            itemText: string;
            comment: string | null;
        }[];
        executedBy: {
            id: string;
            name: string;
            status: import(".prisma/client").$Enums.TechnicianStatus;
            isActive: boolean;
            createdAt: Date;
            version: number;
            department: string | null;
            email: string;
            role: string;
            specialty: string | null;
            avatar: string | null;
        };
    } & {
        result: import(".prisma/client").$Enums.ChecklistExecutionResult | null;
        id: string;
        status: import(".prisma/client").$Enums.ChecklistExecutionStatus;
        version: number;
        cancelledAt: Date | null;
        cancelledById: string | null;
        cancelReason: string | null;
        completedAt: Date | null;
        workOrderId: string;
        executedById: string | null;
        startedAt: Date;
        templateVersion: number;
    }>;
    getExecutions(workOrderId: string): Promise<({
        items: {
            id: string;
            status: import(".prisma/client").$Enums.ChecklistItemStatus;
            createdAt: Date;
            executionId: string;
            itemIndex: number;
            itemText: string;
            comment: string | null;
        }[];
        executedBy: {
            id: string;
            name: string;
            status: import(".prisma/client").$Enums.TechnicianStatus;
            isActive: boolean;
            createdAt: Date;
            version: number;
            department: string | null;
            email: string;
            role: string;
            specialty: string | null;
            avatar: string | null;
        };
    } & {
        result: import(".prisma/client").$Enums.ChecklistExecutionResult | null;
        id: string;
        status: import(".prisma/client").$Enums.ChecklistExecutionStatus;
        version: number;
        cancelledAt: Date | null;
        cancelledById: string | null;
        cancelReason: string | null;
        completedAt: Date | null;
        workOrderId: string;
        executedById: string | null;
        startedAt: Date;
        templateVersion: number;
    })[]>;
    getExecutionById(executionId: string): Promise<{
        items: {
            id: string;
            status: import(".prisma/client").$Enums.ChecklistItemStatus;
            createdAt: Date;
            executionId: string;
            itemIndex: number;
            itemText: string;
            comment: string | null;
        }[];
        executedBy: {
            id: string;
            name: string;
            status: import(".prisma/client").$Enums.TechnicianStatus;
            isActive: boolean;
            createdAt: Date;
            version: number;
            department: string | null;
            email: string;
            role: string;
            specialty: string | null;
            avatar: string | null;
        };
    } & {
        result: import(".prisma/client").$Enums.ChecklistExecutionResult | null;
        id: string;
        status: import(".prisma/client").$Enums.ChecklistExecutionStatus;
        version: number;
        cancelledAt: Date | null;
        cancelledById: string | null;
        cancelReason: string | null;
        completedAt: Date | null;
        workOrderId: string;
        executedById: string | null;
        startedAt: Date;
        templateVersion: number;
    }>;
    updateItem(executionId: string, dto: PatchChecklistItemDto): Promise<{
        items: {
            id: string;
            status: import(".prisma/client").$Enums.ChecklistItemStatus;
            createdAt: Date;
            executionId: string;
            itemIndex: number;
            itemText: string;
            comment: string | null;
        }[];
        executedBy: {
            id: string;
            name: string;
            status: import(".prisma/client").$Enums.TechnicianStatus;
            isActive: boolean;
            createdAt: Date;
            version: number;
            department: string | null;
            email: string;
            role: string;
            specialty: string | null;
            avatar: string | null;
        };
    } & {
        result: import(".prisma/client").$Enums.ChecklistExecutionResult | null;
        id: string;
        status: import(".prisma/client").$Enums.ChecklistExecutionStatus;
        version: number;
        cancelledAt: Date | null;
        cancelledById: string | null;
        cancelReason: string | null;
        completedAt: Date | null;
        workOrderId: string;
        executedById: string | null;
        startedAt: Date;
        templateVersion: number;
    }>;
    completeExecution(executionId: string, dto: CompleteChecklistExecutionDto): Promise<{
        items: {
            id: string;
            status: import(".prisma/client").$Enums.ChecklistItemStatus;
            createdAt: Date;
            executionId: string;
            itemIndex: number;
            itemText: string;
            comment: string | null;
        }[];
        executedBy: {
            id: string;
            name: string;
            status: import(".prisma/client").$Enums.TechnicianStatus;
            isActive: boolean;
            createdAt: Date;
            version: number;
            department: string | null;
            email: string;
            role: string;
            specialty: string | null;
            avatar: string | null;
        };
    } & {
        result: import(".prisma/client").$Enums.ChecklistExecutionResult | null;
        id: string;
        status: import(".prisma/client").$Enums.ChecklistExecutionStatus;
        version: number;
        cancelledAt: Date | null;
        cancelledById: string | null;
        cancelReason: string | null;
        completedAt: Date | null;
        workOrderId: string;
        executedById: string | null;
        startedAt: Date;
        templateVersion: number;
    }>;
    cancelExecution(executionId: string, dto: CancelChecklistExecutionDto): Promise<{
        items: {
            id: string;
            status: import(".prisma/client").$Enums.ChecklistItemStatus;
            createdAt: Date;
            executionId: string;
            itemIndex: number;
            itemText: string;
            comment: string | null;
        }[];
        executedBy: {
            id: string;
            name: string;
            status: import(".prisma/client").$Enums.TechnicianStatus;
            isActive: boolean;
            createdAt: Date;
            version: number;
            department: string | null;
            email: string;
            role: string;
            specialty: string | null;
            avatar: string | null;
        };
    } & {
        result: import(".prisma/client").$Enums.ChecklistExecutionResult | null;
        id: string;
        status: import(".prisma/client").$Enums.ChecklistExecutionStatus;
        version: number;
        cancelledAt: Date | null;
        cancelledById: string | null;
        cancelReason: string | null;
        completedAt: Date | null;
        workOrderId: string;
        executedById: string | null;
        startedAt: Date;
        templateVersion: number;
    }>;
}
