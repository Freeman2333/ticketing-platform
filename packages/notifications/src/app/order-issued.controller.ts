import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { ResendService } from './resend.service';

interface OrderIssuedPayload {
  orderId: string;
  email?: string;
  eventTitle: string;
  seatLabels: string[];
  ticketsPdfUrl: string;
}

@Controller()
export class OrderIssuedController {
  private readonly logger = new Logger(OrderIssuedController.name);

  constructor(private readonly resendService: ResendService) {}

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
      try {
        await this.resendService.sendTicketEmail({
          email: payload.email,
          eventTitle: payload.eventTitle,
          seatLabels: payload.seatLabels,
          ticketsPdfUrl: payload.ticketsPdfUrl,
        });
      } catch (error) {
        this.logger.error(
          `Failed to send ticket email for order ${payload.orderId}`,
          error,
        );
      }
    }

    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    channel.ack(originalMsg);
  }
}
