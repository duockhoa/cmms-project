import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { parseDepartmentList } from '../../common/utils/rbac.helper';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    const { userId, role, department } = client.handshake.query;

    if (userId) {
      client.join(`user:${userId}`);
    }
    if (role) {
      client.join(`role:${role}`);
    }
    if (department) {
      // Decode URI parameter just in case of Vietnamese accents in query string
      const deptStr = decodeURIComponent(department as string);
      for (const dept of parseDepartmentList(deptStr)) {
        client.join(`dept:${dept}`);
      }
    }
    client.join('global');

    console.log(`[WEBSOCKET] Client connected: ${client.id}. Query: userId=${userId}, role=${role}, department=${department}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`[WEBSOCKET] Client disconnected: ${client.id}`);
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
    this.server.to('global').emit('data:changed', payload);

    if (payload.department) {
      this.server.to(`dept:${payload.department}`).emit('data:changed', payload);
    }
    if (payload.userId) {
      this.server.to(`user:${payload.userId}`).emit('data:changed', payload);
    }
  }
}
