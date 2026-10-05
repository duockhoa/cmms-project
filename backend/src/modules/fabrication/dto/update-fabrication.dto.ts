import { PartialType } from '@nestjs/swagger';
import { CreateFabricationDto } from './create-fabrication.dto';
import { IsOptional, IsEnum, IsString, IsNumber } from 'class-validator';
import { FabricationStatusEnum } from './create-fabrication.dto';

export class UpdateFabricationDto extends PartialType(CreateFabricationDto) {
  @IsOptional()
  @IsEnum(FabricationStatusEnum)
  status?: FabricationStatusEnum;

  @IsOptional()
  actualStartDate?: string;

  @IsOptional()
  actualEndDate?: string;

  @IsOptional()
  @IsNumber()
  actualHours?: number;

  @IsOptional()
  resultImages?: any;

  @IsOptional()
  @IsString()
  resultNotes?: string;

  @IsOptional()
  @IsString()
  acceptanceRating?: string;

  @IsOptional()
  @IsString()
  acceptedByName?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
