import { ApiProperty } from '@nestjs/swagger';
import { SeatTypeDto } from './seat-type.dto';

export class SeatTypeWithCountsDto extends SeatTypeDto {
  @ApiProperty()
  availableCount!: number;

  @ApiProperty()
  heldCount!: number;

  @ApiProperty()
  bookedCount!: number;
}
