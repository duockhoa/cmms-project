import { IsEnum, IsNumber } from 'class-validator';
import { TechnicianStatus } from '@prisma/client';

export class UpdateAvailabilityDto {
  @IsEnum(TechnicianStatus)
  status: TechnicianStatus;

  @IsNumber()
  expectedVersion: number;
}
