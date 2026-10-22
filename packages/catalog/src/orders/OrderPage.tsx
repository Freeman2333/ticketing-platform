import { useNavigate, useParams } from 'react-router-dom';
import {
  OrderDtoStatus,
  useOrdersControllerGetOrder,
} from '@ticketing/api-client';
import { Button, formatCountdown, formatDateTime } from '@ticketing/ui';
import { CancelReservationButton } from './components/CancelReservationButton';
import { LeaveOrderGuard } from './components/LeaveOrderGuard';
import { OrderItemsList } from './components/OrderItemsList';
import { PaidConfirmation } from './components/PaidConfirmation';
import { PayButton } from './components/PayButton';
import { useAutoCancelOnExpiry } from './hooks/use-auto-cancel-on-expiry';
import { useIsReturningFromCheckout } from './hooks/use-is-returning-from-checkout';

export function OrderPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const isReturningFromCheckout = useIsReturningFromCheckout();

  const {
    data: order,
    isLoading,
    isError,
    refetch,
  } = useOrdersControllerGetOrder(orderId!, {
    query: { refetchInterval: isReturningFromCheckout ? 1500 : false },
  });

  const remainingMs = useAutoCancelOnExpiry({
    reservedUntil: order?.reservedUntil,
    orderId: orderId!,
    onSettled: refetch,
  });

  const isReserved = order?.status === OrderDtoStatus.reserved;
  const isAwaitingPayment = isReturningFromCheckout && isReserved;

  if (isLoading) return <p>Loading...</p>;
  if (isError || !order) return <p>Order not found.</p>;

  return (
    <div className="mx-auto max-w-2xl">
      {isReserved && (
        <div className="bg-background sticky top-0 z-10 border-b px-4 py-2 text-center text-sm font-medium">
          Hold expires in {formatCountdown(remainingMs)}
        </div>
      )}

      <h1 className="mt-4 text-2xl font-semibold">{order.eventTitle}</h1>
      <p className="text-muted-foreground">
        {formatDateTime(order.eventStartsAt)}
      </p>

      <OrderItemsList items={order.items} />

      {isAwaitingPayment && (
        <div className="mt-6 text-center">
          <p className="text-muted-foreground">Confirming your payment...</p>
        </div>
      )}

      {isReserved && !isAwaitingPayment && (
        <div className="mt-6 flex gap-3 justify-end">
          <PayButton orderId={orderId!} />
          <CancelReservationButton orderId={orderId!} />
        </div>
      )}

      {(order.status === OrderDtoStatus.paid ||
        order.status === OrderDtoStatus.issued) && (
        <PaidConfirmation eventId={order.eventId} />
      )}

      {order.status === OrderDtoStatus.cancelled && (
        <div className="mt-6">
          <p className="text-muted-foreground">
            Your hold has expired and this reservation was cancelled.
          </p>
          <Button
            className="mt-4"
            onClick={() => navigate(`/${order.eventId}`)}
          >
            Back to event
          </Button>
        </div>
      )}

      <LeaveOrderGuard orderId={orderId!} />
    </div>
  );
}
