import { AUTHENTICATED_REQUEST } from '../auth/route-policy';
import { hasPermission } from '../utils/rbac.helper';
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector, private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    if (!userId) {
      throw new ForbiddenException('Không xác định được danh tính người dùng');
    }

    const user = request[AUTHENTICATED_REQUEST] ? request.user : await this.prisma.user.findUnique({
      where: { id: userId as string },
      include: { customRole: true },
    });

    if (!user) {
      throw new ForbiddenException('Người dùng không tồn tại');
    }

    if (!user.isActive || !requiredPermissions.every(permission => hasPermission(user, permission))) {
      throw new ForbiddenException('Permission denied');
    }
    return true;
  }
}
