import { ApiProperty } from '@nestjs/swagger';

export class SeatTypeDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  eventId!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  price!: number;
}
