import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsObject, IsArray, Min, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DowntimeLossBreakdownDto {
  // 8 Đầu mục chuẩn theo PHIẾU THU THẬP DỮ LIỆU HIỆN TRƯỜNG OEE (VER2)
  @IsNumber()
  @IsOptional()
  cleaningMinutes?: number; // 1. Vệ sinh đầu ca / cuối ca

  @IsNumber()
  @IsOptional()
  adjustmentMinutes?: number; // 2. Chỉnh máy (Sau vệ sinh và trước chạy máy)

  @IsNumber()
  @IsOptional()
  runMinutes?: number; // 3. Chạy máy (Bắt đầu từ khi có SP tạo ra)

  @IsNumber()
  @IsOptional()
  breakMinutes?: number; // 4. Nghỉ ca (Nghỉ giữa ca)

  @IsNumber()
  @IsOptional()
  breakdownMinutes?: number; // 5. Hỏng máy (Yêu cầu hỗ trợ - có sự cố đã báo trên APP)

  @IsNumber()
  @IsOptional()
  noOperatorMinutes?: number; // 6. Thiếu người (Không có người đứng máy do việc phát sinh)

  @IsNumber()
  @IsOptional()
  qualityProcessMinutes?: number; // 7. Chất lượng / quá trình (Dừng vì bao bì/nguyên liệu/môi trường chưa đạt)

  @IsNumber()
  @IsOptional()
  otherWaitingMinutes?: number; // 8. Chờ khác (Chờ dụng cụ/kỹ thuật/bảo trì/kiểm tra/nguyên liệu/bao bì)

  // Tương thích mở rộng & lưu chi tiết khung giờ Lần 1 / Lần 2 của tờ phiếu VER2
  @IsNumber()
  @IsOptional()
  changeoverMinutes?: number;

  @IsNumber()
  @IsOptional()
  plannedMaintenanceMinutes?: number;

  @IsNumber()
  @IsOptional()
  waitingMaterialMinutes?: number;

  @IsOptional()
  fieldSheetVer2?: any; // Lưu nguyên trạng bảng khung giờ Lần 1 (Bắt đầu - Kết thúc), Lần 2 (Bắt đầu - Kết thúc), Chỉ số đầu ca, NT cuối kỳ, Người ký
}

export class CreateOeeRecordDto {
  @ApiPropertyOptional({ description: 'Ngày ghi nhận (định dạng ISO, ví dụ: 2026-11-13T00:00:00.000Z)', example: '2026-11-13T00:00:00.000Z' })
  @IsString()
  @IsOptional()
  recordDate?: string; // ISO date string

  @ApiPropertyOptional({ description: 'Ca làm việc: CA_1, CA_2, CA_3, HANH_CHINH', example: 'CA_1', default: 'CA_1' })
  @IsString()
  @IsOptional()
  shift?: string; // CA_1, CA_2, HANH_CHINH, CA_3

  @ApiPropertyOptional({ description: 'Xưởng sản xuất (ví dụ: HT, PX1)', example: 'HT' })
  @IsString()
  @IsOptional()
  workshop?: string; // Xưởng (VD: HT)

  @ApiPropertyOptional({ description: 'Số lô sản xuất (VD: 1091026)', example: 'LOT-20261113' })
  @IsString()
  @IsOptional()
  batchNumber?: string; // Số lô (VD: 1091026)

  @ApiPropertyOptional({ description: 'Tên hoặc mã sản phẩm', example: 'Sản phẩm A' })
  @IsString()
  @IsOptional()
  productName?: string; // Mã sản phẩm (VD: TP00201)

  @ApiPropertyOptional({ description: 'Mã thành phẩm (VD: TP00201)', example: 'TP00201' })
  @IsString()
  @MaxLength(191)
  @IsOptional()
  productCode?: string;

  @ApiPropertyOptional({ description: 'Nhóm sản phẩm theo bảng định mức tốc độ', example: 'Chai 500ml' })
  @IsString()
  @MaxLength(191)
  @IsOptional()
  productGroup?: string;

  @ApiPropertyOptional({ description: 'Tốc độ thực tế máy ghi trên phiếu hoặc cảm biến (SP/phút)', example: 50 })
  @IsNumber()
  @IsOptional()
  machineSpeed?: number; // Tốc độ máy ghi trên phiếu (VD: 50 SP/phút)

  @ApiPropertyOptional({ description: 'Lô nhiều ngày hay bắt đầu từ 0', example: false })
  @IsBoolean()
  @IsOptional()
  isMultiDayBatch?: boolean; // Lô nhiều ngày hay bắt đầu từ 0

  @ApiPropertyOptional({ description: 'Số lượng SP khi bắt đầu chạy máy (đầu ca)', example: 0 })
  @IsNumber()
  @IsOptional()
  startOutputCount?: number; // Số lượng SP khi bắt đầu chạy máy (VD: 0 hoặc 35072)

