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

  @ApiProperty({ nullable: true })
  posterUrl!: string | null;
}
