import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateOeeRecordDto, UpdateEquipmentOeeConfigDto, VoidOeeRecordDto } from './dto/oee-record.dto';
import { buildBatchOeeId, businessDateKey, calculateOee, calculateOeeTimeMetrics, dayMinute, duration, emptyOeeTotals, intersectIntervals, minuteDateKey, OeeTotals, standardShiftWindow, validateTimeRows } from './oee-calculations';
import { allocateOeeTime, buildRecordTimeline, OeeContribution, OeeMethod } from './oee-time-allocation';

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
    const dateKey = businessDateKey(recordDateStr || new Date());
    const base = dayMinute(dateKey) - 420;
    const [shiftStart, shiftEnd] = standardShiftWindow(shift);
    const dateOnly = new Date((base + 480) * 60000);
    const start = new Date((base + shiftStart) * 60000);
    const end = new Date((base + shiftEnd) * 60000);

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
      productSpeedConfigs: await this.prisma.productSpeedConfig.findMany({
        where: { equipmentId: equipment.id }, orderBy: { productGroup: 'asc' },
      }),
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
  private async generateRecordCode(dateObj: Date, database: Pick<PrismaService, 'equipmentOeeRecord'> = this.prisma): Promise<string> {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const prefix = `OEE-${yyyy}${mm}${dd}-`;

    const countToday = await database.equipmentOeeRecord.count({
      where: {
        recordCode: { startsWith: prefix },
      },
    });

    let seq = countToday + 1;
    let candidate = `${prefix}${String(seq).padStart(3, '0')}`;
    while (await database.equipmentOeeRecord.findUnique({ where: { recordCode: candidate } })) {
      seq++;
      candidate = `${prefix}${String(seq).padStart(3, '0')}`;
    }
    return candidate;
  }

  /**
   * Ghi nhận dữ liệu OEE từ App / QR Scan và xử lý tính toán A x P x Q = OEE
   */
  async submitOeeRecord(equipmentId: string, userId: string, dto: CreateOeeRecordDto) {
    return this.prisma.$transaction((database) => this.submitInTransaction(database, equipmentId, userId, dto),
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  private async submitInTransaction(database: Prisma.TransactionClient, equipmentId: string, userId: string, dto: CreateOeeRecordDto) {
    const equipment = await database.equipment.findFirst({
      where: {
        OR: [{ id: equipmentId }, { code: equipmentId }, { oldCode: equipmentId }],
      },
    });
    if (!equipment) {
      throw new NotFoundException(`Không tìm thấy thiết bị (${equipmentId})`);
    }

    // Serialize OEE writes for the same machine; overlap validation and hour increments
    // must see the preceding commit and roll back together when validation fails.
    await database.$queryRaw`SELECT id FROM Equipment WHERE id = ${equipment.id} FOR UPDATE`;
    const shift = dto.shift || 'CA_1';
    if (!['CA_1', 'CA_2', 'CA_3', 'HANH_CHINH'].includes(shift)) {
      throw new BadRequestException('Ca sản xuất không hợp lệ.');
    }
    const timeRows = dto.downtimeBreakdown?.fieldSheetVer2?.timeRows;
    if (timeRows != null && !Array.isArray(timeRows)) {
      throw new BadRequestException('Bảng thời gian OEE phải là danh sách.');
    }
    const timeError = timeRows ? validateTimeRows(timeRows) : null;
    if (timeError) throw new BadRequestException(timeError);
    // Recalculate timed field sheets on the server using the same interval rules as the preview.
    const hasTimeEntries = timeRows?.some((row) => row.start1 || row.end1 || row.start2 || row.end2 ||
      (row.manualMinutes != null && row.manualMinutes !== ''));
    const times = hasTimeEntries
      ? calculateOeeTimeMetrics(timeRows, shift, equipment.plannedShiftMinutes || 480) : null;
    const shiftDurationMinutes = times?.shiftDurationMinutes ?? (Number(dto.shiftDurationMinutes) || 480);
    const plannedDowntimeMinutes = times?.plannedDowntimeMinutes ?? Math.max(0, Number(dto.plannedDowntimeMinutes) || 0);
    const unplannedDowntimeMinutes = times?.unplannedDowntimeMinutes ?? Math.max(0, Number(dto.unplannedDowntimeMinutes) || 0);

    if (plannedDowntimeMinutes > shiftDurationMinutes) {
      throw new BadRequestException(
        'Thời gian dừng có kế hoạch không thể lớn hơn tổng thời gian ca làm việc.',
      );
    }

    const plannedProductionMinutes = Math.max(0, shiftDurationMinutes - plannedDowntimeMinutes);

    if (!times && unplannedDowntimeMinutes > plannedProductionMinutes) {
      throw new BadRequestException(
        `Tổng thời gian dừng sự cố (${unplannedDowntimeMinutes} phút) vượt quá thời gian sản xuất kế hoạch (${plannedProductionMinutes} phút).`,
      );
    }

    const runTimeMinutes = times?.runTimeMinutes ?? (dto.runTimeMinutesOverride != null
      ? Number(dto.runTimeMinutesOverride) : Math.max(0, plannedProductionMinutes - unplannedDowntimeMinutes));
    if (!Number.isFinite(runTimeMinutes) || runTimeMinutes < 0 || runTimeMinutes > shiftDurationMinutes) {
      throw new BadRequestException('Thời gian chạy máy phải từ 0 đến tổng thời gian ghi nhận.');
    }
    const sheetProductCode = dto.downtimeBreakdown?.fieldSheetVer2?.productCode;
    const productCode = dto.productCode?.trim() || (typeof sheetProductCode === 'string' ? sheetProductCode.trim() : null) || null;
    const productGroup = dto.productGroup?.trim() || null;
    const speedConfig = productGroup ? await database.productSpeedConfig.findUnique({
      where: { equipmentId_productGroup: { equipmentId: equipment.id, productGroup } },
    }) : null;
    const standardSpeedPerHour = productGroup
      ? (speedConfig?.speedPerHour || equipment.standardSpeedPerHour || 2400)
      : (Number(dto.standardSpeedPerHour) || equipment.standardSpeedPerHour || 2400);
    const [standardStart, standardEnd] = standardShiftWindow(shift);
    const pa2PlanTimeMinutes = times?.pa2PlanTimeMinutes ?? Math.max(standardEnd - standardStart, shiftDurationMinutes);
    const outputUnit = (dto.outputUnit || equipment.outputUnit || 'Đơn vị').trim();
    const totalOutput = Math.max(0, Number(dto.totalOutput) || 0);
    const defectOutput = Math.max(0, Number(dto.defectOutput) || 0);

    if (defectOutput > totalOutput) {
      throw new BadRequestException(
        `Số lượng phế phẩm/lỗi (${defectOutput}) không thể lớn hơn tổng sản lượng thực tế (${totalOutput}).`,
      );
    }

    const goodOutput = Math.max(0, totalOutput - defectOutput);

    const { availability, performance, quality, oee } = calculateOee({ runTimeMinutes,
      planTimeMinutes: plannedProductionMinutes, theoreticalOutput: runTimeMinutes / 60 * standardSpeedPerHour,
      totalOutput, goodOutput, count: 1 });

    const timeline = buildRecordTimeline({ id: 'pending', equipmentId: equipment.id,
      recordDate: dto.recordDate || new Date(), shift, shiftDurationMinutes, plannedProductionMinutes,
      plannedDowntimeMinutes, unplannedDowntimeMinutes, runTimeMinutes, pa2PlanTimeMinutes,
      standardSpeedPerHour, totalOutput, goodOutput,
      downtimeBreakdown: dto.downtimeBreakdown ? JSON.stringify(dto.downtimeBreakdown) : null });
    if (timeline.timedRun && timeline.run.length) {
      const nearby = await database.equipmentOeeRecord.findMany({
        where: { equipmentId: equipment.id, isVoided: false,
          recordDate: { gte: new Date((dayMinute(timeline.date) - 2880) * 60000),
            lt: new Date((dayMinute(timeline.date) + 4320) * 60000) } },
      });
      for (const existing of nearby) {
        const peer = buildRecordTimeline(existing);
        if (peer.timedRun && timeline.run.some((interval) => duration(intersectIntervals(peer.run, interval)) > 0)) {
          throw new BadRequestException(`Khoảng chạy máy trùng phiếu ${existing.recordCode}. Vui lòng kiểm tra lại giờ hoặc hủy phiếu nhập sai.`);
        }
      }
    }
    const { dateOnly } = this.getShiftTimeWindow(dto.recordDate, shift);
    const recordCode = await this.generateRecordCode(dateOnly, database);

    const record = await database.equipmentOeeRecord.create({
      data: {
        recordCode,
        equipmentId: equipment.id,
        recordDate: dto.recordDate ? new Date(dto.recordDate) : new Date(),
        shift,
        batchNumber: dto.batchNumber?.trim() || null,
        productName: dto.productName?.trim() || null,
        productCode,
        productGroup,
        batchOeeId: buildBatchOeeId(equipment.code, productCode, dto.batchNumber),
        pa2PlanTimeMinutes,
        shiftDurationMinutes,
        plannedDowntimeMinutes,
        plannedProductionMinutes,
        unplannedDowntimeMinutes,
        autoWorkOrderDowntimeMinutes: Number(dto.autoWorkOrderDowntimeMinutes) || 0,
        runTimeMinutes,
        downtimeBreakdown: dto.downtimeBreakdown ? JSON.stringify({ ...dto.downtimeBreakdown,
          runMinutes: runTimeMinutes,
          ...(times ? {
            cleaningMinutes: times.minutesByKey.cleaning || 0, breakMinutes: times.minutesByKey.breakShift || 0,
            adjustmentMinutes: times.minutesByKey.adjustment || 0, breakdownMinutes: times.minutesByKey.breakdown || 0,
            noOperatorMinutes: times.minutesByKey.noOperator || 0, qualityProcessMinutes: times.minutesByKey.qualityProcess || 0,
            otherWaitingMinutes: times.minutesByKey.otherWaiting || 0,
          } : {}),
        }) : null,
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

    await database.equipment.update({
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

    const configs = dto.productSpeedConfigs?.map((config) => ({
      productGroup: config.productGroup.trim(), speedPerHour: Number(config.speedPerHour),
    }));
    if (configs && (configs.some((c) => !c.productGroup || !Number.isFinite(c.speedPerHour) || c.speedPerHour <= 0) ||
      new Set(configs.map((c) => c.productGroup.toLocaleLowerCase())).size !== configs.length)) {
      throw new BadRequestException('Nhóm sản phẩm phải có tên duy nhất và tốc độ lớn hơn 0.');
    }
    return this.prisma.$transaction(async (tx) => {
      if (configs) {
        await tx.productSpeedConfig.deleteMany({ where: { equipmentId: equipment.id } });
        if (configs.length) await tx.productSpeedConfig.createMany({
          data: configs.map((config) => ({ ...config, equipmentId: equipment.id })),
        });
      }
      return tx.equipment.update({
        where: { id: equipment.id },
        data: {
          isCritical: dto.isCritical,
          ...(dto.standardSpeedPerHour !== undefined ? { standardSpeedPerHour: Number(dto.standardSpeedPerHour) } : {}),
          ...(dto.outputUnit !== undefined ? { outputUnit: dto.outputUnit.trim() } : {}),
          ...(dto.plannedShiftMinutes !== undefined ? { plannedShiftMinutes: Number(dto.plannedShiftMinutes) } : {}),
          ...(dto.oeeTarget !== undefined ? { oeeTarget: Number(dto.oeeTarget) } : {}),
        },
      });
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
    batchOeeId?: string;
  }) {
    const where: any = {};
    if (query?.batchOeeId) where.batchOeeId = query.batchOeeId;

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
    startDate?: string; endDate?: string; department?: string; equipmentId?: string;
    criticalOnly?: string; calculationMethod?: string; batchOeeId?: string;
  }) {
    const calculationMethod = (query?.calculationMethod || 'PA1') as OeeMethod;
    if (!['PA1', 'PA2', 'PA3'].includes(calculationMethod)) {
      throw new BadRequestException('Phương án OEE phải là PA1, PA2 hoặc PA3.');
    }
    const validateDate = (date?: string) => {
      if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(dayMinute(date)) ||
        minuteDateKey(dayMinute(date)) !== date)) throw new BadRequestException('Ngày báo cáo không hợp lệ.');
      return date;
    };
    const requestedStart = validateDate(query?.startDate);
    const requestedEnd = validateDate(query?.endDate);
    if (requestedStart && requestedEnd && requestedStart > requestedEnd) {
      throw new BadRequestException('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.');
    }
    const today = businessDateKey(new Date());
    const endDate = requestedEnd && requestedEnd < today ? requestedEnd : today;
    const criticalEquipments = await this.prisma.equipment.findMany({
      where: { isActive: true, ...(query?.criticalOnly !== 'false' ? { isCritical: true } : {}),
        ...(query?.department ? { department: query.department } : {}),
        ...(query?.equipmentId ? { id: query.equipmentId } : {}) },
      orderBy: [{ department: 'asc' }, { name: 'asc' }],
      select: { id: true, code: true, oldCode: true, name: true, category: true, department: true,
        location: true, status: true, isCritical: true, standardSpeedPerHour: true, outputUnit: true,
        plannedShiftMinutes: true, oeeTarget: true, currentOperatingHours: true },
    });
    const equipmentIds = criticalEquipments.map((equipment) => equipment.id);
    const firstRecords = await this.prisma.equipmentOeeRecord.groupBy({
      by: ['equipmentId'], where: { isVoided: false, equipmentId: { in: equipmentIds } },
      _min: { recordDate: true },
    });
    const firstRecordDates = new Map<string, string>(firstRecords
      .filter((item) => item._min.recordDate)
      .map((item) => [item.equipmentId, businessDateKey(item._min.recordDate)]));
    const earliest = Array.from(firstRecordDates.values()).sort()[0] || endDate;
    const startDate = requestedStart || earliest;
    // Load neighbouring days and every peer lot before allocation. A lot filter must not
    // give the selected lot all of a shared shift/day or hide a cross-midnight overlap.
    const records = await this.prisma.equipmentOeeRecord.findMany({
      where: { isVoided: false, equipmentId: { in: equipmentIds },
        recordDate: { gte: new Date((dayMinute(startDate) - 1440) * 60000 - 7 * 3600000),
          lt: new Date((dayMinute(endDate) + 2880) * 60000 - 7 * 3600000) } },
      orderBy: [{ recordDate: 'asc' }, { id: 'asc' }],
      include: { equipment: { select: { id: true, code: true, oldCode: true, name: true,
        category: true, department: true, location: true, oeeTarget: true, outputUnit: true, standardSpeedPerHour: true } },
        recordedBy: { select: { id: true, name: true, department: true } } },
    });
    const recordById = new Map(records.map((record) => [record.id, record]));
    const batchId = (record: typeof records[number]) => record.batchOeeId ||
      buildBatchOeeId(record.equipment.code, record.productCode, record.batchNumber);
    const allocation = allocateOeeTime(records, calculationMethod, { startDate, endDate, firstRecordDates });
    const allContributions = allocation.contributions;
    const contributions = allContributions.filter((item) => !query?.batchOeeId ||
      batchId(recordById.get(item.recordId)!) === query.batchOeeId);
    const selectedIds = new Set(contributions.map((item) => item.recordId));
    const selectedRecords = records.filter((record) => selectedIds.has(record.id));
    type Stats = OeeTotals & { ids: Set<string>; plannedDowntimeMinutes: number; unplannedDowntimeMinutes: number };
    const empty = (): Stats => ({ ...emptyOeeTotals(), ids: new Set(), plannedDowntimeMinutes: 0, unplannedDowntimeMinutes: 0 });
    const take = (stats: Stats, item: OeeContribution) => {
      stats.ids.add(item.recordId); stats.count = stats.ids.size;
      stats.runTimeMinutes += item.runTimeMinutes; stats.planTimeMinutes += item.planTimeMinutes;
      stats.theoreticalOutput += item.theoreticalOutput; stats.totalOutput += item.totalOutput;
      stats.goodOutput += item.goodOutput; stats.plannedDowntimeMinutes += item.plannedDowntimeMinutes;
      stats.unplannedDowntimeMinutes += item.unplannedDowntimeMinutes;
    };
    const totals = empty();
    const equipmentStats = new Map<string, Stats>();
    const dailyStats = new Map<string, Stats>();
    const batchStats = new Map<string, Stats>();
    const recordStats = new Map<string, Stats>();
    const get = (map: Map<string, Stats>, key: string) => {
      if (!map.has(key)) map.set(key, empty());
      return map.get(key)!;
    };
    for (const item of contributions) {
      take(totals, item);
      take(get(equipmentStats, item.equipmentId), item);
      take(get(dailyStats, item.date), item);
      take(get(recordStats, item.recordId), item);
      const id = batchId(recordById.get(item.recordId)!);
      if (id) take(get(batchStats, id), item);
    }
    if (calculationMethod === 'PA3' && !query?.batchOeeId) {
      for (const missing of allocation.unassignedPlan) {
        totals.planTimeMinutes += missing.minutes;
        get(equipmentStats, missing.equipmentId).planTimeMinutes += missing.minutes;
        get(dailyStats, missing.date).planTimeMinutes += missing.minutes;
      }
    }
    const activity = new Map<string, { trackedDays: number; runningDays: number; noRecordDays: number; recordedStopDays: number }>();
    for (const day of allocation.calendar) {
      const stats = activity.get(day.equipmentId) || { trackedDays: 0, runningDays: 0, noRecordDays: 0, recordedStopDays: 0 };
      stats.trackedDays++;
      if (day.status === 'RUNNING') stats.runningDays++;
      else if (day.status === 'NO_RECORD') stats.noRecordDays++;
      else stats.recordedStopDays++;
      activity.set(day.equipmentId, stats);
    }
    const metrics = (stats: Stats) => {
      const { ids, ...values } = stats;
      const shiftsCount = new Set(Array.from(ids).map((id) => {
        const record = recordById.get(id)!;
        return `${record.equipmentId}:${businessDateKey(record.recordDate)}:${record.shift}`;
      })).size;
      return { ...values, ...calculateOee(stats), shiftsCount,
        defectOutput: stats.totalOutput - stats.goodOutput };
    };
    const equipmentLeaderboard = criticalEquipments.map((equipment) => {
      const stats = equipmentStats.get(equipment.id) || empty();
      const result = metrics(stats);
      const target = equipment.oeeTarget || 85;
      const days = activity.get(equipment.id) || { trackedDays: 0, runningDays: 0, noRecordDays: 0, recordedStopDays: 0 };
      const hasData = result.shiftsCount > 0 || calculationMethod === 'PA3' && days.trackedDays > 0;
      const mainBottleneck = !hasData ? 'Chưa có dữ liệu ca' :
        result.availability < 90 && result.availability <= Math.min(result.performance, result.quality)
          ? 'Tổn thất Thời gian dừng máy (A)' : result.performance < 95 && result.performance <= result.quality
          ? 'Tổn thất Tốc độ / Chạy chậm (P)' : result.quality < 99 ? 'Tổn thất Chất lượng / Phế phẩm (Q)' : 'Vận hành ổn định đạt chuẩn';
      return { ...equipment, ...result, ...days, firstRecordedDate: firstRecordDates.get(equipment.id) || null,
        gapToTarget: hasData ? Math.round((result.oee - target) * 100) / 100 : 0,
        evaluation: !hasData ? 'NO_DATA' : result.oee >= target ? 'WORLD_CLASS' : result.oee >= target - 15 ? 'GOOD' : 'WARNING',
        mainBottleneck, lastRecordedAt: selectedRecords.filter((record) => record.equipmentId === equipment.id).slice(-1)[0]?.recordDate || null };
    });
    const dailyTrend = Array.from(dailyStats.entries()).sort(([left], [right]) => left.localeCompare(right)).map(([date, stats]) => ({
      date, ...metrics(stats), target: 85, runTimeHours: Math.round(stats.runTimeMinutes / 60 * 100) / 100,
      downtimeHours: Math.round((stats.plannedDowntimeMinutes + stats.unplannedDowntimeMinutes) / 60 * 100) / 100,
    }));
    const lossDefinitions = [
      ['cleaningMinutes', 'Vệ sinh đầu/cuối ca theo GMP', 'PLANNED'],
      ['breakMinutes', 'Nghỉ ca', 'PLANNED'],
      ['changeoverMinutes', 'Chuyển lô / Thay khuôn & Cài đặt', 'PLANNED'],
      ['plannedMaintenanceMinutes', 'Bảo dưỡng định kỳ / Hiệu chuẩn', 'PLANNED'],
      ['breakdownMinutes', 'Hỏng thiết bị / Sự cố kỹ thuật', 'UNPLANNED'],
      ['adjustmentMinutes', 'Căn chỉnh máy / Kẹt vỉ, bao bì, phôi', 'UNPLANNED'],
      ['waitingMaterialMinutes', 'Chờ bán thành phẩm / Vật tư / Phụ trợ', 'UNPLANNED'],
      ['noOperatorMinutes', 'Thiếu người', 'UNPLANNED'],
      ['qualityProcessMinutes', 'Chất lượng / quá trình', 'UNPLANNED'],
      ['otherWaitingMinutes', 'Chờ khác', 'UNPLANNED'],
    ];
    const losses = new Map(lossDefinitions.map(([key]) => [key, 0]));
    for (const record of selectedRecords) {
      const stats = recordStats.get(record.id)!;
      let raw: any = {};
      try { raw = JSON.parse(record.downtimeBreakdown || '{}'); } catch { /* Legacy notes. */ }
      for (const type of ['PLANNED', 'UNPLANNED']) {
        const definitions = lossDefinitions.filter((definition) => definition[2] === type);
        const sum = definitions.reduce((value, [key]) => value + Math.max(0, Number(raw[key]) || 0), 0);
        const minutes = type === 'PLANNED' ? stats.plannedDowntimeMinutes : stats.unplannedDowntimeMinutes;
        for (const [key] of definitions) losses.set(key, losses.get(key)! +
          (sum > 0 ? minutes * Math.max(0, Number(raw[key]) || 0) / sum : key === definitions[0][0] ? minutes : 0));
      }
    }
    const lossTotal = Array.from(losses.values()).reduce((sum, value) => sum + value, 0);
    const downtimePareto = lossDefinitions.map(([code, label, type]) => ({ code, label, type,
      minutes: Math.round(losses.get(code)! * 100) / 100,
      percentage: lossTotal > 0 ? Math.round(losses.get(code)! / lossTotal * 1000) / 10 : 0,
    })).sort((left, right) => right.minutes - left.minutes);
    const aggregate = calculateOee(totals);
    return {
      planCode: 'KH.DK-SX.2026.03',
      planTitle: 'KẾ HOẠCH CHUẨN HÓA VÀ TRIỂN KHAI HỆ THỐNG ĐO LƯỜNG OEE CHO THIẾT BỊ TRỌNG YẾU',
      calculationMethod, timezone: 'Asia/Bangkok', allocationPolicy: 'RUNTIME_WEIGHTED', startDate, endDate,
      dataQuality: { estimatedTimeRecords: new Set(contributions.filter((item) => item.estimated).map((item) => item.recordId)).size,
        reconciledRuntimeRecords: new Set(contributions.filter((item) => item.runtimeReconciled).map((item) => item.recordId)).size,
        estimatedOutputRecords: new Set(contributions.filter((item) => item.outputEstimated).map((item) => item.recordId)).size,
        estimatedRuntimeReductionMinutes: allocation.estimatedRuntimeReductionMinutes,
        overlappingRunMinutes: allocation.overlappingRunMinutes, deduplicatedPlanMinutes: allocation.deduplicatedPlanMinutes },
      summary: {
        criticalEquipmentCount: criticalEquipments.length,
        measuredEquipmentCount: equipmentLeaderboard.filter((equipment) => equipment.shiftsCount > 0).length,
        totalShiftsRecorded: new Set(selectedRecords.map((record) => `${record.equipmentId}:${businessDateKey(record.recordDate)}:${record.shift}`)).size,
        totalRecordsRecorded: selectedRecords.length, avgAvailability: aggregate.availability,
        avgPerformance: aggregate.performance, avgQuality: aggregate.quality, avgOee: aggregate.oee, benchmarkTarget: 85,
        totalPlanTimeHours: Math.round(totals.planTimeMinutes / 60 * 100) / 100,
        totalShiftHours: Math.round((totals.planTimeMinutes + (calculationMethod === 'PA1' ? totals.plannedDowntimeMinutes : 0)) / 60 * 100) / 100,
        totalRunTimeHours: Math.round(totals.runTimeMinutes / 60 * 100) / 100,
        totalPlannedDowntimeHours: Math.round(totals.plannedDowntimeMinutes / 60 * 100) / 100,
        totalUnplannedDowntimeHours: Math.round(totals.unplannedDowntimeMinutes / 60 * 100) / 100,
        totalOutputQty: totals.totalOutput, totalGoodQty: totals.goodOutput, totalDefectQty: totals.totalOutput - totals.goodOutput,
        trackedEquipmentDays: allocation.calendar.length,
        noRecordDays: allocation.calendar.filter((day) => day.status === 'NO_RECORD').length,
        recordedStopDays: allocation.calendar.filter((day) => day.status === 'RECORDED_STOP').length,
        unassignedPlanMinutes: calculationMethod === 'PA3' && !query?.batchOeeId
          ? allocation.unassignedPlan.reduce((sum, item) => sum + item.minutes, 0) : 0,
      },
      equipmentLeaderboard, dailyTrend, downtimePareto, equipmentDays: allocation.calendar,
      batchOptions: Array.from(new Set(allContributions.map((item) => batchId(recordById.get(item.recordId)!)).filter(Boolean))),
      batchSummary: Array.from(batchStats.entries()).map(([id, stats]) => {
        const record = recordById.get(stats.ids.values().next().value)!;
        return { batchOeeId: id, equipmentId: record.equipmentId, productCode: record.productCode,
          batchNumber: record.batchNumber, ...metrics(stats) };
      }),
      recentRecords: selectedRecords.slice().reverse().slice(0, 30).map((record) => ({
        ...record, recordedRunTimeMinutes: record.runTimeMinutes, recordedTotalOutput: record.totalOutput,
        ...metrics(recordStats.get(record.id)!), calculationMethod,
        allocationEstimated: contributions.some((item) => item.recordId === record.id && (item.estimated || item.outputEstimated)),
      })),
    };
  }
}
