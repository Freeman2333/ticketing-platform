import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/client';
import { EventDto } from '../public/dto/event.dto';
import { SeatDto } from '../public/dto/seat.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventsService } from './events.service';
import { PosterStorageService } from './poster-storage.service';
import { processPosterImage } from './process-poster-image';
import { VenuesRepository } from './venues.repository';

@Controller('events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly venuesRepository: VenuesRepository,
    private readonly posterStorageService: PosterStorageService,
  ) {}

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

  @Post()
  @Roles(Role.organizer)
  @ApiBearerAuth()
  @ApiCreatedResponse({ type: EventDto })
  async create(
    @Body() dto: CreateEventDto,
    @Req() req: Request,
  ): Promise<EventDto> {
    const venue = await this.venuesRepository.findById(dto.venueId);
    if (!venue || venue.organizerId !== req.user!.sub) {
      throw new NotFoundException();
    }

    return this.eventsService.createEvent(
      dto.venueId,
      dto.title,
      new Date(dto.startsAt),
    );
  }

  @Patch(':id')
  @Roles(Role.organizer)
  @ApiBearerAuth()
  @ApiOkResponse({ type: EventDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
    @Req() req: Request,
  ): Promise<EventDto> {
    const event = await this.eventsService.getEvent(id);
    if (!event) throw new NotFoundException();

    const venue = await this.venuesRepository.findById(event.venueId);
    if (!venue || venue.organizerId !== req.user!.sub) {
      throw new NotFoundException();
    }

    return this.eventsService.updateEvent(id, {
      title: dto.title,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
    });
  }

  @Post(':id/poster')
  @Roles(Role.organizer)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOkResponse({ type: EventDto })
  @UseInterceptors(FileInterceptor('file'))
  async uploadPoster(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ): Promise<EventDto> {
    const event = await this.eventsService.getEvent(id);
    if (!event) throw new NotFoundException();

    const venue = await this.venuesRepository.findById(event.venueId);
    if (!venue || venue.organizerId !== req.user!.sub) {
      throw new NotFoundException();
    }

    const processed = await processPosterImage(file.buffer);
    const posterUrl = await this.posterStorageService.upload(
      `events/${id}.webp`,
      processed,
      'image/webp',
    );

    return this.eventsService.setPosterUrl(id, posterUrl);
  }
}
