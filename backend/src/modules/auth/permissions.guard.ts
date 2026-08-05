import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const actor = request.user; // Injected by JwtAuthGuard

    if (!actor) {
      return false;
    }

    // 1. Role verification & Fetch real user from DB
    const dbUser = await this.prisma.user.findUnique({ where: { id: actor.id } });
    if (!dbUser || !dbUser.isActive) {
      throw new ForbiddenException('User is inactive or profile does not exist.');
    }

    // Admins bypass all checks
    if (dbUser.role === 'ADMIN') {
      return true;
    }

    // If no specific permissions are decorated, check base role authorization
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // 2. Permission Check (Static Role -> Permissions mapping)
    const userPermissions: string[] = [];
    if (dbUser.role === 'MANAGER') {
      userPermissions.push('EQUIPMENT_READ', 'WORK_ORDER_WRITE', 'REQUEST_APPROVE', 'INVENTORY_READ', 'INVENTORY_WRITE');
    } else if (dbUser.role === 'TECHNICIAN') {
      userPermissions.push('EQUIPMENT_READ', 'WORK_ORDER_EXECUTE', 'INVENTORY_READ');
    }

    const hasPermission = requiredPermissions.every((perm) =>
      userPermissions.includes(perm),
    );

    if (!hasPermission) {
      throw new ForbiddenException('You do not possess the required permission scope for this action.');
    }

    // 3. Scope verification (Dynamic checks based on resource being accessed)
    // E.g., if checking work order modification, a TECHNICIAN must be assigned to it
    const reqParamId = request.params.id;
    if (reqParamId && dbUser.role === 'TECHNICIAN' && requiredPermissions.includes('WORK_ORDER_EXECUTE')) {
      const workOrder = await this.prisma.workOrder.findUnique({
        where: { id: reqParamId },
      });
      // Allow only if assigned or technicianName matches actor name
      if (workOrder && workOrder.technicianName !== dbUser.name) {
        throw new ForbiddenException('Access denied: You are not assigned to this work order.');
      }
    }

    return true;
  }
}
