import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AUTH_API } from '../../auth/public/auth-api.interface';
import type { AuthApi } from '../../auth/public/auth-api.interface';
import { EVENTS_API } from '../../events/public/events-api.interface';
import type { EventsApi } from '../../events/public/events-api.interface';
import { OrderReservationExpiredEvent } from './domain-events/order-reservation-expired.event';
import { OrdersRepository } from './orders.repository';

@Injectable()
export class HoldExpiryCron {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    @Inject(EVENTS_API) private readonly eventsApi: EventsApi,
    @Inject(AUTH_API) private readonly authApi: AuthApi,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async releaseExpiredHolds(): Promise<void> {
    const expiredOrders = await this.ordersRepository.findExpiredReserved();

    for (const order of expiredOrders) {
      const seatIds = order.items.map((item) => item.seatId);
      await this.eventsApi.releaseSeats(order.eventId, seatIds);
      await this.ordersRepository.markCancelled(order.id);

      const user = await this.authApi.getUserById(order.userId);
      if (user) {
        this.eventEmitter.emit(
          'order.reservation_expired',
          new OrderReservationExpiredEvent(
            order.id,
            order.userId,
            user.email,
            order.eventId,
            order.eventTitle,
            order.items.map((item) => item.seatLabel),
          ),
        );
      }
    }
  }
}
