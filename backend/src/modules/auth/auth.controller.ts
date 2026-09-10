import { Controller, Get, UseGuards, Req, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { ALL_PERMISSION_CODES } from '../../common/constants/permissions.registry';

@Controller('auth')
export class AuthController {
  constructor(private prisma: PrismaService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: any) {
    const actor = req.user;

    // Look up real user details inside our database based on Identity Provider's subject id (sub)
    let dbUser = await this.prisma.user.findUnique({
      where: { id: actor.id },
      include: { customRole: true },
    });

    // Fallback search by email if subject id doesn't match directly
    if (!dbUser && actor.email) {
      dbUser = await this.prisma.user.findFirst({
        where: { email: actor.email },
        include: { customRole: true },
      });
    }

    if (!dbUser) {
      throw new NotFoundException('User profile is not synchronized with CMMS database.');
    }

    // Parse role-based permissions
    let rolePerms: string[] = [];
    if (dbUser.customRole?.permissions) {
      try {
        rolePerms = JSON.parse(dbUser.customRole.permissions);
      } catch (e) {
        rolePerms = [];
      }
    }

    // Parse user direct custom permissions
    let customPerms: string[] = [];
    if (dbUser.customPermissions) {
      try {
        customPerms = JSON.parse(dbUser.customPermissions);
      } catch (e) {
        customPerms = [];
      }
    }

    // Total effective permissions: Role permissions + Direct User permissions (Strict RBAC)
    const merged = new Set<string>([...rolePerms, ...customPerms]);

    // Dynamic wildcard expansion: if role or user has '*' or 'ALL', expand to all permissions
    let permissions: string[] = [];
    if (merged.has('*') || merged.has('ALL')) {
      permissions = ['ALL', ...ALL_PERMISSION_CODES];
    } else {
      const expanded = new Set<string>();
      for (const p of merged) {
        if (p.endsWith(':*')) {
          const mod = p.replace(':*', '');
          ALL_PERMISSION_CODES.filter((code) => code.startsWith(`${mod}:`)).forEach((c) => expanded.add(c));
        } else {
          expanded.add(p);
        }
      }
      permissions = Array.from(expanded);
    }

    return {
      authenticated: true,
      user: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        roleId: dbUser.roleId,
        customRole: dbUser.customRole ? {
          id: dbUser.customRole.id,
          name: dbUser.customRole.name,
          description: dbUser.customRole.description,
          permissions: rolePerms,
        } : null,
        customPermissions: customPerms,
        status: dbUser.status,
        isActive: dbUser.isActive,
        department: dbUser.department,
      },
      permissions: permissions,
      scope: {
        department: dbUser.role === 'MANAGER' ? (dbUser.department || 'ALL') : 'ALL',
        assignedOnly: dbUser.role === 'TECHNICIAN',
      },
    };
  }
}
