import { ApiProperty } from '@nestjs/swagger';

export class EventDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  venueId!: string;

  @ApiProperty()
  organizerId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty()
  startsAt!: Date;

  @ApiProperty()
  endsAt!: Date;

  @ApiProperty({ type: String, nullable: true })
  posterUrl!: string | null;
}
