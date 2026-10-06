import { IsOptional, IsString, IsArray } from 'class-validator';

export class StartWorkOrderSessionDto {
  @IsOptional()
  @IsString()
  taskContent?: string;
}

export class StopWorkOrderSessionDto {
  @IsOptional()
  @IsString()
  taskContent?: string;

  @IsOptional()
  @IsString()
  resultNotes?: string;

  @IsOptional()
  @IsArray()
  photos?: string[];

  @IsOptional()
  @IsArray()
  materialsUsed?: Array<{
    inventoryItemId: string;
    inventoryItemName?: string;
    quantity: number;
    unit?: string;
  }>;
}
