import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../notifications.service';
import { MailService } from '../../mail/mail.service';
import { NotificationEvents } from '../events/notification-events.constants';
import {
  RequestCreatedEvent,
  RequestApprovedEvent,
  RequestRejectedEvent,
  RequestReturnedEvent,
} from '../events/request.events';
import { WorkOrderStatusChangedEvent } from '../events/work-order.events';
import { FabricationAssignedEvent, FabricationUpdatedEvent } from '../events/fabrication.events';
import { ScheduleWorkOrderGeneratedEvent } from '../events/schedule.events';
import { InventoryLowStockEvent } from '../events/inventory.events';

@Injectable()
export class NotificationEventListener {
  private readonly logger = new Logger(NotificationEventListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly mailService: MailService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. MAINTENANCE REQUESTS
  // ═══════════════════════════════════════════════════════════════════════════

  @OnEvent(NotificationEvents.REQUEST_CREATED, { async: true })
  async handleRequestCreated(event: RequestCreatedEvent) {
    try {
      const { request, equipment } = event;
      if (!equipment) return;

      const location = await this.prisma.location.findFirst({
        where: { name: equipment.location },
      });

      if (!location) return;

      // In-App: Notify managers of this department
      await this.notifications.createNotification(
        null,
        'MANAGER',
        location.name,
        `Sự cố mới: ${request.requestCode}`,
        `Thiết bị ${equipment.name} gặp sự cố: ${request.title}. Vui lòng đánh giá phương án xử lý.`,
      );

      // In-App: Notify responsible technician of this location
      if (location.responsibleTechId) {
        await this.notifications.createNotification(
          location.responsibleTechId,
          null,
          null,
          `Sự cố mới: ${request.requestCode}`,
          `Phân xưởng ${location.name} báo sự cố thiết bị ${equipment.name}: ${request.title}.`,
        );
      }

      // Email: Responsible Tech & Department Managers
      const targetEmails: string[] = [];
      if (location.responsibleTechId) {
        const tech = await this.prisma.user.findUnique({ where: { id: location.responsibleTechId } });
        if (tech?.email) targetEmails.push(tech.email);
      }
      const managers = await this.prisma.user.findMany({
        where: {
          OR: [{ role: 'MANAGER', department: location.name }, { role: 'ADMIN' }],
          isActive: true,
        },
        select: { email: true },
      });
      targetEmails.push(...managers.map((m) => m.email));
      const uniqueEmails = Array.from(new Set(targetEmails)).filter(Boolean);

      if (uniqueEmails.length > 0) {
        await this.mailService.sendDkPharmaEmail({
          to: uniqueEmails,
          subject: `[Sự cố mới] ${request.requestCode} - ${equipment.name} (${location.name})`,
          title: 'Báo cáo sự cố thiết bị mới',
          badgeText: 'CHỜ ĐÁNH GIÁ',
          badgeColor: 'amber',
          summaryMessage: `Hệ thống vừa ghi nhận sự cố mới từ phân xưởng ${location.name}. Vui lòng kiểm tra và duyệt phương án xử lý.`,
          metadata: [
            { label: 'Mã sự cố', value: request.requestCode },
            { label: 'Thiết bị', value: `${equipment.name} (${equipment.code})` },
            { label: 'Phân xưởng', value: location.name },
            { label: 'Mức độ ưu tiên', value: request.priority || 'MEDIUM' },
            { label: 'Người báo cáo', value: request.reporterName || 'Nhân viên vận hành' },
          ],
          notes: request.description || request.title,
          actionText: 'Xem chi tiết sự cố',
          actionPath: `/requests?id=${request.id}`,
        });
      }
    } catch (err: any) {
      this.logger.error('[EVENT] Error in handleRequestCreated:', err);
    }
  }

  @OnEvent(NotificationEvents.REQUEST_APPROVED, { async: true })
  async handleRequestApproved(event: RequestApprovedEvent) {
    try {
      const { requestId, workOrder, isExternalTransfer, targetDepartment } = event;
      const request = await this.prisma.maintenanceRequest.findUnique({
        where: { id: requestId },
        include: { equipment: true, reporter: true },
      });
      if (!request) return;

      const orderCode = workOrder.orderCode;

      if (isExternalTransfer) {
        const targetDept = targetDepartment || 'Bộ phận kỹ thuật';
        await this.notifications.createNotification(
          null,
          'MANAGER',
          targetDept,
          `Phiếu bảo trì mới chờ phân công: ${orderCode}`,
          `Yêu cầu sửa chữa ${request.requestCode} (${request.equipment.name}) đã chuyển đến ${targetDept}. Vui lòng phân công kỹ thuật viên thực hiện.`,
        );

        const targetManagers = await this.prisma.user.findMany({
          where: {
            OR: [{ role: 'MANAGER', department: { contains: targetDept } }, { role: 'ADMIN' }],
            isActive: true,
          },
          select: { email: true },
        });
        const targetEmails = Array.from(new Set(targetManagers.map((m) => m.email))).filter(Boolean);
        if (targetEmails.length > 0) {
          await this.mailService.sendDkPharmaEmail({
            to: targetEmails,
            subject: `[Điều chuyển sự cố] Phiếu ${orderCode} chuyển đến ${targetDept}`,
            title: 'Phiếu bảo trì mới chờ phân công',
            badgeText: 'CHUYỂN KỸ THUẬT',
            badgeColor: 'blue',
            summaryMessage: `Yêu cầu sửa chữa ${request.requestCode} từ ${request.equipment.location} đã được chuyển đến bộ phận ${targetDept}.`,
            metadata: [
              { label: 'Mã phiếu bảo trì', value: orderCode },
              { label: 'Mã sự cố gốc', value: request.requestCode },
              { label: 'Thiết bị', value: `${request.equipment.name} (${request.equipment.code})` },
              { label: 'Bộ phận nhận', value: targetDept },
            ],
            actionText: 'Xem phiếu bảo trì',
            actionPath: `/work-orders?id=${workOrder.id}`,
          });
        }
      } else if (workOrder.assignedTechnicianId || workOrder.technicianName) {
        let techId = workOrder.assignedTechnicianId;
        let techUser: any = null;
        if (techId) {
          techUser = await this.prisma.user.findUnique({ where: { id: techId } });
        } else if (workOrder.technicianName) {
          techUser = await this.prisma.user.findFirst({ where: { name: workOrder.technicianName } });
          if (techUser) techId = techUser.id;
        }

        if (techId) {
          await this.notifications.createNotification(
            techId,
            null,
            null,
            `Phiếu bảo trì mới được phân công: ${orderCode}`,
            `Bạn được phân công xử lý phiếu bảo trì ${orderCode} cho thiết bị ${request.equipment.name}.`,
          );

          if (techUser?.email) {
            await this.mailService.sendDkPharmaEmail({
              to: techUser.email,
              recipientName: techUser.name,
              subject: `[Phân công xử lý] Phiếu bảo trì ${orderCode} - ${request.equipment.name}`,
              title: 'Phân công nhiệm vụ bảo trì',
              badgeText: 'PHÂN CÔNG MỚI',
              badgeColor: 'blue',
              summaryMessage: `Bạn vừa được phân công xử lý phiếu bảo trì ${orderCode} cho thiết bị ${request.equipment.name}.`,
              metadata: [
                { label: 'Mã phiếu bảo trì', value: orderCode },
                { label: 'Mã sự cố gốc', value: request.requestCode },
                { label: 'Thiết bị', value: `${request.equipment.name} (${request.equipment.code})` },
                { label: 'Vị trí/Xưởng', value: request.equipment.location },
                { label: 'Mức độ ưu tiên', value: request.priority },
                {
                  label: 'Hạn dự kiến',
                  value: workOrder.plannedEndDate
                    ? new Date(workOrder.plannedEndDate).toLocaleDateString('vi-VN')
                    : 'Trong ngày',
                },
              ],
              actionText: 'Xem phiếu bảo trì',
              actionPath: `/work-orders?id=${workOrder.id}`,
            });
          }
        }
      }

      // Email to Reporter confirming approval
      if (request.reporter?.email) {
        await this.mailService.sendDkPharmaEmail({
          to: request.reporter.email,
          recipientName: request.reporter.name,
          subject: `[Yêu cầu đã duyệt] ${request.requestCode} - Khởi tạo phiếu bảo trì ${orderCode}`,
          title: 'Yêu cầu sự cố đã được phê duyệt',
          badgeText: 'ĐÃ PHÊ DUYỆT',
          badgeColor: 'green',
          summaryMessage: `Yêu cầu xử lý sự cố ${request.requestCode} của bạn đã được phê duyệt và khởi tạo phiếu sửa chữa ${orderCode}.`,
          metadata: [
            { label: 'Mã sự cố', value: request.requestCode },
            { label: 'Mã phiếu bảo trì', value: orderCode },
            { label: 'Thiết bị', value: `${request.equipment.name} (${request.equipment.code})` },
            { label: 'Kỹ thuật viên', value: workOrder.technicianName || 'Đang điều phối' },
          ],
          actionText: 'Theo dõi sự cố',
          actionPath: `/requests?id=${request.id}`,
        });
      }
    } catch (err: any) {
      this.logger.error('[EVENT] Error in handleRequestApproved:', err);
    }
  }

  @OnEvent(NotificationEvents.REQUEST_REJECTED, { async: true })
  async handleRequestRejected(event: RequestRejectedEvent) {
    try {
      const { requestId, reason } = event;
      const fullReq = await this.prisma.maintenanceRequest.findUnique({
        where: { id: requestId },
        include: { equipment: true, reporter: true },
      });
      if (!fullReq) return;

      if (fullReq.reporterId) {
        await this.notifications.createNotification(
          fullReq.reporterId,
          null,
          null,
          `Yêu cầu bị từ chối: ${fullReq.requestCode}`,
          `Yêu cầu báo sự cố thiết bị ${fullReq.equipment.name} đã bị từ chối. Lý do: ${reason || 'Không đủ điều kiện'}.`,
        );
      }

      if (fullReq.reporter?.email) {
        await this.mailService.sendDkPharmaEmail({
          to: fullReq.reporter.email,
          recipientName: fullReq.reporter.name,
          subject: `[Từ chối yêu cầu] ${fullReq.requestCode} - ${fullReq.equipment.name}`,
          title: 'Yêu cầu sự cố đã bị từ chối',
          badgeText: 'TỪ CHỐI',
          badgeColor: 'red',
          summaryMessage: `Yêu cầu xử lý sự cố ${fullReq.requestCode} không được phê duyệt.`,
          metadata: [
            { label: 'Mã sự cố', value: fullReq.requestCode },
            { label: 'Thiết bị', value: `${fullReq.equipment.name} (${fullReq.equipment.code})` },
            { label: 'Lý do từ chối', value: reason || 'Chưa đủ điều kiện xử lý' },
          ],
          notes: 'Vui lòng kiểm tra lại thông tin thiết bị hoặc trao đổi trực tiếp với quản lý phân xưởng.',
          actionText: 'Xem chi tiết sự cố',
          actionPath: `/requests?id=${fullReq.id}`,
        });
      }
    } catch (err: any) {
      this.logger.error('[EVENT] Error in handleRequestRejected:', err);
    }
  }

  @OnEvent(NotificationEvents.REQUEST_RETURNED, { async: true })
  async handleRequestReturned(event: RequestReturnedEvent) {
    try {
      const { requestId, reason } = event;
      const fullReq = await this.prisma.maintenanceRequest.findUnique({
        where: { id: requestId },
        include: { equipment: true, reporter: true },
      });
      if (!fullReq) return;

      if (fullReq.reporterId) {
        await this.notifications.createNotification(
          fullReq.reporterId,
          null,
          null,
          `Yêu cầu cần bổ sung thông tin: ${fullReq.requestCode}`,
          `Yêu cầu ${fullReq.requestCode} đã được trả lại để bổ sung thông tin. Lý do: ${reason}.`,
        );
      }

      if (fullReq.reporter?.email) {
        await this.mailService.sendDkPharmaEmail({
          to: fullReq.reporter.email,
          recipientName: fullReq.reporter.name,
          subject: `[Yêu cầu trả lại] ${fullReq.requestCode} - Cần bổ sung thông tin`,
          title: 'Yêu cầu sự cố được trả lại',
          badgeText: 'CẦN BỔ SUNG',
          badgeColor: 'amber',
          summaryMessage: `Yêu cầu xử lý sự cố ${fullReq.requestCode} được trả lại để quý bộ phận bổ sung hoặc làm rõ thông tin.`,
          metadata: [
            { label: 'Mã sự cố', value: fullReq.requestCode },
            { label: 'Thiết bị', value: `${fullReq.equipment.name} (${fullReq.equipment.code})` },
            { label: 'Lý do trả lại', value: reason },
          ],
          notes: 'Vui lòng kiểm tra lại thông tin thiết bị hoặc làm rõ các chi tiết theo yêu cầu.',
          actionText: 'Bổ sung thông tin',
          actionPath: `/requests?id=${fullReq.id}`,
        });
      }
    } catch (err: any) {
      this.logger.error('[EVENT] Error in handleRequestReturned:', err);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. WORK ORDERS
  // ═══════════════════════════════════════════════════════════════════════════

  @OnEvent(NotificationEvents.WORK_ORDER_STATUS_CHANGED, { async: true })
  async handleWorkOrderStatusChanged(event: WorkOrderStatusChangedEvent) {
    try {
      const { workOrder: wo, actionName, comment, reason } = event;
      if (!wo) return;

      const orderCode = wo.orderCode;
      const equipName = wo.equipment ? `${wo.equipment.name} (${wo.equipment.code})` : 'Thiết bị';
      const locationName = wo.equipment?.location || 'Phân xưởng';

      // 1. ASSIGN / REASSIGN (Đẩy thông báo và Email đến tất cả nhân sự được phân công)
      if (actionName === 'ASSIGN' && (wo.assignedTechnicianId || wo.technicianName || wo.assignedTechnicianIds)) {
        const targetUserIds = new Set<string>();
        if (wo.assignedTechnicianId) targetUserIds.add(wo.assignedTechnicianId);

        // Danh sách ID kỹ thuật viên
        if (wo.assignedTechnicianIds) {
          try {
            const parsed = typeof wo.assignedTechnicianIds === 'string'
              ? JSON.parse(wo.assignedTechnicianIds)
              : wo.assignedTechnicianIds;
            if (Array.isArray(parsed)) parsed.forEach((id: any) => id && targetUserIds.add(String(id)));
          } catch {}
        }

        // Danh sách ID người hỗ trợ phối hợp
        if (wo.supporterIds) {
          try {
            const parsed = typeof wo.supporterIds === 'string'
              ? JSON.parse(wo.supporterIds)
              : wo.supporterIds;
            if (Array.isArray(parsed)) parsed.forEach((id: any) => id && targetUserIds.add(String(id)));
          } catch {}
        }

        // Dự phòng: Nếu chưa có ID mà có technicianName dạng nối tên
        if (targetUserIds.size === 0 && wo.technicianName) {
          const names = String(wo.technicianName).split(',').map((n: string) => n.trim()).filter(Boolean);
          const matchedUsers = await this.prisma.user.findMany({ where: { name: { in: names } } });
          matchedUsers.forEach((u) => targetUserIds.add(u.id));
        }

        if (targetUserIds.size > 0) {
          const techUsers = await this.prisma.user.findMany({
            where: { id: { in: Array.from(targetUserIds) } },
          });

          for (const techUser of techUsers) {
            await this.notifications.createNotification(
              techUser.id,
              null,
              null,
              `Phân công phiếu bảo trì: ${orderCode}`,
              `Bạn được phân công tham gia xử lý phiếu bảo trì ${orderCode} cho thiết bị ${equipName}.`,
            );

            if (techUser.email) {
              await this.mailService.sendDkPharmaEmail({
                to: techUser.email,
                recipientName: techUser.name,
                subject: `[Phân công xử lý] Phiếu bảo trì ${orderCode} - ${equipName}`,
                title: 'Phân công nhiệm vụ bảo trì',
                badgeText: 'PHÂN CÔNG MỚI',
                badgeColor: 'blue',
                summaryMessage: `Bạn vừa được phân công tham gia xử lý phiếu bảo trì ${orderCode} cho thiết bị ${equipName}.`,
                metadata: [
                  { label: 'Mã phiếu', value: orderCode },
                  { label: 'Thiết bị', value: equipName },
                  { label: 'Vị trí/Xưởng', value: locationName },
                  { label: 'Mức độ ưu tiên', value: wo.priority },
                  {
                    label: 'Hạn hoàn thành',
                    value: wo.plannedEndDate ? new Date(wo.plannedEndDate).toLocaleDateString('vi-VN') : 'Trong ngày',
                  },
                ],
                notes: wo.description,
                actionText: 'Xem phiếu bảo trì',
                actionPath: `/work-orders?id=${wo.id}`,
              });
            }
          }
        }
      }

      // 2. COMPLETE / HANDOVER_SUBMIT (KTV hoàn thành -> Nghiệm thu nội bộ)
      else if (actionName === 'COMPLETE' || actionName === 'HANDOVER_SUBMIT') {
        // Low stock warning for any items used that dropped below minQuantity
        if (wo.items && wo.items.length > 0) {
          for (const item of wo.items) {
            if (item.inventoryItem && item.inventoryItem.quantity <= item.inventoryItem.minQuantity) {
              await this.handleInventoryLowStock(new InventoryLowStockEvent(item.inventoryItem));
            }
          }
        }

        // Notify workshop manager & reporter
        await this.notifications.createNotification(
          null,
          'MANAGER',
          locationName,
          `Đề nghị nghiệm thu bàn giao: ${orderCode}`,
          `Kỹ thuật viên đã hoàn thành xử lý sự cố thiết bị ${equipName}. Kính mời Quản đốc và Người báo sự cố kiểm tra chạy thử & nghiệm thu.`,
        );

        if (wo.request?.reporterId) {
          await this.notifications.createNotification(
            wo.request.reporterId,
            null,
            null,
            `Thiết bị đã được sửa chữa: ${orderCode}`,
            `Thiết bị ${equipName} đã được khắc phục. Mời bạn kiểm tra nghiệm thu.`,
          );
        }

        const managers = await this.prisma.user.findMany({
          where: {
            OR: [{ role: 'MANAGER', department: locationName }, { role: 'ADMIN' }],
            isActive: true,
          },
          select: { email: true },
        });

        const targetEmails = managers.map((m) => m.email);
        if (wo.request?.reporterId) {
          const reporter = await this.prisma.user.findUnique({ where: { id: wo.request.reporterId } });
          if (reporter?.email) targetEmails.push(reporter.email);
        }
        const uniqueEmails = Array.from(new Set(targetEmails)).filter(Boolean);

        if (uniqueEmails.length > 0) {
          await this.mailService.sendDkPharmaEmail({
            to: uniqueEmails,
            subject: `[Đề nghị nghiệm thu] Phiếu bảo trì ${orderCode} - ${equipName}`,
            title: 'Yêu cầu nghiệm thu bàn giao thiết bị',
            badgeText: 'CHỜ NGHIỆM THU',
            badgeColor: 'amber',
            summaryMessage: `Kỹ thuật viên đã hoàn tất sửa chữa thiết bị ${equipName} tại phân xưởng ${locationName}. Kính mời phụ trách phân xưởng kiểm tra chạy thử và ký biên bản bàn giao.`,
            metadata: [
              { label: 'Mã phiếu', value: orderCode },
              { label: 'Thiết bị', value: equipName },
              { label: 'Phân xưởng', value: locationName },
              { label: 'Kỹ thuật viên', value: wo.technicianName || 'KTV Cơ điện' },
            ],
            notes: comment || 'Đã sửa chữa xong, thiết bị sẵn sàng chạy thử.',
            actionText: 'Nghiệm thu phiếu bảo trì',
            actionPath: `/work-orders?id=${wo.id}`,
          });
        }
      }

      // 3. HANDOVER_ACCEPT (Nghiệm thu nội bộ đạt -> Chuyển QA thẩm định)
      else if (actionName === 'HANDOVER_ACCEPT') {
        await this.notifications.createNotification(
          null,
          'MANAGER',
          'QA',
          `Hồ sơ bảo trì chờ thẩm định QA: ${orderCode}`,
          `Phân xưởng ${locationName} đã nghiệm thu đạt phiếu ${orderCode} cho ${equipName}. Đề nghị bộ phận QA thẩm định GMP và cấp phép bàn giao sản xuất.`,
        );

        const qaUsers = await this.prisma.user.findMany({
          where: {
            OR: [
              { role: 'QA' },
              { department: { contains: 'QA' } },
              { department: { contains: 'Đảm bảo chất lượng' } },
              { role: 'ADMIN' },
            ],
            isActive: true,
          },
          select: { email: true },
        });
        const qaEmails = Array.from(new Set(qaUsers.map((u) => u.email))).filter(Boolean);

        if (qaEmails.length > 0) {
          await this.mailService.sendDkPharmaEmail({
            to: qaEmails,
            subject: `[Thẩm định GMP] Phiếu bảo trì ${orderCode} - ${equipName}`,
            title: 'Hồ sơ bảo trì chờ thẩm định chất lượng',
            badgeText: 'CHỜ QA ĐÁNH GIÁ',
            badgeColor: 'purple',
            summaryMessage: `Phiếu bảo trì ${orderCode} (${equipName}) đã vượt qua nghiệm thu chạy thử tại xưởng ${locationName}. Kính mời phòng Đảm bảo chất lượng (QA) đánh giá tác động GMP và xác nhận bàn giao vào sản xuất.`,
            metadata: [
              { label: 'Mã phiếu', value: orderCode },
              { label: 'Thiết bị', value: equipName },
              { label: 'Phân xưởng', value: locationName },
              { label: 'Trạng thái', value: 'Chờ QA thẩm định (INSPECTION)' },
            ],
            notes: comment || 'Xưởng đã nghiệm thu đạt tiêu chuẩn nội bộ.',
            actionText: 'Thẩm định hồ sơ QA',
            actionPath: `/work-orders?id=${wo.id}`,
          });
        }
      }

      // 4. HANDOVER_REJECT (Xưởng từ chối bàn giao -> Yêu cầu sửa lại)
      else if (actionName === 'HANDOVER_REJECT') {
        if (wo.assignedTechnicianId) {
          await this.notifications.createNotification(
            wo.assignedTechnicianId,
            null,
            null,
            `Nghiệm thu KHÔNG ĐẠT: ${orderCode}`,
            `Phân xưởng ${locationName} từ chối nhận bàn giao phiếu ${orderCode}. Lý do: ${reason || 'Không đạt'}.`,
          );

          const tech = await this.prisma.user.findUnique({ where: { id: wo.assignedTechnicianId } });
          if (tech?.email) {
            await this.mailService.sendDkPharmaEmail({
              to: tech.email,
              recipientName: tech.name,
              subject: `[Yêu cầu xử lý lại] Phiếu bảo trì ${orderCode} - ${equipName}`,
              title: 'Nghiệm thu bàn giao không đạt',
              badgeText: 'YÊU CẦU LÀM LẠI',
              badgeColor: 'red',
              summaryMessage: `Quản đốc phân xưởng ${locationName} từ chối bàn giao phiếu ${orderCode} và yêu cầu kỹ thuật viên kiểm tra xử lý lại.`,
              metadata: [
                { label: 'Mã phiếu', value: orderCode },
                { label: 'Thiết bị', value: equipName },
                { label: 'Phân xưởng', value: locationName },
                { label: 'Lý do từ chối', value: reason || 'Chưa đạt yêu cầu kỹ thuật' },
              ],
              notes: 'Vui lòng kiểm tra lại thiết bị và phối hợp với vận hành xưởng để khắc phục triệt để.',
              actionText: 'Xem chi tiết phiếu bảo trì',
              actionPath: `/work-orders?id=${wo.id}`,
            });
          }
        }
      }

      // 5. QA_VERIFY / VERIFY (QA thẩm định đạt -> Hoàn tất nghiệm thu)
      else if (actionName === 'QA_VERIFY' || actionName === 'VERIFY') {
        if (wo.assignedTechnicianId) {
          await this.notifications.createNotification(
            wo.assignedTechnicianId,
            null,
            null,
            `Nghiệm thu thành công: ${orderCode}`,
            `Phiếu bảo trì ${orderCode} (${equipName}) đã được QA thẩm định và xác nhận đạt chuẩn.`,
          );
        }

        const targetEmails: string[] = [];
        if (wo.assignedTechnicianId) {
          const tech = await this.prisma.user.findUnique({ where: { id: wo.assignedTechnicianId } });
          if (tech?.email) targetEmails.push(tech.email);
        }
        if (wo.request?.reporterId) {
          const reporter = await this.prisma.user.findUnique({ where: { id: wo.request.reporterId } });
          if (reporter?.email) targetEmails.push(reporter.email);
        }

        const managers = await this.prisma.user.findMany({
          where: {
            OR: [{ role: 'MANAGER', department: locationName }, { role: 'ADMIN' }],
            isActive: true,
          },
          select: { email: true },
        });
        targetEmails.push(...managers.map((m) => m.email));
        const uniqueEmails = Array.from(new Set(targetEmails)).filter(Boolean);

        if (uniqueEmails.length > 0) {
          await this.mailService.sendDkPharmaEmail({
            to: uniqueEmails,
            subject: `[Nghiệm thu hoàn tất] Phiếu bảo trì ${orderCode} - ${equipName}`,
            title: 'Nghiệm thu chất lượng hoàn tất',
            badgeText: 'ĐÃ NGHIỆM THU',
            badgeColor: 'green',
            summaryMessage: `Phiếu bảo trì ${orderCode} cho thiết bị ${equipName} đã được thẩm định đạt và cấp phép bàn giao lại cho sản xuất.`,
            metadata: [
              { label: 'Mã phiếu', value: orderCode },
              { label: 'Thiết bị', value: equipName },
              { label: 'Phân xưởng', value: locationName },
              { label: 'Kết luận QA', value: comment || 'Đạt tiêu chuẩn GMP & an toàn' },
            ],
            actionText: 'Xem hồ sơ bảo trì',
            actionPath: `/work-orders?id=${wo.id}`,
          });
        }
      }

      // 6. QA_REJECT (QA từ chối -> Khắc phục)
      else if (actionName === 'QA_REJECT') {
        if (wo.assignedTechnicianId) {
          await this.notifications.createNotification(
            wo.assignedTechnicianId,
            null,
            null,
            `QA yêu cầu khắc phục: ${orderCode}`,
            `Bộ phận QA chưa đồng ý nghiệm thu phiếu ${orderCode}. Lý do: ${reason || 'Không đạt chuẩn GMP'}.`,
          );

          const tech = await this.prisma.user.findUnique({ where: { id: wo.assignedTechnicianId } });
          if (tech?.email) {
            await this.mailService.sendDkPharmaEmail({
              to: tech.email,
              recipientName: tech.name,
              subject: `[QA Yêu cầu khắc phục] Phiếu bảo trì ${orderCode} - ${equipName}`,
              title: 'Hồ sơ QA chưa đạt tiêu chuẩn',
              badgeText: 'QA TỪ CHỐI',
              badgeColor: 'red',
              summaryMessage: `Hồ sơ kiểm tra phiếu ${orderCode} chưa đạt yêu cầu của Bộ phận Đảm bảo chất lượng (QA).`,
              metadata: [
                { label: 'Mã phiếu', value: orderCode },
                { label: 'Thiết bị', value: equipName },
                { label: 'Lý do từ chối', value: reason || 'Chưa đạt tiêu chuẩn GMP/vệ sinh' },
              ],
              notes: 'Vui lòng trao đổi với chuyên viên QA và tiến hành khắc phục theo hướng dẫn.',
              actionText: 'Xem chi tiết phiếu',
              actionPath: `/work-orders?id=${wo.id}`,
            });
          }
        }
      }

      // 7. ESCALATE (Hỗ trợ kỹ thuật)
      else if (actionName === 'ESCALATE') {
        await this.notifications.createNotification(
          null,
          'MANAGER',
          'CO_DIEN',
          `Yêu cầu hỗ trợ kỹ thuật: ${orderCode}`,
          `Phân xưởng ${locationName} yêu cầu hỗ trợ kỹ thuật cho thiết bị ${equipName}. Lý do: ${reason || 'Vượt quá khả năng xử lý tại xưởng'}.`,
        );

        const techManagers = await this.prisma.user.findMany({
          where: {
            OR: [
              { role: 'MANAGER', department: { contains: 'Cơ điện' } },
              { role: 'MANAGER', department: 'CO_DIEN' },
              { role: 'ADMIN' },
            ],
            isActive: true,
          },
          select: { email: true },
        });
        const emails = Array.from(new Set(techManagers.map((m) => m.email))).filter(Boolean);

        if (emails.length > 0) {
          await this.mailService.sendDkPharmaEmail({
            to: emails,
            subject: `[Hỗ trợ kỹ thuật] Phiếu bảo trì ${orderCode} - ${equipName}`,
            title: 'Yêu cầu hỗ trợ kỹ thuật từ xưởng sản xuất',
            badgeText: 'CHUYỂN KỸ THUẬT',
            badgeColor: 'amber',
            summaryMessage: `Phân xưởng ${locationName} không thể tự xử lý sự cố thiết bị ${equipName} và đã chuyển yêu cầu hỗ trợ đến Tổ Cơ điện.`,
            metadata: [
              { label: 'Mã phiếu', value: orderCode },
              { label: 'Thiết bị', value: equipName },
              { label: 'Phân xưởng', value: locationName },
              { label: 'Lý do chuyển', value: reason || 'Cần hỗ trợ chuyên sâu' },
            ],
            actionText: 'Phân công kỹ thuật',
            actionPath: `/work-orders?id=${wo.id}`,
          });
        }
      }

      // 8. CLOSE (Đóng phiếu bảo trì)
      else if (actionName === 'CLOSE') {
        const targetEmails: string[] = [];
        if (wo.assignedTechnicianId) {
          const tech = await this.prisma.user.findUnique({ where: { id: wo.assignedTechnicianId } });
          if (tech?.email) targetEmails.push(tech.email);
        }
        if (wo.request?.reporterId) {
          const reporter = await this.prisma.user.findUnique({ where: { id: wo.request.reporterId } });
          if (reporter?.email) targetEmails.push(reporter.email);
        }
        const uniqueEmails = Array.from(new Set(targetEmails)).filter(Boolean);

        if (uniqueEmails.length > 0) {
          await this.mailService.sendDkPharmaEmail({
            to: uniqueEmails,
            subject: `[Đóng phiếu bảo trì] ${orderCode} - ${equipName}`,
            title: 'Phiếu bảo trì đã đóng hoàn tất',
            badgeText: 'ĐÃ ĐÓNG',
            badgeColor: 'green',
            summaryMessage: `Phiếu bảo trì ${orderCode} (${equipName}) đã hoàn thành toàn bộ chu trình và được đóng hồ sơ lưu trữ.`,
            metadata: [
              { label: 'Mã phiếu', value: orderCode },
              { label: 'Thiết bị', value: equipName },
              { label: 'Phân xưởng', value: locationName },
            ],
            actionText: 'Xem lịch sử bảo trì',
            actionPath: `/work-orders?id=${wo.id}`,
          });
        }
      }
    } catch (err: any) {
      this.logger.error('[EVENT] Error in handleWorkOrderStatusChanged:', err);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. FABRICATION & MODIFICATION ORDERS
  // ═══════════════════════════════════════════════════════════════════════════

  @OnEvent(NotificationEvents.FABRICATION_ASSIGNED, { async: true })
  async handleFabricationAssigned(event: FabricationAssignedEvent) {
    try {
      const { order } = event;
      if (!order) return;

      const targetUserIds = new Set<string>();
      if (order.assignedTechnicianId) targetUserIds.add(order.assignedTechnicianId);

      // Thêm danh sách người hỗ trợ phối hợp
      if (order.supporterIds) {
        try {
          const parsed = typeof order.supporterIds === 'string'
            ? JSON.parse(order.supporterIds)
            : order.supporterIds;
          if (Array.isArray(parsed)) parsed.forEach((id: any) => id && targetUserIds.add(String(id)));
        } catch {}
      }

      if (targetUserIds.size === 0) return;

      const techUsers = await this.prisma.user.findMany({
        where: { id: { in: Array.from(targetUserIds) } },
      });

      for (const techUser of techUsers) {
        await this.notifications.createNotification(
          techUser.id,
          null,
          null,
          `Phân công gia công/chế tạo: ${order.orderCode}`,
          `Bạn được phân công tham gia thực hiện công việc gia công [${order.orderCode}]: ${order.title}.`,
        );

        if (techUser.email) {
          await this.mailService.sendDkPharmaEmail({
            to: techUser.email,
            recipientName: techUser.name,
            subject: `[Phân công gia công] ${order.orderCode} - ${order.title}`,
            title: 'Phân công nhiệm vụ gia công / chế tạo',
            badgeText: 'PHÂN CÔNG MỚI',
            badgeColor: 'blue',
            summaryMessage: `Bạn vừa được phân công tham gia công việc gia công/chế tạo mã phiếu ${order.orderCode}.`,
            metadata: [
              { label: 'Mã phiếu', value: order.orderCode },
              { label: 'Tiêu đề', value: order.title },
              {
                label: 'Hạng mục',
                value:
                  order.category === 'FABRICATION'
                    ? 'Chế tạo mới'
                    : order.category === 'MODIFICATION'
                    ? 'Cải tiến / Hoán cải'
                    : 'Gia công phục hồi',
              },
              { label: 'Ưu tiên', value: order.priority },
              { label: 'Xưởng / Vị trí', value: order.location || order.targetDepartment || 'Xưởng cơ điện' },
              {
                label: 'Dự kiến hoàn thành',
                value: order.plannedEndDate ? new Date(order.plannedEndDate).toLocaleDateString('vi-VN') : 'Theo tiến độ',
              },
            ],
            notes: order.description,
            actionText: 'Xem chi tiết công việc',
            actionPath: `/fabrication/${order.id}`,
          });
        }
      }
    } catch (err: any) {
      this.logger.error('[EVENT] Error in handleFabricationAssigned:', err);
    }
  }

  @OnEvent(NotificationEvents.FABRICATION_UPDATED, { async: true })
  async handleFabricationUpdated(event: FabricationUpdatedEvent) {
    try {
      const { updated, existing, dto, auditAction, auditReason } = event;
      if (!updated) return;

      const orderCode = updated.orderCode;
      const title = updated.title;
      const location = updated.location || updated.targetDepartment || 'Xưởng cơ điện';

      // 1. REASSIGN TECHNICIAN
      if (dto.assignedTechnicianId && dto.assignedTechnicianId !== existing.assignedTechnicianId) {
        await this.notifications.createNotification(
          dto.assignedTechnicianId,
          null,
          null,
          `Phân công gia công/chế tạo: ${orderCode}`,
          `Bạn được chuyển giao phụ trách công việc [${orderCode}]: ${title}.`,
        );

        if (updated.assignedTechnician?.email) {
          await this.mailService.sendDkPharmaEmail({
            to: updated.assignedTechnician.email,
            recipientName: updated.assignedTechnician.name,
            subject: `[Điều chuyển phân công] ${orderCode} - ${title}`,
            title: 'Phân công nhiệm vụ gia công / chế tạo',
            badgeText: 'PHÂN CÔNG MỚI',
            badgeColor: 'blue',
            summaryMessage: `Bạn vừa được phân công thay thế phụ trách công việc gia công/chế tạo mã phiếu ${orderCode}.`,
            metadata: [
              { label: 'Mã phiếu', value: orderCode },
              { label: 'Tiêu đề', value: title },
              { label: 'Xưởng / Vị trí', value: location },
              { label: 'Ưu tiên', value: updated.priority },
            ],
            notes: updated.description,
            actionText: 'Xem chi tiết công việc',
            actionPath: `/fabrication/${updated.id}`,
          });
        }
      }

      // 2. COMPLETED -> Đề nghị nghiệm thu bàn giao
      if (updated.status === 'COMPLETED' && existing.status !== 'COMPLETED') {
        const creatorId = updated.creatorId || existing.creatorId;
        if (creatorId) {
          await this.notifications.createNotification(
            creatorId,
            null,
            null,
            `Công việc hoàn thành: ${orderCode}`,
            `Kỹ thuật viên đã hoàn thành công việc gia công [${orderCode}]: ${title}. Mời bạn nghiệm thu bàn giao.`,
          );
        }

        await this.notifications.createNotification(
          null,
          'MANAGER',
          location,
          `Đề nghị nghiệm thu gia công: ${orderCode}`,
          `Công việc [${orderCode}]: ${title} đã hoàn tất. Đề nghị phụ trách phân xưởng kiểm tra và nghiệm thu sản phẩm.`,
        );

        const managers = await this.prisma.user.findMany({
          where: {
            OR: [{ role: 'MANAGER', department: location }, { role: 'ADMIN' }],
            isActive: true,
          },
          select: { email: true },
        });

        const targetEmails = managers.map((m) => m.email);
        if (updated.creator?.email) targetEmails.push(updated.creator.email);
        const uniqueEmails = Array.from(new Set(targetEmails)).filter(Boolean);

        if (uniqueEmails.length > 0) {
          await this.mailService.sendDkPharmaEmail({
            to: uniqueEmails,
            subject: `[Đề nghị nghiệm thu] Phiếu gia công ${orderCode} - ${title}`,
            title: 'Sản phẩm gia công hoàn thành, chờ nghiệm thu',
            badgeText: 'CHỜ BÀN GIAO',
            badgeColor: 'amber',
            summaryMessage: `Kỹ thuật viên đã hoàn thành công việc gia công [${orderCode}]: ${title}. Kính mời quý bộ phận tiến hành kiểm tra chất lượng và ký xác nhận nghiệm thu.`,
            metadata: [
              { label: 'Mã phiếu', value: orderCode },
              { label: 'Tiêu đề', value: title },
              { label: 'Kỹ thuật viên', value: updated.assignedTechnician?.name || 'KTV Cơ điện' },
              { label: 'Giờ công thực tế', value: `${updated.actualHours || 0} giờ` },
            ],
            notes: dto.resultNotes || 'Sản phẩm đã gia công xong và sẵn sàng bàn giao lắp ráp/sử dụng.',
            actionText: 'Nghiệm thu bàn giao',
            actionPath: `/fabrication/${updated.id}`,
          });
        }
      }

      // 3. REWORK -> Yêu cầu làm lại
      if (dto.acceptanceRating === 'REWORK' || auditAction === 'REJECT_REWORK') {
        const techId = updated.assignedTechnicianId || existing.assignedTechnicianId;
        if (techId) {
          await this.notifications.createNotification(
            techId,
            null,
            null,
            `Nghiệm thu KHÔNG ĐẠT: ${orderCode}`,
            `Sản phẩm gia công [${orderCode}] chưa đạt tiêu chuẩn. Yêu cầu làm lại. Lý do: ${auditReason || 'Không đạt'}.`,
          );

          if (updated.assignedTechnician?.email) {
            await this.mailService.sendDkPharmaEmail({
              to: updated.assignedTechnician.email,
              recipientName: updated.assignedTechnician.name,
              subject: `[Yêu cầu sửa lại] Phiếu gia công ${orderCode} - ${title}`,
              title: 'Nghiệm thu chưa đạt - Yêu cầu làm lại',
              badgeText: 'YÊU CẦU LÀM LẠI',
              badgeColor: 'red',
              summaryMessage: `Quản lý phân xưởng đánh giá sản phẩm gia công [${orderCode}] chưa đạt yêu cầu kỹ thuật và đề nghị khắc phục sửa đổi.`,
              metadata: [
                { label: 'Mã phiếu', value: orderCode },
                { label: 'Tiêu đề', value: title },
                { label: 'Lý do từ chối', value: auditReason || 'Không đạt tiêu chuẩn kỹ thuật' },
              ],
              notes: 'Vui lòng kiểm tra lại kích thước, bản vẽ hoặc trao đổi trực tiếp với đại diện tiếp nhận.',
              actionText: 'Xem chi tiết phiếu',
              actionPath: `/fabrication/${updated.id}`,
            });
          }
        }
      }

      // 4. CLOSED -> Nghiệm thu đạt
      if (updated.status === 'CLOSED' && existing.status !== 'CLOSED') {
        const targetEmails: string[] = [];
        if (updated.assignedTechnician?.email) targetEmails.push(updated.assignedTechnician.email);
        if (updated.creator?.email) targetEmails.push(updated.creator.email);
        const uniqueEmails = Array.from(new Set(targetEmails)).filter(Boolean);

        if (uniqueEmails.length > 0) {
          await this.mailService.sendDkPharmaEmail({
            to: uniqueEmails,
            subject: `[Nghiệm thu đạt] Hoàn tất bàn giao phiếu ${orderCode} - ${title}`,
            title: 'Nghiệm thu bàn giao sản phẩm thành công',
            badgeText: 'ĐÃ BÀN GIAO',
            badgeColor: 'green',
            summaryMessage: `Công việc gia công/chế tạo [${orderCode}]: ${title} đã được nghiệm thu đạt chuẩn và bàn giao hoàn tất.`,
            metadata: [
              { label: 'Mã phiếu', value: orderCode },
              { label: 'Tiêu đề', value: title },
              { label: 'Người tiếp nhận', value: updated.acceptedByName || 'Đại diện phân xưởng' },
              { label: 'Đánh giá chất lượng', value: updated.acceptanceRating || 'GOOD' },
            ],
            actionText: 'Xem hồ sơ công việc',
            actionPath: `/fabrication/${updated.id}`,
          });
        }
      }
    } catch (err: any) {
      this.logger.error('[EVENT] Error in handleFabricationUpdated:', err);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. PREVENTIVE MAINTENANCE SCHEDULES
  // ═══════════════════════════════════════════════════════════════════════════

  @OnEvent(NotificationEvents.SCHEDULE_WO_GENERATED, { async: true })
  async handleScheduleWoGenerated(event: ScheduleWorkOrderGeneratedEvent) {
    try {
      const { schedule, createdWO } = event;
      if (!createdWO || !schedule?.assignedTechnicianId) return;

      await this.notifications.createNotification(
        schedule.assignedTechnicianId,
        null,
        null,
        `Bảo trì định kỳ đến hạn: ${createdWO.orderCode}`,
        `Phiếu bảo trì định kỳ [${createdWO.orderCode}] cho thiết bị ${schedule.equipment?.name} đã được khởi tạo.`,
      );

      if (schedule.assignedTechnician?.email) {
        await this.mailService.sendDkPharmaEmail({
          to: schedule.assignedTechnician.email,
          recipientName: schedule.assignedTechnician.name,
          subject: `[Bảo trì định kỳ] ${createdWO.orderCode} - ${schedule.title}`,
          title: 'Phiếu bảo trì định kỳ đến hạn',
          badgeText: 'BẢO TRÌ ĐỊNH KỲ',
          badgeColor: 'blue',
          summaryMessage: `Hệ thống vừa khởi tạo phiếu bảo trì định kỳ ${createdWO.orderCode} theo kế hoạch ${schedule.scheduleCode}.`,
          metadata: [
            { label: 'Mã phiếu bảo trì', value: createdWO.orderCode },
            { label: 'Kế hoạch bảo trì', value: `${schedule.title} (${schedule.scheduleCode})` },
            {
              label: 'Thiết bị',
              value: `${schedule.equipment?.name} (${schedule.equipment?.code})`,
            },
            { label: 'Phân xưởng', value: schedule.equipment?.location || 'Khu vực sản xuất' },
            { label: 'Mức độ ưu tiên', value: createdWO.priority },
            {
              label: 'Ngày đến hạn',
              value: createdWO.scheduledDueDate
                ? new Date(createdWO.scheduledDueDate).toLocaleDateString('vi-VN')
                : 'Hôm nay',
            },
          ],
          notes:
            schedule.description ||
            'Vui lòng kiểm tra thiết bị, thực hiện bảo dưỡng và tích chọn checklist theo đúng quy trình GMP.',
          actionText: 'Xem phiếu bảo trì',
          actionPath: `/work-orders?id=${createdWO.id}`,
        });
      }
    } catch (err: any) {
      this.logger.error('[EVENT] Error in handleScheduleWoGenerated:', err);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. INVENTORY & SPARE PARTS
  // ═══════════════════════════════════════════════════════════════════════════

  @OnEvent(NotificationEvents.INVENTORY_LOW_STOCK, { async: true })
  async handleInventoryLowStock(event: InventoryLowStockEvent) {
    try {
      const { item } = event;
      if (!item || item.quantity > item.minQuantity) return;

      await this.notifications.createNotification(
        null,
        'MANAGER',
        'KHO',
        `Cảnh báo tồn kho tối thiểu: ${item.itemCode}`,
        `Vật tư ${item.name} (${item.itemCode}) hiện chỉ còn ${item.quantity} ${item.unit} (dưới định mức tối thiểu ${item.minQuantity}). Vui lòng lập phiếu dự trù mua sắm.`,
      );

      const managers = await this.prisma.user.findMany({
        where: {
          OR: [{ role: 'MANAGER' }, { department: { contains: 'Kho' } }, { role: 'ADMIN' }],
          isActive: true,
        },
        select: { email: true },
      });
      const emails = Array.from(new Set(managers.map((m) => m.email))).filter(Boolean);

      if (emails.length > 0) {
        await this.mailService.sendDkPharmaEmail({
          to: emails,
          subject: `[Cảnh báo tồn kho] Vật tư ${item.name} (${item.itemCode}) chạm ngưỡng an toàn`,
          title: 'Cảnh báo vật tư dưới ngưỡng tối thiểu',
          badgeText: 'TỒN KHO THẤP',
          badgeColor: 'amber',
          summaryMessage: `Hệ thống ghi nhận vật tư ${item.name} sau khi xuất kho đã chạm hoặc giảm dưới mức tồn kho an toàn.`,
          metadata: [
            { label: 'Mã vật tư', value: item.itemCode },
            { label: 'Tên vật tư', value: item.name },
            { label: 'Số lượng còn lại', value: `${item.quantity} ${item.unit}` },
            { label: 'Định mức an toàn', value: `${item.minQuantity} ${item.unit}` },
            { label: 'Vị trí lưu kho', value: item.location || 'Kho phụ tùng' },
          ],
          notes: 'Đề nghị bộ phận quản lý kho và mua sắm tiến hành lập kế hoạch bổ sung vật tư kịp thời.',
          actionText: 'Quản lý kho vật tư',
          actionPath: `/spare-parts?search=${encodeURIComponent(item.itemCode || item.name)}`,
        });
      }
    } catch (err: any) {
      this.logger.error('[EVENT] Error in handleInventoryLowStock:', err);
    }
  }
}
