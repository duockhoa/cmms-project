import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();

    // Support M2M API Key (e.g. EVN Electricity sync bot)
    const apiKey = request.headers['x-api-key'];
    const configuredKey = process.env.EVN_SYNC_API_KEY || 'cmms_evn_sync_secret_2026';
    if (apiKey && apiKey === configuredKey) {
      request.user = {
        id: 'system-evn-bot',
        name: 'EVN Auto-Sync Bot',
        email: 'evn-sync@cmms.local',
        role: 'ADMIN',
        roles: ['ADMIN'],
      };
      return true;
    }

    // x-user-id header bypass is strictly restricted to automated test environments (Jest)
    if (process.env.NODE_ENV === 'test') {
      const userId = request.headers['x-user-id'];
      if (userId) {
        const adminCode = process.env.ADMIN_EMPLOYEE_CODE;
        const role = (adminCode && userId === adminCode) ? 'ADMIN' : 'TECHNICIAN';
        
        request.user = { 
          id: userId, 
          role: role,
          roles: [role]
        };
        return true;
      }
    }
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      console.error('JwtAuthGuard Error:', err?.message || err);
      console.error('JwtAuthGuard Info:', info?.message || info);
      throw err || new UnauthorizedException('Authentication token is missing, expired, or invalid.');
    }
    return user;
  }
}
