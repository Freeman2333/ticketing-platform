import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EventsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.event.findUnique({ where: { id } });
  }

  findMany(titleContains: string | undefined, skip: number, take: number) {
    return this.prisma.event.findMany({
      where: titleContains
        ? { title: { contains: titleContains, mode: 'insensitive' } }
        : undefined,
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
      skip,
      take,
    });
  }

  findByOrganizerId(
    organizerId: string,
    skip: number,
    take: number,
    venueId?: string,
  ) {
    return this.prisma.event.findMany({
      where: { venue: { organizerId }, venueId },
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
      skip,
      take,
    });
  }

  async findIdsByVenueId(venueId: string): Promise<string[]> {
    const events = await this.prisma.event.findMany({
      where: { venueId },
      select: { id: true },
    });
    return events.map((event) => event.id);
  }

  findUpcoming(excludeIds: string[], take: number) {
    return this.prisma.event.findMany({
      where: { id: { notIn: excludeIds } },
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
      take,
    });
  }

  create(venueId: string, title: string, startsAt: Date) {
    return this.prisma.event.create({ data: { venueId, title, startsAt } });
  }

  update(
    id: string,
    data: { title?: string; startsAt?: Date; posterUrl?: string },
  ) {
    return this.prisma.event.update({ where: { id }, data });
  }
}
