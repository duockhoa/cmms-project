import { UsersService } from './users.service';
import { UpdateTechnicalProfileDto } from './dto/update-technical-profile.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getUsers(role?: string, includeInactive?: string): Promise<{
        activeWorkOrderCount: number;
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
    }[]>;
    getUserById(id: string): Promise<{
        activeWorkOrderCount: number;
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
    }>;
    updateTechnicalProfile(id: string, dto: UpdateTechnicalProfileDto): Promise<{
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
    }>;
    updateAvailability(id: string, dto: UpdateAvailabilityDto): Promise<{
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
    }>;
}
