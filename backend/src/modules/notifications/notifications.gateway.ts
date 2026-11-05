import * as passport from 'passport';
import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { parseDepartmentList } from '../../common/utils/rbac.helper';
import { browserOrigin, allowedBrowserOrigins } from '../../common/auth/browser-origin';

@WebSocketGateway({
  cors: {
    origin: browserOrigin,
  },
  namespace: 'notifications',
  allowRequest: (req, callback) => callback(null, !req.headers.origin || allowedBrowserOrigins().has(req.headers.origin)),
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private sessions = new Map<string, ReturnType<typeof setInterval>>();

  private authenticateToken(token: string): Promise<any> {
    return new Promise((resolve, reject) => {
      passport.authenticate('jwt', { session: false }, (error: any, user: any) => {
        if (error || !user) reject(error || new Error('Unauthorized socket'));
        else resolve(user);
      })({ headers: { authorization: `Bearer ${token}` } } as any, {} as any, reject);
    });
  }

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token;
    if (typeof token !== 'string' || !token) { client.disconnect(true); return; }
    try {
      const user = await this.authenticateToken(token);
      if (!client.connected) return;
      client.join(`user:${user.id}`);
      client.join(`role:${user.role}`);
      for (const department of parseDepartmentList(user.managedDepartments || user.department)) client.join(`dept:${department}`);
      client.join('global');
      const signature = JSON.stringify([user.id, user.role, user.managedDepartments, user.department]);
      let verifying = false;
      this.sessions.set(client.id, setInterval(async () => {
        if (verifying) return;
        verifying = true;
        try {
          const current = await this.authenticateToken(token);
          if (JSON.stringify([current.id, current.role, current.managedDepartments, current.department]) !== signature) client.disconnect(true);
        } catch { client.disconnect(true); }
        finally { verifying = false; }
      }, 30000));
    } catch { client.disconnect(true); }
  }

  handleDisconnect(client: Socket) {
    const timer = this.sessions.get(client.id);
    if (timer) clearInterval(timer);
    this.sessions.delete(client.id);
  }

  sendNotificationToRooms(
    userId: string | null,
    role: string | null,
    department: string | null,
    notification: any,
  ) {
    if (!this.server) {
      console.warn('[WEBSOCKET] Server not initialized yet.');
      return;
    }

    if (userId) {
      this.server.to(`user:${userId}`).emit('notification', notification);
    }
    if (role) {
      this.server.to(`role:${role}`).emit('notification', notification);
    }
    if (department) {
      this.server.to(`dept:${department}`).emit('notification', notification);
    }
    if (!userId && !role && !department) {
      this.server.to('global').emit('notification', notification);
    }
  }

  broadcastDataChange(payload: {
    entity: string;
    action: string;
    id?: string;
    department?: string | null;
    role?: string | null;
    userId?: string | null;
    metadata?: any;
  }) {
    if (!this.server) {
      console.warn('[WEBSOCKET] Server not initialized yet.');
      return;
    }

    // Broadcast data change event to all connected clients in 'global'
    this.server.to('global').emit('data:changed', { entity: payload.entity, action: payload.action });

    if (payload.department) {
      this.server.to(`dept:${payload.department}`).emit('data:changed', payload);
    }
    if (payload.userId) {
      this.server.to(`user:${payload.userId}`).emit('data:changed', payload);
    }
  }
}
