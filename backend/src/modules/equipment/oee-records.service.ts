import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOeeRecordDto, UpdateEquipmentOeeConfigDto, VoidOeeRecordDto } from './dto/oee-record.dto';

@Injectable()
export class OeeRecordsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      // Tự động chuẩn hóa định mức OEE mặc định cho các Thiết bị sản xuất trọng yếu nếu chưa có thiết bị nào được cấu hình
      const criticalCount = await this.prisma.equipment.count({
        where: { isActive: true, isCritical: true },
      });

      if (criticalCount === 0) {
        const allActive = await this.prisma.equipment.findMany({
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
          take: 25,
        });

        // Ưu tiên nhận diện các máy sản xuất trọng yếu trong nhà máy Dược / Sản xuất
        const criticalKeywords = [
          'ép vỉ', 'dập viên', 'đóng nang', 'chiết rót', 'đóng gói', 'bao phim',
          'trộn', 'sấy tầng sôi', 'nhào trộn', 'dán nhãn', 'đóng hộp', 'đóng lọ',
          'máy chính', 'dây chuyền', 'nén khí', 'chiller', 'nồi hơi', 'cnc', 'phay', 'tiện',
        ];

        let targetEquipments = allActive.filter((eq) => {
          const text = `${eq.name} ${eq.category} ${eq.department || ''}`.toLowerCase();
          return criticalKeywords.some((kw) => text.includes(kw));
        });

        if (targetEquipments.length === 0 && allActive.length > 0) {
          targetEquipments = allActive.slice(0, Math.min(8, allActive.length));
        } else if (targetEquipments.length > 10) {
          targetEquipments = targetEquipments.slice(0, 10);
        }

        for (const eq of targetEquipments) {
          const nameLower = `${eq.name} ${eq.category}`.toLowerCase();
          let standardSpeedPerHour = 2400;
          let outputUnit = 'Đơn vị';

          if (nameLower.includes('dập viên')) {
            standardSpeedPerHour = 35000;
            outputUnit = 'Viên';
          } else if (nameLower.includes('ép vỉ')) {
            standardSpeedPerHour = 4800;
            outputUnit = 'Vỉ';
          } else if (nameLower.includes('đóng nang')) {
            standardSpeedPerHour = 25000;
            outputUnit = 'Viên';
          } else if (nameLower.includes('chiết rót') || nameLower.includes('đóng lọ') || nameLower.includes('đóng chai')) {
            standardSpeedPerHour = 3600;
            outputUnit = 'Chai/Lọ';
          } else if (nameLower.includes('đóng gói') || nameLower.includes('đóng hộp') || nameLower.includes('dán nhãn')) {
            standardSpeedPerHour = 3000;
            outputUnit = 'Hộp/Gói';
          } else if (nameLower.includes('trộn') || nameLower.includes('sấy') || nameLower.includes('bao phim')) {
            standardSpeedPerHour = 120;
            outputUnit = 'Kg';
          }

          await this.prisma.equipment.update({
            where: { id: eq.id },
            data: {
              isCritical: true,
              standardSpeedPerHour: eq.standardSpeedPerHour || standardSpeedPerHour,
              outputUnit: eq.outputUnit || outputUnit,
              plannedShiftMinutes: eq.plannedShiftMinutes || 480,
              oeeTarget: eq.oeeTarget || 85,
            },
          });
        }

        if (targetEquipments.length > 0) {
          console.log(
            `[OEE_INIT] Đã chuẩn hóa định mức cơ sở OEE cho ${targetEquipments.length} thiết bị trọng yếu (KH.DK-SX.2026.03).`,
          );
        }
      }
    } catch (err) {
      console.warn('[OEE_INIT] Bỏ qua khởi tạo định mức OEE mặc định:', err);
    }
  }

  /**
   * Tính khung giờ bắt đầu - kết thúc của Ca sản xuất để tự động quét thời gian dừng máy từ Phiếu sửa chữa (WorkOrder)
   */
  private getShiftTimeWindow(recordDateStr?: string, shift: string = 'CA_1'): { start: Date; end: Date; dateOnly: Date } {
    const baseDate = recordDateStr ? new Date(recordDateStr) : new Date();
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const day = baseDate.getDate();

    const dateOnly = new Date(year, month, day, 8, 0, 0);
    let start = new Date(year, month, day, 6, 0, 0);
    let end = new Date(year, month, day, 14, 0, 0);

    if (shift === 'CA_1') {
      // Ca 1: 06:00 - 14:00
      start = new Date(year, month, day, 6, 0, 0);
      end = new Date(year, month, day, 14, 0, 0);
    } else if (shift === 'CA_2') {
      // Ca 2: 14:00 - 22:00
      start = new Date(year, month, day, 14, 0, 0);
      end = new Date(year, month, day, 22, 0, 0);
    } else if (shift === 'CA_3') {
      // Ca 3: 22:00 - 06:00 sáng hôm sau
      start = new Date(year, month, day, 22, 0, 0);
      end = new Date(year, month, day + 1, 6, 0, 0);
    } else {
      // Ca Hành chính: 07:30 - 17:00
      start = new Date(year, month, day, 7, 30, 0);
      end = new Date(year, month, day, 17, 0, 0);
    }

    return { start, end, dateOnly };
  }

  /**
   * Lấy ngữ cảnh Ca sản xuất & Tự động gợi ý số phút dừng sự cố từ Phiếu sửa chữa (WorkOrder) phát sinh trong ca
   */
  async getShiftContext(equipmentId: string, recordDate?: string, shift: string = 'CA_1') {
    const equipment = await this.prisma.equipment.findFirst({
      where: {
        OR: [{ id: equipmentId }, { code: equipmentId }, { oldCode: equipmentId }],
      },
    });
    if (!equipment) {
      throw new NotFoundException(`Không tìm thấy thiết bị (${equipmentId})`);
    }

    const { start, end } = this.getShiftTimeWindow(recordDate, shift);

    // Tìm các Phiếu sửa chữa (WorkOrder) của thiết bị này có giao thoa với khung giờ ca sản xuất
    const workOrders = await this.prisma.workOrder.findMany({
      where: {
        equipmentId: equipment.id,
        status: { notIn: ['CANCELLED'] },
        createdAt: { lte: end },
        OR: [
          { completedAt: null },
          { completedAt: { gte: start } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderCode: true,
        description: true,
        status: true,
        priority: true,
        completedAt: true,
        createdAt: true,
        actualHours: true,
      },
    });

    // Tính số phút dừng máy tự động giao thoa trong ca
    let autoWorkOrderDowntimeMinutes = 0;
    const matchedIncidents = workOrders.map((wo) => {
      const incidentStart = new Date(wo.createdAt);
      const incidentEnd = wo.completedAt ? new Date(wo.completedAt) : new Date();

      const overlapStart = Math.max(start.getTime(), incidentStart.getTime());
      const overlapEnd = Math.min(end.getTime(), incidentEnd.getTime());
      let minutesInShift = 0;

      if (overlapEnd > overlapStart) {
        minutesInShift = Math.round((overlapEnd - overlapStart) / 60000);
      } else if (wo.actualHours && wo.actualHours > 0) {
        minutesInShift = Math.min(480, Math.round(wo.actualHours * 60));
      }

      autoWorkOrderDowntimeMinutes += minutesInShift;

      return {
        id: wo.id,
        orderCode: wo.orderCode,
        description: wo.description,
        status: wo.status,
        priority: wo.priority,
        minutesInShift,
      };
    });

    autoWorkOrderDowntimeMinutes = Math.min(
      equipment.plannedShiftMinutes || 480,
      autoWorkOrderDowntimeMinutes,
    );

    const recentRecords = await this.prisma.equipmentOeeRecord.findMany({
      where: { equipmentId: equipment.id, isVoided: false },
      orderBy: { recordDate: 'desc' },
      take: 5,
      include: {
        recordedBy: { select: { id: true, name: true, department: true } },
      },
    });

    return {
      equipment: {
        id: equipment.id,
        code: equipment.code,
        oldCode: equipment.oldCode,
        name: equipment.name,
        category: equipment.category,
        department: equipment.department,
        location: equipment.location,
        status: equipment.status,
        isCritical: equipment.isCritical,
        standardSpeedPerHour: equipment.standardSpeedPerHour || 2400,
        outputUnit: equipment.outputUnit || 'Đơn vị',
        plannedShiftMinutes: equipment.plannedShiftMinutes || 480,
        oeeTarget: equipment.oeeTarget || 85,
      },
      shiftWindow: {
        shift,
        start: start.toISOString(),
        end: end.toISOString(),
      },
      autoWorkOrderDowntimeMinutes,
      matchedIncidents,
      recentRecords,
    };
  }

  /**
   * Sinh mã bản ghi OEE duy nhất dạng OEE-YYYYMMDD-XXX
   */
  private async generateRecordCode(dateObj: Date): Promise<string> {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const prefix = `OEE-${yyyy}${mm}${dd}-`;

    const countToday = await this.prisma.equipmentOeeRecord.count({
      where: {
        recordCode: { startsWith: prefix },
      },
    });

    let seq = countToday + 1;
    let candidate = `${prefix}${String(seq).padStart(3, '0')}`;
    while (await this.prisma.equipmentOeeRecord.findUnique({ where: { recordCode: candidate } })) {
      seq++;
      candidate = `${prefix}${String(seq).padStart(3, '0')}`;
    }
    return candidate;
  }

  /**
   * Ghi nhận dữ liệu OEE từ App / QR Scan và xử lý tính toán A x P x Q = OEE
   */
  async submitOeeRecord(equipmentId: string, userId: string, dto: CreateOeeRecordDto) {
    const equipment = await this.prisma.equipment.findFirst({
      where: {
        OR: [{ id: equipmentId }, { code: equipmentId }, { oldCode: equipmentId }],
      },
    });
    if (!equipment) {
      throw new NotFoundException(`Không tìm thấy thiết bị (${equipmentId})`);
    }

    const shiftDurationMinutes = Number(dto.shiftDurationMinutes) || 480;
    const plannedDowntimeMinutes = Math.max(0, Number(dto.plannedDowntimeMinutes) || 0);
    const unplannedDowntimeMinutes = Math.max(0, Number(dto.unplannedDowntimeMinutes) || 0);

    if (plannedDowntimeMinutes >= shiftDurationMinutes) {
      throw new BadRequestException(
        'Thời gian dừng có kế hoạch không thể lớn hơn hoặc bằng tổng thời gian ca làm việc.',
      );
    }

    const plannedProductionMinutes = Math.max(0, shiftDurationMinutes - plannedDowntimeMinutes);

    if (unplannedDowntimeMinutes > plannedProductionMinutes) {
      throw new BadRequestException(
        `Tổng thời gian dừng sự cố (${unplannedDowntimeMinutes} phút) vượt quá thời gian sản xuất kế hoạch (${plannedProductionMinutes} phút).`,
      );
    }

    const runTimeMinutes = Math.max(0, plannedProductionMinutes - unplannedDowntimeMinutes);
    const standardSpeedPerHour = Number(dto.standardSpeedPerHour) || equipment.standardSpeedPerHour || 2400;
    const outputUnit = (dto.outputUnit || equipment.outputUnit || 'Đơn vị').trim();
    const totalOutput = Math.max(0, Number(dto.totalOutput) || 0);
    const defectOutput = Math.max(0, Number(dto.defectOutput) || 0);

    if (defectOutput > totalOutput) {
      throw new BadRequestException(
        `Số lượng phế phẩm/lỗi (${defectOutput}) không thể lớn hơn tổng sản lượng thực tế (${totalOutput}).`,
      );
    }

    const goodOutput = Math.max(0, totalOutput - defectOutput);

    // 1. Tính Availability (A %)
    const rawAvailability =
      plannedProductionMinutes > 0 ? (runTimeMinutes / plannedProductionMinutes) * 100 : 0;
    const availability = Math.round(Math.min(100, Math.max(0, rawAvailability)) * 100) / 100;

    // 2. Tính Performance (P %)
    const runTimeHours = runTimeMinutes / 60;
    const theoreticalMaxOutput = runTimeHours * standardSpeedPerHour;
    const rawPerformance =
      theoreticalMaxOutput > 0 ? (totalOutput / theoreticalMaxOutput) * 100 : 0;
    // Cho phép hiển thị thực tế (tối đa 120% nếu máy chạy vượt tốc độ định mức, nhưng cảnh báo)
    const performance = Math.round(Math.min(120, Math.max(0, rawPerformance)) * 100) / 100;

    // 3. Tính Quality (Q %)
    const rawQuality = totalOutput > 0 ? (goodOutput / totalOutput) * 100 : 100;
    const quality = Math.round(Math.min(100, Math.max(0, rawQuality)) * 100) / 100;

    // 4. Tính OEE tổng hợp (%) = A x P x Q
    const rawOee = (availability * Math.min(100, performance) * quality) / 10000;
    const oee = Math.round(rawOee * 100) / 100;

    const shift = dto.shift || 'CA_1';
    const { dateOnly } = this.getShiftTimeWindow(dto.recordDate, shift);
    const recordCode = await this.generateRecordCode(dateOnly);

    const record = await this.prisma.equipmentOeeRecord.create({
      data: {
        recordCode,
        equipmentId: equipment.id,
        recordDate: dto.recordDate ? new Date(dto.recordDate) : new Date(),
        shift,
        batchNumber: dto.batchNumber?.trim() || null,
        productName: dto.productName?.trim() || null,
        shiftDurationMinutes,
        plannedDowntimeMinutes,
        plannedProductionMinutes,
        unplannedDowntimeMinutes,
        autoWorkOrderDowntimeMinutes: Number(dto.autoWorkOrderDowntimeMinutes) || 0,
        runTimeMinutes,
        downtimeBreakdown: dto.downtimeBreakdown ? JSON.stringify(dto.downtimeBreakdown) : null,
        standardSpeedPerHour,
        outputUnit,
        totalOutput,
        goodOutput,
        defectOutput,
        defectReasons: dto.defectReasons?.trim() || null,
        availability,
        performance,
        quality,
        oee,
        recordedVia: dto.recordedVia || 'QR_APP',
        notes: dto.notes?.trim() || null,
        recordedById: userId,
      },
      include: {
        equipment: {
          select: { id: true, code: true, oldCode: true, name: true, department: true, location: true, oeeTarget: true },
        },
        recordedBy: {
          select: { id: true, name: true, email: true, department: true },
        },
      },
    });

    // Tự động cộng số giờ chạy máy thực tế (Run Time) vào currentOperatingHours của Thiết bị
    // và lưu định mức chuẩn nếu thiết bị chưa có định mức
    const addedOperatingHours = Math.round((runTimeMinutes / 60) * 100) / 100;
    const shouldSaveBaseline =
      dto.saveBaselineToEquipment !== false &&
      (!equipment.standardSpeedPerHour || !equipment.outputUnit);

    await this.prisma.equipment.update({
      where: { id: equipment.id },
      data: {
        currentOperatingHours: { increment: addedOperatingHours },
        ...(shouldSaveBaseline
          ? {
              isCritical: true,
              standardSpeedPerHour,
              outputUnit,
            }
          : {}),
      },
    });

    return {
      success: true,
      message: `Đã ghi nhận dữ liệu OEE ca ${shift} (${recordCode}) — Chỉ số OEE đạt ${oee}%`,
      record,
    };
  }

  /**
   * Cập nhật cấu hình định mức OEE cho Thiết bị trọng yếu
   */
  async updateEquipmentOeeConfig(equipmentId: string, dto: UpdateEquipmentOeeConfigDto) {
    const equipment = await this.prisma.equipment.findFirst({
      where: {
        OR: [{ id: equipmentId }, { code: equipmentId }, { oldCode: equipmentId }],
      },
    });
    if (!equipment) {
      throw new NotFoundException(`Không tìm thấy thiết bị (${equipmentId})`);
    }

    return this.prisma.equipment.update({
      where: { id: equipment.id },
      data: {
        isCritical: dto.isCritical,
        standardSpeedPerHour:
          dto.standardSpeedPerHour !== undefined ? Number(dto.standardSpeedPerHour) : equipment.standardSpeedPerHour,
        outputUnit: dto.outputUnit !== undefined ? dto.outputUnit.trim() : equipment.outputUnit,
        plannedShiftMinutes:
          dto.plannedShiftMinutes !== undefined ? Number(dto.plannedShiftMinutes) : equipment.plannedShiftMinutes,
        oeeTarget: dto.oeeTarget !== undefined ? Number(dto.oeeTarget) : equipment.oeeTarget,
      },
    });
  }

  /**
   * Lấy danh sách bản ghi OEE của 1 thiết bị
   */
  async getRecordsByEquipment(equipmentId: string, limit: number = 50) {
    const equipment = await this.prisma.equipment.findFirst({
      where: {
        OR: [{ id: equipmentId }, { code: equipmentId }, { oldCode: equipmentId }],
      },
    });
    if (!equipment) {
      throw new NotFoundException(`Không tìm thấy thiết bị (${equipmentId})`);
    }

    return this.prisma.equipmentOeeRecord.findMany({
      where: { equipmentId: equipment.id },
      orderBy: [{ recordDate: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      include: {
        equipment: {
          select: { id: true, code: true, oldCode: true, name: true, department: true, location: true, oeeTarget: true },
        },
        recordedBy: {
          select: { id: true, name: true, email: true, department: true },
        },
        voidedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  /**
   * Lấy toàn bộ lịch sử bản ghi OEE toàn nhà máy
   */
  async getAllRecords(query?: {
    equipmentId?: string;
    department?: string;
    shift?: string;
    startDate?: string;
    endDate?: string;
    limit?: string;
  }) {
    const where: any = {};

    if (query?.equipmentId) {
      where.equipmentId = query.equipmentId;
    }
    if (query?.shift) {
      where.shift = query.shift;
    }
    if (query?.department) {
      where.equipment = { department: query.department };
    }
    if (query?.startDate || query?.endDate) {
      where.recordDate = {};
      if (query.startDate) {
        where.recordDate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.recordDate.lte = end;
      }
    }

    const take = Math.min(500, Math.max(10, parseInt(query?.limit || '150', 10)));

    return this.prisma.equipmentOeeRecord.findMany({
      where,
      orderBy: [{ recordDate: 'desc' }, { createdAt: 'desc' }],
      take,
      include: {
        equipment: {
          select: {
            id: true,
            code: true,
            oldCode: true,
            name: true,
            category: true,
            department: true,
            location: true,
            isCritical: true,
            standardSpeedPerHour: true,
            outputUnit: true,
            oeeTarget: true,
          },
        },
        recordedBy: {
          select: { id: true, name: true, email: true, department: true },
        },
        voidedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  /**
   * Hủy bản ghi OEE nhập sai (Có lưu vết Audit Trail)
   */
  async voidRecord(recordId: string, userId: string, dto: VoidOeeRecordDto) {
    const record = await this.prisma.equipmentOeeRecord.findUnique({
      where: { id: recordId },
    });
    if (!record) {
      throw new NotFoundException('Không tìm thấy bản ghi OEE cần hủy');
    }

    const updated = await this.prisma.equipmentOeeRecord.update({
      where: { id: recordId },
      data: {
        isVoided: true,
        voidReason: dto.reason,
        voidedAt: new Date(),
        voidedById: userId,
      },
    });

    return {
      success: true,
      message: `Đã đánh dấu hủy phiếu OEE ${record.recordCode}. Dữ liệu vẫn được lưu vết kiểm toán.`,
      record: updated,
    };
  }

  /**
   * Engine xử lý & tổng hợp báo cáo phân tích OEE cho Thiết bị trọng yếu (KH.DK-SX.2026.03)
   */
  async getOeeAnalyticsSummary(query?: {
    startDate?: string;
    endDate?: string;
    department?: string;
    equipmentId?: string;
    criticalOnly?: string;
  }) {
    const isCriticalOnly = query?.criticalOnly !== 'false';

    // 1. Lấy danh sách thiết bị trọng yếu (hoặc toàn bộ thiết bị nếu criticalOnly=false)
    const equipmentWhere: any = { isActive: true };
    if (isCriticalOnly) {
      equipmentWhere.isCritical = true;
    }
    if (query?.department) {
      equipmentWhere.department = query.department;
    }
    if (query?.equipmentId) {
      equipmentWhere.id = query.equipmentId;
    }

    const criticalEquipments = await this.prisma.equipment.findMany({
      where: equipmentWhere,
      orderBy: [{ department: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        code: true,
        oldCode: true,
        name: true,
        category: true,
        department: true,
        location: true,
        status: true,
        isCritical: true,
        standardSpeedPerHour: true,
        outputUnit: true,
        plannedShiftMinutes: true,
        oeeTarget: true,
        currentOperatingHours: true,
      },
    });

    // 2. Lấy các bản ghi OEE hợp lệ trong kỳ phân tích
    const recordWhere: any = { isVoided: false };
    if (query?.equipmentId) {
      recordWhere.equipmentId = query.equipmentId;
    } else if (isCriticalOnly && criticalEquipments.length > 0) {
      recordWhere.equipmentId = { in: criticalEquipments.map((e) => e.id) };
    }
    if (query?.department) {
      recordWhere.equipment = { department: query.department };
    }
    if (query?.startDate || query?.endDate) {
      recordWhere.recordDate = {};
      if (query.startDate) {
        recordWhere.recordDate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        recordWhere.recordDate.lte = end;
      }
    }

    const records = await this.prisma.equipmentOeeRecord.findMany({
      where: recordWhere,
      orderBy: { recordDate: 'asc' },
      include: {
        equipment: {
          select: {
            id: true,
            code: true,
            oldCode: true,
            name: true,
            category: true,
            department: true,
            location: true,
            oeeTarget: true,
            outputUnit: true,
            standardSpeedPerHour: true,
          },
        },
        recordedBy: {
          select: { id: true, name: true, department: true },
        },
      },
    });

    // 3. Tổng hợp KPI toàn diện
    const totalShiftsRecorded = records.length;
    let sumA = 0;
    let sumP = 0;
    let sumQ = 0;
    let sumOee = 0;
    let totalShiftMinutes = 0;
    let totalPlannedDowntimeMinutes = 0;
    let totalUnplannedDowntimeMinutes = 0;
    let totalRunTimeMinutes = 0;
    let totalOutputQty = 0;
    let totalGoodQty = 0;
    let totalDefectQty = 0;

    // Phân tích 6 tổn thất lớn (Six Big Losses)
    const lossBreakdownTotals = {
      cleaningMinutes: 0, // Vệ sinh đầu/cuối ca
      changeoverMinutes: 0, // Chuyển lô / Thay khuôn
      plannedMaintenanceMinutes: 0, // Bảo dưỡng định kỳ
      breakdownMinutes: 0, // Hỏng thiết bị / Sự cố
      adjustmentMinutes: 0, // Căn chỉnh máy / Kẹt phôi, vỉ
      waitingMaterialMinutes: 0, // Chờ bán thành phẩm / Vật tư
    };

    // Map theo từng thiết bị
    const eqStatsMap = new Map<
      string,
      {
        shiftsCount: number;
        sumA: number;
        sumP: number;
        sumQ: number;
        sumOee: number;
        runTimeMinutes: number;
        plannedDowntimeMinutes: number;
        unplannedDowntimeMinutes: number;
        totalOutput: number;
        goodOutput: number;
        defectOutput: number;
        lastRecordedAt: Date | null;
      }
    >();

    // Map xu hướng theo ngày
    const dailyMap = new Map<
      string,
      {
        date: string;
        count: number;
        sumA: number;
        sumP: number;
        sumQ: number;
        sumOee: number;
        runTimeMinutes: number;
        downtimeMinutes: number;
      }
    >();

    for (const r of records) {
      sumA += r.availability;
      sumP += r.performance;
      sumQ += r.quality;
      sumOee += r.oee;

      totalShiftMinutes += r.shiftDurationMinutes;
      totalPlannedDowntimeMinutes += r.plannedDowntimeMinutes;
      totalUnplannedDowntimeMinutes += r.unplannedDowntimeMinutes;
      totalRunTimeMinutes += r.runTimeMinutes;
      totalOutputQty += r.totalOutput;
      totalGoodQty += r.goodOutput;
      totalDefectQty += r.defectOutput;

      // Parse 6 tổn thất lớn
      if (r.downtimeBreakdown) {
        try {
          const parsed = JSON.parse(r.downtimeBreakdown);
          lossBreakdownTotals.cleaningMinutes += Number(parsed.cleaningMinutes) || 0;
          lossBreakdownTotals.changeoverMinutes += Number(parsed.changeoverMinutes) || 0;
          lossBreakdownTotals.plannedMaintenanceMinutes += Number(parsed.plannedMaintenanceMinutes) || 0;
          lossBreakdownTotals.breakdownMinutes += Number(parsed.breakdownMinutes) || 0;
          lossBreakdownTotals.adjustmentMinutes += Number(parsed.adjustmentMinutes) || 0;
          lossBreakdownTotals.waitingMaterialMinutes += Number(parsed.waitingMaterialMinutes) || 0;
        } catch {
          lossBreakdownTotals.cleaningMinutes += r.plannedDowntimeMinutes;
          lossBreakdownTotals.breakdownMinutes += r.unplannedDowntimeMinutes;
        }
      } else {
        lossBreakdownTotals.cleaningMinutes += r.plannedDowntimeMinutes;
        lossBreakdownTotals.breakdownMinutes += r.unplannedDowntimeMinutes;
      }

      // Cộng dồn theo máy
      const prevEq = eqStatsMap.get(r.equipmentId) || {
        shiftsCount: 0,
        sumA: 0,
        sumP: 0,
        sumQ: 0,
        sumOee: 0,
        runTimeMinutes: 0,
        plannedDowntimeMinutes: 0,
        unplannedDowntimeMinutes: 0,
        totalOutput: 0,
        goodOutput: 0,
        defectOutput: 0,
        lastRecordedAt: null,
      };
      prevEq.shiftsCount += 1;
      prevEq.sumA += r.availability;
      prevEq.sumP += r.performance;
      prevEq.sumQ += r.quality;
      prevEq.sumOee += r.oee;
      prevEq.runTimeMinutes += r.runTimeMinutes;
      prevEq.plannedDowntimeMinutes += r.plannedDowntimeMinutes;
      prevEq.unplannedDowntimeMinutes += r.unplannedDowntimeMinutes;
      prevEq.totalOutput += r.totalOutput;
      prevEq.goodOutput += r.goodOutput;
      prevEq.defectOutput += r.defectOutput;
      if (!prevEq.lastRecordedAt || r.recordDate > prevEq.lastRecordedAt) {
        prevEq.lastRecordedAt = r.recordDate;
      }
      eqStatsMap.set(r.equipmentId, prevEq);

      // Cộng dồn theo ngày (YYYY-MM-DD)
      const d = new Date(r.recordDate);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const prevDay = dailyMap.get(dateKey) || {
        date: dateKey,
        count: 0,
        sumA: 0,
        sumP: 0,
        sumQ: 0,
        sumOee: 0,
        runTimeMinutes: 0,
        downtimeMinutes: 0,
      };
      prevDay.count += 1;
      prevDay.sumA += r.availability;
      prevDay.sumP += r.performance;
      prevDay.sumQ += r.quality;
      prevDay.sumOee += r.oee;
      prevDay.runTimeMinutes += r.runTimeMinutes;
      prevDay.downtimeMinutes += r.plannedDowntimeMinutes + r.unplannedDowntimeMinutes;
      dailyMap.set(dateKey, prevDay);
    }

    const avgAvailability = totalShiftsRecorded > 0 ? Math.round((sumA / totalShiftsRecorded) * 100) / 100 : 0;
    const avgPerformance = totalShiftsRecorded > 0 ? Math.round((sumP / totalShiftsRecorded) * 100) / 100 : 0;
    const avgQuality = totalShiftsRecorded > 0 ? Math.round((sumQ / totalShiftsRecorded) * 100) / 100 : 0;
    const avgOee = totalShiftsRecorded > 0 ? Math.round((sumOee / totalShiftsRecorded) * 100) / 100 : 0;

    // 4. Bảng xếp hạng Thiết bị trọng yếu
    const equipmentLeaderboard = criticalEquipments.map((eq) => {
      const st = eqStatsMap.get(eq.id);
      const shiftsCount = st ? st.shiftsCount : 0;
      const availability = shiftsCount > 0 ? Math.round((st!.sumA / shiftsCount) * 100) / 100 : 0;
      const performance = shiftsCount > 0 ? Math.round((st!.sumP / shiftsCount) * 100) / 100 : 0;
      const quality = shiftsCount > 0 ? Math.round((st!.sumQ / shiftsCount) * 100) / 100 : 0;
      const oee = shiftsCount > 0 ? Math.round((st!.sumOee / shiftsCount) * 100) / 100 : 0;
      const target = eq.oeeTarget || 85;

      let evaluation: 'WORLD_CLASS' | 'GOOD' | 'WARNING' | 'NO_DATA' = 'NO_DATA';
      if (shiftsCount > 0) {
        if (oee >= target) evaluation = 'WORLD_CLASS';
        else if (oee >= target - 15) evaluation = 'GOOD';
        else evaluation = 'WARNING';
      }

      // Xác định điểm nghẽn chính (Bottleneck Pillar)
      let mainBottleneck = 'Chưa có dữ liệu ca';
      if (shiftsCount > 0) {
        const minVal = Math.min(availability, performance, quality);
        if (minVal === availability && availability < 90) {
          mainBottleneck = 'Tổn thất Thời gian dừng máy (A)';
        } else if (minVal === performance && performance < 95) {
          mainBottleneck = 'Tổn thất Tốc độ / Chạy chậm (P)';
        } else if (minVal === quality && quality < 99) {
          mainBottleneck = 'Tổn thất Chất lượng / Phế phẩm (Q)';
        } else {
          mainBottleneck = 'Vận hành ổn định đạt chuẩn';
        }
      }

      return {
        ...eq,
        shiftsCount,
        availability,
        performance,
        quality,
        oee,
        gapToTarget: shiftsCount > 0 ? Math.round((oee - target) * 100) / 100 : 0,
        evaluation,
        mainBottleneck,
        runTimeMinutes: st ? st.runTimeMinutes : 0,
        plannedDowntimeMinutes: st ? st.plannedDowntimeMinutes : 0,
        unplannedDowntimeMinutes: st ? st.unplannedDowntimeMinutes : 0,
        totalOutput: st ? st.totalOutput : 0,
        goodOutput: st ? st.goodOutput : 0,
        defectOutput: st ? st.defectOutput : 0,
        lastRecordedAt: st?.lastRecordedAt || null,
      };
    });

    // 5. Chuỗi xu hướng theo ngày
    const dailyTrend = Array.from(dailyMap.values()).map((d) => ({
      date: d.date,
      shiftsCount: d.count,
      availability: Math.round((d.sumA / d.count) * 100) / 100,
      performance: Math.round((d.sumP / d.count) * 100) / 100,
      quality: Math.round((d.sumQ / d.count) * 100) / 100,
      oee: Math.round((d.sumOee / d.count) * 100) / 100,
      target: 85,
      runTimeHours: Math.round((d.runTimeMinutes / 60) * 100) / 100,
      downtimeHours: Math.round((d.downtimeMinutes / 60) * 100) / 100,
    }));

    // 6. Biểu đồ Pareto 6 tổn thất dừng máy
    const totalLossMinutes =
      Object.values(lossBreakdownTotals).reduce((acc, v) => acc + v, 0) || 1;
    const downtimePareto = [
      {
        code: 'BREAKDOWN',
        label: 'Hỏng thiết bị / Sự cố kỹ thuật',
        type: 'UNPLANNED',
        minutes: lossBreakdownTotals.breakdownMinutes,
        percentage: Math.round((lossBreakdownTotals.breakdownMinutes / totalLossMinutes) * 1000) / 10,
      },
      {
        code: 'CHANGEOVER',
        label: 'Chuyển lô / Thay khuôn & Cài đặt',
        type: 'PLANNED',
        minutes: lossBreakdownTotals.changeoverMinutes,
        percentage: Math.round((lossBreakdownTotals.changeoverMinutes / totalLossMinutes) * 1000) / 10,
      },
      {
        code: 'CLEANING',
        label: 'Vệ sinh đầu/cuối ca theo GMP',
        type: 'PLANNED',
        minutes: lossBreakdownTotals.cleaningMinutes,
        percentage: Math.round((lossBreakdownTotals.cleaningMinutes / totalLossMinutes) * 1000) / 10,
      },
      {
        code: 'ADJUSTMENT',
        label: 'Căn chỉnh máy / Kẹt vỉ, bao bì, phôi',
        type: 'UNPLANNED',
        minutes: lossBreakdownTotals.adjustmentMinutes,
        percentage: Math.round((lossBreakdownTotals.adjustmentMinutes / totalLossMinutes) * 1000) / 10,
      },
      {
        code: 'WAITING_MATERIAL',
        label: 'Chờ bán thành phẩm / Vật tư / Phụ trợ',
        type: 'UNPLANNED',
        minutes: lossBreakdownTotals.waitingMaterialMinutes,
        percentage: Math.round((lossBreakdownTotals.waitingMaterialMinutes / totalLossMinutes) * 1000) / 10,
      },
      {
        code: 'PLANNED_MAINTENANCE',
        label: 'Bảo dưỡng định kỳ / Hiệu chuẩn',
        type: 'PLANNED',
        minutes: lossBreakdownTotals.plannedMaintenanceMinutes,
        percentage: Math.round((lossBreakdownTotals.plannedMaintenanceMinutes / totalLossMinutes) * 1000) / 10,
      },
    ].sort((a, b) => b.minutes - a.minutes);

    return {
      planCode: 'KH.DK-SX.2026.03',
      planTitle: 'KẾ HOẠCH CHUẨN HÓA VÀ TRIỂN KHAI HỆ THỐNG ĐO LƯỜNG OEE CHO THIẾT BỊ TRỌNG YẾU',
      summary: {
        criticalEquipmentCount: criticalEquipments.length,
        measuredEquipmentCount: equipmentLeaderboard.filter((e) => e.shiftsCount > 0).length,
        totalShiftsRecorded,
        avgAvailability,
        avgPerformance,
        avgQuality,
        avgOee,
        benchmarkTarget: 85,
        totalShiftHours: Math.round((totalShiftMinutes / 60) * 100) / 100,
        totalRunTimeHours: Math.round((totalRunTimeMinutes / 60) * 100) / 100,
        totalPlannedDowntimeHours: Math.round((totalPlannedDowntimeMinutes / 60) * 100) / 100,
        totalUnplannedDowntimeHours: Math.round((totalUnplannedDowntimeMinutes / 60) * 100) / 100,
        totalOutputQty,
        totalGoodQty,
        totalDefectQty,
      },
      equipmentLeaderboard,
      dailyTrend,
      downtimePareto,
      recentRecords: records.slice().reverse().slice(0, 30),
    };
  }
}
