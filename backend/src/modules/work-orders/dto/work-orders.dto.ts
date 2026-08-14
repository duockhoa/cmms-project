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
  @IsOptional()
  technicianName?: string;

  @IsString()
  @IsOptional()
  assignedTechnicianId?: string;

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

export class CreateExecutionLogDto {
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

// Backward compatibility or fallback support
export class CreateRepairLogDto extends CreateExecutionLogDto {}

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

export class EscalateWorkOrderDto {
  @IsString()
  @IsNotEmpty({ message: 'Lý do yêu cầu hỗ trợ kỹ thuật không được để trống' })
  reason: string;

  @IsInt()
  @IsNotEmpty()
  expectedVersion: number;
}

export class ClassifyWorkOrderDto {
  @IsString()
  @IsNotEmpty({ message: 'Kết quả phân loại không được để trống' })
  classificationResult: 'WORKSHOP_CONTINUE' | 'MAINTENANCE_REQUIRED';

  @IsString()
  @IsNotEmpty({ message: 'Nhận xét đánh giá không được để trống' })
  classificationNotes: string;

  @IsInt()
  @IsNotEmpty()
  expectedVersion: number;
}

export class SubmitHandoverDto {
  @IsInt()
  @IsNotEmpty()
  expectedVersion: number;

  @IsString()
  @IsNotEmpty({ message: 'Nội dung sửa chữa không được để trống' })
  workDone: string;

  @IsString()
  @IsNotEmpty({ message: 'Tình trạng thiết bị không được để trống' })
  equipmentStatusAfter: string;

  @IsString()
  @IsNotEmpty({ message: 'Kết quả chạy thử không được để trống' })
  testResult: string;

  @IsString()
  @IsNotEmpty({ message: 'Kết luận không được để trống' })
  conclusion: string;

  @IsString()
  @IsOptional()
  recommendation?: string;
}

export class RejectHandoverDto {
  @IsString()
  @IsNotEmpty({ message: 'Lý do từ chối bàn giao không được để trống' })
  reason: string;

  @IsInt()
  @IsNotEmpty()
  expectedVersion: number;
}
