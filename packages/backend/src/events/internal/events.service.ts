import { ConflictException, Injectable } from '@nestjs/common';
import { Event, Seat } from '../../generated/prisma/client';
import { EventDto } from '../public/dto/event.dto';
import { EventListDto } from '../public/dto/event-list.dto';
import { RecentlyViewedDto } from '../public/dto/recently-viewed.dto';
import { SeatDto } from '../public/dto/seat.dto';
import { EventsApi } from '../public/events-api.interface';
import { EventViewsRepository } from './event-views.repository';
import { EventsGateway } from './events.gateway';
import { EventsRepository } from './events.repository';
import { paginate } from './paginate';
import { SeatLockService } from './seat-lock.service';
import { SeatsRepository } from './seats.repository';
import { RedisService } from '../../redis/redis.service';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const RECENTLY_VIEWED_TOTAL = 4;
const CACHE_TTL_SECONDS = 30;

@Injectable()
export class EventsService implements EventsApi {
  constructor(
    private readonly eventsRepository: EventsRepository,
    private readonly seatsRepository: SeatsRepository,
    private readonly eventViewsRepository: EventViewsRepository,
    private readonly eventsGateway: EventsGateway,
    private readonly seatLockService: SeatLockService,
    private readonly redis: RedisService,
  ) {}

  async getEvent(id: string): Promise<EventDto | null> {
    const cacheKey = `cache:event:${id}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const event = await this.eventsRepository.findById(id);
    const dto = event ? this.toEventDto(event) : null;
    if (dto) {
      await this.redis.set(cacheKey, JSON.stringify(dto), 'EX', CACHE_TTL_SECONDS);
    }
    return dto;
  }

  async listEvents(filter?: {
    title?: string;
    page?: number;
    limit?: number;
  }): Promise<EventListDto> {
    const limit = filter?.limit ?? DEFAULT_LIMIT;
    const page = filter?.page ?? DEFAULT_PAGE;
    const cacheKey = `cache:events:list:${filter?.title ?? ''}:${page}:${limit}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const { items: events, hasMore } = await paginate(
      (skip, take) => this.eventsRepository.findMany(filter?.title, skip, take),
      page,
      limit,
    );
    const result = { items: events.map((event) => this.toEventDto(event)), hasMore };
    await this.redis.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL_SECONDS);
    return result;
  }

  async listMyEvents(
    organizerId: string,
    filter?: { page?: number; limit?: number },
  ): Promise<EventListDto> {
    const limit = filter?.limit ?? DEFAULT_LIMIT;
    const page = filter?.page ?? DEFAULT_PAGE;

    const { items, hasMore } = await paginate(
      (skip, take) =>
        this.eventsRepository.findByOrganizerId(organizerId, skip, take),
      page,
      limit,
    );
    return { items: items.map((event) => this.toEventDto(event)), hasMore };
  }

  async getSeatAvailability(eventId: string): Promise<SeatDto[]> {
    const seats = await this.seatsRepository.findByEventId(eventId);
    return seats.map((seat) => this.toSeatDto(seat));
  }

  async reserveSeats(eventId: string, seatIds: string[]): Promise<void> {
    const token = await this.seatLockService.acquireAll(eventId, seatIds);
    if (!token) {
      throw new ConflictException(
        'One or more selected seats are no longer available',
      );
    }

    try {
      await this.seatsRepository.holdIfAvailable(eventId, seatIds);
    } finally {
      await this.seatLockService.releaseAll(eventId, seatIds, token);
    }

    const seats = await this.getSeatAvailability(eventId);
    this.eventsGateway.broadcastSeatsUpdated(eventId, seats);
  }

  async releaseSeats(eventId: string, seatIds: string[]): Promise<void> {
    await this.seatsRepository.updateStatus(seatIds, 'available');
    const seats = await this.getSeatAvailability(eventId);
    this.eventsGateway.broadcastSeatsUpdated(eventId, seats);
  }

  async markSeatsBooked(eventId: string, seatIds: string[]): Promise<void> {
    await this.seatsRepository.updateStatus(seatIds, 'booked');
    const seats = await this.getSeatAvailability(eventId);
    this.eventsGateway.broadcastSeatsUpdated(eventId, seats);
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
    await this.redis.del(`cache:event:${id}`);
    return this.toEventDto(event);
  }

  async setPosterUrl(id: string, posterUrl: string): Promise<EventDto> {
    const event = await this.eventsRepository.update(id, { posterUrl });
    await this.redis.del(`cache:event:${id}`);
    return this.toEventDto(event);
  }

  private toEventDto(event: Event): EventDto {
    return {
      id: event.id,
      venueId: event.venueId,
      title: event.title,
      description: event.description,
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
