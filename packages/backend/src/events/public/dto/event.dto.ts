import { ApiProperty } from '@nestjs/swagger';

export class EventDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  venueId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  startsAt!: Date;

  @ApiProperty({ type: String, nullable: true })
  posterUrl!: string | null;
}
