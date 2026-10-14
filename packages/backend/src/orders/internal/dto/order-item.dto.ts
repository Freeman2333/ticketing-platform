import { ApiProperty } from '@nestjs/swagger';

export class OrderItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  seatId!: string;

  @ApiProperty()
  price!: number;
}
