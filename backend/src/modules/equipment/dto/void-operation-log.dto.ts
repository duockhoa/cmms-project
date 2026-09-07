import { IsString, IsNotEmpty, IsOptional, IsArray, MinLength } from 'class-validator';

export class VoidOperationLogSessionDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Lý do hủy kết quả phải có ít nhất 3 ký tự' })
  reason: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  logIds?: string[];

  @IsString()
  @IsOptional()
  recordedAt?: string;
}
