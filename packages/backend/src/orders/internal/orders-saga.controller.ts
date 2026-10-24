import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { OrdersService } from './orders.service';

@Controller()
export class OrdersSagaController {
  constructor(private readonly ordersService: OrdersService) {}

  @EventPattern('payment.succeeded')
  async handlePaymentSucceeded(@Payload() rawPayload: any, @Ctx() rawContext: any) {
    const payload = rawPayload as { orderId: string };
    const context = rawContext as RmqContext;

    await this.ordersService.handlePaymentSucceeded(payload.orderId);

    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    channel.ack(originalMsg);
  }

  @EventPattern('order.paid')
  async handleOrderPaid(@Payload() rawPayload: any, @Ctx() rawContext: any) {
    const payload = rawPayload as { orderId: string };
    const context = rawContext as RmqContext;

    await this.ordersService.issueTickets(payload.orderId);

    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    channel.ack(originalMsg);
  }
}
