import { useOrdersCancelOrder } from '@ticketing/api-client';
import { useCountdown } from '@ticketing/ui';

export function useAutoCancelOnExpiry({
  reservedUntil,
  orderId,
  onSettled,
}: {
  reservedUntil?: string | null;
  orderId: string;
  onSettled: () => void;
}): number {
  const { mutate: cancelOrder } = useOrdersCancelOrder();

  return useCountdown(reservedUntil ? new Date(reservedUntil) : null, () => {
    cancelOrder({ id: orderId }, { onSuccess: onSettled, onError: onSettled });
  });
}
