import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class CreateFunctionalUnitDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsNumber()
  @IsOptional()
  orderIndex?: number;

  @IsString()
  @IsOptional()
  libraryId?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsBoolean()
  @IsOptional()
  saveToLibrary?: boolean;
}

export class UpdateFunctionalUnitDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsNumber()
  @IsOptional()
  orderIndex?: number;

  @IsString()
  @IsOptional()
  libraryId?: string;
}

export class CreateFunctionalUnitLibraryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateFunctionalUnitLibraryDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class BulkImportFunctionalUnitDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Danh sách cụm chức năng import không được để trống' })
  @ArrayMaxSize(1000, { message: 'Mỗi lần import tối đa 1000 dòng cụm chức năng' })
  items: Record<string, any>[];
}
