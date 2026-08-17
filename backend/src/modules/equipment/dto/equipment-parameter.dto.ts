import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEquipmentParameterDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsNumber()
  @IsOptional()
  minSpec?: number;

  @IsNumber()
  @IsOptional()
  maxSpec?: number;

  @IsNumber()
  @IsOptional()
  standardValue?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateEquipmentParameterDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsNumber()
  @IsOptional()
  minSpec?: number;

  @IsNumber()
  @IsOptional()
  maxSpec?: number;

  @IsNumber()
  @IsOptional()
  standardValue?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
