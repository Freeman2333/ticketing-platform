import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
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
  ApiQuery,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { OptionalAuth } from '../../common/decorators/optional-auth.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/client';
import { EventDto } from '../public/dto/event.dto';
import { EventListDto } from '../public/dto/event-list.dto';
import { RecentlyViewedDto } from '../public/dto/recently-viewed.dto';
import { SeatDto } from '../public/dto/seat.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { CreateSeatsDto } from './dto/create-seats.dto';
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
  @ApiQuery({ name: 'title', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ type: EventListDto })
  listEvents(
    @Query('title') title?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<EventListDto> {
    return this.eventsService.listEvents({
      title,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('mine')
  @Roles(Role.organizer)
  @ApiBearerAuth()
  @ApiOkResponse({ type: EventDto, isArray: true })
  listMyEvents(@Req() req: Request): Promise<EventDto[]> {
    return this.eventsService.listMyEvents(req.user!.sub);
  }

  @Get('recently-viewed')
  @OptionalAuth()
  @ApiOkResponse({ type: RecentlyViewedDto })
  getRecentlyViewed(@Req() req: Request): Promise<RecentlyViewedDto> {
    return this.eventsService.getRecentlyViewed({
      userId: req.user?.sub,
      anonId: req.anonId,
    });
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

  @Post(':id/seats')
  @Roles(Role.organizer)
  @ApiBearerAuth()
  @ApiCreatedResponse({ type: SeatDto, isArray: true })
  async createSeats(
    @Param('id') id: string,
    @Body() dto: CreateSeatsDto,
    @Req() req: Request,
  ): Promise<SeatDto[]> {
    const event = await this.eventsService.getEvent(id);
    if (!event) throw new NotFoundException();

    const venue = await this.venuesRepository.findById(event.venueId);
    if (!venue || venue.organizerId !== req.user!.sub) {
      throw new NotFoundException();
    }

    return this.eventsService.createSeats(id, dto.rows);
  }

  @Post(':id/view')
  @OptionalAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async recordView(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<void> {
    const event = await this.eventsService.getEvent(id);
    if (!event) throw new NotFoundException();

    await this.eventsService.recordView(id, {
      userId: req.user?.sub,
      anonId: req.anonId,
    });
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
