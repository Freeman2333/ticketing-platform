import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';

@WebSocketGateway()
export class EventsGateway {
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
