import { Injectable } from '@nestjs/common';
import { Event, Seat } from '../../generated/prisma/client';
import { EventDto } from '../public/dto/event.dto';
import { EventListDto } from '../public/dto/event-list.dto';
import { SeatDto } from '../public/dto/seat.dto';
import { EventsApi } from '../public/events-api.interface';
import { EventViewsRepository } from './event-views.repository';
import { EventsRepository } from './events.repository';
import { SeatsRepository } from './seats.repository';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

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

  async reserveSeats(): Promise<void> {
    throw new Error('Not implemented - no caller until Orders (Step 3).');
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
