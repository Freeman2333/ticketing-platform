import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Interval } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';
import { OrdersRepository } from './orders.repository';

@Injectable()
export class OutboxPublisherService {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    @Inject('ORDERS_QUEUE_CLIENT') private readonly ordersQueueClient: ClientProxy,
    @Inject('NOTIFICATIONS_QUEUE_CLIENT')
    private readonly notificationsQueueClient: ClientProxy,
  ) {}

  @Interval(5000)
  async publishUnpublishedEvents(): Promise<void> {
    const events = await this.ordersRepository.findUnpublishedOutboxEvents();

    for (const event of events) {
      const client =
        event.eventType === 'order.issued'
          ? this.notificationsQueueClient
          : this.ordersQueueClient;

      await firstValueFrom(client.emit(event.eventType, event.payload));
      await this.ordersRepository.markOutboxEventPublished(event.id);
    }
  }
}
