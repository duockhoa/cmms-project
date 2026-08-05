import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { ChecklistItemStatus } from '@prisma/client';

export class PatchChecklistItemDto {
  @IsNumber()
  itemIndex: number;

  @IsEnum(ChecklistItemStatus)
  status: ChecklistItemStatus;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsNumber()
  expectedVersion: number;
}
