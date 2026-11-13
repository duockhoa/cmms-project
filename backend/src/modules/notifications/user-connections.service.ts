import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UserConnectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async recordConnection(data: {
    userId: string;
    hrmId?: string | null;
    userName: string;
    department?: string | null;
    role: string;
    socketId: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    // Tìm bản ghi gần nhất của user này có cùng IP và UserAgent trong 24 giờ qua mà chưa quá 1 tiếng kể từ lần cuối tương tác
    const recentSession = await this.prisma.userConnectionLog.findFirst({
      where: {
        userId: data.userId,
        ipAddress: data.ipAddress || null,
        status: { in: ['CONNECTED', 'RECONNECTING'] },
      },
      orderBy: { connectedAt: 'desc' },
    });

    if (recentSession) {
      // Cập nhật session hiện có (tái kết nối)
      return this.prisma.userConnectionLog.update({
        where: { id: recentSession.id },
        data: {
          socketId: data.socketId,
          status: 'CONNECTED',
          lastSeenAt: new Date(),
          disconnectedAt: null,
          reconnectCount: { increment: 1 },
          userAgent: data.userAgent || recentSession.userAgent,
        },
      });
    }

    // Tạo phiên kết nối mới
    const id = 'conn_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    return this.prisma.userConnectionLog.create({
      data: {
        id,
        userId: data.userId,
        hrmId: data.hrmId || null,
        userName: data.userName,
        department: data.department || null,
        role: data.role,
        socketId: data.socketId,
        status: 'CONNECTED',
        connectedAt: new Date(),
        lastSeenAt: new Date(),
        reconnectCount: 1,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
      },
    });
  }

  async recordHeartbeat(socketId: string) {
    const session = await this.prisma.userConnectionLog.findFirst({
      where: { socketId, status: 'CONNECTED' },
    });
    if (session) {
      await this.prisma.userConnectionLog.update({
        where: { id: session.id },
        data: { lastSeenAt: new Date() },
      });
    }
  }

  async recordDisconnect(socketId: string) {
    const session = await this.prisma.userConnectionLog.findFirst({
      where: { socketId, status: 'CONNECTED' },
    });
    if (session) {
      await this.prisma.userConnectionLog.update({
        where: { id: session.id },
        data: {
          status: 'DISCONNECTED',
          disconnectedAt: new Date(),
          lastSeenAt: new Date(),
        },
      });
    }
  }

  async getLogs(query: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
    }

    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { userName: { contains: q } },
        { hrmId: { contains: q } },
        { department: { contains: q } },
        { ipAddress: { contains: q } },
      ];
    }

    const [items, total, connectedCount, reconnectingCount, disconnectedCount] = await Promise.all([
      this.prisma.userConnectionLog.findMany({
        where,
        orderBy: { lastSeenAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.userConnectionLog.count({ where }),
      this.prisma.userConnectionLog.count({ where: { status: 'CONNECTED' } }),
      this.prisma.userConnectionLog.count({ where: { status: 'RECONNECTING' } }),
      this.prisma.userConnectionLog.count({ where: { status: 'DISCONNECTED' } }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        connected: connectedCount,
        reconnecting: reconnectingCount,
        disconnected: disconnectedCount,
      },
    };
  }

  async forceDisconnect(id: string) {
    const session = await this.prisma.userConnectionLog.findUnique({
      where: { id },
    });
    if (!session) return null;

    await this.prisma.userConnectionLog.update({
      where: { id },
      data: {
        status: 'DISCONNECTED',
        disconnectedAt: new Date(),
      },
    });

    return session;
  }
}

