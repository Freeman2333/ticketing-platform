import { useNavigate, useParams } from 'react-router-dom';
import {
  OrderDtoStatus,
  useOrdersControllerGetOrder,
} from '@ticketing/api-client';
import { Button, formatCountdown, formatDateTime } from '@ticketing/ui';
import { CancelReservationButton } from './components/CancelReservationButton';
import { OrderItemsList } from './components/OrderItemsList';
import { useAutoCancelOnExpiry } from './hooks/use-auto-cancel-on-expiry';

export function OrderPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const {
    data: order,
    isLoading,
    isError,
    refetch,
  } = useOrdersControllerGetOrder(orderId!);

  const reservedUntil = order?.reservedUntil
    ? new Date(order.reservedUntil)
    : null;
  const remainingMs = useAutoCancelOnExpiry(reservedUntil, orderId!, refetch);

  if (isLoading) return <p>Loading...</p>;
  if (isError || !order) return <p>Order not found.</p>;

  const isReserved = order.status === OrderDtoStatus.reserved;

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

      {isReserved && <CancelReservationButton orderId={orderId!} />}

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
    </div>
  );
}
