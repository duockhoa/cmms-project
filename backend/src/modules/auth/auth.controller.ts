import { Controller, Get, Post, Body, Header, UseGuards, Req, Res, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiBody } from '@nestjs/swagger';
import { ApiStandardResponse } from '../../common/decorators/api-standard-response.decorator';
import { Request, Response } from 'express';
import { BrowserSessionService } from './browser-session.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { ALL_PERMISSION_CODES } from '../../common/constants/permissions.registry';
import { getUserDepartments, effectivePermissionCodes } from '../../common/utils/rbac.helper';
import { HrmIdentityService } from './hrm-identity.service';

@ApiTags('Auth (Xác thực & Phiên làm việc)')
@Controller('auth')
export class AuthController {
  constructor(private prisma: PrismaService, private identities: HrmIdentityService, private sessions?: BrowserSessionService) {}

  @ApiStandardResponse({ summary: 'Đăng nhập hệ thống bằng tài khoản / mật khẩu', method: 'POST', path: '/auth/login', isPublic: true })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['username', 'password'],
      properties: {
        username: { type: 'string', example: 'admin' },
        password: { type: 'string', example: '123456' },
      },
    },
  })
  @Post('login')
  @Header('Cache-Control', 'no-store')
  async login(@Body() body: { username: string; password: string }, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    this.sessions.assertOrigin(request);
    this.sessions.throttle(request);
    const { accessToken, refreshToken, profile } = await this.identities.login(body.username, body.password);
    return this.sessions.open(request, response, accessToken, refreshToken, String(profile.id));
  }

  @ApiStandardResponse({ summary: 'Đăng xuất khỏi hệ thống', method: 'POST', path: '/auth/logout', isPublic: true })
  @Post('logout')
  @Header('Cache-Control', 'no-store')
  logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    return this.sessions.logout(request, response);
  }

  @ApiStandardResponse({ summary: 'Làm mới Access Token bằng Refresh Token', method: 'POST', path: '/auth/refresh', isPublic: true })
  @Post('refresh')
  @Header('Cache-Control', 'no-store')
  refresh(@Req() request: Request) {
    return this.sessions.refresh(request);
  }

  @ApiStandardResponse({ summary: 'Kiểm tra trạng thái phiên làm việc hiện tại', method: 'GET', path: '/auth/session', isPublic: true })
  @Get('session')
  @Header('Cache-Control', 'no-store')
  getSession(@Req() request: Request) {
    return this.sessions.inspect(request);
  }

  @ApiStandardResponse({ summary: 'Nhận diện phiên làm việc SSO từ cổng HRM', method: 'POST', path: '/auth/session', isPublic: true })
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

  @ApiStandardResponse({ summary: 'Lấy thông tin tài khoản, vai trò và danh sách quyền hạn của tôi', method: 'GET', path: '/auth/me' })
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
