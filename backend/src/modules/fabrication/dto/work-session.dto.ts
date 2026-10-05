import { IsString, IsOptional, IsNumber, Min, Max, IsArray, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class StartWorkSessionDto {
  @ApiPropertyOptional({ description: 'Ghi chú ban đầu khi bắt đầu ca làm việc' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Tự động kết thúc phiên đang chạy ở phiếu khác để chuyển sang phiếu này' })
  @IsOptional()
  @IsBoolean()
  autoSwitch?: boolean;
}

export class StopWorkSessionDto {
  @ApiPropertyOptional({ description: 'Nội dung chi tiết phần việc đã làm trong phiên này' })
  @IsOptional()
  @IsString()
  taskContent?: string;

  @ApiPropertyOptional({ description: 'Ghi chú, khó khăn hoặc lưu ý' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Tiến độ ước tính sau phiên làm việc (0 - 100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progressPercent?: number;

  @ApiPropertyOptional({ description: 'Text mô tả tiến độ tự do do người dùng ghi' })
  @IsOptional()
  @IsString()
  progressText?: string;

  @ApiPropertyOptional({ description: 'Danh sách URLs ảnh minh chứng' })
  @IsOptional()
  @IsArray()
  photos?: any[];

  @ApiPropertyOptional({ description: 'Lý do kết thúc phiên (MANUAL, ORDER_COMPLETED, AUTO_CAP)' })
  @IsOptional()
  @IsString()
  autoStopReason?: string;
}
