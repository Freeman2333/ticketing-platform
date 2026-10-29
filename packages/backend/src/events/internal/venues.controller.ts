import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/client';
import { processPosterImage } from './process-poster-image';
import { PosterStorageService } from './poster-storage.service';
import { SeatsRepository } from './seats.repository';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
import { VenueDto } from './dto/venue.dto';
import { VenueStatsDto } from './dto/venue-stats.dto';
import { VenuesRepository } from './venues.repository';

@Controller('venues')
export class VenuesController {
  constructor(
    private readonly venuesRepository: VenuesRepository,
    private readonly posterStorageService: PosterStorageService,
    private readonly seatsRepository: SeatsRepository,
  ) {}

  @Post()
  @Roles(Role.organizer)
  @ApiBearerAuth()
  @ApiCreatedResponse({ type: VenueDto })
  create(@Body() dto: CreateVenueDto, @Req() req: Request): Promise<VenueDto> {
    return this.venuesRepository.create(req.user!.sub, dto.name, dto.address);
  }

  @Get()
  @Roles(Role.organizer)
  @ApiBearerAuth()
  @ApiOkResponse({ type: VenueDto, isArray: true })
  findMine(@Req() req: Request): Promise<VenueDto[]> {
    return this.venuesRepository.findByOrganizerId(req.user!.sub);
  }

  @Get(':id')
  @Roles(Role.organizer)
  @ApiBearerAuth()
  @ApiOkResponse({ type: VenueDto })
  async findOne(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<VenueDto> {
    const venue = await this.venuesRepository.findById(id);
    if (!venue || venue.organizerId !== req.user!.sub) {
      throw new NotFoundException();
    }

    return venue;
  }

  @Patch(':id')
  @Roles(Role.organizer)
  @ApiBearerAuth()
  @ApiOkResponse({ type: VenueDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateVenueDto,
    @Req() req: Request,
  ): Promise<VenueDto> {
    const venue = await this.venuesRepository.findById(id);
    if (!venue || venue.organizerId !== req.user!.sub) {
      throw new NotFoundException();
    }

    return this.venuesRepository.update(id, dto);
  }

  @Post(':id/image')
  @Roles(Role.organizer)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOkResponse({ type: VenueDto })
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ): Promise<VenueDto> {
    const venue = await this.venuesRepository.findById(id);
    if (!venue || venue.organizerId !== req.user!.sub) {
      throw new NotFoundException();
    }

    const processed = await processPosterImage(file.buffer);
    const imageUrl = await this.posterStorageService.upload(
      `venues/${id}.webp`,
      processed,
      'image/webp',
    );

    return this.venuesRepository.update(id, { imageUrl });
  }

  @Delete(':id')
  @Roles(Role.organizer)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Req() req: Request): Promise<void> {
    const venue = await this.venuesRepository.findById(id);
    if (!venue || venue.organizerId !== req.user!.sub) {
      throw new NotFoundException();
    }

    const eventCount = await this.venuesRepository.countEventsByVenueId(id);
    if (eventCount > 0) {
      throw new ConflictException('Venue still has events');
    }

    await this.venuesRepository.delete(id);
  }

  @Get(':id/stats')
  @Roles(Role.organizer)
  @ApiBearerAuth()
  @ApiOkResponse({ type: VenueStatsDto })
  async getStats(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<VenueStatsDto> {
    const venue = await this.venuesRepository.findById(id);
    if (!venue || venue.organizerId !== req.user!.sub) {
      throw new NotFoundException();
    }

    const ticketsSold = await this.seatsRepository.countBookedByVenueId(id);
    // revenue placeholder until the Part E read-model lands - no longer
    // computable from Seat, which no longer stores price.
    return { ticketsSold, revenue: 0 };
  }
}
