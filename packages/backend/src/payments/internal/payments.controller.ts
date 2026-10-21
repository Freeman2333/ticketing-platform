import { Body, Controller, Post, Req, type RawBodyRequest } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
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

  @Post('webhook')
  @Public()
  handleWebhook(@Req() req: RawBodyRequest<Request>): void {
    const signature = req.headers['stripe-signature'] as string;
    this.paymentsService.handleWebhookEvent(req.rawBody as Buffer, signature);
  }
}
