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

  async findRecentlyViewed(
    identity: { userId?: string; anonId?: string },
    take: number,
  ) {
    const views = await this.prisma.eventView.findMany({
      where: identity.userId
        ? { userId: identity.userId }
        : { anonId: identity.anonId },
      orderBy: { viewedAt: 'desc' },
      take,
      include: { event: true },
    });
    return views.map((view) => view.event);
  }

  async mergeAnonymousViews(anonId: string, userId: string): Promise<void> {
    const anonViews = await this.prisma.eventView.findMany({
      where: { anonId },
    });
    if (anonViews.length === 0) return;

    await this.prisma.$transaction([
      ...anonViews.map((view) =>
        this.prisma.eventView.upsert({
          where: { userId_eventId: { userId, eventId: view.eventId } },
          create: { userId, eventId: view.eventId, viewedAt: view.viewedAt },
          update: {},
        }),
      ),
      this.prisma.eventView.deleteMany({ where: { anonId } }),
    ]);
  }
}
