import { ConflictException, Injectable } from '@nestjs/common';
import { Event, Seat } from '../../generated/prisma/client';
import { EventDto } from '../public/dto/event.dto';
import { EventListDto } from '../public/dto/event-list.dto';
import { RecentlyViewedDto } from '../public/dto/recently-viewed.dto';
import { SeatDto } from '../public/dto/seat.dto';
import { EventsApi } from '../public/events-api.interface';
import { EventViewsRepository } from './event-views.repository';
import { EventsRepository } from './events.repository';
import { SeatsRepository } from './seats.repository';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const RECENTLY_VIEWED_TOTAL = 4;

@Injectable()
export class EventsService implements EventsApi {
  constructor(
    private readonly eventsRepository: EventsRepository,
    private readonly seatsRepository: SeatsRepository,
    private readonly eventViewsRepository: EventViewsRepository,
  ) {}

  async getEvent(id: string): Promise<EventDto | null> {
    const event = await this.eventsRepository.findById(id);
    return event ? this.toEventDto(event) : null;
  }

  async listEvents(filter?: {
    title?: string;
    page?: number;
    limit?: number;
  }): Promise<EventListDto> {
    const limit = filter?.limit ?? DEFAULT_LIMIT;
    const page = filter?.page ?? DEFAULT_PAGE;
    const events = await this.eventsRepository.findMany(
      filter?.title,
      (page - 1) * limit,
      limit + 1,
    );
    const hasMore = events.length > limit;
    const items = hasMore ? events.slice(0, limit) : events;
    return { items: items.map((event) => this.toEventDto(event)), hasMore };
  }

  async getSeatAvailability(eventId: string): Promise<SeatDto[]> {
    const seats = await this.seatsRepository.findByEventId(eventId);
    return seats.map((seat) => this.toSeatDto(seat));
  }

  async reserveSeats(eventId: string, seatIds: string[]): Promise<void> {
    await this.seatsRepository.holdIfAvailable(eventId, seatIds);
  }

  async createSeats(
    eventId: string,
    rows: { label: string; count: number; price: number }[],
  ): Promise<SeatDto[]> {
    const existingSeats = await this.seatsRepository.findByEventId(eventId);
    if (existingSeats.length > 0) {
      throw new ConflictException('Event already has seats');
    }

    const seatsToCreate = rows.flatMap((row) =>
      Array.from({ length: row.count }, (_, i) => ({
        label: `${row.label}${i + 1}`,
        price: row.price,
      })),
    );

    const seats = await this.seatsRepository.createMany(eventId, seatsToCreate);
    return seats.map((seat) => this.toSeatDto(seat));
  }

  async recordView(
    eventId: string,
    identity: { userId?: string; anonId?: string },
  ): Promise<void> {
    if (identity.userId) {
      await this.eventViewsRepository.recordByUserId(identity.userId, eventId);
      return;
    }
    if (identity.anonId) {
      await this.eventViewsRepository.recordByAnonId(identity.anonId, eventId);
    }
  }

  async mergeAnonymousViews(anonId: string, userId: string): Promise<void> {
    await this.eventViewsRepository.mergeAnonymousViews(anonId, userId);
  }

  async getRecentlyViewed(identity: {
    userId?: string;
    anonId?: string;
  }): Promise<RecentlyViewedDto> {
    const recentEvents = await this.eventViewsRepository.findRecentlyViewed(
      identity,
      RECENTLY_VIEWED_TOTAL,
    );

    const remaining = RECENTLY_VIEWED_TOTAL - recentEvents.length;
    const upcomingEvents =
      remaining > 0
        ? await this.eventsRepository.findUpcoming(
            recentEvents.map((event) => event.id),
            remaining,
          )
        : [];

    return {
      recentlyViewed: recentEvents.map((event) => this.toEventDto(event)),
      upcoming: upcomingEvents.map((event) => this.toEventDto(event)),
    };
  }

  async createEvent(
    venueId: string,
    title: string,
    startsAt: Date,
  ): Promise<EventDto> {
    const event = await this.eventsRepository.create(venueId, title, startsAt);
    return this.toEventDto(event);
  }

  async updateEvent(
    id: string,
    data: { title?: string; startsAt?: Date },
  ): Promise<EventDto> {
    const event = await this.eventsRepository.update(id, data);
    return this.toEventDto(event);
  }

  async setPosterUrl(id: string, posterUrl: string): Promise<EventDto> {
    const event = await this.eventsRepository.update(id, { posterUrl });
    return this.toEventDto(event);
  }

  private toEventDto(event: Event): EventDto {
    return {
      id: event.id,
      venueId: event.venueId,
      title: event.title,
      startsAt: event.startsAt,
      posterUrl: event.posterUrl,
    };
  }

  private toSeatDto(seat: Seat): SeatDto {
    return {
      id: seat.id,
      eventId: seat.eventId,
      label: seat.label,
      status: seat.status,
      price: seat.price,
    };
  }
}
