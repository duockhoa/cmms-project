import { IsNotEmpty, IsString, IsOptional, IsInt, IsNumber, Min } from 'class-validator';

export class CreateInventoryItemDto {
  @IsString()
  @IsOptional()
  itemCode?: string;

  @IsString()
  @IsNotEmpty({ message: 'Tên vật tư không được để trống' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Phân loại không được để trống' })
  category: string;

  @IsInt()
  @Min(0, { message: 'Số lượng không được âm' })
  @IsOptional()
  quantity?: number;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsInt()
  @Min(0, { message: 'Định mức tối thiểu không được âm' })
  @IsOptional()
  minQuantity?: number;

  @IsNumber()
  @Min(0, { message: 'Đơn giá không được âm' })
  @IsOptional()
  unitPrice?: number;

  @IsString()
  @IsOptional()
  location?: string;
}

export class AdjustInventoryStockDto {
  @IsNumber()
  @IsNotEmpty({ message: 'Số lượng thay đổi không được để trống' })
  changeQuantity: number;

  @IsInt()
  @IsOptional()
  expectedVersion?: number;
}

export class AdjustInDto {
  @IsNumber()
  @Min(1, { message: 'Số lượng phải lớn hơn 0' })
  quantity: number;

  @IsString()
  @IsNotEmpty({ message: 'Lý do điều chỉnh (reason) là bắt buộc' })
  reason: string;

  @IsOptional()
  @IsString()
  referenceCode?: string;

  @IsNumber()
  expectedVersion: number;

  @IsString()
  @IsNotEmpty({ message: 'Người thực hiện (actedById) là bắt buộc' })
  actedById: string;

  @IsOptional()
  @IsString()
  clientTransactionId?: string;
}

export class AdjustOutDto {
  @IsNumber()
  @Min(1, { message: 'Số lượng phải lớn hơn 0' })
  quantity: number;

  @IsString()
  @IsNotEmpty({ message: 'Lý do điều chỉnh (reason) là bắt buộc' })
  reason: string;

  @IsOptional()
  @IsString()
  referenceCode?: string;

  @IsNumber()
  expectedVersion: number;

  @IsString()
  @IsNotEmpty({ message: 'Người thực hiện (actedById) là bắt buộc' })
  actedById: string;

  @IsOptional()
  @IsString()
  clientTransactionId?: string;
}

export class MaterialReturnDto {
  @IsString()
  @IsNotEmpty({ message: 'inventoryItemId là bắt buộc' })
  inventoryItemId: string;

  @IsNumber()
  @Min(1, { message: 'Số lượng trả phải lớn hơn 0' })
  quantity: number;

  @IsString()
  @IsNotEmpty({ message: 'Lý do (reason) là bắt buộc' })
  reason: string;

  @IsString()
  @IsNotEmpty({ message: 'workOrderItemId là bắt buộc' })
  workOrderItemId: string;

  @IsNumber()
  expectedInventoryVersion: number;

  @IsNumber()
  expectedWorkOrderVersion: number;

  @IsString()
  @IsNotEmpty({ message: 'Người thực hiện (actedById) là bắt buộc' })
  actedById: string;

  @IsOptional()
  @IsString()
  clientTransactionId?: string;
}
