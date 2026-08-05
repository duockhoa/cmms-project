import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateScheduleDto,
  UpdateScheduleDto,
  ActivateScheduleDto,
  PauseScheduleDto,
  CompleteScheduleDto,
  CancelScheduleDto,
  GenerateWorkOrderDto,
} from './dto/schedules.dto';
import { SCHEDULE_STATUS, SCHEDULE_FREQUENCY_TYPE } from './schedules.constants';

@Injectable()
export class SchedulesService {
  constructor(private prisma: PrismaService) {}

  private async validateActedBy(tx: any, actedById?: string) {
    if (!actedById || actedById.trim() === '') {
      throw new BadRequestException('Người thực hiện (actedById) là bắt buộc');
    }
    const user = await tx.user.findUnique({ where: { id: actedById.trim() } });
    if (!user || !user.isActive) {
      throw new BadRequestException(`Người thực hiện (actedById) không tồn tại hoặc đã bị vô hiệu hóa: ${actedById}`);
    }
    return user;
  }

  // ─── NEXT DUE DATE MATH & DRIFT PREVENTION ───
  public calculateNextDueDate(
    currentDueDate: Date,
    frequencyType: string,
    frequencyInterval: number,
    anchorDayOfMonth?: number,
  ): Date {
    const next = new Date(currentDueDate.getTime());
    const interval = Math.max(1, frequencyInterval);

    switch (frequencyType) {
      case SCHEDULE_FREQUENCY_TYPE.DAILY:
        next.setUTCDate(next.getUTCDate() + interval);
        break;

      case SCHEDULE_FREQUENCY_TYPE.WEEKLY:
        next.setUTCDate(next.getUTCDate() + interval * 7);
        break;

      case SCHEDULE_FREQUENCY_TYPE.MONTHLY:
      case SCHEDULE_FREQUENCY_TYPE.QUARTERLY:
      case SCHEDULE_FREQUENCY_TYPE.YEARLY: {
        let monthsToAdd = interval;
        if (frequencyType === SCHEDULE_FREQUENCY_TYPE.QUARTERLY) monthsToAdd = interval * 3;
        if (frequencyType === SCHEDULE_FREQUENCY_TYPE.YEARLY) monthsToAdd = interval * 12;

        const targetAnchorDay = anchorDayOfMonth || currentDueDate.getUTCDate();
        const targetYear = next.getUTCFullYear();
        const targetMonth = next.getUTCMonth() + monthsToAdd;

        // Set to 1st day of target month first to avoid roll-over
        next.setUTCFullYear(targetYear, targetMonth, 1);

        // Find max days in target month
        const maxDaysInMonth = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
        next.setUTCDate(Math.min(targetAnchorDay, maxDaysInMonth));
        break;
      }

      default:
        next.setUTCDate(next.getUTCDate() + interval);
        break;
    }

    return next;
  }

