import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { EVENTS_API } from '../../events/public/events-api.interface';
import type { EventsApi } from '../../events/public/events-api.interface';
import { OrdersRepository } from './orders.repository';
import { TicketQrService } from './ticket-qr.service';
import type { OrdersApi } from '../public/orders-api.interface';

const HOLD_DURATION_MS = 5 * 60 * 1000;

@Injectable()
export class OrdersService implements OrdersApi {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly ticketQrService: TicketQrService,
    @Inject(EVENTS_API) private readonly eventsApi: EventsApi,
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

  async handlePaymentSucceeded(orderId: string): Promise<void> {
    const order = await this.ordersRepository.findById(orderId);
    if (!order || order.status !== 'reserved') {
      console.log('Order already processed or not found, skipping.');
      return;
    }

    await this.eventsApi.markSeatsBooked(
      order.eventId,
      order.items.map((item) => item.seatId),
    );

    await this.ordersRepository.markPaidAndCreateOutboxEvent(
      orderId,
      'order.paid',
      { orderId, orderItemIds: order.items.map((item) => item.id) },
    );
  }

  async issueTickets(orderId: string): Promise<void> {
    const order = await this.ordersRepository.findById(orderId);
    if (!order || order.status !== 'paid') {
      console.log('Order already processed or not found, skipping.');
      return;
    }

    const tickets = await Promise.all(
      order.items.map(async (item) => {
        const id = randomUUID();
        const qrCodeRef = await this.ticketQrService.generateAndUpload(id);
        return { id, orderItemId: item.id, qrCodeRef };
      }),
    );

    await this.ordersRepository.markIssuedAndCreateTickets(orderId, tickets);
  }
}
