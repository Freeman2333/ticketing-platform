import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EventRevenueRepository {
  constructor(private readonly prisma: PrismaService) {}

  async recordIfNew(
    orderId: string,
    eventId: string,
    amount: number,
  ): Promise<void> {
    try {
      await this.prisma.eventRevenueEntry.create({
        data: { orderId, eventId, amount },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return;
      }
      throw error;
    }
  }

  sumByEventIds(eventIds: string[]) {
    return this.prisma.eventRevenueEntry.aggregate({
      where: { eventId: { in: eventIds } },
      _sum: { amount: true },
    });
  }
}