  // ─── CREATE SCHEDULE ───
  async create(dto: CreateScheduleDto) {
    if (!dto.title || dto.title.trim() === '') {
      throw new BadRequestException('Tiêu đề (title) không được để trống');
    }
    if (!dto.equipmentId) {
      throw new BadRequestException('Thiết bị (equipmentId) là bắt buộc');
    }
    if (!dto.createdById || dto.createdById.trim() === '') {
      throw new BadRequestException('Người tạo (createdById) là bắt buộc');
    }
    if (dto.frequencyInterval <= 0) {
      throw new BadRequestException('frequencyInterval phải lớn hơn 0');
    }

    const validTypes = Object.values(SCHEDULE_FREQUENCY_TYPE);
    if (!validTypes.includes(dto.frequencyType as any)) {
      throw new BadRequestException(`frequencyType không hợp lệ: ${dto.frequencyType}`);
    }

    return this.prisma.$transaction(async (tx) => {
      await this.validateActedBy(tx, dto.createdById);

      const equipment = await tx.equipment.findUnique({ where: { id: dto.equipmentId } });
      if (!equipment || !equipment.isActive) {
        throw new BadRequestException('Thiết bị không tồn tại hoặc đã bị vô hiệu hóa');
      }

      if (dto.assignedTechnicianId) {
        const tech = await tx.user.findUnique({ where: { id: dto.assignedTechnicianId } });
        if (!tech || !tech.isActive) {
          throw new BadRequestException('Kỹ thuật viên không tồn tại hoặc đã bị vô hiệu hóa');
        }
      }

      const scheduleCount = await tx.maintenanceSchedule.count();
      const scheduleCode = `MS-${new Date().getUTCFullYear()}-${(scheduleCount + 1).toString().padStart(4, '0')}`;

      const startDate = new Date(dto.startDate);
      const anchorDayOfMonth = startDate.getUTCDate();

      let nextDueDate: Date | null = startDate;
      let nextDueMeter: number | null = null;

      if (dto.frequencyType === SCHEDULE_FREQUENCY_TYPE.OPERATING_HOURS) {
        nextDueDate = null;
        nextDueMeter = (equipment.currentOperatingHours || 0) + dto.frequencyInterval;
      }

      const schedule = await tx.maintenanceSchedule.create({
        data: {
          scheduleCode,
          title: dto.title.trim(),
          description: dto.description?.trim() || null,
          equipmentId: dto.equipmentId,
          status: SCHEDULE_STATUS.DRAFT,
          frequencyType: dto.frequencyType,
          frequencyInterval: dto.frequencyInterval,
          startDate,
          nextDueDate,
          nextDueMeter,
          anchorDayOfMonth,
          estimatedDurationMinutes: dto.estimatedDurationMinutes || null,
          defaultPriority: dto.defaultPriority || 'MEDIUM',
          assignedTechnicianId: dto.assignedTechnicianId || null,
          createdById: dto.createdById.trim(),
          autoGenerate: dto.autoGenerate !== undefined ? dto.autoGenerate : true,
          leadTimeDays: dto.leadTimeDays || 0,
          notes: dto.notes?.trim() || null,
          checklistJson: dto.checklistJson ? JSON.stringify(dto.checklistJson) : null,
          version: 1,
        },
      });

      await tx.scheduleHistory.create({
        data: {
          scheduleId: schedule.id,
          action: 'CREATE',
          fromStatus: null,
          toStatus: SCHEDULE_STATUS.DRAFT,
          actedById: dto.createdById.trim(),
          versionBefore: null,
          versionAfter: 1,
          reason: 'Khởi tạo kế hoạch bảo trì',
        },
      });

      return schedule;
    });
  }

  // ─── ACTIVATE SCHEDULE ───
  async activate(id: string, dto: ActivateScheduleDto) {
    if (dto.expectedVersion === undefined || dto.expectedVersion === null) {
      throw new BadRequestException('expectedVersion là bắt buộc');
    }

    return this.prisma.$transaction(async (tx) => {
      const schedule = await tx.maintenanceSchedule.findUnique({ where: { id } });
      if (!schedule) throw new NotFoundException('Không tìm thấy lịch bảo trì');

      if (schedule.status === SCHEDULE_STATUS.COMPLETED || schedule.status === SCHEDULE_STATUS.CANCELLED) {
        throw new BadRequestException(`Lịch bảo trì ở trạng thái ${schedule.status} không thể kích hoạt lại`);
      }

      if (schedule.status !== SCHEDULE_STATUS.DRAFT && schedule.status !== SCHEDULE_STATUS.PAUSED) {
        throw new BadRequestException(`Không thể activate từ trạng thái ${schedule.status}`);
      }

      await this.validateActedBy(tx, dto.actedById);

      if (schedule.version !== dto.expectedVersion) {
        throw new ConflictException('Xung đột đồng thời: Bản ghi đã bị thay đổi bởi người dùng khác.');
      }

      const now = new Date();
      let nextDueDate = schedule.nextDueDate;
      let nextDueMeter = schedule.nextDueMeter;

      if (schedule.status === SCHEDULE_STATUS.DRAFT) {
        if (schedule.frequencyType === SCHEDULE_FREQUENCY_TYPE.OPERATING_HOURS) {
          const eq = await tx.equipment.findUnique({ where: { id: schedule.equipmentId } });
          nextDueMeter = (eq?.currentOperatingHours || 0) + schedule.frequencyInterval;
        } else {
          nextDueDate = schedule.startDate;
          while (nextDueDate && nextDueDate < now) {
            nextDueDate = this.calculateNextDueDate(nextDueDate, schedule.frequencyType, schedule.frequencyInterval, schedule.anchorDayOfMonth || undefined);
          }
        }
      } else if (schedule.status === SCHEDULE_STATUS.PAUSED) {
        if (nextDueDate && nextDueDate < now && schedule.frequencyType !== SCHEDULE_FREQUENCY_TYPE.OPERATING_HOURS) {
          while (nextDueDate < now) {
            nextDueDate = this.calculateNextDueDate(nextDueDate, schedule.frequencyType, schedule.frequencyInterval, schedule.anchorDayOfMonth || undefined);
          }
        }
      }

      const res = await tx.maintenanceSchedule.updateMany({
        where: { id, version: dto.expectedVersion },
        data: {
          status: SCHEDULE_STATUS.ACTIVE,
          nextDueDate,
          nextDueMeter,
          pausedAt: null,
          pausedById: null,
          pauseReason: null,
          version: { increment: 1 },
          updatedAt: now,
        },
      });

      if (res.count === 0) {
        throw new ConflictException('Xung đột đồng thời khi kích hoạt lịch bảo trì.');
      }

      await tx.scheduleHistory.create({
        data: {
          scheduleId: id,
          action: schedule.status === SCHEDULE_STATUS.PAUSED ? 'RESUME' : 'ACTIVATE',
          fromStatus: schedule.status,
          toStatus: SCHEDULE_STATUS.ACTIVE,
          actedById: dto.actedById.trim(),
          versionBefore: dto.expectedVersion,
          versionAfter: dto.expectedVersion + 1,
          reason: schedule.status === SCHEDULE_STATUS.PAUSED ? 'Tiếp tục thực hiện lịch bảo trì' : 'Kích hoạt lịch bảo trì',
        },
      });

      return tx.maintenanceSchedule.findUnique({ where: { id } });
    });
  }

