import { IsNotEmpty, IsString, IsOptional, IsInt, IsPositive } from 'class-validator';

export class CreateWorkOrderDto {
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'Thiết bị không được để trống' })
  equipmentId: string;

  @IsString()
  @IsOptional()
  requestId?: string;

  @IsString()
  @IsNotEmpty({ message: 'Mô tả không được để trống' })
  description: string;

  @IsString()
  @IsOptional()
  priority?: string;

  @IsString()
  @IsOptional()
  technicianName?: string;

  @IsString()
  @IsOptional()
  plannedStartDate?: string;

  @IsString()
  @IsOptional()
  plannedEndDate?: string;
}

export class AssignWorkOrderDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên kỹ thuật viên không được để trống' })
  technicianName: string;

  @IsInt()
  @IsNotEmpty()
  expectedVersion: number;
}

export class StartWorkOrderDto {
  @IsInt()
  @IsNotEmpty()
  expectedVersion: number;
}

export class PauseWorkOrderDto {
  @IsString()
  @IsNotEmpty({ message: 'Lý do tạm dừng không được để trống' })
  reason: string;

  @IsInt()
  @IsNotEmpty()
  expectedVersion: number;
}

export class ResumeWorkOrderDto {
  @IsInt()
  @IsNotEmpty()
  expectedVersion: number;
}

export class CompleteWorkOrderDto {
  @IsInt()
  @IsNotEmpty()
  expectedVersion: number;

  @IsString()
  @IsOptional()
  failureCause?: string;

  @IsString()
  @IsOptional()
  solution?: string;

  // New fields for detailed completion reporting
  @IsString()
  @IsOptional()
  workDone?: string;

  @IsString()
  @IsOptional()
  equipmentStatusAfter?: string;

  @IsString()
  @IsOptional()
  testResult?: string;

  @IsString()
  @IsOptional()
  conclusion?: string;

  @IsString()
  @IsOptional()
  recommendation?: string;
}

export class CreateRepairLogDto {
  @IsString()
  @IsNotEmpty({ message: 'Nội dung không được để trống' })
  content: string;

  @IsString()
  @IsOptional()
  result?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  adjustedLogId?: string;

  @IsString()
  @IsOptional()
  adjustmentReason?: string;
}

export class VerifyWorkOrderDto {
  @IsInt()
  @IsNotEmpty()
  expectedVersion: number;

  @IsString()
  @IsOptional()
  comment?: string;
}

export class CloseWorkOrderDto {
  @IsInt()
  @IsNotEmpty()
  expectedVersion: number;
}

export class CancelWorkOrderDto {
  @IsString()
  @IsNotEmpty({ message: 'Lý do hủy không được để trống' })
  reason: string;

  @IsInt()
  @IsNotEmpty()
  expectedVersion: number;
}

export class AddWorkOrderItemDto {
  @IsString()
  @IsNotEmpty()
  inventoryItemId: string;

  @IsInt()
  @IsPositive({ message: 'Số lượng phải lớn hơn 0' })
  quantity: number;
}
