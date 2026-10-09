import { Module } from '@nestjs/common';
import { EventsController } from './internal/events.controller';
import { EventsRepository } from './internal/events.repository';
import { EventsService } from './internal/events.service';
import { SeatsRepository } from './internal/seats.repository';
import { VenuesRepository } from './internal/venues.repository';

@Module({
  controllers: [EventsController],
  providers: [
    EventsService,
    EventsRepository,
    SeatsRepository,
    VenuesRepository,
  ],
})
export class EventsModule {}
