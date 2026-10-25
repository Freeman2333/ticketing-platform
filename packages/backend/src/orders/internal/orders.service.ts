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
import { TicketPdfService } from './ticket-pdf.service';
import { TicketQrService } from './ticket-qr.service';
import type { OrdersApi } from '../public/orders-api.interface';

const HOLD_DURATION_MS = 5 * 60 * 1000;

type OrderWithItemsAndTickets = NonNullable<
  Awaited<ReturnType<OrdersRepository['findById']>>
>;

@Injectable()
export class OrdersService implements OrdersApi {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly ticketQrService: TicketQrService,
    private readonly ticketPdfService: TicketPdfService,
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

    return this.toOrderDto(reservedOrder);
  }

  async listOrders(userId: string) {
    const orders = await this.ordersRepository.findByUserId(userId);
    return orders.map((order) => this.toOrderDto(order));
  }

  async getOrder(orderId: string) {
    const order = await this.ordersRepository.findById(orderId);
    return order ? this.toOrderDto(order) : null;
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
    return this.toOrderDto(await this.ordersRepository.markCancelled(orderId));
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

  private toOrderDto(order: OrderWithItemsAndTickets) {
    return {
      ...order,
      tickets: order.items
        .filter((item) => item.ticket)
        .map((item) => ({
          id: item.ticket!.id,
          seatLabel: item.seatLabel,
        })),
    };
  }

  async issueTickets(orderId: string): Promise<void> {
    const order = await this.ordersRepository.findById(orderId);
    if (!order || order.status !== 'paid') {
      console.log('Order already processed or not found, skipping.');
      return;
    }

    const tickets = order.items.map((item) => ({
      id: randomUUID(),
      orderItemId: item.id,
      seatLabel: item.seatLabel,
    }));

    const seats = await Promise.all(
      tickets.map(async (ticket) => ({
        seatLabel: ticket.seatLabel,
        qrBuffer: await this.ticketQrService.generateBuffer(ticket.id),
      })),
    );

    const ticketsPdfUrl = await this.ticketPdfService.generateAndUpload(
      orderId,
      order.eventTitle,
      order.eventStartsAt,
      seats,
    );

    await this.ordersRepository.markIssuedAndCreateTickets(
      orderId,
      ticketsPdfUrl,
      tickets.map(({ id, orderItemId }) => ({ id, orderItemId })),
    );
  }
}
