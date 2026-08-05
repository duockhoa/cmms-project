import { IsString, IsOptional, IsArray, IsNumber } from 'class-validator';

export class CreateChecklistExecutionDto {
  @IsOptional()
  @IsString()
  executedById?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  checklistItems?: string[];

  @IsOptional()
  @IsNumber()
  templateVersion?: number;
}
