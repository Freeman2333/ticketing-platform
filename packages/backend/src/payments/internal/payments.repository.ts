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
}
