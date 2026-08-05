"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const schedules_constants_1 = require("./schedules.constants");
let SchedulesService = class SchedulesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async validateActedBy(tx, actedById) {
        if (!actedById || actedById.trim() === '') {
            throw new common_1.BadRequestException('Người thực hiện (actedById) là bắt buộc');
        }
        const user = await tx.user.findUnique({ where: { id: actedById.trim() } });
        if (!user || !user.isActive) {
            throw new common_1.BadRequestException(`Người thực hiện (actedById) không tồn tại hoặc đã bị vô hiệu hóa: ${actedById}`);
        }
        return user;
    }
    calculateNextDueDate(currentDueDate, frequencyType, frequencyInterval, anchorDayOfMonth) {
        const next = new Date(currentDueDate.getTime());
        const interval = Math.max(1, frequencyInterval);
        switch (frequencyType) {
            case schedules_constants_1.SCHEDULE_FREQUENCY_TYPE.DAILY:
                next.setUTCDate(next.getUTCDate() + interval);
                break;
            case schedules_constants_1.SCHEDULE_FREQUENCY_TYPE.WEEKLY:
                next.setUTCDate(next.getUTCDate() + interval * 7);
                break;
            case schedules_constants_1.SCHEDULE_FREQUENCY_TYPE.MONTHLY:
            case schedules_constants_1.SCHEDULE_FREQUENCY_TYPE.QUARTERLY:
            case schedules_constants_1.SCHEDULE_FREQUENCY_TYPE.YEARLY: {
                let monthsToAdd = interval;
                if (frequencyType === schedules_constants_1.SCHEDULE_FREQUENCY_TYPE.QUARTERLY)
                    monthsToAdd = interval * 3;
                if (frequencyType === schedules_constants_1.SCHEDULE_FREQUENCY_TYPE.YEARLY)
                    monthsToAdd = interval * 12;
                const targetAnchorDay = anchorDayOfMonth || currentDueDate.getUTCDate();
                const targetYear = next.getUTCFullYear();
                const targetMonth = next.getUTCMonth() + monthsToAdd;
                next.setUTCFullYear(targetYear, targetMonth, 1);
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
    async create(dto) {
        if (!dto.title || dto.title.trim() === '') {
            throw new common_1.BadRequestException('Tiêu đề (title) không được để trống');
        }
        if (!dto.equipmentId) {
            throw new common_1.BadRequestException('Thiết bị (equipmentId) là bắt buộc');
        }
        if (!dto.createdById || dto.createdById.trim() === '') {
            throw new common_1.BadRequestException('Người tạo (createdById) là bắt buộc');
        }
        if (dto.frequencyInterval <= 0) {
            throw new common_1.BadRequestException('frequencyInterval phải lớn hơn 0');
        }
        const validTypes = Object.values(schedules_constants_1.SCHEDULE_FREQUENCY_TYPE);
        if (!validTypes.includes(dto.frequencyType)) {
            throw new common_1.BadRequestException(`frequencyType không hợp lệ: ${dto.frequencyType}`);
        }
        return this.prisma.$transaction(async (tx) => {
            await this.validateActedBy(tx, dto.createdById);
            const equipment = await tx.equipment.findUnique({ where: { id: dto.equipmentId } });
            if (!equipment || !equipment.isActive) {
                throw new common_1.BadRequestException('Thiết bị không tồn tại hoặc đã bị vô hiệu hóa');
            }
            if (dto.assignedTechnicianId) {
                const tech = await tx.user.findUnique({ where: { id: dto.assignedTechnicianId } });
                if (!tech || !tech.isActive) {
                    throw new common_1.BadRequestException('Kỹ thuật viên không tồn tại hoặc đã bị vô hiệu hóa');
                }
            }
            const scheduleCount = await tx.maintenanceSchedule.count();
            const scheduleCode = `MS-${new Date().getUTCFullYear()}-${(scheduleCount + 1).toString().padStart(4, '0')}`;
            const startDate = new Date(dto.startDate);
            const anchorDayOfMonth = startDate.getUTCDate();
            let nextDueDate = startDate;
            let nextDueMeter = null;
            if (dto.frequencyType === schedules_constants_1.SCHEDULE_FREQUENCY_TYPE.OPERATING_HOURS) {
                nextDueDate = null;
                nextDueMeter = (equipment.currentOperatingHours || 0) + dto.frequencyInterval;
            }
            const schedule = await tx.maintenanceSchedule.create({
                data: {
                    scheduleCode,
                    title: dto.title.trim(),
                    description: dto.description?.trim() || null,
                    equipmentId: dto.equipmentId,
                    status: schedules_constants_1.SCHEDULE_STATUS.DRAFT,
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
                    toStatus: schedules_constants_1.SCHEDULE_STATUS.DRAFT,
                    actedById: dto.createdById.trim(),
                    versionBefore: null,
                    versionAfter: 1,
                    reason: 'Khởi tạo kế hoạch bảo trì',
                },
            });
            return schedule;
        });
    }
    async activate(id, dto) {
        if (dto.expectedVersion === undefined || dto.expectedVersion === null) {
            throw new common_1.BadRequestException('expectedVersion là bắt buộc');
        }
        return this.prisma.$transaction(async (tx) => {
            const schedule = await tx.maintenanceSchedule.findUnique({ where: { id } });
            if (!schedule)
                throw new common_1.NotFoundException('Không tìm thấy lịch bảo trì');
            if (schedule.status === schedules_constants_1.SCHEDULE_STATUS.COMPLETED || schedule.status === schedules_constants_1.SCHEDULE_STATUS.CANCELLED) {
                throw new common_1.BadRequestException(`Lịch bảo trì ở trạng thái ${schedule.status} không thể kích hoạt lại`);
            }
            if (schedule.status !== schedules_constants_1.SCHEDULE_STATUS.DRAFT && schedule.status !== schedules_constants_1.SCHEDULE_STATUS.PAUSED) {
                throw new common_1.BadRequestException(`Không thể activate từ trạng thái ${schedule.status}`);
            }
            await this.validateActedBy(tx, dto.actedById);
            if (schedule.version !== dto.expectedVersion) {
                throw new common_1.ConflictException('Xung đột đồng thời: Bản ghi đã bị thay đổi bởi người dùng khác.');
            }
            const now = new Date();
            let nextDueDate = schedule.nextDueDate;
            let nextDueMeter = schedule.nextDueMeter;
            if (schedule.status === schedules_constants_1.SCHEDULE_STATUS.DRAFT) {
                if (schedule.frequencyType === schedules_constants_1.SCHEDULE_FREQUENCY_TYPE.OPERATING_HOURS) {
                    const eq = await tx.equipment.findUnique({ where: { id: schedule.equipmentId } });
                    nextDueMeter = (eq?.currentOperatingHours || 0) + schedule.frequencyInterval;
                }
                else {
                    nextDueDate = schedule.startDate;
                    while (nextDueDate && nextDueDate < now) {
                        nextDueDate = this.calculateNextDueDate(nextDueDate, schedule.frequencyType, schedule.frequencyInterval, schedule.anchorDayOfMonth || undefined);
                    }
                }
            }
            else if (schedule.status === schedules_constants_1.SCHEDULE_STATUS.PAUSED) {
                if (nextDueDate && nextDueDate < now && schedule.frequencyType !== schedules_constants_1.SCHEDULE_FREQUENCY_TYPE.OPERATING_HOURS) {
                    while (nextDueDate < now) {
                        nextDueDate = this.calculateNextDueDate(nextDueDate, schedule.frequencyType, schedule.frequencyInterval, schedule.anchorDayOfMonth || undefined);
                    }
                }
            }
            const res = await tx.maintenanceSchedule.updateMany({
                where: { id, version: dto.expectedVersion },
                data: {
                    status: schedules_constants_1.SCHEDULE_STATUS.ACTIVE,
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
                throw new common_1.ConflictException('Xung đột đồng thời khi kích hoạt lịch bảo trì.');
            }
            await tx.scheduleHistory.create({
                data: {
                    scheduleId: id,
                    action: schedule.status === schedules_constants_1.SCHEDULE_STATUS.PAUSED ? 'RESUME' : 'ACTIVATE',
                    fromStatus: schedule.status,
                    toStatus: schedules_constants_1.SCHEDULE_STATUS.ACTIVE,
                    actedById: dto.actedById.trim(),
                    versionBefore: dto.expectedVersion,
                    versionAfter: dto.expectedVersion + 1,
                    reason: schedule.status === schedules_constants_1.SCHEDULE_STATUS.PAUSED ? 'Tiếp tục thực hiện lịch bảo trì' : 'Kích hoạt lịch bảo trì',
                },
            });
            return tx.maintenanceSchedule.findUnique({ where: { id } });
        });
    }
    async pause(id, dto) {
        if (!dto.reason || dto.reason.trim() === '') {
            throw new common_1.BadRequestException('Lý do tạm dừng (reason) là bắt buộc');
        }
        if (dto.expectedVersion === undefined || dto.expectedVersion === null) {
            throw new common_1.BadRequestException('expectedVersion là bắt buộc');
        }
        return this.prisma.$transaction(async (tx) => {
            const schedule = await tx.maintenanceSchedule.findUnique({ where: { id } });
            if (!schedule)
                throw new common_1.NotFoundException('Không tìm thấy lịch bảo trì');
            if (schedule.status !== schedules_constants_1.SCHEDULE_STATUS.ACTIVE) {
                throw new common_1.BadRequestException(`Không thể tạm dừng lịch bảo trì ở trạng thái ${schedule.status}`);
            }
            await this.validateActedBy(tx, dto.actedById);
            if (schedule.version !== dto.expectedVersion) {
                throw new common_1.ConflictException('Xung đột đồng thời: Bản ghi đã bị thay đổi bởi người dùng khác.');
            }
            const now = new Date();
            const res = await tx.maintenanceSchedule.updateMany({
                where: { id, version: dto.expectedVersion },
                data: {
                    status: schedules_constants_1.SCHEDULE_STATUS.PAUSED,
                    pausedAt: now,
                    pausedById: dto.actedById.trim(),
                    pauseReason: dto.reason.trim(),
                    version: { increment: 1 },
                    updatedAt: now,
                },
            });
            if (res.count === 0) {
                throw new common_1.ConflictException('Xung đột đồng thời khi tạm dừng lịch bảo trì.');
            }
            await tx.scheduleHistory.create({
                data: {
                    scheduleId: id,
                    action: 'PAUSE',
                    fromStatus: schedules_constants_1.SCHEDULE_STATUS.ACTIVE,
                    toStatus: schedules_constants_1.SCHEDULE_STATUS.PAUSED,
                    reason: dto.reason.trim(),
                    actedById: dto.actedById.trim(),
                    versionBefore: dto.expectedVersion,
                    versionAfter: dto.expectedVersion + 1,
                },
            });
            return tx.maintenanceSchedule.findUnique({ where: { id } });
        });
    }
    async complete(id, dto) {
        if (!dto.reason || dto.reason.trim() === '') {
            throw new common_1.BadRequestException('Lý do hoàn thành (reason) là bắt buộc');
        }
        if (dto.expectedVersion === undefined || dto.expectedVersion === null) {
            throw new common_1.BadRequestException('expectedVersion là bắt buộc');
        }
        return this.prisma.$transaction(async (tx) => {
            const schedule = await tx.maintenanceSchedule.findUnique({ where: { id } });
            if (!schedule)
                throw new common_1.NotFoundException('Không tìm thấy lịch bảo trì');
            if (schedule.status === schedules_constants_1.SCHEDULE_STATUS.COMPLETED || schedule.status === schedules_constants_1.SCHEDULE_STATUS.CANCELLED) {
                throw new common_1.BadRequestException(`Lịch bảo trì ở trạng thái ${schedule.status} không thể hoàn thành`);
            }
            await this.validateActedBy(tx, dto.actedById);
            if (schedule.version !== dto.expectedVersion) {
                throw new common_1.ConflictException('Xung đột đồng thời: Bản ghi đã bị thay đổi bởi người dùng khác.');
            }
            const openWO = await tx.workOrder.findFirst({
                where: {
                    scheduleId: id,
                    status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'INSPECTION', 'COMPLETED', 'VERIFIED'] },
                },
            });
            if (openWO) {
                throw new common_1.ConflictException(`Không thể hoàn thành lịch bảo trì vì vẫn còn Work Order mở (${openWO.orderCode} - Status: ${openWO.status})`);
            }
            const now = new Date();
            const res = await tx.maintenanceSchedule.updateMany({
                where: { id, version: dto.expectedVersion },
                data: {
                    status: schedules_constants_1.SCHEDULE_STATUS.COMPLETED,
                    endDate: now,
                    version: { increment: 1 },
                    updatedAt: now,
                },
            });
            if (res.count === 0) {
                throw new common_1.ConflictException('Xung đột đồng thời khi hoàn thành lịch bảo trì.');
            }
            await tx.scheduleHistory.create({
                data: {
                    scheduleId: id,
                    action: 'COMPLETE',
                    fromStatus: schedule.status,
                    toStatus: schedules_constants_1.SCHEDULE_STATUS.COMPLETED,
                    reason: dto.reason.trim(),
                    actedById: dto.actedById.trim(),
                    versionBefore: dto.expectedVersion,
                    versionAfter: dto.expectedVersion + 1,
                },
            });
            return tx.maintenanceSchedule.findUnique({ where: { id } });
        });
    }
    async cancel(id, dto) {
        if (!dto.reason || dto.reason.trim() === '') {
            throw new common_1.BadRequestException('Lý do hủy (reason) là bắt buộc');
        }
        if (dto.expectedVersion === undefined || dto.expectedVersion === null) {
            throw new common_1.BadRequestException('expectedVersion là bắt buộc');
        }
        return this.prisma.$transaction(async (tx) => {
            const schedule = await tx.maintenanceSchedule.findUnique({ where: { id } });
            if (!schedule)
                throw new common_1.NotFoundException('Không tìm thấy lịch bảo trì');
            if (schedule.status === schedules_constants_1.SCHEDULE_STATUS.COMPLETED || schedule.status === schedules_constants_1.SCHEDULE_STATUS.CANCELLED) {
                throw new common_1.BadRequestException(`Lịch bảo trì ở trạng thái ${schedule.status} không thể hủy`);
            }
            await this.validateActedBy(tx, dto.actedById);
            if (schedule.version !== dto.expectedVersion) {
                throw new common_1.ConflictException('Xung đột đồng thời: Bản ghi đã bị thay đổi bởi người dùng khác.');
            }
            const openWO = await tx.workOrder.findFirst({
                where: {
                    scheduleId: id,
                    status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'INSPECTION', 'COMPLETED', 'VERIFIED'] },
                },
            });
            if (openWO) {
                throw new common_1.ConflictException(`Không thể hủy lịch bảo trì vì vẫn còn Work Order mở (${openWO.orderCode} - Status: ${openWO.status})`);
            }
            const now = new Date();
            const res = await tx.maintenanceSchedule.updateMany({
                where: { id, version: dto.expectedVersion },
                data: {
                    status: schedules_constants_1.SCHEDULE_STATUS.CANCELLED,
                    cancelledAt: now,
                    cancelledById: dto.actedById.trim(),
                    cancelReason: dto.reason.trim(),
                    version: { increment: 1 },
                    updatedAt: now,
                },
            });
            if (res.count === 0) {
                throw new common_1.ConflictException('Xung đột đồng thời khi hủy lịch bảo trì.');
            }
            await tx.scheduleHistory.create({
                data: {
                    scheduleId: id,
                    action: 'CANCEL',
                    fromStatus: schedule.status,
                    toStatus: schedules_constants_1.SCHEDULE_STATUS.CANCELLED,
                    reason: dto.reason.trim(),
                    actedById: dto.actedById.trim(),
                    versionBefore: dto.expectedVersion,
                    versionAfter: dto.expectedVersion + 1,
                },
            });
            return tx.maintenanceSchedule.findUnique({ where: { id } });
        });
    }
    async update(id, dto) {
        if (dto.expectedVersion === undefined || dto.expectedVersion === null) {
            throw new common_1.BadRequestException('expectedVersion là bắt buộc');
        }
        return this.prisma.$transaction(async (tx) => {
            const schedule = await tx.maintenanceSchedule.findUnique({ where: { id } });
            if (!schedule)
                throw new common_1.NotFoundException('Không tìm thấy lịch bảo trì');
            if (schedule.status === schedules_constants_1.SCHEDULE_STATUS.COMPLETED || schedule.status === schedules_constants_1.SCHEDULE_STATUS.CANCELLED) {
                throw new common_1.BadRequestException(`Lịch bảo trì ở trạng thái ${schedule.status} không được phép chỉnh sửa`);
            }
            await this.validateActedBy(tx, dto.actedById);
            if (schedule.version !== dto.expectedVersion) {
                throw new common_1.ConflictException('Xung đột đồng thời: Bản ghi đã bị thay đổi bởi người dùng khác.');
            }
            const updateData = {};
            if (dto.title !== undefined)
                updateData.title = dto.title.trim();
            if (dto.description !== undefined)
                updateData.description = dto.description.trim();
            if (dto.estimatedDurationMinutes !== undefined)
                updateData.estimatedDurationMinutes = dto.estimatedDurationMinutes;
            if (dto.defaultPriority !== undefined)
                updateData.defaultPriority = dto.defaultPriority;
            if (dto.autoGenerate !== undefined)
                updateData.autoGenerate = dto.autoGenerate;
            if (dto.leadTimeDays !== undefined)
                updateData.leadTimeDays = dto.leadTimeDays;
            if (dto.notes !== undefined)
                updateData.notes = dto.notes.trim();
            if (dto.assignedTechnicianId !== undefined) {
                if (dto.assignedTechnicianId) {
                    const tech = await tx.user.findUnique({ where: { id: dto.assignedTechnicianId } });
                    if (!tech || !tech.isActive)
                        throw new common_1.BadRequestException('Kỹ thuật viên không tồn tại hoặc đã bị vô hiệu hóa');
                }
                updateData.assignedTechnicianId = dto.assignedTechnicianId || null;
            }
            if (dto.frequencyType !== undefined || dto.frequencyInterval !== undefined || dto.startDate !== undefined) {
                if (dto.frequencyInterval !== undefined && dto.frequencyInterval <= 0) {
                    throw new common_1.BadRequestException('frequencyInterval phải lớn hơn 0');
                }
                const freqType = dto.frequencyType || schedule.frequencyType;
                const freqInterval = dto.frequencyInterval || schedule.frequencyInterval;
                updateData.frequencyType = freqType;
                updateData.frequencyInterval = freqInterval;
                if (dto.startDate) {
                    const sDate = new Date(dto.startDate);
                    updateData.startDate = sDate;
                    updateData.anchorDayOfMonth = sDate.getUTCDate();
                    if (schedule.status === schedules_constants_1.SCHEDULE_STATUS.DRAFT) {
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
                throw new common_1.ConflictException('Xung đột đồng thời khi cập nhật lịch bảo trì.');
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
    async generateWorkOrder(id, dto) {
        if (dto.expectedVersion === undefined || dto.expectedVersion === null) {
            throw new common_1.BadRequestException('expectedVersion là bắt buộc');
        }
        return this.prisma.$transaction(async (tx) => {
            const schedule = await tx.maintenanceSchedule.findUnique({
                where: { id },
                include: { equipment: true, assignedTechnician: true },
            });
            if (!schedule)
                throw new common_1.NotFoundException('Không tìm thấy lịch bảo trì');
            if (schedule.status !== schedules_constants_1.SCHEDULE_STATUS.ACTIVE) {
                throw new common_1.BadRequestException(`Không thể phát sinh Work Order từ lịch ở trạng thái ${schedule.status}`);
            }
            if (!schedule.equipment || !schedule.equipment.isActive) {
                throw new common_1.BadRequestException('Thiết bị gắn liền với lịch không tồn tại hoặc đã bị vô hiệu hóa');
            }
            await this.validateActedBy(tx, dto.actedById);
            let scheduledDueDate = dto.dueDate ? new Date(dto.dueDate) : (schedule.nextDueDate || new Date());
            let scheduledDueMeter = schedule.nextDueMeter;
            let generationKey = '';
            if (schedule.frequencyType === schedules_constants_1.SCHEDULE_FREQUENCY_TYPE.OPERATING_HOURS) {
                if (schedule.equipment.currentOperatingHours < (schedule.nextDueMeter || 0)) {
                    throw new common_1.BadRequestException(`Thiết bị chưa đạt số giờ vận hành đến hạn (${schedule.equipment.currentOperatingHours} / ${schedule.nextDueMeter})`);
                }
                const roundedMeter = Math.round(schedule.nextDueMeter || 0);
                generationKey = `${id}:METER:${roundedMeter}`;
            }
            else {
                generationKey = `${id}:DATE:${scheduledDueDate.toISOString()}`;
            }
            const existingWO = await tx.workOrder.findUnique({
                where: { generationKey },
            });
            if (existingWO) {
                return existingWO;
            }
            if (schedule.version !== dto.expectedVersion) {
                throw new common_1.ConflictException('Xung đột đồng thời: Bản ghi đã bị thay đổi bởi người dùng khác.');
            }
            const woCount = await tx.workOrder.count();
            const orderCode = `WO-MS-${(woCount + 1).toString().padStart(4, '0')}`;
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
            let nextDueDate = schedule.nextDueDate;
            let nextDueMeter = schedule.nextDueMeter;
            let lastTriggerMeter = schedule.lastTriggerMeter;
            if (schedule.frequencyType === schedules_constants_1.SCHEDULE_FREQUENCY_TYPE.OPERATING_HOURS) {
                lastTriggerMeter = schedule.nextDueMeter;
                nextDueMeter = (schedule.nextDueMeter || 0) + schedule.frequencyInterval;
            }
            else {
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
                throw new common_1.ConflictException('Xung đột đồng thời khi phát sinh Work Order.');
            }
            await tx.scheduleHistory.create({
                data: {
                    scheduleId: id,
                    action: 'GENERATE_WORK_ORDER',
                    fromStatus: schedules_constants_1.SCHEDULE_STATUS.ACTIVE,
                    toStatus: schedules_constants_1.SCHEDULE_STATUS.ACTIVE,
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
    async processDueSchedules(actedById, referenceTimeInput) {
        if (actedById) {
            const user = await this.prisma.user.findUnique({ where: { id: actedById.trim() } });
            if (!user || !user.isActive || (user.role !== 'ADMIN' && user.role !== 'MANAGER' && user.role !== 'TECHNICIAN')) {
                throw new common_1.ForbiddenException('Truy cập bị từ chối: Chỉ người dùng hệ thống/quản trị mới có quyền thực hiện process-due');
            }
        }
        const referenceTime = referenceTimeInput ? new Date(referenceTimeInput) : new Date();
        const activeSchedules = await this.prisma.maintenanceSchedule.findMany({
            where: {
                status: schedules_constants_1.SCHEDULE_STATUS.ACTIVE,
                autoGenerate: true,
                equipment: { isActive: true },
            },
            take: 100,
            include: { equipment: true, assignedTechnician: true },
        });
        const summary = {
            scanned: activeSchedules.length,
            generated: 0,
            skipped: 0,
            failed: 0,
            errors: [],
        };
        for (const schedule of activeSchedules) {
            try {
                let isDue = false;
                if (schedule.frequencyType === schedules_constants_1.SCHEDULE_FREQUENCY_TYPE.OPERATING_HOURS) {
                    if (schedule.nextDueMeter !== null && schedule.equipment.currentOperatingHours >= schedule.nextDueMeter) {
                        isDue = true;
                    }
                }
                else if (schedule.nextDueDate) {
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
            }
            catch (err) {
                summary.failed++;
                summary.errors.push(`Schedule ${schedule.scheduleCode}: ${err.message || 'Error generating WO'}`);
            }
        }
        return summary;
    }
    async onWorkOrderClosed(workOrderId) {
        const wo = await this.prisma.workOrder.findUnique({ where: { id: workOrderId } });
        if (!wo || !wo.scheduleId)
            return;
        const schedule = await this.prisma.maintenanceSchedule.findUnique({ where: { id: wo.scheduleId } });
        if (!schedule)
            return;
        const closedAt = wo.closedAt || new Date();
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
    async findAll(query) {
        const where = {};
        if (query?.status)
            where.status = query.status;
        if (query?.equipmentId)
            where.equipmentId = query.equipmentId;
        if (query?.frequencyType)
            where.frequencyType = query.frequencyType;
        if (query?.assignedTechnicianId)
            where.assignedTechnicianId = query.assignedTechnicianId;
        if (query?.search) {
            where.OR = [
                { title: { contains: query.search } },
                { scheduleCode: { contains: query.search } },
                { equipment: { name: { contains: query.search } } },
            ];
        }
        if (query?.dueFrom || query?.dueTo) {
            where.nextDueDate = {};
            if (query.dueFrom)
                where.nextDueDate.gte = new Date(query.dueFrom);
            if (query.dueTo)
                where.nextDueDate.lte = new Date(query.dueTo);
        }
        if (query?.overdue === true || query?.overdue === 'true') {
            where.status = schedules_constants_1.SCHEDULE_STATUS.ACTIVE;
            where.nextDueDate = { lt: new Date() };
        }
        const page = Math.max(1, parseInt(query?.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(query?.limit) || 10));
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
    async findOne(id) {
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
        if (!schedule)
            throw new common_1.NotFoundException('Không tìm thấy lịch bảo trì');
        const now = new Date();
        const leadMs = (schedule.leadTimeDays || 0) * 24 * 60 * 60 * 1000;
        const isOverdue = schedule.status === schedules_constants_1.SCHEDULE_STATUS.ACTIVE && schedule.nextDueDate !== null && schedule.nextDueDate < now;
        const isDueSoon = schedule.status === schedules_constants_1.SCHEDULE_STATUS.ACTIVE &&
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
    async getHistory(id) {
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
    async triggerWorkOrder(id, expectedVersion) {
        const adminUser = await this.prisma.user.findFirst({ where: { isActive: true } });
        return this.generateWorkOrder(id, {
            expectedVersion,
            actedById: adminUser?.id || 'user-id',
        });
    }
    async remove(id) {
        const schedule = await this.findOne(id);
        if (schedule.status === schedules_constants_1.SCHEDULE_STATUS.ACTIVE || schedule.status === schedules_constants_1.SCHEDULE_STATUS.PAUSED) {
            throw new common_1.ConflictException('Không thể xóa lịch bảo trì đang ACTIVE hoặc PAUSED. Hãy hủy (CANCEL) trước.');
        }
        if (schedule.workOrders.length > 0) {
            throw new common_1.ConflictException('Không thể xóa lịch bảo trì đã phát sinh Work Order.');
        }
        const historyCount = await this.prisma.scheduleHistory.count({ where: { scheduleId: id } });
        if (historyCount > 0) {
            throw new common_1.ConflictException('Không thể xóa Lịch bảo trì đã có lịch sử thao tác (ScheduleHistory).');
        }
        return this.prisma.maintenanceSchedule.delete({ where: { id } });
    }
};
exports.SchedulesService = SchedulesService;
exports.SchedulesService = SchedulesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SchedulesService);
//# sourceMappingURL=schedules.service.js.map