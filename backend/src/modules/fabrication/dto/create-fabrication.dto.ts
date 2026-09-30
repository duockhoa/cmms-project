import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum FabricationCategoryEnum {
  FABRICATION = 'FABRICATION',
  NEW_MAKING = 'NEW_MAKING',
  MODIFICATION = 'MODIFICATION',
  INSTALLATION = 'INSTALLATION',
  INFRASTRUCTURE = 'INFRASTRUCTURE',
  OTHER = 'OTHER',
}

export enum FabricationStatusEnum {
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export class CreateFabricationMaterialDto {
  @IsString()
  @IsNotEmpty()
  materialName: string;

  @IsNumber()
  quantity: number;

  @IsString()
  @IsNotEmpty()
  unit: string;

  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @IsOptional()
  @IsString()
  inventoryItemId?: string;
}

export class CreateFabricationDto {
  @ApiProperty({ description: 'Tên công việc / sản phẩm chế tạo' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ enum: FabricationCategoryEnum })
  @IsOptional()
  @IsEnum(FabricationCategoryEnum)
  category?: FabricationCategoryEnum;

  @ApiPropertyOptional({ default: 'MEDIUM' })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiProperty({ description: 'Mô tả chi tiết nội dung công việc' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ description: 'Quy cách kỹ thuật, kích thước, vật liệu' })
  @IsOptional()
  @IsString()
  specifications?: string;

  @ApiPropertyOptional({ description: 'Vị trí / Phân xưởng áp dụng' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Bộ phận thụ hưởng / yêu cầu' })
  @IsOptional()
  @IsString()
  targetDepartment?: string;

  @ApiPropertyOptional({ description: 'Thiết bị liên quan (nếu có)' })
  @IsOptional()
  @IsString()
  equipmentId?: string;

  @ApiPropertyOptional({ description: 'Kỹ thuật viên phụ trách chính' })
  @IsOptional()
  @IsString()
  assignedTechnicianId?: string;

  @ApiPropertyOptional({ description: 'Danh sách kỹ thuật viên hỗ trợ' })
  @IsOptional()
  @IsArray()
  supporterIds?: string[];

  @ApiPropertyOptional({ description: 'Ngày bắt đầu dự kiến' })
  @IsOptional()
  plannedStartDate?: string;

  @ApiPropertyOptional({ description: 'Hạn hoàn thành dự kiến' })
  @IsOptional()
  plannedEndDate?: string;

  @ApiPropertyOptional({ description: 'Số giờ công ước tính' })
  @IsOptional()
  @IsNumber()
  estimatedHours?: number;

  @ApiPropertyOptional({ description: 'Bản vẽ kỹ thuật, ảnh thiết kế đính kèm' })
  @IsOptional()
  drawings?: any;

  @ApiPropertyOptional({ description: 'Vật tư phôi thô sử dụng', type: [CreateFabricationMaterialDto] })
  @IsOptional()
  @IsArray()
  materials?: CreateFabricationMaterialDto[];
}
