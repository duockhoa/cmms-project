import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFeedbackDto {
  @ApiProperty({ description: 'Nội dung / Tiêu đề góp ý hoặc lỗi' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Mô tả chi tiết yêu cầu / lỗi' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ description: 'Loại: BUG, FEATURE, IMPROVEMENT, OTHER', default: 'BUG' })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ description: 'Người yêu cầu' })
  @IsString()
  @IsOptional()
  requesterName?: string;

  @ApiPropertyOptional({ description: 'Bộ phận' })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiPropertyOptional({ description: 'Số điện thoại liên hệ' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Hình ảnh / file đính kèm (JSON string mảng URL)' })
  @IsString()
  @IsOptional()
  attachments?: string;
}
