import { IsNotEmpty, IsString, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';

export class CreateScheduleDto {
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề (title) là bắt buộc' })
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty({ message: 'Thiết bị (equipmentId) là bắt buộc' })
  equipmentId: string;

  @IsString()
  @IsNotEmpty({ message: 'Loại chu kỳ (frequencyType) là bắt buộc' })
  frequencyType: string; // DAILY, WEEKLY, MONTHLY, OPERATING_HOURS, QUARTERLY, YEARLY

  @IsNumber()
  @Min(1, { message: 'frequencyInterval phải lớn hơn 0' })
  frequencyInterval: number;

  @IsString()
  @IsNotEmpty({ message: 'Ngày bắt đầu (startDate) là bắt buộc' })
  startDate: string;

  @IsNumber()
  @IsOptional()
  estimatedDurationMinutes?: number;

  @IsString()
  @IsOptional()
  defaultPriority?: string; // LOW, MEDIUM, HIGH, URGENT

  @IsString()
  @IsOptional()
  assignedTechnicianId?: string;

  @IsString()
  @IsNotEmpty({ message: 'Người tạo (createdById) là bắt buộc' })
  createdById: string;

  @IsBoolean()
  @IsOptional()
  autoGenerate?: boolean;

  @IsNumber()
  @IsOptional()
  leadTimeDays?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsOptional()
  checklistJson?: any;
}

export class UpdateScheduleDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  frequencyType?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  frequencyInterval?: number;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsNumber()
  @IsOptional()
  estimatedDurationMinutes?: number;

  @IsString()
  @IsOptional()
  defaultPriority?: string;

  @IsString()
  @IsOptional()
  assignedTechnicianId?: string;

  @IsBoolean()
  @IsOptional()
  autoGenerate?: boolean;

  @IsNumber()
  @IsOptional()
  leadTimeDays?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsNumber()
  @IsNotEmpty({ message: 'expectedVersion là bắt buộc' })
  expectedVersion: number;

  @IsString()
  @IsNotEmpty({ message: 'actedById là bắt buộc' })
  actedById: string;
}

export class ActivateScheduleDto {
  @IsNumber()
  @IsNotEmpty({ message: 'expectedVersion là bắt buộc' })
  expectedVersion: number;

  @IsString()
  @IsNotEmpty({ message: 'actedById là bắt buộc' })
  actedById: string;
}

export class PauseScheduleDto {
  @IsString()
  @IsNotEmpty({ message: 'Lý do tạm dừng (reason) là bắt buộc' })
  reason: string;

  @IsNumber()
  @IsNotEmpty({ message: 'expectedVersion là bắt buộc' })
  expectedVersion: number;

  @IsString()
  @IsNotEmpty({ message: 'actedById là bắt buộc' })
  actedById: string;
}

export class CompleteScheduleDto {
  @IsString()
  @IsNotEmpty({ message: 'Lý do hoàn thành (reason) là bắt buộc' })
  reason: string;

  @IsNumber()
  @IsNotEmpty({ message: 'expectedVersion là bắt buộc' })
  expectedVersion: number;

  @IsString()
  @IsNotEmpty({ message: 'actedById là bắt buộc' })
  actedById: string;
}

export class CancelScheduleDto {
  @IsString()
  @IsNotEmpty({ message: 'Lý do hủy (reason) là bắt buộc' })
  reason: string;

  @IsNumber()
  @IsNotEmpty({ message: 'expectedVersion là bắt buộc' })
  expectedVersion: number;

  @IsString()
  @IsNotEmpty({ message: 'actedById là bắt buộc' })
  actedById: string;
}

export class GenerateWorkOrderDto {
  @IsNumber()
  @IsNotEmpty({ message: 'expectedVersion là bắt buộc' })
  expectedVersion: number;

  @IsString()
  @IsNotEmpty({ message: 'actedById là bắt buộc' })
  actedById: string;

  @IsString()
  @IsOptional()
  dueDate?: string;
}
