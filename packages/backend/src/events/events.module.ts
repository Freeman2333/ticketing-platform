import { Module } from '@nestjs/common';
import { EventsController } from './internal/events.controller';
import { EventsGateway } from './internal/events.gateway';
import { EventsRepository } from './internal/events.repository';
import { EventsService } from './internal/events.service';
import { PosterStorageService } from './internal/poster-storage.service';
import { SeatsRepository } from './internal/seats.repository';
import { VenuesController } from './internal/venues.controller';
import { VenuesRepository } from './internal/venues.repository';

@Module({
  controllers: [EventsController, VenuesController],
  providers: [
    EventsService,
    EventsGateway,
    EventsRepository,
    PosterStorageService,
    SeatsRepository,
    VenuesRepository,
  ],
})
export class EventsModule {}
