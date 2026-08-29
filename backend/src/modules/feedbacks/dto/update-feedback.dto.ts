import { IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFeedbackDto {
  @ApiPropertyOptional({ description: 'Nội dung / Tiêu đề' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Mô tả chi tiết' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Loại' })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ description: 'Phản hồi từ Admin / Người xử lý' })
  @IsString()
  @IsOptional()
  response?: string;

  @ApiPropertyOptional({ description: 'Nguyên nhân (nếu lỗi)' })
  @IsString()
  @IsOptional()
  rootCause?: string;

  @ApiPropertyOptional({ description: 'Người xử lý' })
  @IsString()
  @IsOptional()
  handlerName?: string;

  @ApiPropertyOptional({ description: 'Ngày dự kiến hoàn thành' })
  @IsDateString()
  @IsOptional()
  expectedCompletionDate?: string;

  @ApiPropertyOptional({ description: 'Trạng thái: PENDING, IN_PROGRESS, RESOLVED, CLOSED, REJECTED' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Ngày thực tế hoàn thành' })
  @IsDateString()
  @IsOptional()
  actualCompletionDate?: string;

  @ApiPropertyOptional({ description: 'Hình ảnh hoàn thành (JSON string mảng URL)' })
  @IsString()
  @IsOptional()
  completionImages?: string;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsString()
  @IsOptional()
  notes?: string;
}
