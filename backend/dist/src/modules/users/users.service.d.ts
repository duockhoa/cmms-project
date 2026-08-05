import { PrismaService } from '../../prisma/prisma.service';
import { UpdateTechnicalProfileDto } from './dto/update-technical-profile.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getUsers(role?: string, includeInactive?: boolean): Promise<{
        activeWorkOrderCount: number;
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
    }[]>;
    getUserById(id: string): Promise<{
        activeWorkOrderCount: number;
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
    }>;
    updateTechnicalProfile(id: string, dto: UpdateTechnicalProfileDto): Promise<{
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
    }>;
    updateAvailability(id: string, dto: UpdateAvailabilityDto): Promise<{
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
    }>;
}
