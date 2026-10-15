import { useBlocker } from 'react-router-dom';
import { useOrdersControllerCancelOrder } from '@ticketing/api-client';
import { ConfirmDialog } from '@ticketing/ui';

export function LeaveOrderGuard({
  orderId,
  isReserved,
}: {
  orderId: string;
  isReserved: boolean;
}) {
  const { mutate: cancelOnLeave, isPending: isCancellingOnLeave } =
    useOrdersControllerCancelOrder();

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isReserved && currentLocation.pathname !== nextLocation.pathname,
  );

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
