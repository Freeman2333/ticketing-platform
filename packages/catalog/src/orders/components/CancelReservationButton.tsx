import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  getOrdersControllerGetOrderQueryKey,
  useOrdersControllerCancelOrder,
} from '@ticketing/api-client';
import { Button, ConfirmDialog } from '@ticketing/ui';

export function CancelReservationButton({ orderId }: { orderId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { mutate: cancelOrder, isPending: isCancelling } =
    useOrdersControllerCancelOrder();

  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" disabled={isCancelling}>
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
          {
            onSuccess: (cancelled) => {
              queryClient.setQueryData(
                getOrdersControllerGetOrderQueryKey(orderId),
                cancelled,
              );
              navigate(`/${cancelled.eventId}`);
            },
          },
        )
      }
    />
  );
}
