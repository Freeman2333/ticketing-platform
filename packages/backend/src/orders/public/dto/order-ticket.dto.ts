import { ApiProperty } from '@nestjs/swagger';

export class OrderTicketDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  seatLabel!: string;

  @ApiProperty()
  qrCodeUrl!: string;
}
