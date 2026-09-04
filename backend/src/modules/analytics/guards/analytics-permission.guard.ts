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
    
    // Extract actor ID directly from authenticated request.user (set by JwtAuthGuard)
    const userId = request.user?.id;

    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      throw new ForbiddenException('Không xác định được danh tính người dùng để truy cập Báo cáo & Phân tích');
    }

    let user = await this.prisma.user.findUnique({
      where: { id: userId.trim() },
    });

    if (!user && request.user?.email) {
      user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { email: request.user.email },
            { name: request.user.name },
          ],
        },
      });
    }

    if (!user || !user.isActive) {
      // If user is validated by JWT as ADMIN, allow fallback
      if (request.user?.role === 'ADMIN' || request.user?.roles?.includes('ADMIN')) {
        return true;
      }
      throw new ForbiddenException('Tài khoản người dùng không tồn tại hoặc đã bị vô hiệu hóa');
    }

    // Attach user context to request for downstream services
    request.user = {
      id: user.id,
      name: user.name,
      role: user.role,
      roles: request.user?.roles || [user.role],
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
