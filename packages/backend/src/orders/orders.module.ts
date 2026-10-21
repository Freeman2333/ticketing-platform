import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EventsModule } from '../events/events.module';
import { HoldExpiryCron } from './internal/hold-expiry.cron';
import { OrdersController } from './internal/orders.controller';
import { OrdersRepository } from './internal/orders.repository';
import { OrdersService } from './internal/orders.service';
import { ORDERS_API } from './public/orders-api.interface';

@Module({
  imports: [EventsModule, AuthModule],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrdersRepository,
    HoldExpiryCron,
    { provide: ORDERS_API, useExisting: OrdersService },
  ],
  exports: [ORDERS_API],
})
export class OrdersModule {}
