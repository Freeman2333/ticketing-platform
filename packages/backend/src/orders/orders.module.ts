import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AuthModule } from '../auth/auth.module';
import { EventsModule } from '../events/events.module';
import { HoldExpiryCron } from './internal/hold-expiry.cron';
import { OrdersController } from './internal/orders.controller';
import { OrdersSagaController } from './internal/orders-saga.controller';
import { OrdersRepository } from './internal/orders.repository';
import { OrdersService } from './internal/orders.service';
import { OutboxPublisherService } from './internal/outbox-publisher.service';
import { TicketPdfService } from './internal/ticket-pdf.service';
import { TicketQrService } from './internal/ticket-qr.service';
import { ORDERS_API } from './public/orders-api.interface';

@Module({
  imports: [
    EventsModule,
    AuthModule,
    ClientsModule.register([
      {
        name: 'ORDERS_QUEUE_CLIENT',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL as string],
          queue: 'orders_queue',
          queueOptions: { durable: true },
        },
      },
      {
        name: 'NOTIFICATIONS_QUEUE_CLIENT',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL as string],
          queue: 'notifications_queue',
          queueOptions: { durable: true },
        },
      },
      {
        name: 'EVENT_REVENUE_QUEUE_CLIENT',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL as string],
          queue: 'event_revenue_queue',
          queueOptions: { durable: true },
        },
      },
    ]),
  ],
  controllers: [OrdersController, OrdersSagaController],
  providers: [
    OrdersService,
    OrdersRepository,
    HoldExpiryCron,
    OutboxPublisherService,
    TicketQrService,
    TicketPdfService,
    { provide: ORDERS_API, useExisting: OrdersService },
  ],
  exports: [ORDERS_API],
})
export class OrdersModule {}
