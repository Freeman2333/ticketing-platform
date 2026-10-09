import { ApiProperty } from '@nestjs/swagger';

export class VenueDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  organizerId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  address!: string;
}
