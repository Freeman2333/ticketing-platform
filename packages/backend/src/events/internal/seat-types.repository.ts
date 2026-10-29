import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SeatTypesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEventId(eventId: string) {
    return this.prisma.seatType.findMany({
      where: { eventId },
      include: { seats: { select: { status: true } } },
    });
  }

  findById(id: string) {
    return this.prisma.seatType.findUnique({ where: { id } });
  }

  createMany(
    eventId: string,
    rows: { label: string; count: number; price: number }[],
  ) {
    return this.prisma.$transaction(
      rows.map((row) =>
        this.prisma.seatType.create({
          data: {
            eventId,
            label: row.label,
            price: row.price,
            seats: {
              create: Array.from({ length: row.count }, (_, i) => ({
                eventId,
                label: `${row.label}${i + 1}`,
              })),
            },
          },
        }),
      ),
    );
  }

  updatePrice(id: string, price: number) {
    return this.prisma.seatType.update({ where: { id }, data: { price } });
  }
}
