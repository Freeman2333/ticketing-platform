import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(orderId: string, stripeSessionId: string, amount: number) {
    return this.prisma.payment.create({
      data: { orderId, stripeSessionId, amount },
    });
  }

  findByStripeSessionId(stripeSessionId: string) {
    return this.prisma.payment.findUnique({ where: { stripeSessionId } });
  }

  markSucceededAndCreateOutboxEvent(
    paymentId: string,
    eventType: string,
    payload: object,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: paymentId },
        data: { status: 'succeeded' },
      });
      await tx.outboxEvent.create({ data: { eventType, payload } });
    });
  }

  findUnpublished() {
    return this.prisma.outboxEvent.findMany({
      where: { publishedAt: null },
    });
  }

  markPublished(outboxEventId: string) {
    return this.prisma.outboxEvent.update({
      where: { id: outboxEventId },
      data: { publishedAt: new Date() },
    });
  }
}
