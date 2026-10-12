import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EventViewsRepository {
  constructor(private readonly prisma: PrismaService) {}

  recordByUserId(userId: string, eventId: string) {
    return this.prisma.eventView.upsert({
      where: { userId_eventId: { userId, eventId } },
      create: { userId, eventId },
      update: { viewedAt: new Date() },
    });
  }

  recordByAnonId(anonId: string, eventId: string) {
    return this.prisma.eventView.upsert({
      where: { anonId_eventId: { anonId, eventId } },
      create: { anonId, eventId },
      update: { viewedAt: new Date() },
    });
  }
}
