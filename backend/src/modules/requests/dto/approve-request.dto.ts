import { IsArray, IsOptional, IsString } from 'class-validator';

export class ApproveMaintenanceRequestDto {
  @IsString()
  @IsOptional()
  technicianName?: string;

  @IsString()
  @IsOptional()
  note?: string;

  @IsString()
  @IsOptional()
  handlerType?: string; // 'WORKSHOP' | 'EXTERNAL_DEPT'

  @IsString()
  @IsOptional()
  targetDepartment?: string; // Tên phòng ban tiếp nhận từ HRM

  @IsString()
  @IsOptional()
  assignedTechnicianId?: string; // ID nhân viên chính (backward compat)

  @IsArray()
  @IsOptional()
  assignedTechnicianIds?: string[]; // Danh sách ID người phụ trách (nhiều người)

  @IsArray()
  @IsOptional()
  supporterIds?: string[]; // Danh sách ID người hỗ trợ (không bắt buộc)

  @IsString()
  @IsOptional()
  watcherId?: string; // ID người theo dõi

  @IsString()
  @IsOptional()
  handlerTeam?: string; // Backward compatibility
}

export type ApproveRequestDto = ApproveMaintenanceRequestDto;
