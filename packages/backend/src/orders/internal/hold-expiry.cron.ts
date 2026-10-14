import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EVENTS_API } from '../../events/public/events-api.interface';
import type { EventsApi } from '../../events/public/events-api.interface';
import { OrderReservationExpiredEvent } from './domain-events/order-reservation-expired.event';
import { OrdersRepository } from './orders.repository';

@Injectable()
export class HoldExpiryCron {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    @Inject(EVENTS_API) private readonly eventsApi: EventsApi,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async releaseExpiredHolds(): Promise<void> {
    const expiredOrders = await this.ordersRepository.findExpiredReserved();

    for (const order of expiredOrders) {
      const seatIds = order.items.map((item) => item.seatId);
      await this.eventsApi.releaseSeats(order.eventId, seatIds);
      await this.ordersRepository.markCancelled(order.id);
      this.eventEmitter.emit(
        'order.reservation_expired',
        new OrderReservationExpiredEvent(
          order.id,
          order.userId,
          order.eventId,
          seatIds,
        ),
      );
    }
  }
}
