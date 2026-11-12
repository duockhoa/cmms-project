import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsDateString, IsArray, IsBoolean, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export enum EquipmentStatus {
  OPERATIONAL = 'OPERATIONAL',
  UNDER_MAINTENANCE = 'UNDER_MAINTENANCE',
  INCIDENT = 'INCIDENT',
  DISCOMMISSIONED = 'DISCOMMISSIONED',
}

export class CreateEquipmentDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  oldCode?: string;

  @IsString()
  @IsOptional()
  accountingCode?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsEnum(EquipmentStatus)
  @IsOptional()
  status?: EquipmentStatus;

  @IsDateString()
  @IsOptional()
  purchaseDate?: string;

  @IsString()
  @IsOptional()
  warrantyPeriod?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsString()
  @IsOptional()
  serialNumber?: string;

  @IsString()
  @IsOptional()
  specs?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  functionalUnit?: string;

  @IsArray()
  @IsOptional()
  functionalUnits?: string[];

  @IsNumber()
  @IsOptional()
  currentOperatingHours?: number;

  @IsBoolean()
  @IsOptional()
  isCritical?: boolean;

  @IsNumber()
  @IsOptional()
  standardSpeedPerHour?: number;

  @IsString()
  @IsOptional()
  outputUnit?: string;

  @IsNumber()
  @IsOptional()
  plannedShiftMinutes?: number;

  @IsNumber()
  @IsOptional()
  oeeTarget?: number;
}

export class UpdateEquipmentDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  oldCode?: string;

  @IsString()
  @IsOptional()
  accountingCode?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsEnum(EquipmentStatus)
  @IsOptional()
  status?: EquipmentStatus;

  @IsDateString()
  @IsOptional()
  purchaseDate?: string;

  @IsString()
  @IsOptional()
  warrantyPeriod?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsString()
  @IsOptional()
  serialNumber?: string;

  @IsString()
  @IsOptional()
  specs?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  functionalUnit?: string;

  @IsArray()
  @IsOptional()
  functionalUnits?: string[];

  @IsNumber()
  @IsOptional()
  currentOperatingHours?: number;

  @IsBoolean()
  @IsOptional()
  isCritical?: boolean;

  @IsNumber()
  @IsOptional()
  standardSpeedPerHour?: number;

  @IsString()
  @IsOptional()
  outputUnit?: string;

  @IsNumber()
  @IsOptional()
  plannedShiftMinutes?: number;

  @IsNumber()
  @IsOptional()
  oeeTarget?: number;

  @IsNumber()
  @IsNotEmpty()
  expectedVersion: number;
}

export class BulkImportEquipmentDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Danh sách thiết bị import không được để trống' })
  @ArrayMaxSize(500, { message: 'Mỗi lần import tối đa 500 thiết bị' })
  items: Record<string, any>[];
}
