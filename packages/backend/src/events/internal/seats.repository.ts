import { ConflictException, Injectable } from '@nestjs/common';
import { SeatStatus } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SeatsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEventId(eventId: string) {
    return this.prisma.seat.findMany({
      where: { eventId },
      include: { seatType: true },
    });
  }

  createMany(eventId: string, seatTypeId: string, seats: { label: string }[]) {
    return this.prisma.seat.createManyAndReturn({
      data: seats.map((seat) => ({
        eventId,
        seatTypeId,
        label: seat.label,
      })),
    });
  }

  updateStatus(seatIds: string[], status: SeatStatus) {
    return this.prisma.seat.updateMany({
      where: { id: { in: seatIds } },
      data: { status },
    });
  }

  countBookedByVenueId(venueId: string) {
    return this.prisma.seat.count({
      where: { event: { venueId }, status: 'booked' },
    });
  }

  countBookedByEventId(eventId: string) {
    return this.prisma.seat.count({
      where: { eventId, status: 'booked' },
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
