import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderDto } from './dto/order.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(ThrottlerGuard)
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

  @Get()
  @ApiBearerAuth()
  @ApiOkResponse({ type: OrderDto, isArray: true })
  listOrders(@Req() req: Request): Promise<OrderDto[]> {
    return this.ordersService.listOrders(req.user!.sub);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOkResponse({ type: OrderDto })
  async getOrder(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<OrderDto> {
    const order = await this.ordersService.getOrder(id);
    if (!order || order.userId !== req.user!.sub) {
      throw new NotFoundException();
    }

    return order;
  }

  @Patch(':id/cancel')
  @ApiBearerAuth()
  @ApiOkResponse({ type: OrderDto })
  async cancelOrder(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<OrderDto> {
    const order = await this.ordersService.getOrder(id);
    if (!order || order.userId !== req.user!.sub) {
      throw new NotFoundException();
    }

    return this.ordersService.cancelOrder(id);
  }
}
