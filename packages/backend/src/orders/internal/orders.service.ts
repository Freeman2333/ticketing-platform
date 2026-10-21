import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AUTH_API } from '../../auth/public/auth-api.interface';
import type { AuthApi } from '../../auth/public/auth-api.interface';
import { EVENTS_API } from '../../events/public/events-api.interface';
import type { EventsApi } from '../../events/public/events-api.interface';
import { OrderCreatedEvent } from './domain-events/order-created.event';
import { OrdersRepository } from './orders.repository';

const HOLD_DURATION_MS = 5 * 60 * 1000;

@Injectable()
export class OrdersService {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    @Inject(EVENTS_API) private readonly eventsApi: EventsApi,
    @Inject(AUTH_API) private readonly authApi: AuthApi,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createOrder(userId: string, eventId: string, seatIds: string[]) {
    const event = await this.eventsApi.getEvent(eventId);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

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
      event.title,
      event.startsAt,
      selectedSeats.map((seat) => ({
        seatId: seat.id,
        seatLabel: seat.label,
        price: seat.price,
      })),
    );

    try {
      await this.eventsApi.reserveSeats(eventId, seatIds);
    } catch (error) {
      await this.ordersRepository.markCancelled(order.id);
      throw error;
    }

    const reservedUntil = new Date(Date.now() + HOLD_DURATION_MS);
    const reservedOrder = await this.ordersRepository.markReserved(
      order.id,
      reservedUntil,
    );

    const user = await this.authApi.getUserById(userId);
    if (user) {
      this.eventEmitter.emit(
        'order.created',
        new OrderCreatedEvent(
          order.id,
          userId,
          user.email,
          eventId,
          event.title,
          selectedSeats.map((seat) => seat.label),
        ),
      );
    }

    return reservedOrder;
  }

  listOrders(userId: string) {
    return this.ordersRepository.findByUserId(userId);
  }

  getOrder(orderId: string) {
    return this.ordersRepository.findById(orderId);
  }

  async cancelOrder(orderId: string) {
    const order = await this.ordersRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException();
    }
    if (order.status !== 'reserved') {
      throw new ConflictException('Only a reserved order can be cancelled');
    }

    await this.eventsApi.releaseSeats(
      order.eventId,
      order.items.map((item) => item.seatId),
    );
    return this.ordersRepository.markCancelled(orderId);
  }
}
