import { IsOptional, IsString } from 'class-validator';

export class RejectMaintenanceRequestDto {
  @IsString()
  @IsOptional()
  reason?: string;
}
