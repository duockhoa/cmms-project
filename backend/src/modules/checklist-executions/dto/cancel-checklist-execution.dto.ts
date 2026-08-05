import { IsNumber, IsString, IsOptional } from 'class-validator';

export class CancelChecklistExecutionDto {
  @IsNumber()
  expectedVersion: number;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  cancelledById?: string;
}
