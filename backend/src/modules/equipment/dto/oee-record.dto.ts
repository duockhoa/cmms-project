import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsObject, IsArray, Min } from 'class-validator';

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
  @IsString()
  @IsOptional()
  recordDate?: string; // ISO date string

  @IsString()
  @IsOptional()
  shift?: string; // CA_1, CA_2, HANH_CHINH, CA_3

  @IsString()
  @IsOptional()
  workshop?: string; // Xưởng (VD: HT)

  @IsString()
  @IsOptional()
  batchNumber?: string; // Số lô (VD: 1091026)

  @IsString()
  @IsOptional()
  productName?: string; // Mã sản phẩm (VD: TP00201)

  @IsNumber()
  @IsOptional()
  machineSpeed?: number; // Tốc độ máy ghi trên phiếu (VD: 50 SP/phút)

  @IsBoolean()
  @IsOptional()
  isMultiDayBatch?: boolean; // Lô nhiều ngày hay bắt đầu từ 0

  @IsNumber()
  @IsOptional()
  startOutputCount?: number; // Số lượng SP khi bắt đầu chạy máy (VD: 0 hoặc 35072)

  @IsNumber()
  @IsOptional()
  endCounterNt?: number; // Chỉ số NT cuối kỳ (VD: 42016)

  @IsString()
  @IsOptional()
  operatorSignName?: string; // Người ghi ký trên phiếu (VD: Hoài)

  @IsArray()
  @IsOptional()
  defectLogs?: Array<{
    time?: string;
    quantity?: number;
    reason?: string;
  }>;

  @IsNumber()
  @Min(1)
  shiftDurationMinutes: number;

  @IsNumber()
  @Min(0)
  plannedDowntimeMinutes: number;

  @IsNumber()
  @Min(0)
  unplannedDowntimeMinutes: number;

  @IsNumber()
  @IsOptional()
  runTimeMinutesOverride?: number; // Thời gian chạy máy thực tế tính trực tiếp từ mục "Chạy máy" trên phiếu VER2

  @IsNumber()
  @IsOptional()
  autoWorkOrderDowntimeMinutes?: number;

  @IsObject()
  @IsOptional()
  downtimeBreakdown?: DowntimeLossBreakdownDto;

  @IsNumber()
  @Min(0.01)
  standardSpeedPerHour: number;

  @IsString()
  @IsOptional()
  outputUnit?: string;

  @IsNumber()
  @Min(0)
  totalOutput: number;

  @IsNumber()
  @Min(0)
  defectOutput: number;

  @IsString()
  @IsOptional()
  defectReasons?: string;

  @IsString()
  @IsOptional()
  recordedVia?: string; // QR_APP, WEB_APP

  @IsString()
  @IsOptional()
  notes?: string;

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
