import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '../../../generated/prisma/client';
import { OrderItemDto } from './order-item.dto';

export class OrderDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  eventId!: string;

  @ApiProperty()
  eventTitle!: string;

  @ApiProperty()
  eventStartsAt!: Date;

  @ApiProperty({ enum: OrderStatus })
  status!: OrderStatus;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  reservedUntil!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ type: OrderItemDto, isArray: true })
  items!: OrderItemDto[];
}
