import { Injectable } from '@nestjs/common';
import { Event, Seat } from '../../generated/prisma/client';
import { EventDto } from '../public/dto/event.dto';
import { SeatDto } from '../public/dto/seat.dto';
import { EventsApi } from '../public/events-api.interface';
import { EventsRepository } from './events.repository';
import { SeatsRepository } from './seats.repository';

@Injectable()
export class EventsService implements EventsApi {
  constructor(
    private readonly eventsRepository: EventsRepository,
    private readonly seatsRepository: SeatsRepository,
  ) {}

  async getEvent(id: string): Promise<EventDto | null> {
    const event = await this.eventsRepository.findById(id);
    return event ? this.toEventDto(event) : null;
  }

  async listEvents(filter?: { title?: string }): Promise<EventDto[]> {
    const events = await this.eventsRepository.findMany(filter?.title);
    return events.map((event) => this.toEventDto(event));
  }

  async getSeatAvailability(eventId: string): Promise<SeatDto[]> {
    const seats = await this.seatsRepository.findByEventId(eventId);
    return seats.map((seat) => this.toSeatDto(seat));
  }

  async reserveSeats(): Promise<void> {
    throw new Error('Not implemented - no caller until Orders (Step 3).');
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
