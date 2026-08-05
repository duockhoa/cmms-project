import { PrismaService } from '../../prisma/prisma.service';
import { CreateChecklistExecutionDto } from './dto/create-checklist-execution.dto';
import { PatchChecklistItemDto } from './dto/patch-checklist-item.dto';
import { CompleteChecklistExecutionDto } from './dto/complete-checklist-execution.dto';
import { CancelChecklistExecutionDto } from './dto/cancel-checklist-execution.dto';
export declare class ChecklistExecutionsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createExecution(workOrderId: string, dto: CreateChecklistExecutionDto): Promise<{
        items: {
            id: string;
            createdAt: Date;
            status: import(".prisma/client").$Enums.ChecklistItemStatus;
            executionId: string;
            itemIndex: number;
            itemText: string;
            comment: string | null;
        }[];
        executedBy: {
            id: string;
            createdAt: Date;
            name: string;
            status: import(".prisma/client").$Enums.TechnicianStatus;
            isActive: boolean;
            version: number;
            email: string;
            role: string;
            specialty: string | null;
            department: string | null;
            avatar: string | null;
        };
    } & {
        id: string;
        result: import(".prisma/client").$Enums.ChecklistExecutionResult | null;
        status: import(".prisma/client").$Enums.ChecklistExecutionStatus;
        version: number;
        cancelledAt: Date | null;
        cancelledById: string | null;
        completedAt: Date | null;
        workOrderId: string;
        executedById: string | null;
        cancelReason: string | null;
        startedAt: Date;
        templateVersion: number;
    }>;
    getExecutionsForWorkOrder(workOrderId: string): Promise<({
        items: {
            id: string;
            createdAt: Date;
            status: import(".prisma/client").$Enums.ChecklistItemStatus;
            executionId: string;
            itemIndex: number;
            itemText: string;
            comment: string | null;
        }[];
        executedBy: {
            id: string;
            createdAt: Date;
            name: string;
            status: import(".prisma/client").$Enums.TechnicianStatus;
            isActive: boolean;
            version: number;
            email: string;
            role: string;
            specialty: string | null;
            department: string | null;
            avatar: string | null;
        };
    } & {
        id: string;
        result: import(".prisma/client").$Enums.ChecklistExecutionResult | null;
        status: import(".prisma/client").$Enums.ChecklistExecutionStatus;
        version: number;
        cancelledAt: Date | null;
        cancelledById: string | null;
        completedAt: Date | null;
        workOrderId: string;
        executedById: string | null;
        cancelReason: string | null;
        startedAt: Date;
        templateVersion: number;
    })[]>;
    getExecutionById(executionId: string): Promise<{
        items: {
            id: string;
            createdAt: Date;
            status: import(".prisma/client").$Enums.ChecklistItemStatus;
            executionId: string;
            itemIndex: number;
            itemText: string;
            comment: string | null;
        }[];
        executedBy: {
            id: string;
            createdAt: Date;
            name: string;
            status: import(".prisma/client").$Enums.TechnicianStatus;
            isActive: boolean;
            version: number;
            email: string;
            role: string;
            specialty: string | null;
            department: string | null;
            avatar: string | null;
        };
    } & {
        id: string;
        result: import(".prisma/client").$Enums.ChecklistExecutionResult | null;
        status: import(".prisma/client").$Enums.ChecklistExecutionStatus;
        version: number;
        cancelledAt: Date | null;
        cancelledById: string | null;
        completedAt: Date | null;
        workOrderId: string;
        executedById: string | null;
        cancelReason: string | null;
        startedAt: Date;
        templateVersion: number;
    }>;
    updateItem(executionId: string, dto: PatchChecklistItemDto): Promise<{
        items: {
            id: string;
            createdAt: Date;
            status: import(".prisma/client").$Enums.ChecklistItemStatus;
            executionId: string;
            itemIndex: number;
            itemText: string;
            comment: string | null;
        }[];
        executedBy: {
            id: string;
            createdAt: Date;
            name: string;
            status: import(".prisma/client").$Enums.TechnicianStatus;
            isActive: boolean;
            version: number;
            email: string;
            role: string;
            specialty: string | null;
            department: string | null;
            avatar: string | null;
        };
    } & {
        id: string;
        result: import(".prisma/client").$Enums.ChecklistExecutionResult | null;
        status: import(".prisma/client").$Enums.ChecklistExecutionStatus;
        version: number;
        cancelledAt: Date | null;
        cancelledById: string | null;
        completedAt: Date | null;
        workOrderId: string;
        executedById: string | null;
        cancelReason: string | null;
        startedAt: Date;
        templateVersion: number;
    }>;
    completeExecution(executionId: string, dto: CompleteChecklistExecutionDto): Promise<{
        items: {
            id: string;
            createdAt: Date;
            status: import(".prisma/client").$Enums.ChecklistItemStatus;
            executionId: string;
            itemIndex: number;
            itemText: string;
            comment: string | null;
        }[];
        executedBy: {
            id: string;
            createdAt: Date;
            name: string;
            status: import(".prisma/client").$Enums.TechnicianStatus;
            isActive: boolean;
            version: number;
            email: string;
            role: string;
            specialty: string | null;
            department: string | null;
            avatar: string | null;
        };
    } & {
        id: string;
        result: import(".prisma/client").$Enums.ChecklistExecutionResult | null;
        status: import(".prisma/client").$Enums.ChecklistExecutionStatus;
        version: number;
        cancelledAt: Date | null;
        cancelledById: string | null;
        completedAt: Date | null;
        workOrderId: string;
        executedById: string | null;
        cancelReason: string | null;
        startedAt: Date;
        templateVersion: number;
    }>;
    cancelExecution(executionId: string, dto: CancelChecklistExecutionDto): Promise<{
        items: {
            id: string;
            createdAt: Date;
            status: import(".prisma/client").$Enums.ChecklistItemStatus;
            executionId: string;
            itemIndex: number;
            itemText: string;
            comment: string | null;
        }[];
        executedBy: {
            id: string;
            createdAt: Date;
            name: string;
            status: import(".prisma/client").$Enums.TechnicianStatus;
            isActive: boolean;
            version: number;
            email: string;
            role: string;
            specialty: string | null;
            department: string | null;
            avatar: string | null;
        };
    } & {
        id: string;
        result: import(".prisma/client").$Enums.ChecklistExecutionResult | null;
        status: import(".prisma/client").$Enums.ChecklistExecutionStatus;
        version: number;
        cancelledAt: Date | null;
        cancelledById: string | null;
        completedAt: Date | null;
        workOrderId: string;
        executedById: string | null;
        cancelReason: string | null;
        startedAt: Date;
        templateVersion: number;
    }>;
}
