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
            comment: string | null;
            executionId: string;
            itemIndex: number;
            itemText: string;
        }[];
        executedBy: {
            id: string;
            name: string;
            email: string;
            role: string;
            specialty: string | null;
            status: import(".prisma/client").$Enums.TechnicianStatus;
            department: string | null;
            avatar: string | null;
            isActive: boolean;
            createdAt: Date;
            version: number;
        };
    } & {
        id: string;
        status: import(".prisma/client").$Enums.ChecklistExecutionStatus;
        version: number;
        result: import(".prisma/client").$Enums.ChecklistExecutionResult | null;
        cancelledAt: Date | null;
        cancelledById: string | null;
        completedAt: Date | null;
        workOrderId: string;
        cancelReason: string | null;
        executedById: string | null;
        startedAt: Date;
        templateVersion: number;
    }>;
    getExecutions(workOrderId: string): Promise<({
        items: {
            id: string;
            status: import(".prisma/client").$Enums.ChecklistItemStatus;
            createdAt: Date;
            comment: string | null;
            executionId: string;
            itemIndex: number;
            itemText: string;
        }[];
        executedBy: {
            id: string;
            name: string;
            email: string;
            role: string;
            specialty: string | null;
            status: import(".prisma/client").$Enums.TechnicianStatus;
            department: string | null;
            avatar: string | null;
            isActive: boolean;
            createdAt: Date;
            version: number;
        };
    } & {
        id: string;
        status: import(".prisma/client").$Enums.ChecklistExecutionStatus;
        version: number;
        result: import(".prisma/client").$Enums.ChecklistExecutionResult | null;
        cancelledAt: Date | null;
        cancelledById: string | null;
        completedAt: Date | null;
        workOrderId: string;
        cancelReason: string | null;
        executedById: string | null;
        startedAt: Date;
        templateVersion: number;
    })[]>;
    getExecutionById(executionId: string): Promise<{
        items: {
            id: string;
            status: import(".prisma/client").$Enums.ChecklistItemStatus;
            createdAt: Date;
            comment: string | null;
            executionId: string;
            itemIndex: number;
            itemText: string;
        }[];
        executedBy: {
            id: string;
            name: string;
            email: string;
            role: string;
            specialty: string | null;
            status: import(".prisma/client").$Enums.TechnicianStatus;
            department: string | null;
            avatar: string | null;
            isActive: boolean;
            createdAt: Date;
            version: number;
        };
    } & {
        id: string;
        status: import(".prisma/client").$Enums.ChecklistExecutionStatus;
        version: number;
        result: import(".prisma/client").$Enums.ChecklistExecutionResult | null;
        cancelledAt: Date | null;
        cancelledById: string | null;
        completedAt: Date | null;
        workOrderId: string;
        cancelReason: string | null;
        executedById: string | null;
        startedAt: Date;
        templateVersion: number;
    }>;
    updateItem(executionId: string, dto: PatchChecklistItemDto): Promise<{
        items: {
            id: string;
            status: import(".prisma/client").$Enums.ChecklistItemStatus;
            createdAt: Date;
            comment: string | null;
            executionId: string;
            itemIndex: number;
            itemText: string;
        }[];
        executedBy: {
            id: string;
            name: string;
            email: string;
            role: string;
            specialty: string | null;
            status: import(".prisma/client").$Enums.TechnicianStatus;
            department: string | null;
            avatar: string | null;
            isActive: boolean;
            createdAt: Date;
            version: number;
        };
    } & {
        id: string;
        status: import(".prisma/client").$Enums.ChecklistExecutionStatus;
        version: number;
        result: import(".prisma/client").$Enums.ChecklistExecutionResult | null;
        cancelledAt: Date | null;
        cancelledById: string | null;
        completedAt: Date | null;
        workOrderId: string;
        cancelReason: string | null;
        executedById: string | null;
        startedAt: Date;
        templateVersion: number;
    }>;
    completeExecution(executionId: string, dto: CompleteChecklistExecutionDto): Promise<{
        items: {
            id: string;
            status: import(".prisma/client").$Enums.ChecklistItemStatus;
            createdAt: Date;
            comment: string | null;
            executionId: string;
            itemIndex: number;
            itemText: string;
        }[];
        executedBy: {
            id: string;
            name: string;
            email: string;
            role: string;
            specialty: string | null;
            status: import(".prisma/client").$Enums.TechnicianStatus;
            department: string | null;
            avatar: string | null;
            isActive: boolean;
            createdAt: Date;
            version: number;
        };
    } & {
        id: string;
        status: import(".prisma/client").$Enums.ChecklistExecutionStatus;
        version: number;
        result: import(".prisma/client").$Enums.ChecklistExecutionResult | null;
        cancelledAt: Date | null;
        cancelledById: string | null;
        completedAt: Date | null;
        workOrderId: string;
        cancelReason: string | null;
        executedById: string | null;
        startedAt: Date;
        templateVersion: number;
    }>;
    cancelExecution(executionId: string, dto: CancelChecklistExecutionDto): Promise<{
        items: {
            id: string;
            status: import(".prisma/client").$Enums.ChecklistItemStatus;
            createdAt: Date;
            comment: string | null;
            executionId: string;
            itemIndex: number;
            itemText: string;
        }[];
        executedBy: {
            id: string;
            name: string;
            email: string;
            role: string;
            specialty: string | null;
            status: import(".prisma/client").$Enums.TechnicianStatus;
            department: string | null;
            avatar: string | null;
            isActive: boolean;
            createdAt: Date;
            version: number;
        };
    } & {
        id: string;
        status: import(".prisma/client").$Enums.ChecklistExecutionStatus;
        version: number;
        result: import(".prisma/client").$Enums.ChecklistExecutionResult | null;
        cancelledAt: Date | null;
        cancelledById: string | null;
        completedAt: Date | null;
        workOrderId: string;
        cancelReason: string | null;
        executedById: string | null;
        startedAt: Date;
        templateVersion: number;
    }>;
}
