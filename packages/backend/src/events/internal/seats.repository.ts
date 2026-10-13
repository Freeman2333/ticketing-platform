import { Injectable } from '@nestjs/common';
import { SeatStatus } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SeatsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEventId(eventId: string) {
    return this.prisma.seat.findMany({ where: { eventId } });
  }

  createMany(eventId: string, seats: { label: string; price: number }[]) {
    return this.prisma.seat.createManyAndReturn({
      data: seats.map((seat) => ({
        eventId,
        label: seat.label,
        price: seat.price,
      })),
    });
  }

  updateStatus(seatIds: string[], status: SeatStatus) {
    return this.prisma.seat.updateMany({
      where: { id: { in: seatIds } },
      data: { status },
    });
  }
}
