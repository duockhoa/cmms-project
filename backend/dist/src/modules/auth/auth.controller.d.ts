import { PrismaService } from '../../prisma/prisma.service';
export declare class AuthController {
    private prisma;
    constructor(prisma: PrismaService);
    getMe(req: any): Promise<{
        authenticated: boolean;
        user: {
            id: string;
            name: string;
            email: string;
            role: string;
            status: import(".prisma/client").$Enums.TechnicianStatus;
            isActive: boolean;
        };
        permissions: any[];
        scope: {
            department: string;
            assignedOnly: boolean;
        };
    }>;
}
