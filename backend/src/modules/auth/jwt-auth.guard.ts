import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // x-user-id header bypass is strictly restricted to automated test environments (Jest)
    if (process.env.NODE_ENV === 'test') {
      const request = context.switchToHttp().getRequest();
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
