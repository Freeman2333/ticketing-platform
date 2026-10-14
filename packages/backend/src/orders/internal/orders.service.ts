import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EVENTS_API } from '../../events/public/events-api.interface';
import type { EventsApi } from '../../events/public/events-api.interface';
import { OrdersRepository } from './orders.repository';

const HOLD_DURATION_MS = 5 * 60 * 1000;

@Injectable()
export class OrdersService {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    @Inject(EVENTS_API) private readonly eventsApi: EventsApi,
  ) {}

  async createOrder(userId: string, eventId: string, seatIds: string[]) {
    const seats = await this.eventsApi.getSeatAvailability(eventId);
    const selectedSeats = seats.filter((seat) => seatIds.includes(seat.id));
    if (selectedSeats.length !== seatIds.length) {
      throw new NotFoundException(
        'One or more seats do not exist for this event',
      );
    }

    const order = await this.ordersRepository.create(
      userId,
      eventId,
      selectedSeats.map((seat) => ({ seatId: seat.id, price: seat.price })),
    );

    try {
      await this.eventsApi.reserveSeats(eventId, seatIds);
    } catch (error) {
      await this.ordersRepository.markCancelled(order.id);
      throw error;
    }

    const reservedUntil = new Date(Date.now() + HOLD_DURATION_MS);
    return this.ordersRepository.markReserved(order.id, reservedUntil);
  }
}
