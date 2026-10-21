import { OrderDto } from './dto/order.dto';

export interface OrdersApi {
  getOrder(orderId: string): Promise<OrderDto | null>;
}

export const ORDERS_API = Symbol('ORDERS_API');
