import { useBlocker } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  getOrdersGetOrderQueryKey,
  OrderDtoStatus,
  useOrdersCancelOrder,
  type OrderDto,
} from '@ticketing/api-client';
import { ConfirmDialog } from '@ticketing/ui';

export function LeaveOrderGuard({ orderId }: { orderId: string }) {
  const queryClient = useQueryClient();
  const { mutate: cancelOnLeave, isPending: isCancellingOnLeave } =
    useOrdersCancelOrder();

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    const order = queryClient.getQueryData<OrderDto>(
      getOrdersGetOrderQueryKey(orderId),
    );
    return (
      order?.status === OrderDtoStatus.reserved &&
      currentLocation.pathname !== nextLocation.pathname
    );
  });

  return (
    <ConfirmDialog
      open={blocker.state === 'blocked'}
      onOpenChange={(open) => {
        if (!open) blocker.reset?.();
      }}
      title="Leave this page?"
      description="Your reservation is still active. Leaving now will cancel it and release your seats back to other buyers."
      confirmLabel="Leave and cancel"
      cancelLabel="Stay on this page"
      variant="destructive"
      isLoading={isCancellingOnLeave}
      closeOnConfirm={false}
      onConfirm={() => {
        cancelOnLeave(
          { id: orderId },
          { onSettled: () => blocker.proceed?.() },
        );
      }}
    />
  );
}
