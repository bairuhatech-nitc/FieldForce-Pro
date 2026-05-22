import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { AgentLocation } from './agent_locations.entity';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'agent-locations',
})
export class AgentLocationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AgentLocationsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_tenant_room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tenantId: string },
  ) {
    if (data?.tenantId) {
      const room = `tenant_${data.tenantId}_locations`;
      client.join(room);
      this.logger.log(`Client ${client.id} joined room: ${room}`);
      return { event: 'joinedRoom', data: room };
    }
    return { event: 'error', data: 'Tenant ID required' };
  }

  @SubscribeMessage('leave_tenant_room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tenantId: string },
  ) {
    if (data?.tenantId) {
      const room = `tenant_${data.tenantId}_locations`;
      client.leave(room);
      this.logger.log(`Client ${client.id} left room: ${room}`);
      return { event: 'leftRoom', data: room };
    }
  }

  broadcastLocationUpdate(tenantId: string, location: AgentLocation | AgentLocation[]) {
    const room = `tenant_${tenantId}_locations`;
    this.server.to(room).emit('agent_location_updated', location);
    this.logger.debug(`Broadcasted location update to room: ${room}`);
  }
}
