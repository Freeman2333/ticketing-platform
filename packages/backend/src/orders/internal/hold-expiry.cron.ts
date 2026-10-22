import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EVENTS_API } from '../../events/public/events-api.interface';
import type { EventsApi } from '../../events/public/events-api.interface';
import { OrdersRepository } from './orders.repository';

@Injectable()
export class HoldExpiryCron {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    @Inject(EVENTS_API) private readonly eventsApi: EventsApi,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async releaseExpiredHolds(): Promise<void> {
    const expiredOrders = await this.ordersRepository.findExpiredReserved();

    for (const order of expiredOrders) {
      const seatIds = order.items.map((item) => item.seatId);
      await this.eventsApi.releaseSeats(order.eventId, seatIds);
      await this.ordersRepository.markCancelled(order.id);
    }
  }
}
