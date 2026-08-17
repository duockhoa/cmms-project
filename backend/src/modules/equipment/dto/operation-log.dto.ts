import { IsString, IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class OperationLogItemDto {
  @IsString()
  parameterId: string;

  @IsNumber()
  value: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class SubmitOperationLogsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OperationLogItemDto)
  logs: OperationLogItemDto[];
}
