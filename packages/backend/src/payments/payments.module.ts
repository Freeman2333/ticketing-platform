import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { PaymentsController } from './internal/payments.controller';
import { PaymentsRepository } from './internal/payments.repository';
import { PaymentsService } from './internal/payments.service';
import { StripeService } from './internal/stripe.service';

@Module({
  imports: [OrdersModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsRepository, StripeService],
})
export class PaymentsModule {}
