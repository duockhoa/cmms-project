import { Controller, Get, UseGuards, Req, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';

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
    });

    // Fallback search by email if subject id doesn't match directly
    if (!dbUser && actor.email) {
      dbUser = await this.prisma.user.findFirst({
        where: { email: actor.email },
      });
    }

    if (!dbUser) {
      throw new NotFoundException('User profile is not synchronized with CMMS database.');
    }

    // Build permissions map based on role
    // ADMIN: full permissions
    // MANAGER: read, write on specific department
    // TECHNICIAN: read, execute work orders
    const permissions = [];
    if (dbUser.role === 'ADMIN') {
      permissions.push('ALL');
    } else if (dbUser.role === 'MANAGER') {
      permissions.push('EQUIPMENT_READ', 'WORK_ORDER_WRITE', 'REQUEST_APPROVE', 'INVENTORY_READ');
    } else if (dbUser.role === 'TECHNICIAN') {
      permissions.push('EQUIPMENT_READ', 'WORK_ORDER_EXECUTE', 'INVENTORY_READ');
    }

    return {
      authenticated: true,
      user: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        status: dbUser.status,
        isActive: dbUser.isActive,
        department: dbUser.department,
      },
      permissions: permissions,
      scope: {
        department: dbUser.role === 'MANAGER' ? 'Phân xưởng A' : 'ALL',
        assignedOnly: dbUser.role === 'TECHNICIAN',
      },
    };
  }
}
