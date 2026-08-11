import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) {}

  async createNotification(
    userId?: string,
    role?: string,
    department?: string,
    title?: string,
    message?: string,
  ) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: userId || null,
        role: role || null,
        department: department || null,
        title: title || 'Thông báo hệ thống',
        message: message || '',
      },
    });

    // Push via WebSocket Gateway
    try {
      this.gateway.sendNotificationToRooms(
        userId || null,
        role || null,
        department || null,
        notification,
      );
    } catch (err) {
      console.error('[WEBSOCKET] Failed to emit notification realtime:', err);
    }

    return notification;
  }

  async getNotificationsForUser(user: any) {
    // A user receives a notification if:
    // 1. It is directly targeted to their userId
    // 2. Or, it targets their role (e.g. MANAGER)
    // 3. Or, it targets their department (e.g. CO_DIEN)
    // 4. Or, it is a global notification (userId, role, department are all null)
    const orConditions: any[] = [
      { userId: user.id },
    ];

    if (user.role) {
      orConditions.push({ role: user.role });
    }

    if (user.department) {
      orConditions.push({ department: user.department });
    }

    // Add global notification criteria
    orConditions.push({
      userId: null,
      role: null,
      department: null,
    });

    return this.prisma.notification.findMany({
      where: {
        OR: orConditions,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // Keep it light
    });
  }

  async markAsRead(id: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });
    if (!notification) {
      throw new NotFoundException('Không tìm thấy thông báo');
    }
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }
}
