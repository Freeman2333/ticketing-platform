import { useNavigate } from 'react-router-dom';
import { useOrdersControllerCancelOrder } from '@ticketing/api-client';
import { Button, ConfirmDialog } from '@ticketing/ui';

export function CancelReservationButton({ orderId }: { orderId: string }) {
  const navigate = useNavigate();
  const { mutate: cancelOrder, isPending: isCancelling } =
    useOrdersControllerCancelOrder();

  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" className="mt-6" disabled={isCancelling}>
          Cancel reservation
        </Button>
      }
      title="Cancel this reservation?"
      description="Your held seats will be released back to other buyers. This can't be undone."
      confirmLabel="Cancel reservation"
      cancelLabel="Keep reservation"
      variant="destructive"
      isLoading={isCancelling}
      onConfirm={() =>
        cancelOrder(
          { id: orderId },
          { onSuccess: (cancelled) => navigate(`/${cancelled.eventId}`) },
        )
      }
    />
  );
}
