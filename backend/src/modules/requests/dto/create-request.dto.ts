import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateMaintenanceRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'Thiết bị không được để trống' })
  equipmentId: string;

  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'Mô tả không được để trống' })
  description: string;

  @IsString()
  @IsOptional()
  priority?: string;

  @IsString()
  @IsOptional()
  reporterName?: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsString()
  @IsOptional()
  images?: string;
}