  // ─── PAUSE SCHEDULE ───
  async pause(id: string, dto: PauseScheduleDto) {
    if (!dto.reason || dto.reason.trim() === '') {
      throw new BadRequestException('Lý do tạm dừng (reason) là bắt buộc');
    }
    if (dto.expectedVersion === undefined || dto.expectedVersion === null) {
      throw new BadRequestException('expectedVersion là bắt buộc');
    }

    return this.prisma.$transaction(async (tx) => {
      const schedule = await tx.maintenanceSchedule.findUnique({ where: { id } });
      if (!schedule) throw new NotFoundException('Không tìm thấy lịch bảo trì');

      if (schedule.status !== SCHEDULE_STATUS.ACTIVE) {
        throw new BadRequestException(`Không thể tạm dừng lịch bảo trì ở trạng thái ${schedule.status}`);
      }

      await this.validateActedBy(tx, dto.actedById);

      if (schedule.version !== dto.expectedVersion) {
        throw new ConflictException('Xung đột đồng thời: Bản ghi đã bị thay đổi bởi người dùng khác.');
      }

      const now = new Date();
      const res = await tx.maintenanceSchedule.updateMany({
        where: { id, version: dto.expectedVersion },
        data: {
          status: SCHEDULE_STATUS.PAUSED,
          pausedAt: now,
          pausedById: dto.actedById.trim(),
          pauseReason: dto.reason.trim(),
          version: { increment: 1 },
          updatedAt: now,
        },
      });

      if (res.count === 0) {
        throw new ConflictException('Xung đột đồng thời khi tạm dừng lịch bảo trì.');
      }

      await tx.scheduleHistory.create({
        data: {
          scheduleId: id,
          action: 'PAUSE',
          fromStatus: SCHEDULE_STATUS.ACTIVE,
          toStatus: SCHEDULE_STATUS.PAUSED,
          reason: dto.reason.trim(),
          actedById: dto.actedById.trim(),
          versionBefore: dto.expectedVersion,
          versionAfter: dto.expectedVersion + 1,
        },
      });

      return tx.maintenanceSchedule.findUnique({ where: { id } });
    });
  }

