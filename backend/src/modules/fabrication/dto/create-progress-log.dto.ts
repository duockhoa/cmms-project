import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProgressLogDto {
  @ApiProperty({ description: 'Nội dung chi tiết công việc đã thực hiện' })
  @IsString()
  @IsNotEmpty({ message: 'Nội dung công việc không được để trống' })
  taskContent: string;

  @ApiPropertyOptional({ description: 'Số giờ công thực hiện lượt này (VD: 1.5, 2.0)' })
  @IsOptional()
  @IsNumber({}, { message: 'Giờ công phải là số hợp lệ' })
  @Min(0, { message: 'Giờ công không được âm' })
  hoursSpent?: number;

  @ApiPropertyOptional({ description: 'Tiến độ ước tính phần trăm (0 - 100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progressPercent?: number;

  @ApiPropertyOptional({ description: 'Text mô tả tiến độ tự do do người dùng ghi' })
  @IsOptional()
  @IsString()
  progressText?: string;

  @ApiPropertyOptional({ description: 'Ghi chú, khó khăn hoặc lưu ý' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Danh sách URLs ảnh minh chứng' })
  @IsOptional()
  @IsArray()
  photos?: any[];

  @ApiPropertyOptional({ description: 'Ngày thực hiện công việc (ISO string)' })
  @IsOptional()
  @IsString()
  workDate?: string;
}