  @ApiPropertyOptional({ description: 'Chỉ số công tơ / đếm cuối kỳ (cuối ca)', example: 21000 })
  @IsNumber()
  @IsOptional()
  endCounterNt?: number; // Chỉ số NT cuối kỳ (VD: 42016)

  @ApiPropertyOptional({ description: 'Người ghi nhận / vận hành ký phiếu', example: 'Nguyễn Văn A' })
  @IsString()
  @IsOptional()
  operatorSignName?: string; // Người ghi ký trên phiếu (VD: Hoài)

  @ApiPropertyOptional({
    description: 'Nhật ký lỗi chi tiết trong ca',
    example: [{ time: '09:30', quantity: 50, reason: 'Lỗi cấn màng' }],
  })
  @IsArray()
  @IsOptional()
  defectLogs?: Array<{
    time?: string;
    quantity?: number;
    reason?: string;
  }>;

  @ApiProperty({ description: 'Tổng thời gian ca làm việc (phút)', example: 480, default: 480 })
  @IsNumber()
  @Min(1)
  shiftDurationMinutes: number;

  @ApiProperty({ description: 'Tổng thời gian dừng có kế hoạch (phút)', example: 30, default: 0 })
  @IsNumber()
  @Min(0)
  plannedDowntimeMinutes: number;

  @ApiProperty({ description: 'Tổng thời gian dừng sự cố ngoài kế hoạch (phút)', example: 20, default: 0 })
  @IsNumber()
  @Min(0)
  unplannedDowntimeMinutes: number;

  @ApiPropertyOptional({ description: 'Thời gian chạy máy thực tế (phút) nếu đã tính sẵn (bỏ trống hệ thống tự tính)', example: 430 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  runTimeMinutesOverride?: number; // Thời gian chạy máy thực tế tính trực tiếp từ mục "Chạy máy" trên phiếu VER2

  @ApiPropertyOptional({ description: 'Thời gian dừng máy từ phiếu sửa chữa CMMS tự động giao thoa (phút)', example: 0 })
  @IsNumber()
  @IsOptional()
  autoWorkOrderDowntimeMinutes?: number;

  @ApiPropertyOptional({ description: 'Bóc tách chi tiết các loại tổn thất dừng máy theo 8 đầu mục' })
  @IsObject()
  @IsOptional()
  downtimeBreakdown?: DowntimeLossBreakdownDto;

  @ApiPropertyOptional({ description: 'Tốc độ định mức chuẩn (SP/giờ). Bỏ trống sẽ lấy theo cấu hình của thiết bị', example: 3000 })
  @IsNumber()
  @Min(0.01)
  @IsOptional()
  standardSpeedPerHour?: number;

  @ApiPropertyOptional({ description: 'Đơn vị đo sản lượng (chai, vỉ, hộp, viên...)', example: 'viên' })
  @IsString()
  @IsOptional()
  outputUnit?: string;

  @ApiProperty({ description: 'Tổng sản lượng thực tế máy đếm được trong ca', example: 21000 })
  @IsNumber()
  @Min(0)
  totalOutput: number;

  @ApiProperty({ description: 'Tổng sản lượng lỗi / phế phẩm trong ca', example: 150 })
  @IsNumber()
  @Min(0)
  defectOutput: number;

  @ApiPropertyOptional({ description: 'Mô tả lý do phế phẩm', example: 'Lệch viên, cấn mép' })
  @IsString()
  @IsOptional()
  defectReasons?: string;

  @ApiPropertyOptional({ description: 'Kênh nhập liệu (QR_APP, WEB_APP, MES_INTEGRATION, SCADA, IOT)', example: 'MES_INTEGRATION' })
  @IsString()
  @IsOptional()
  recordedVia?: string; // QR_APP, WEB_APP

  @ApiPropertyOptional({ description: 'Ghi chú thêm', example: 'Dữ liệu đẩy tự động từ hệ thống MES' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Tự động lưu tốc độ chuẩn này làm mặc định cho thiết bị', example: false })
  @IsBoolean()
  @IsOptional()
  saveBaselineToEquipment?: boolean;
}

export class VoidOeeRecordDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class UpdateEquipmentOeeConfigDto {
  @IsBoolean()
  isCritical: boolean;

  @IsNumber()
  @Min(0.01)
  @IsOptional()
  standardSpeedPerHour?: number;

  @IsString()
  @IsOptional()
  outputUnit?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  plannedShiftMinutes?: number;

  @IsNumber()
  @IsOptional()
  oeeTarget?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductSpeedConfigDto)
  @IsOptional()
  productSpeedConfigs?: ProductSpeedConfigDto[];
}

export class ProductSpeedConfigDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  productGroup: string;

  @IsNumber()
  @Min(0.01)
  speedPerHour: number;
}
