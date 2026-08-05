import { IsOptional, IsString } from 'class-validator';

export class ApproveMaintenanceRequestDto {
  @IsString()
  @IsOptional()
  technicianName?: string;

  @IsString()
  @IsOptional()
  note?: string;
}
