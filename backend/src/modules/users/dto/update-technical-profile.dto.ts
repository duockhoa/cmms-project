import { IsString, IsBoolean, IsNumber, IsOptional } from 'class-validator';

export class UpdateTechnicalProfileDto {
  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsNumber()
  expectedVersion: number;
}
