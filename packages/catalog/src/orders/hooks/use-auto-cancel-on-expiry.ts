import { useOrdersControllerCancelOrder } from '@ticketing/api-client';
import { useCountdown } from '@ticketing/ui';

export function useAutoCancelOnExpiry(
  reservedUntil: Date | null,
  orderId: string,
  onSettled: () => void,
): number {
  const { mutate: cancelOrder } = useOrdersControllerCancelOrder();

  return useCountdown(reservedUntil, () => {
    cancelOrder({ id: orderId }, { onSuccess: onSettled, onError: onSettled });
  });
}
