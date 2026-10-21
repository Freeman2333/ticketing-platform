import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ORDERS_API } from '../../orders/public/orders-api.interface';
import type { OrdersApi } from '../../orders/public/orders-api.interface';
import { PaymentsRepository } from './payments.repository';
import { StripeService } from './stripe.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly stripeService: StripeService,
    @Inject(ORDERS_API) private readonly ordersApi: OrdersApi,
  ) {}

  async createCheckoutSession(userId: string, orderId: string) {
    const order = await this.ordersApi.getOrder(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.userId !== userId) {
      throw new ForbiddenException();
    }
    if (order.status !== 'reserved') {
      throw new ConflictException('Only a reserved order can be paid for');
    }

    const amount = order.items.reduce((sum, item) => sum + item.price, 0);
    const orderUrl = `${process.env.FRONTEND_ORIGIN}/orders/${orderId}`;

    // OrderItem.price is in whole dollars; Stripe's unit_amount is in cents.
    const amountInCents = amount * 100;

    const session = await this.stripeService.createCheckoutSession({
      amount: amountInCents,
      successUrl: orderUrl,
      cancelUrl: orderUrl,
    });
    if (!session.url) {
      throw new Error('Stripe did not return a checkout URL');
    }

    await this.paymentsRepository.create(orderId, session.id, amount);

    return { url: session.url };
  }

  handleWebhookEvent(rawBody: Buffer, signature: string): void {
    const event = this.stripeService.constructWebhookEvent(rawBody, signature);
    console.log('Stripe webhook received:', event.type);
  }
}
