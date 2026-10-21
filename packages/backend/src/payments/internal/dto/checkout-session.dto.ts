import { ApiProperty } from '@nestjs/swagger';

export class CheckoutSessionDto {
  @ApiProperty()
  url!: string;
}
