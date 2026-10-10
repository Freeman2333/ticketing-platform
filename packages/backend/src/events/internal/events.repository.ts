import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EventsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.event.findUnique({ where: { id } });
  }

  findMany(titleContains?: string) {
    return this.prisma.event.findMany({
      where: titleContains
        ? { title: { contains: titleContains, mode: 'insensitive' } }
        : undefined,
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
