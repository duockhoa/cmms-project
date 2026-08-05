import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // In test environment, we bypass real Keycloak JWT verify and mock the user
    // if a special x-test-user-id header is provided, or let standard strategy handle it.
    if (process.env.NODE_ENV === 'test') {
      const request = context.switchToHttp().getRequest();
      const testUserId = request.headers['x-test-user-id'] || request.headers['x-user-id'];
      if (testUserId) {
        // Mock token payload data structure
        request.user = {
          id: testUserId,
          email: `${testUserId}@test.com`,
          name: 'Test Actor',
          roles: request.headers['x-test-roles'] 
            ? request.headers['x-test-roles'].split(',') 
            : ['TECHNICIAN'],
          scope: 'all',
        };
        return true;
      }
    }
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Authentication token is missing, expired, or invalid.');
    }
    return user;
  }
}
