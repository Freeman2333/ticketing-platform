import { ApiProperty } from '@nestjs/swagger';
import { SeatStatus } from '../../../generated/prisma/client';

export class SeatDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  eventId!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ enum: SeatStatus })
  status!: SeatStatus;

  @ApiProperty()
  price!: number;
}
