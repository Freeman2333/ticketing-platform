import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    userId: string,
    eventId: string,
    items: { seatId: string; price: number }[],
  ) {
    return this.prisma.order.create({
      data: {
        userId,
        eventId,
        items: { create: items },
      },
      include: { items: true },
    });
  }

  markReserved(orderId: string, reservedUntil: Date) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'reserved', reservedUntil },
      include: { items: true },
    });
  }

  markCancelled(orderId: string) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'cancelled' },
    });
  }
}
