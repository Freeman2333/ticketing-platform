import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { EventDto } from '../public/dto/event.dto';
import { SeatDto } from '../public/dto/seat.dto';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @Public()
  @ApiOkResponse({ type: EventDto, isArray: true })
  listEvents(): Promise<EventDto[]> {
    return this.eventsService.listEvents();
  }

  @Get(':id')
  @Public()
  @ApiOkResponse({ type: EventDto })
  async getEvent(@Param('id') id: string): Promise<EventDto> {
    const event = await this.eventsService.getEvent(id);
    if (!event) throw new NotFoundException();

    return event;
  }

  @Get(':id/seats')
  @Public()
  @ApiOkResponse({ type: SeatDto, isArray: true })
  async getSeats(@Param('id') id: string): Promise<SeatDto[]> {
    const event = await this.eventsService.getEvent(id);
    if (!event) throw new NotFoundException();

    return this.eventsService.getSeatAvailability(id);
  }
}
