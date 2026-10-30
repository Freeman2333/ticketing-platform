import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { EventRevenueRepository } from './event-revenue.repository';

@Controller()
export class EventRevenueController {
  constructor(private readonly eventRevenueRepository: EventRevenueRepository) {}

  @EventPattern('order.paid')
  async handleOrderPaid(@Payload() rawPayload: any, @Ctx() rawContext: any) {
    const payload = rawPayload as {
      orderId: string;
      eventId: string;
      amount: number;
    };
    const context = rawContext as RmqContext;

    await this.eventRevenueRepository.recordIfNew(
      payload.orderId,
      payload.eventId,
      payload.amount,
    );

    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    channel.ack(originalMsg);
  }
}
