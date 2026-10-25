import { useNavigate, useParams } from 'react-router-dom';
import { OrderDtoStatus } from '@ticketing/api-client';
import { Button, formatCountdown, formatDateTime } from '@ticketing/ui';
import { CancelReservationButton } from './components/CancelReservationButton';
import { LeaveOrderGuard } from './components/LeaveOrderGuard';
import { OrderItemsList } from './components/OrderItemsList';
import { PayButton } from './components/PayButton';
import { SuccessCheckmark } from './components/SuccessCheckmark';
import { useAutoCancelOnExpiry } from './hooks/use-auto-cancel-on-expiry';
import { useOrder } from './hooks/use-order';

export function OrderPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const {
    order,
    isLoading,
    isError,
    refetch,
    isReserved,
    isAwaitingPayment,
    isAwaitingTickets,
    isPaidOrIssued,
  } = useOrder(orderId!);

  const remainingMs = useAutoCancelOnExpiry({
    reservedUntil: order?.reservedUntil,
    orderId: orderId!,
    onSettled: refetch,
  });

  if (isLoading) return <p>Loading...</p>;
  if (isError || !order) return <p>Order not found.</p>;

  const goToEvent = () => navigate(`/${order.eventId}`);

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

      {isPaidOrIssued && (
        <div className="mt-6 text-center">
          <SuccessCheckmark />
          <p className="mt-4 font-medium text-green-700">Payment confirmed</p>
          <p className="text-muted-foreground">
            You're all set for this event.
          </p>
        </div>
      )}

      {isAwaitingTickets && (
        <div className="mt-6 text-center">
          <p className="text-muted-foreground">
            Generating your tickets...
          </p>
        </div>
      )}

      {isPaidOrIssued && (
        <div className="mt-6 flex justify-center gap-3">
          {order.ticketsPdfUrl && (
            <Button asChild>
              <a
                href={order.ticketsPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                View/Download tickets
              </a>
            </Button>
          )}
          <Button variant="outline" onClick={goToEvent}>
            Back to event
          </Button>
        </div>
      )}

      {order.status === OrderDtoStatus.cancelled && (
        <div className="mt-6">
          <p className="text-muted-foreground">
            Your hold has expired and this reservation was cancelled.
          </p>
          <Button className="mt-4" onClick={goToEvent}>
            Back to event
          </Button>
        </div>
      )}

      <LeaveOrderGuard orderId={orderId!} />
    </div>
  );
}
