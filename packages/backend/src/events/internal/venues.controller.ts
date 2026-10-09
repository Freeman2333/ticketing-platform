import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../generated/prisma/client';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
import { VenueDto } from './dto/venue.dto';
import { VenuesRepository } from './venues.repository';

@Controller('venues')
export class VenuesController {
  constructor(private readonly venuesRepository: VenuesRepository) {}

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
}
