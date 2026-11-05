import { IsInt, IsNotEmpty, IsOptional, IsString, IsBoolean } from 'class-validator';

export class CreateIncidentAssessmentDto {
  @IsInt()
  @IsNotEmpty()
  expectedVersion: number;

  @IsString()
  @IsNotEmpty({ message: 'Vui lòng mô tả hiện trạng thực tế của thiết bị' })
  actualCondition: string;

  @IsString()
  @IsNotEmpty({ message: 'Vui lòng chọn hoặc nhập nguyên nhân sơ bộ' })
  preliminaryCause: string;

  @IsString()
  @IsOptional()
  preliminaryCauseDetail?: string;

  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập phương án xử lý sơ bộ' })
  proposedSolution: string;

  @IsInt()
  @IsOptional()
  estimatedCompletionMinutes?: number;

  @IsBoolean()
  @IsOptional()
  requireSpareParts?: boolean;

  @IsString()
  @IsOptional()
  sparePartsNeeded?: string;

  @IsString()
  @IsOptional()
  images?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

