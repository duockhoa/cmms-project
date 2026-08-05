import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateChecklistExecutionDto } from './dto/create-checklist-execution.dto';
import { PatchChecklistItemDto } from './dto/patch-checklist-item.dto';
import { CompleteChecklistExecutionDto } from './dto/complete-checklist-execution.dto';
import { CancelChecklistExecutionDto } from './dto/cancel-checklist-execution.dto';
import { ChecklistItemStatus, ChecklistExecutionStatus } from '@prisma/client';

@Injectable()
export class ChecklistExecutionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createExecution(workOrderId: string, dto: CreateChecklistExecutionDto) {
    return this.prisma.$transaction(async (tx) => {
      const wo = await tx.workOrder.findUnique({
        where: { id: workOrderId },
      });
      if (!wo) {
        throw new NotFoundException(`Không tìm thấy Work Order với ID: ${workOrderId}`);
      }

      if (wo.status === 'CANCELLED' || wo.status === 'CLOSED') {
        throw new BadRequestException(`Không thể tạo checklist cho Work Order ở trạng thái ${wo.status}.`);
      }

      if (dto.executedById) {
        const user = await tx.user.findUnique({
          where: { id: dto.executedById },
        });
        if (!user) {
          throw new BadRequestException('Kỹ thuật viên thực hiện không tồn tại.');
        }
        if (!user.isActive) {
          throw new BadRequestException('Kỹ thuật viên thực hiện đã ngừng hoạt động.');
        }
      }

      let checklistItems: string[] = [];

      if (dto.checklistItems && dto.checklistItems.length > 0) {
        checklistItems = dto.checklistItems;
      } else if (wo.scheduleId) {
        const schedule = await tx.maintenanceSchedule.findUnique({
          where: { id: wo.scheduleId },
        });
        if (!schedule) {
          throw new NotFoundException('Không tìm thấy lịch bảo trì liên kết của Work Order này.');
        }
        try {
          checklistItems = JSON.parse(schedule.checklistJson);
        } catch (e) {
          throw new BadRequestException('Mẫu checklist của lịch bảo trì không đúng định dạng JSON.');
        }
      } else {
        throw new BadRequestException('Vui lòng cung cấp danh sách checklist hoặc tạo từ lịch bảo trì định kỳ.');
      }

      // Create ChecklistExecution
      const execution = await tx.checklistExecution.create({
        data: {
          workOrderId,
          executedById: dto.executedById || null,
          templateVersion: dto.templateVersion || 1,
          status: ChecklistExecutionStatus.DRAFT,
          result: null,
        },
      });

      // Create ChecklistExecutionItems
      const itemsData = checklistItems.map((itemText, idx) => ({
        executionId: execution.id,
        itemIndex: idx,
        itemText,
        status: ChecklistItemStatus.NOT_CHECKED,
      }));

      await tx.checklistExecutionItem.createMany({
        data: itemsData,
      });

      return tx.checklistExecution.findUnique({
        where: { id: execution.id },
        include: { items: true, executedBy: true },
      });
    });
  }

  async getExecutionsForWorkOrder(workOrderId: string) {
    return this.prisma.checklistExecution.findMany({
      where: { workOrderId },
      include: { items: true, executedBy: true },
      orderBy: { startedAt: 'desc' },
    });
  }

  async getExecutionById(executionId: string) {
    const execution = await this.prisma.checklistExecution.findUnique({
      where: { id: executionId },
      include: { items: true, executedBy: true },
    });
    if (!execution) {
      throw new NotFoundException(`Không tìm thấy Checklist Execution với ID: ${executionId}`);
    }
    return execution;
  }

  async updateItem(executionId: string, dto: PatchChecklistItemDto) {
    return this.prisma.$transaction(async (tx) => {
      const execution = await tx.checklistExecution.findUnique({
        where: { id: executionId },
      });
      if (!execution) {
        throw new NotFoundException(`Không tìm thấy Checklist Execution với ID: ${executionId}`);
      }

      if (execution.status !== ChecklistExecutionStatus.DRAFT) {
        throw new BadRequestException('Chỉ được phép cập nhật đầu mục khi Checklist ở trạng thái nháp (DRAFT).');
      }

      if (execution.version !== dto.expectedVersion) {
        throw new ConflictException('Xung đột đồng thời: Checklist đã bị thay đổi bởi phiên làm việc khác.');
      }

      // Validation: FAILED must have comment
      if (dto.status === ChecklistItemStatus.FAILED && (!dto.comment || dto.comment.trim() === '')) {
        throw new BadRequestException('FAILED items must have an explanatory comment');
      }

      // Update Item
      const item = await tx.checklistExecutionItem.findFirst({
        where: { executionId, itemIndex: dto.itemIndex },
      });
      if (!item) {
        throw new NotFoundException(`Không tìm thấy đầu mục checklist với chỉ số Index: ${dto.itemIndex}`);
      }

      await tx.checklistExecutionItem.update({
        where: { id: item.id },
        data: {
          status: dto.status,
          comment: dto.comment || null,
        },
      });

      // Increment execution version
      try {
        return await tx.checklistExecution.update({
          where: { id: executionId, version: dto.expectedVersion },
          data: {
            version: { increment: 1 },
          },
          include: { items: true, executedBy: true },
        });
      } catch (err: any) {
        if (err.code === 'P2025') {
          throw new ConflictException('Xung đột đồng thời: Checklist đã bị thay đổi bởi phiên làm việc khác.');
        }
        throw err;
      }
    });
  }

  async completeExecution(executionId: string, dto: CompleteChecklistExecutionDto) {
    return this.prisma.$transaction(async (tx) => {
      const execution = await tx.checklistExecution.findUnique({
        where: { id: executionId },
        include: { items: true },
      });
      if (!execution) {
        throw new NotFoundException(`Không tìm thấy Checklist Execution với ID: ${executionId}`);
      }

      if (execution.status !== ChecklistExecutionStatus.DRAFT) {
        throw new BadRequestException('Checklist đã hoàn thành hoặc hủy trước đó.');
      }

      if (execution.version !== dto.expectedVersion) {
        throw new ConflictException('Xung đột đồng thời: Checklist đã bị thay đổi bởi phiên làm việc khác.');
      }

      // Check NOT_CHECKED
      const hasNotChecked = execution.items.some((item) => item.status === ChecklistItemStatus.NOT_CHECKED);
      if (hasNotChecked) {
        throw new BadRequestException('Vui lòng hoàn thành kiểm tra toàn bộ đầu mục trước khi lưu kết quả.');
      }

      // Check all-NA rule: cannot complete if every single item is NA
      const allNA = execution.items.length > 0 && execution.items.every((item) => item.status === ChecklistItemStatus.NA);
      if (allNA) {
        throw new BadRequestException('Không thể hoàn tất checklist khi toàn bộ đầu mục đều là Không áp dụng (NA).');
      }

      // Compute result
      const hasFailed = execution.items.some((item) => item.status === ChecklistItemStatus.FAILED);
      const result = hasFailed ? 'FAILED' : 'PASSED';

      try {
        return await tx.checklistExecution.update({
          where: { id: executionId, version: dto.expectedVersion },
          data: {
            status: ChecklistExecutionStatus.COMPLETED,
            result: result,
            completedAt: new Date(),
            version: { increment: 1 },
          },
          include: { items: true, executedBy: true },
        });
      } catch (err: any) {
        if (err.code === 'P2025') {
          throw new ConflictException('Xung đột đồng thời: Checklist đã bị thay đổi bởi phiên làm việc khác.');
        }
        throw err;
      }
    });
  }

  async cancelExecution(executionId: string, dto: CancelChecklistExecutionDto) {
    return this.prisma.$transaction(async (tx) => {
      const execution = await tx.checklistExecution.findUnique({
        where: { id: executionId },
      });
      if (!execution) {
        throw new NotFoundException(`Không tìm thấy Checklist Execution với ID: ${executionId}`);
      }

      if (execution.status !== ChecklistExecutionStatus.DRAFT) {
        throw new BadRequestException('Chỉ được phép hủy Checklist ở trạng thái nháp (DRAFT). Trạng thái hiện tại: ' + execution.status);
      }

      if (execution.version !== dto.expectedVersion) {
        throw new ConflictException('Xung đột đồng thời: Checklist đã bị thay đổi bởi phiên làm việc khác.');
      }

      if (!dto.reason || dto.reason.trim() === '') {
        throw new BadRequestException('Lý do hủy (reason) là bắt buộc.');
      }

      try {
        return await tx.checklistExecution.update({
          where: { id: executionId, version: dto.expectedVersion },
          data: {
            status: ChecklistExecutionStatus.CANCELLED,
            cancelReason: dto.reason.trim(),
            cancelledAt: new Date(),
            cancelledById: dto.cancelledById || null,
            version: { increment: 1 },
          },
          include: { items: true, executedBy: true },
        });
      } catch (err: any) {
        if (err.code === 'P2025') {
          throw new ConflictException('Xung đột đồng thời: Checklist đã bị thay đổi bởi phiên làm việc khác.');
        }
        throw err;
      }
    });
  }
}
