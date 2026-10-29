import { Module } from '@nestjs/common';
import { EventViewsRepository } from './internal/event-views.repository';
import { EventsController } from './internal/events.controller';
import { EventsGateway } from './internal/events.gateway';
import { EventsRepository } from './internal/events.repository';
import { EventsService } from './internal/events.service';
import { PosterStorageService } from './internal/poster-storage.service';
import { SeatLockService } from './internal/seat-lock.service';
import { SeatTypesRepository } from './internal/seat-types.repository';
import { SeatsRepository } from './internal/seats.repository';
import { VenuesController } from './internal/venues.controller';
import { VenuesRepository } from './internal/venues.repository';
import { EVENTS_API } from './public/events-api.interface';

@Module({
  controllers: [EventsController, VenuesController],
  providers: [
    EventsService,
    EventsGateway,
    EventsRepository,
    EventViewsRepository,
    PosterStorageService,
    SeatLockService,
    SeatTypesRepository,
    SeatsRepository,
    VenuesRepository,
    { provide: EVENTS_API, useExisting: EventsService },
  ],
  exports: [EVENTS_API],
})
export class EventsModule {}
