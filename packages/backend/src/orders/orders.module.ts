import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { HoldExpiryCron } from './internal/hold-expiry.cron';
import { OrdersController } from './internal/orders.controller';
import { OrdersRepository } from './internal/orders.repository';
import { OrdersService } from './internal/orders.service';

@Module({
  imports: [EventsModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository, HoldExpiryCron],
})
export class OrdersModule {}
