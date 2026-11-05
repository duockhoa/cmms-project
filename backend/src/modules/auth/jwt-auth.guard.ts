import { ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { isObservable, lastValueFrom } from 'rxjs';
import { timingSafeEqual } from 'crypto';
import { getRoutePolicy, AUTHENTICATED_REQUEST } from '../../common/auth/route-policy';
import { hasPermission } from '../../common/utils/rbac.helper';
import { ResourceAccessService } from '../../common/auth/resource-access.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private resources: ResourceAccessService) { super(); }
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    if (request[AUTHENTICATED_REQUEST]) return true;
    const key = `${context.getClass().name}.${context.getHandler().name}`;
    const policy = getRoutePolicy(context.getClass().name, context.getHandler().name);
    if (!policy) throw new ForbiddenException('API access policy is not configured.');
    if (policy.public) return true;
    const apiKey = request.headers?.['x-api-key'];
    if (apiKey) {
      const configured = process.env.EVN_SYNC_API_KEY;
      if (typeof apiKey !== 'string' || !configured || Buffer.byteLength(apiKey) !== Buffer.byteLength(configured) ||
          !timingSafeEqual(Buffer.from(apiKey), Buffer.from(configured))) throw new UnauthorizedException('Invalid API key.');
      if (policy.machine !== 'evn' || key !== 'UtilitiesController.syncEvnReadings' || request.method !== 'POST') {
        throw new ForbiddenException('Machine identity is not allowed on this API.');
      }
      request.user = { id: 'system-evn-bot', name: 'EVN Auto-Sync Bot', role: 'SERVICE', roles: [],
        isActive: true, kind: 'machine', customPermissions: JSON.stringify(['utilities:record']) };
    } else {
      const result = super.canActivate(context);
      const authenticated = isObservable(result) ? await lastValueFrom(result) : await result;
      if (!authenticated || !request.user) throw new UnauthorizedException('Authentication required.');
    }
    if (policy.any?.length && !policy.any.some(permission => hasPermission(request.user, permission))) {
      throw new ForbiddenException('Permission denied.');
    }
    if (request.user.kind !== 'machine') await this.resources.assertRequest(context.getClass().name, request);
    request[AUTHENTICATED_REQUEST] = true;
    return true;
  }
  handleRequest(error: any, user: any) {
    if (error || !user) throw error || new UnauthorizedException('Invalid or expired session.');
    return user;
  }
}
