import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { CheckoutSessionDto } from './dto/checkout-session.dto';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('checkout-session')
  @ApiBearerAuth()
  @ApiCreatedResponse({ type: CheckoutSessionDto })
  createCheckoutSession(
    @Body() dto: CreateCheckoutSessionDto,
    @Req() req: Request,
  ): Promise<CheckoutSessionDto> {
    return this.paymentsService.createCheckoutSession(
      req.user!.sub,
      dto.orderId,
    );
  }
}
