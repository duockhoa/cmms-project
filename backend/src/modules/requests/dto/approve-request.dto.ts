import { IsOptional, IsString } from 'class-validator';

export class ApproveMaintenanceRequestDto {
  @IsString()
  @IsOptional()
  technicianName?: string;

  @IsString()
  @IsOptional()
  note?: string;

  @IsString()
  @IsOptional()
  handlerTeam?: string; // 'XUONG' hoặc 'CO_DIEN'
}

