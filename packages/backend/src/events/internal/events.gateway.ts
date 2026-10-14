import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SeatDto } from '../public/dto/seat.dto';

@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_ORIGIN, credentials: true },
})
export class EventsGateway {
  @WebSocketServer()
  server!: Server;

  broadcastSeatsUpdated(eventId: string, seats: SeatDto[]) {
    this.server.to(`event:${eventId}`).emit('seatsUpdated', seats);
  }

  @SubscribeMessage('joinEvent')
  joinEvent(
    @MessageBody() eventId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`event:${eventId}`);
  }

  @SubscribeMessage('leaveEvent')
  leaveEvent(
    @MessageBody() eventId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`event:${eventId}`);
  }
}
