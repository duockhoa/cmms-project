import { Controller, Get, Post, Body, Header, SetMetadata, UseGuards, Req, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { ALL_PERMISSION_CODES } from '../../common/constants/permissions.registry';
import { getUserDepartments } from '../../common/utils/rbac.helper';
import { HrmIdentityService } from './hrm-identity.service';

@Controller('auth')
export class AuthController {
  constructor(private prisma: PrismaService, private identities: HrmIdentityService) {}

  @Post('refresh')
  @Header('Cache-Control', 'no-store')
  @SetMetadata('auth:session-token-response', true)
  refresh(@Body() body: { refreshToken: string; expectedHrmId: string }) {
    return this.identities.refreshSession(body.refreshToken, body.expectedHrmId);
  }

  @Get('me')
  @Header('Cache-Control', 'no-store')
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: any) {
    const actor = req.user;

    // Look up real user details inside our database based on Identity Provider's subject id (sub)
    let dbUser = await this.prisma.user.findUnique({
      where: { id: actor.id },
      include: { customRole: true },
    });

    if (!dbUser || !dbUser.isActive) {
      throw new NotFoundException('Tài khoản QLTB không tồn tại hoặc đã ngừng hoạt động.');
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

    // Backward-compatibility & Security: ADMIN or SUPER_ADMIN always has full permissions
    const isGlobalAdmin = dbUser.role === 'ADMIN' || dbUser.role === 'SUPER_ADMIN';
    if (isGlobalAdmin) {
      merged.add('*');
    }

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

    const userDepartments = getUserDepartments(dbUser);

    return {
      authenticated: true,
      identity: actor.identity,
      user: {
        id: dbUser.id,
        hrmId: dbUser.hrmId,
        name: actor.name || dbUser.name,
        email: actor.email || dbUser.email,
        role: dbUser.role,
        customRole: dbUser.customRole ? {
          name: dbUser.customRole.name,
        } : null,
        status: dbUser.status,
        isActive: dbUser.isActive,
        department: dbUser.department,
        managedDepartments: userDepartments,
        position: actor.position || dbUser.specialty,
        avatar: actor.identity?.provider === 'hrm' ? actor.avatar : dbUser.avatar,
      },
      permissions: permissions,
      scope: {
        department: (dbUser.role === 'MANAGER' || permissions.includes('requests:approve') || dbUser.customRole?.name?.toLowerCase().includes('quản lý')) 
          ? (userDepartments.length > 0 ? userDepartments.join(', ') : (dbUser.department || 'ALL')) 
          : 'ALL',
        departments: userDepartments,
        assignedOnly: dbUser.role === 'TECHNICIAN' && !permissions.includes('requests:approve'),
      },
    };
  }
}
