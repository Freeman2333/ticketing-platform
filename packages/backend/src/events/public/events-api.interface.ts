import { EventDto } from './dto/event.dto';
import { EventListDto } from './dto/event-list.dto';
import { SeatDto } from './dto/seat.dto';

export interface EventsApi {
  getEvent(id: string): Promise<EventDto | null>;
  listEvents(filter?: {
    title?: string;
    page?: number;
    limit?: number;
  }): Promise<EventListDto>;
  getSeatAvailability(eventId: string): Promise<SeatDto[]>;
  reserveSeats(eventId: string, seatIds: string[]): Promise<void>;
  releaseSeats(seatIds: string[]): Promise<void>;
  mergeAnonymousViews(anonId: string, userId: string): Promise<void>;
}

export const EVENTS_API = Symbol('EVENTS_API');
