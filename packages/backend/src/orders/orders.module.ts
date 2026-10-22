import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { HoldExpiryCron } from './internal/hold-expiry.cron';
import { OrdersController } from './internal/orders.controller';
import { OrdersSagaController } from './internal/orders-saga.controller';
import { OrdersRepository } from './internal/orders.repository';
import { OrdersService } from './internal/orders.service';
import { ORDERS_API } from './public/orders-api.interface';

@Module({
  imports: [EventsModule],
  controllers: [OrdersController, OrdersSagaController],
  providers: [
    OrdersService,
    OrdersRepository,
    HoldExpiryCron,
    { provide: ORDERS_API, useExisting: OrdersService },
  ],
  exports: [ORDERS_API],
})
export class OrdersModule {}
