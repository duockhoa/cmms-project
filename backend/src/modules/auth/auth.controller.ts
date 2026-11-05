import { Controller, Get, Post, Body, Header, UseGuards, Req, Res, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { BrowserSessionService } from './browser-session.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { ALL_PERMISSION_CODES } from '../../common/constants/permissions.registry';
import { getUserDepartments, effectivePermissionCodes } from '../../common/utils/rbac.helper';
import { HrmIdentityService } from './hrm-identity.service';

@Controller('auth')
export class AuthController {
  constructor(private prisma: PrismaService, private identities: HrmIdentityService, private sessions?: BrowserSessionService) {}

  @Post('login')
  @Header('Cache-Control', 'no-store')
  async login(@Body() body: { username: string; password: string }, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    this.sessions.assertOrigin(request);
    this.sessions.throttle(request);
    const { accessToken, refreshToken, profile } = await this.identities.login(body.username, body.password);
    return this.sessions.open(request, response, accessToken, refreshToken, String(profile.id));
  }

  @Post('logout')
  @Header('Cache-Control', 'no-store')
  logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    return this.sessions.logout(request, response);
  }

  @Post('refresh')
  @Header('Cache-Control', 'no-store')
  refresh(@Req() request: Request) {
    return this.sessions.refresh(request);
  }

  @Get('session')
  @Header('Cache-Control', 'no-store')
  getSession(@Req() request: Request) {
    return this.sessions.inspect(request);
  }

  @Post('session')
  @Header('Cache-Control', 'no-store')
  async adoptSession(@Body() body: { refreshToken: string }, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    this.sessions.assertOrigin(request);
    this.sessions.throttle(request);
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) throw new UnauthorizedException('Cần xác minh phiên SSO.');
    const profile = await this.identities.validateSession(authorization.slice(7), true);
    await this.identities.resolve(profile);
    const pair = await this.identities.refreshSession(body.refreshToken, String(profile.id));
    return this.sessions.open(request, response, pair.accessToken, pair.refreshToken, String(profile.id));
  }

  @Get('me')
  @Header('Cache-Control', 'no-store')
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: any) {
    const actor = req.user;

    // Look up real user details inside our database based on Identity Provider's subject id (sub)
    const dbUser = actor.localUser || await this.prisma.user.findUnique({
      where: { id: actor.id },
      include: { customRole: true },
    });

    if (!dbUser || !dbUser.isActive || dbUser.accessBlocked) {
      throw new NotFoundException('Tài khoản QLTB không tồn tại hoặc đã ngừng hoạt động.');
    }

    const permissions = effectivePermissionCodes(dbUser);

    const userDepartments = getUserDepartments(dbUser);

    return {
      authenticated: true,
      identity: actor.identity,
      user: {
        id: dbUser.id,
        hrmId: dbUser.hrmId,
        name: actor.name || dbUser.name,
        email: actor.email || dbUser.email,
        role: actor.role || (dbUser.customRole?.isActive === false ? 'USER' : dbUser.role),
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
        department: (dbUser.role === 'MANAGER' || permissions.includes('requests:approve'))
          ? (userDepartments.length > 0 ? userDepartments.join(', ') : (dbUser.department || 'ALL')) 
          : 'ALL',
        departments: userDepartments,
        assignedOnly: dbUser.role === 'TECHNICIAN' && !permissions.includes('requests:approve'),
      },
    };
  }
}
