import { ConflictException, Injectable } from '@nestjs/common';
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

  aggregateByVenueId(venueId: string) {
    return this.prisma.seat.aggregate({
      where: { event: { venueId }, status: 'booked' },
      _count: true,
      _sum: { price: true },
    });
  }

  async holdIfAvailable(eventId: string, seatIds: string[]): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.seat.updateMany({
        where: { id: { in: seatIds }, eventId, status: 'available' },
        data: { status: 'held' },
      });
      if (result.count !== seatIds.length) {
        throw new ConflictException(
          'One or more selected seats are no longer available',
        );
      }
    });
  }
}
