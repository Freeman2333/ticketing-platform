import { ApiProperty } from '@nestjs/swagger';

export class VenueStatsDto {
  @ApiProperty()
  ticketsSold!: number;

  @ApiProperty()
  revenue!: number;
}
