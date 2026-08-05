import { PrismaService } from '../../prisma/prisma.service';
export declare class AnalyticsService {
    private prisma;
    constructor(prisma: PrismaService);
    getDashboardSummary(): Promise<{
        kpi: {
            totalEquipment: number;
            operationalEquipment: number;
            underMaintenanceEquipment: number;
            incidentEquipment: number;
            pendingRequests: number;
            activeWorkOrders: number;
            completedWorkOrders: number;
            totalCost: number;
            lowStockItems: number;
        };
        recentRequests: ({
            equipment: {
                id: string;
                createdAt: Date;
                code: string;
                name: string;
                category: string;
                location: string;
                status: string;
                purchaseDate: Date | null;
                warrantyPeriod: string | null;
                image: string | null;
                serialNumber: string | null;
                specs: string | null;
                notes: string | null;
                currentOperatingHours: number;
                isActive: boolean;
                updatedAt: Date;
                version: number;
            };
        } & {
            id: string;
            createdAt: Date;
            title: string;
            status: string;
            version: number;
            department: string | null;
            requestCode: string;
            equipmentId: string;
            description: string;
            priority: string;
            reporterName: string;
            images: string | null;
            rejectedReason: string | null;
            returnedReason: string | null;
            cancelledReason: string | null;
            cancelledAt: Date | null;
            cancelledById: string | null;
        })[];
        urgentWorkOrders: ({
            equipment: {
                id: string;
                createdAt: Date;
                code: string;
                name: string;
                category: string;
                location: string;
                status: string;
                purchaseDate: Date | null;
                warrantyPeriod: string | null;
                image: string | null;
                serialNumber: string | null;
                specs: string | null;
                notes: string | null;
                currentOperatingHours: number;
                isActive: boolean;
                updatedAt: Date;
                version: number;
            };
        } & {
            id: string;
            createdAt: Date;
            title: string;
            status: string;
            updatedAt: Date;
            version: number;
            equipmentId: string;
            description: string;
            priority: string;
            orderCode: string;
            technicianName: string | null;
            plannedStartDate: Date | null;
            plannedEndDate: Date | null;
            actualStartDate: Date | null;
            actualEndDate: Date | null;
            failureCause: string | null;
            solution: string | null;
            totalCost: number;
            completedAt: Date | null;
            verifiedAt: Date | null;
            closedAt: Date | null;
            scheduledDueDate: Date | null;
            scheduledDueMeter: number | null;
            generationKey: string | null;
            requestId: string | null;
            scheduleId: string | null;
        })[];
    }>;
}
