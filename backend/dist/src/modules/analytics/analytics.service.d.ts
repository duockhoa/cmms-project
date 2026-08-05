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
                name: string;
                status: string;
                isActive: boolean;
                createdAt: Date;
                version: number;
                category: string;
                location: string;
                updatedAt: Date;
                code: string;
                purchaseDate: Date | null;
                warrantyPeriod: string | null;
                image: string | null;
                serialNumber: string | null;
                specs: string | null;
                notes: string | null;
                currentOperatingHours: number;
            };
        } & {
            id: string;
            status: string;
            department: string | null;
            createdAt: Date;
            version: number;
            requestCode: string;
            title: string;
            description: string;
            priority: string;
            reporterName: string;
            images: string | null;
            rejectedReason: string | null;
            returnedReason: string | null;
            cancelledReason: string | null;
            cancelledAt: Date | null;
            equipmentId: string;
            cancelledById: string | null;
        })[];
        urgentWorkOrders: ({
            equipment: {
                id: string;
                name: string;
                status: string;
                isActive: boolean;
                createdAt: Date;
                version: number;
                category: string;
                location: string;
                updatedAt: Date;
                code: string;
                purchaseDate: Date | null;
                warrantyPeriod: string | null;
                image: string | null;
                serialNumber: string | null;
                specs: string | null;
                notes: string | null;
                currentOperatingHours: number;
            };
        } & {
            id: string;
            status: string;
            createdAt: Date;
            version: number;
            updatedAt: Date;
            title: string;
            description: string;
            priority: string;
            equipmentId: string;
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
