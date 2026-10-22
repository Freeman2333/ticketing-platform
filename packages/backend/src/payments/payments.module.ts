import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { OrdersModule } from '../orders/orders.module';
import { OutboxPublisherService } from './internal/outbox-publisher.service';
import { PaymentsController } from './internal/payments.controller';
import { PaymentsRepository } from './internal/payments.repository';
import { PaymentsService } from './internal/payments.service';
import { StripeService } from './internal/stripe.service';

@Module({
  imports: [
    OrdersModule,
    ClientsModule.register([
      {
        name: 'ORDERS_SAGA_CLIENT',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL as string],
          queue: 'orders_queue',
          queueOptions: { durable: true },
        },
      },
    ]),
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentsRepository,
    StripeService,
    OutboxPublisherService,
  ],
})
export class PaymentsModule {}
