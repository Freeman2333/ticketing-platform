import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderDto } from './dto/order.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiBearerAuth()
  @ApiCreatedResponse({ type: OrderDto })
  createOrder(
    @Body() dto: CreateOrderDto,
    @Req() req: Request,
  ): Promise<OrderDto> {
    return this.ordersService.createOrder(
      req.user!.sub,
      dto.eventId,
      dto.seatIds,
    );
  }
}
