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

    let rolePerms: string[] = [];
    if (user.customRole?.permissions) {
      try {
        rolePerms = typeof user.customRole.permissions === 'string'
          ? JSON.parse(user.customRole.permissions)
          : user.customRole.permissions;
      } catch (e) {
        rolePerms = [];
      }
    }

    let customPerms: string[] = [];
    if (user.customPermissions) {
      try {
        customPerms = typeof user.customPermissions === 'string'
          ? JSON.parse(user.customPermissions)
          : user.customPermissions;
      } catch (e) {
        customPerms = [];
      }
    }

    const effectivePerms = new Set<string>([...rolePerms, ...customPerms]);

    // Pure dynamic RBAC permission check (Supports '*' and 'ALL' wildcards)
    const hasPermission = requiredPermissions.every((required) => {
      // 1. Direct permission match
      if (effectivePerms.has(required)) return true;
      // 2. Global wildcard
      if (effectivePerms.has('*') || effectivePerms.has('ALL')) return true;
      // 3. Module-level wildcard, e.g. "utilities:*" matches "utilities:edit_reading"
      const [moduleName] = required.split(':');
      if (effectivePerms.has(`${moduleName}:*`) || effectivePerms.has(`${moduleName}:ALL`)) return true;
      return false;
    });

    if (!hasPermission) {
      throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');
    }

    return true;
  }
}
