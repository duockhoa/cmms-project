import { TechnicianStatus } from '@prisma/client';
export declare class UpdateAvailabilityDto {
    status: TechnicianStatus;
    expectedVersion: number;
}
