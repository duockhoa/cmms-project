import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AnalyticsPermissionGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Extract actor ID from header or query (convention used in CMMS API: x-user-id or actedById)
    const userId = request.headers['x-user-id'] || request.query?.actedById || request.body?.actedById;

    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      throw new UnauthorizedException('Yêu cầu truyền x-user-id hoặc actedById hợp lệ để xác thực');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId.trim() },
    });

    if (!user || !user.isActive) {
      throw new ForbiddenException('Tài khoản người dùng không tồn tại hoặc đã bị vô hiệu hóa');
    }

    // Attach user context to request for downstream services
    request.user = {
      id: user.id,
      name: user.name,
      role: user.role,
      department: user.department,
      isActive: user.isActive,
    };

    // OPERATOR is strictly blocked from all Analytics & Reports endpoints
    if (user.role === 'OPERATOR') {
      throw new ForbiddenException('Vai trò OPERATOR không có quyền truy cập Analytics & Reports');
    }

    // Check sensitive cost path access
    const url = request.url || '';
    if (url.includes('/cost') || url.includes('/financial')) {
      if (user.role === 'TECHNICIAN') {
        throw new ForbiddenException('Kỹ thuật viên (TECHNICIAN) không có quyền xem dữ liệu Chi phí & Tài chính');
      }
    }

    return true;
  }
}