  // ─── COMPLETE SCHEDULE ───
  async complete(id: string, dto: CompleteScheduleDto) {
    if (!dto.reason || dto.reason.trim() === '') {
      throw new BadRequestException('Lý do hoàn thành (reason) là bắt buộc');
    }
    if (dto.expectedVersion === undefined || dto.expectedVersion === null) {
      throw new BadRequestException('expectedVersion là bắt buộc');
    }

    return this.prisma.$transaction(async (tx) => {
      const schedule = await tx.maintenanceSchedule.findUnique({ where: { id } });
      if (!schedule) throw new NotFoundException('Không tìm thấy lịch bảo trì');

      if (schedule.status === SCHEDULE_STATUS.COMPLETED || schedule.status === SCHEDULE_STATUS.CANCELLED) {
        throw new BadRequestException(`Lịch bảo trì ở trạng thái ${schedule.status} không thể hoàn thành`);
      }

      await this.validateActedBy(tx, dto.actedById);

      if (schedule.version !== dto.expectedVersion) {
        throw new ConflictException('Xung đột đồng thời: Bản ghi đã bị thay đổi bởi người dùng khác.');
      }

      // Check open Work Orders
      const openWO = await tx.workOrder.findFirst({
        where: {
          scheduleId: id,
          status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'INSPECTION', 'COMPLETED', 'VERIFIED'] },
        },
      });
      if (openWO) {
        throw new ConflictException(`Không thể hoàn thành lịch bảo trì vì vẫn còn Work Order mở (${openWO.orderCode} - Status: ${openWO.status})`);
      }

      const now = new Date();
      const res = await tx.maintenanceSchedule.updateMany({
        where: { id, version: dto.expectedVersion },
        data: {
          status: SCHEDULE_STATUS.COMPLETED,
          endDate: now,
          version: { increment: 1 },
          updatedAt: now,
        },
      });

      if (res.count === 0) {
        throw new ConflictException('Xung đột đồng thời khi hoàn thành lịch bảo trì.');
      }

      await tx.scheduleHistory.create({
        data: {
          scheduleId: id,
          action: 'COMPLETE',
          fromStatus: schedule.status,
          toStatus: SCHEDULE_STATUS.COMPLETED,
          reason: dto.reason.trim(),
          actedById: dto.actedById.trim(),
          versionBefore: dto.expectedVersion,
          versionAfter: dto.expectedVersion + 1,
        },
      });

      return tx.maintenanceSchedule.findUnique({ where: { id } });
    });
  }

  // ─── CANCEL SCHEDULE ───
  async cancel(id: string, dto: CancelScheduleDto) {
    if (!dto.reason || dto.reason.trim() === '') {
      throw new BadRequestException('Lý do hủy (reason) là bắt buộc');
    }
    if (dto.expectedVersion === undefined || dto.expectedVersion === null) {
      throw new BadRequestException('expectedVersion là bắt buộc');
    }

    return this.prisma.$transaction(async (tx) => {
      const schedule = await tx.maintenanceSchedule.findUnique({ where: { id } });
      if (!schedule) throw new NotFoundException('Không tìm thấy lịch bảo trì');

      if (schedule.status === SCHEDULE_STATUS.COMPLETED || schedule.status === SCHEDULE_STATUS.CANCELLED) {
        throw new BadRequestException(`Lịch bảo trì ở trạng thái ${schedule.status} không thể hủy`);
      }

      await this.validateActedBy(tx, dto.actedById);

      if (schedule.version !== dto.expectedVersion) {
        throw new ConflictException('Xung đột đồng thời: Bản ghi đã bị thay đổi bởi người dùng khác.');
      }

      const openWO = await tx.workOrder.findFirst({
        where: {
          scheduleId: id,
          status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'INSPECTION', 'COMPLETED', 'VERIFIED'] },
        },
      });
      if (openWO) {
        throw new ConflictException(`Không thể hủy lịch bảo trì vì vẫn còn Work Order mở (${openWO.orderCode} - Status: ${openWO.status})`);
      }

      const now = new Date();
      const res = await tx.maintenanceSchedule.updateMany({
        where: { id, version: dto.expectedVersion },
        data: {
          status: SCHEDULE_STATUS.CANCELLED,
          cancelledAt: now,
          cancelledById: dto.actedById.trim(),
          cancelReason: dto.reason.trim(),
          version: { increment: 1 },
          updatedAt: now,
        },
      });

      if (res.count === 0) {
        throw new ConflictException('Xung đột đồng thời khi hủy lịch bảo trì.');
      }

      await tx.scheduleHistory.create({
        data: {
          scheduleId: id,
          action: 'CANCEL',
          fromStatus: schedule.status,
          toStatus: SCHEDULE_STATUS.CANCELLED,
          reason: dto.reason.trim(),
          actedById: dto.actedById.trim(),
          versionBefore: dto.expectedVersion,
          versionAfter: dto.expectedVersion + 1,
        },
      });

      return tx.maintenanceSchedule.findUnique({ where: { id } });
    });
  }

  // ─── UPDATE SCHEDULE ───
  async update(id: string, dto: UpdateScheduleDto) {
    if (dto.expectedVersion === undefined || dto.expectedVersion === null) {
      throw new BadRequestException('expectedVersion là bắt buộc');
    }

    return this.prisma.$transaction(async (tx) => {
      const schedule = await tx.maintenanceSchedule.findUnique({ where: { id } });
      if (!schedule) throw new NotFoundException('Không tìm thấy lịch bảo trì');

      if (schedule.status === SCHEDULE_STATUS.COMPLETED || schedule.status === SCHEDULE_STATUS.CANCELLED) {
        throw new BadRequestException(`Lịch bảo trì ở trạng thái ${schedule.status} không được phép chỉnh sửa`);
      }

      await this.validateActedBy(tx, dto.actedById);

      if (schedule.version !== dto.expectedVersion) {
        throw new ConflictException('Xung đột đồng thời: Bản ghi đã bị thay đổi bởi người dùng khác.');
      }

      const updateData: any = {};

      if (dto.title !== undefined) updateData.title = dto.title.trim();
      if (dto.description !== undefined) updateData.description = dto.description.trim();
      if (dto.estimatedDurationMinutes !== undefined) updateData.estimatedDurationMinutes = dto.estimatedDurationMinutes;
      if (dto.defaultPriority !== undefined) updateData.defaultPriority = dto.defaultPriority;
      if (dto.autoGenerate !== undefined) updateData.autoGenerate = dto.autoGenerate;
      if (dto.leadTimeDays !== undefined) updateData.leadTimeDays = dto.leadTimeDays;
      if (dto.notes !== undefined) updateData.notes = dto.notes.trim();

      if (dto.assignedTechnicianId !== undefined) {
        if (dto.assignedTechnicianId) {
          const tech = await tx.user.findUnique({ where: { id: dto.assignedTechnicianId } });
          if (!tech || !tech.isActive) throw new BadRequestException('Kỹ thuật viên không tồn tại hoặc đã bị vô hiệu hóa');
        }
        updateData.assignedTechnicianId = dto.assignedTechnicianId || null;
      }

      if (dto.frequencyType !== undefined || dto.frequencyInterval !== undefined || dto.startDate !== undefined) {
        if (dto.frequencyInterval !== undefined && dto.frequencyInterval <= 0) {
          throw new BadRequestException('frequencyInterval phải lớn hơn 0');
        }
        const freqType = dto.frequencyType || schedule.frequencyType;
        const freqInterval = dto.frequencyInterval || schedule.frequencyInterval;

        updateData.frequencyType = freqType;
        updateData.frequencyInterval = freqInterval;

        if (dto.startDate) {
          const sDate = new Date(dto.startDate);
          updateData.startDate = sDate;
          updateData.anchorDayOfMonth = sDate.getUTCDate();
          if (schedule.status === SCHEDULE_STATUS.DRAFT) {
            updateData.nextDueDate = sDate;
          }
        }
      }

      updateData.version = { increment: 1 };
      updateData.updatedAt = new Date();

      const res = await tx.maintenanceSchedule.updateMany({
        where: { id, version: dto.expectedVersion },
        data: updateData,
      });

      if (res.count === 0) {
        throw new ConflictException('Xung đột đồng thời khi cập nhật lịch bảo trì.');
      }

      await tx.scheduleHistory.create({
        data: {
          scheduleId: id,
          action: 'UPDATE',
          fromStatus: schedule.status,
          toStatus: schedule.status,
          actedById: dto.actedById.trim(),
          versionBefore: dto.expectedVersion,
          versionAfter: dto.expectedVersion + 1,
          reason: 'Cập nhật cấu hình lịch bảo trì',
        },
      });

      return tx.maintenanceSchedule.findUnique({ where: { id } });
    });
  }

  // ─── GENERATE WORK ORDER FROM SCHEDULE ───
  async generateWorkOrder(id: string, dto: GenerateWorkOrderDto) {
    if (dto.expectedVersion === undefined || dto.expectedVersion === null) {
      throw new BadRequestException('expectedVersion là bắt buộc');
    }

    return this.prisma.$transaction(async (tx) => {
      const schedule = await tx.maintenanceSchedule.findUnique({
        where: { id },
        include: { equipment: true, assignedTechnician: true },
      });
      if (!schedule) throw new NotFoundException('Không tìm thấy lịch bảo trì');

      if (schedule.status !== SCHEDULE_STATUS.ACTIVE) {
        throw new BadRequestException(`Không thể phát sinh Work Order từ lịch ở trạng thái ${schedule.status}`);
      }

      if (!schedule.equipment || !schedule.equipment.isActive) {
        throw new BadRequestException('Thiết bị gắn liền với lịch không tồn tại hoặc đã bị vô hiệu hóa');
      }

      await this.validateActedBy(tx, dto.actedById);

      let scheduledDueDate = dto.dueDate ? new Date(dto.dueDate) : (schedule.nextDueDate || new Date());
      let scheduledDueMeter = schedule.nextDueMeter;
      let generationKey = '';

      if (schedule.frequencyType === SCHEDULE_FREQUENCY_TYPE.OPERATING_HOURS) {
        if (schedule.equipment.currentOperatingHours < (schedule.nextDueMeter || 0)) {
          throw new BadRequestException(`Thiết bị chưa đạt số giờ vận hành đến hạn (${schedule.equipment.currentOperatingHours} / ${schedule.nextDueMeter})`);
        }
        const roundedMeter = Math.round(schedule.nextDueMeter || 0);
        generationKey = `${id}:METER:${roundedMeter}`;
      } else {
        generationKey = `${id}:DATE:${scheduledDueDate.toISOString()}`;
      }

      // Check if Work Order with this generationKey already exists (IDEMPOTENCY HANDLING FOR RETRIES)
      const existingWO = await tx.workOrder.findUnique({
        where: { generationKey },
      });

      if (existingWO) {
        // Idempotency: return existing WorkOrder WITHOUT advancing version, WITHOUT updating nextDueDate, WITHOUT creating duplicate History
        return existingWO;
      }

      if (schedule.version !== dto.expectedVersion) {
        throw new ConflictException('Xung đột đồng thời: Bản ghi đã bị thay đổi bởi người dùng khác.');
      }

      const woCount = await tx.workOrder.count();
      const orderCode = `WO-MS-${(woCount + 1).toString().padStart(4, '0')}`;

      // Create Work Order snapshot
      const createdWO = await tx.workOrder.create({
        data: {
          orderCode,
          equipmentId: schedule.equipmentId,
          title: `[Định kỳ] ${schedule.title}`,
          description: schedule.description || schedule.title,
          priority: schedule.defaultPriority || 'MEDIUM',
          status: 'PENDING',
          technicianName: schedule.assignedTechnician?.name || null,
          scheduleId: id,
          scheduledDueDate,
          scheduledDueMeter,
          generationKey,
          version: 1,
        },
      });

      // Calculate next due date/meter
      let nextDueDate = schedule.nextDueDate;
      let nextDueMeter = schedule.nextDueMeter;
      let lastTriggerMeter = schedule.lastTriggerMeter;

      if (schedule.frequencyType === SCHEDULE_FREQUENCY_TYPE.OPERATING_HOURS) {
        lastTriggerMeter = schedule.nextDueMeter;
        nextDueMeter = (schedule.nextDueMeter || 0) + schedule.frequencyInterval;
      } else {
        const baseDate = schedule.nextDueDate || scheduledDueDate;
        nextDueDate = this.calculateNextDueDate(baseDate, schedule.frequencyType, schedule.frequencyInterval, schedule.anchorDayOfMonth || undefined);
      }

      const now = new Date();
      const schedRes = await tx.maintenanceSchedule.updateMany({
        where: { id, version: dto.expectedVersion },
        data: {
          lastGeneratedAt: now,
          nextDueDate,
          nextDueMeter,
          lastTriggerMeter,
          version: { increment: 1 },
          updatedAt: now,
        },
      });

      if (schedRes.count === 0) {
        throw new ConflictException('Xung đột đồng thời khi phát sinh Work Order.');
      }

      await tx.scheduleHistory.create({
        data: {
          scheduleId: id,
          action: 'GENERATE_WORK_ORDER',
          fromStatus: SCHEDULE_STATUS.ACTIVE,
          toStatus: SCHEDULE_STATUS.ACTIVE,
          actedById: dto.actedById.trim(),
          versionBefore: dto.expectedVersion,
          versionAfter: dto.expectedVersion + 1,
          workOrderId: createdWO.id,
          reason: `Phát sinh Work Order tự động/thủ công: ${createdWO.orderCode}`,
        },
      });

      return createdWO;
    });
  }

  // ─── AUTO GENERATE PROCESS BATCH ───
  async processDueSchedules(actedById?: string, referenceTimeInput?: Date | string) {
    if (actedById) {
      const user = await this.prisma.user.findUnique({ where: { id: actedById.trim() } });
      if (!user || !user.isActive || (user.role !== 'ADMIN' && user.role !== 'MANAGER' && user.role !== 'TECHNICIAN')) {
        throw new ForbiddenException('Truy cập bị từ chối: Chỉ người dùng hệ thống/quản trị mới có quyền thực hiện process-due');
      }
    }

    const referenceTime = referenceTimeInput ? new Date(referenceTimeInput) : new Date();

    const activeSchedules = await this.prisma.maintenanceSchedule.findMany({
      where: {
        status: SCHEDULE_STATUS.ACTIVE,
        autoGenerate: true,
        equipment: { isActive: true },
      },
      take: 100, // Batch limit protection
      include: { equipment: true, assignedTechnician: true },
    });

    const summary = {
      scanned: activeSchedules.length,
      generated: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const schedule of activeSchedules) {
      try {
        let isDue = false;
        if (schedule.frequencyType === SCHEDULE_FREQUENCY_TYPE.OPERATING_HOURS) {
          if (schedule.nextDueMeter !== null && schedule.equipment.currentOperatingHours >= schedule.nextDueMeter) {
            isDue = true;
          }
        } else if (schedule.nextDueDate) {
          const leadMs = (schedule.leadTimeDays || 0) * 24 * 60 * 60 * 1000;
          const dueThreshold = new Date(referenceTime.getTime() + leadMs);
          if (schedule.nextDueDate <= dueThreshold) {
            isDue = true;
          }
        }

        if (!isDue) {
          summary.skipped++;
          continue;
        }

        const actorId = actedById || schedule.createdById;
        const actor = await this.prisma.user.findUnique({ where: { id: actorId } });
        if (!actor || !actor.isActive) {
          summary.failed++;
          summary.errors.push(`Schedule ${schedule.scheduleCode}: actor ${actorId} inactive or missing`);
          continue;
        }

        await this.generateWorkOrder(schedule.id, {
          expectedVersion: schedule.version,
          actedById: actor.id,
          dueDate: schedule.nextDueDate ? schedule.nextDueDate.toISOString() : undefined,
        });

        summary.generated++;
      } catch (err: any) {
        summary.failed++;
        summary.errors.push(`Schedule ${schedule.scheduleCode}: ${err.message || 'Error generating WO'}`);
      }
    }

    return summary;
  }

  // ─── WORK ORDER CLOSED CALLBACK (MONOTONIC & IDEMPOTENT) ───
  async onWorkOrderClosed(workOrderId: string) {
    const wo = await this.prisma.workOrder.findUnique({ where: { id: workOrderId } });
    if (!wo || !wo.scheduleId) return;

    const schedule = await this.prisma.maintenanceSchedule.findUnique({ where: { id: wo.scheduleId } });
    if (!schedule) return;

    const closedAt = wo.closedAt || new Date();

    // Monotonic check: only update lastCompletedAt if closedAt is strictly newer than existing lastCompletedAt
    if (!schedule.lastCompletedAt || closedAt > schedule.lastCompletedAt) {
      await this.prisma.maintenanceSchedule.update({
        where: { id: wo.scheduleId },
        data: {
          lastCompletedAt: closedAt,
          updatedAt: new Date(),
        },
      });
    }
  }

  // ─── FIND ALL WITH FILTERS & PAGINATION ───
  async findAll(query?: {
    status?: string;
    equipmentId?: string;
    frequencyType?: string;
    assignedTechnicianId?: string;
    dueFrom?: string;
    dueTo?: string;
    overdue?: boolean | string;
    search?: string;
    page?: number | string;
    limit?: number | string;
  }) {
    const where: any = {};

    if (query?.status) where.status = query.status;
    if (query?.equipmentId) where.equipmentId = query.equipmentId;
    if (query?.frequencyType) where.frequencyType = query.frequencyType;
    if (query?.assignedTechnicianId) where.assignedTechnicianId = query.assignedTechnicianId;

    if (query?.search) {
      where.OR = [
        { title: { contains: query.search } },
        { scheduleCode: { contains: query.search } },
        { equipment: { name: { contains: query.search } } },
      ];
    }

    if (query?.dueFrom || query?.dueTo) {
      where.nextDueDate = {};
      if (query.dueFrom) where.nextDueDate.gte = new Date(query.dueFrom);
      if (query.dueTo) where.nextDueDate.lte = new Date(query.dueTo);
    }

    if (query?.overdue === true || query?.overdue === 'true') {
      where.status = SCHEDULE_STATUS.ACTIVE;
      where.nextDueDate = { lt: new Date() };
    }

    const page = Math.max(1, parseInt(query?.page as any) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query?.limit as any) || 10));
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.maintenanceSchedule.count({ where }),
      this.prisma.maintenanceSchedule.findMany({
        where,
        orderBy: [{ nextDueDate: 'asc' }, { id: 'asc' }],
        skip,
        take: limit,
        include: {
          equipment: true,
          assignedTechnician: true,
          createdBy: true,
          workOrders: {
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─── FIND ONE ───
  async findOne(id: string) {
    const schedule = await this.prisma.maintenanceSchedule.findUnique({
      where: { id },
      include: {
        equipment: true,
        assignedTechnician: true,
        createdBy: true,
        pausedBy: true,
        cancelledBy: true,
        workOrders: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!schedule) throw new NotFoundException('Không tìm thấy lịch bảo trì');

    const now = new Date();
    const leadMs = (schedule.leadTimeDays || 0) * 24 * 60 * 60 * 1000;

    const isOverdue = schedule.status === SCHEDULE_STATUS.ACTIVE && schedule.nextDueDate !== null && schedule.nextDueDate < now;
    const isDueSoon =
      schedule.status === SCHEDULE_STATUS.ACTIVE &&
      schedule.nextDueDate !== null &&
      schedule.nextDueDate >= now &&
      schedule.nextDueDate.getTime() <= now.getTime() + leadMs;

    return {
      ...schedule,
      isOverdue,
      isDueSoon,
      totalWorkOrdersGenerated: schedule.workOrders.length,
      latestWorkOrder: schedule.workOrders[0] || null,
    };
  }

  // ─── GET SCHEDULE HISTORY ───
  async getHistory(id: string) {
    await this.findOne(id);
    return this.prisma.scheduleHistory.findMany({
      where: { scheduleId: id },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      include: {
        actedBy: true,
        workOrder: true,
      },
    });
  }

  // ─── ALIAS: TRIGGER WORK ORDER ───
  async triggerWorkOrder(id: string, expectedVersion: number) {
    const adminUser = await this.prisma.user.findFirst({ where: { isActive: true } });
    return this.generateWorkOrder(id, {
      expectedVersion,
      actedById: adminUser?.id || 'user-id',
    });
  }

  // ─── REMOVE SCHEDULE ───
  async remove(id: string) {
    const schedule = await this.findOne(id);

    if (schedule.status === SCHEDULE_STATUS.ACTIVE || schedule.status === SCHEDULE_STATUS.PAUSED) {
      throw new ConflictException('Không thể xóa lịch bảo trì đang ACTIVE hoặc PAUSED. Hãy hủy (CANCEL) trước.');
    }

    if (schedule.workOrders.length > 0) {
      throw new ConflictException('Không thể xóa lịch bảo trì đã phát sinh Work Order.');
    }

    // ScheduleHistory Restrict check
    const historyCount = await this.prisma.scheduleHistory.count({ where: { scheduleId: id } });
    if (historyCount > 0) {
      throw new ConflictException('Không thể xóa Lịch bảo trì đã có lịch sử thao tác (ScheduleHistory).');
    }

    return this.prisma.maintenanceSchedule.delete({ where: { id } });
  }
}
