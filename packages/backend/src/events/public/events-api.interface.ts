import { EventDto } from './dto/event.dto';
import { SeatDto } from './dto/seat.dto';

export interface EventsApi {
  getEvent(id: string): Promise<EventDto | null>;
  listEvents(filter?: { title?: string }): Promise<EventDto[]>;
  getSeatAvailability(eventId: string): Promise<SeatDto[]>;
  reserveSeats(eventId: string, seatIds: string[]): Promise<void>;
}

export const EVENTS_API = Symbol('EVENTS_API');
