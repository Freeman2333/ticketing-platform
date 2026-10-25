import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    userId: string,
    eventId: string,
    eventTitle: string,
    eventStartsAt: Date,
    items: { seatId: string; seatLabel: string; price: number }[],
  ) {
    return this.prisma.order.create({
      data: {
        userId,
        eventId,
        eventTitle,
        eventStartsAt,
        items: { create: items },
      },
      include: { items: { include: { ticket: true } } },
    });
  }

  markReserved(orderId: string, reservedUntil: Date) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'reserved', reservedUntil },
      include: { items: { include: { ticket: true } } },
    });
  }

  markCancelled(orderId: string) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'cancelled' },
      include: { items: { include: { ticket: true } } },
    });
  }

  markPaidAndCreateOutboxEvent(
    orderId: string,
    eventType: string,
    payload: object,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'paid' },
      });
      await tx.ordersOutboxEvent.create({ data: { eventType, payload } });
    });
  }

  markIssuedAndCreateTickets(
    orderId: string,
    ticketsPdfUrl: string,
    tickets: { id: string; orderItemId: string }[],
    outboxPayload: object,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'issued', ticketsPdfUrl },
      });
      await tx.ticket.createMany({ data: tickets });
      await tx.ordersOutboxEvent.create({
        data: { eventType: 'order.issued', payload: outboxPayload },
      });
    });
  }

  findByUserId(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: { items: { include: { ticket: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(orderId: string) {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { ticket: true } } },
    });
  }

  findExpiredReserved() {
    return this.prisma.order.findMany({
      where: { status: 'reserved', reservedUntil: { lt: new Date() } },
      include: { items: { include: { ticket: true } } },
    });
  }

  findUnpublishedOutboxEvents() {
    return this.prisma.ordersOutboxEvent.findMany({
      where: { publishedAt: null },
    });
  }

  markOutboxEventPublished(outboxEventId: string) {
    return this.prisma.ordersOutboxEvent.update({
      where: { id: outboxEventId },
      data: { publishedAt: new Date() },
    });
  }
}
