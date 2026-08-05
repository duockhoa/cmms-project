import { IsNumber, IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ResubmitRequestDto {
  @IsNumber()
  expectedVersion: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  updatedFields?: {
    title?: string;
    description?: string;
    priority?: string;
    reporterName?: string;
    department?: string;
    images?: string;
  };
}
