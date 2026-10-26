import { Controller, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import type { Queue } from 'bullmq';

export interface OrderIssuedPayload {
  orderId: string;
  email?: string;
  eventTitle: string;
  seatLabels: string[];
  ticketsPdfUrl: string;
}

@Controller()
export class OrderIssuedController {
  private readonly logger = new Logger(OrderIssuedController.name);

  constructor(@InjectQueue('email') private readonly emailQueue: Queue) {}

  @EventPattern('order.issued')
  async handleOrderIssued(
    @Payload() payload: OrderIssuedPayload,
    @Ctx() context: RmqContext,
  ) {
    if (!payload.email) {
      this.logger.warn(
        `No email on order.issued payload for order ${payload.orderId}, skipping.`,
      );
    } else {
      await this.emailQueue.add('send-ticket-email', payload, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      });
    }

    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    channel.ack(originalMsg);
  }
}
