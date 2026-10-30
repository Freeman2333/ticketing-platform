import { ApiProperty } from '@nestjs/swagger';

export class EventStatsDto {
  @ApiProperty()
  ticketsSold!: number;

  @ApiProperty()
  revenue!: number;
}
