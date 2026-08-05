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
        email: string;
        role: string;
        specialty: string | null;
        status: import(".prisma/client").$Enums.TechnicianStatus;
        department: string | null;
        avatar: string | null;
        isActive: boolean;
        createdAt: Date;
        version: number;
    }[]>;
    getUserById(id: string): Promise<{
        activeWorkOrderCount: number;
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
    }>;
    updateTechnicalProfile(id: string, dto: UpdateTechnicalProfileDto): Promise<{
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
    }>;
    updateAvailability(id: string, dto: UpdateAvailabilityDto): Promise<{
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
    }>;
}
