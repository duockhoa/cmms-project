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

    const user = await this.prisma.user.findUnique({
      where: { id: userId as string },
      include: { customRole: true },
    });

    if (!user) {
      throw new ForbiddenException('Người dùng không tồn tại');
    }

    // Admins bypass
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      return true;
    }

    if (!user.customRole) {
      throw new ForbiddenException('Người dùng chưa được gán nhóm quyền');
    }

    try {
      const userPermissions: string[] = JSON.parse(user.customRole.permissions);
      const hasPermission = requiredPermissions.every((perm) => userPermissions.includes(perm));

      if (!hasPermission) {
        throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');
      }
    } catch (e) {
      throw new ForbiddenException('Cấu hình phân quyền bị lỗi');
    }

    return true;
  }
}
