import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateMaintenanceRequestDto {
  @IsString()
  @IsOptional()
  equipmentId?: string; // ID hoặc mã thiết bị (UUID hoặc code như TBSX915)

  @IsString()
  @IsOptional()
  equipmentCode?: string; // Mã thiết bị thực tế từ hệ thống ngoài (VD: TBSX915, TBSX001)

  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'Mô tả không được để trống' })
  description: string;

  @IsString()
  @IsOptional()
  priority?: string; // LOW, MEDIUM, HIGH, URGENT (Mặc định: MEDIUM)

  @IsString()
  @IsOptional()
  functionalUnitId?: string; // Tùy chọn: ID cụm chức năng bị lỗi

  @IsString()
  @IsOptional()
  images?: string; // Tùy chọn: Link hoặc mảng JSON ảnh đính kèm

  @IsString()
  @IsOptional()
  reporterName?: string; // Tùy chọn: Tự động trích xuất từ tài khoản đăng nhập nếu không truyền

  @IsString()
  @IsOptional()
  department?: string; // Tùy chọn: Tự động trích xuất từ tài khoản đăng nhập nếu không truyền

  @IsString()
  @IsOptional()
  reporterId?: string; // Tùy chọn: Tự động trích xuất từ tài khoản đăng nhập nếu không truyền
}

