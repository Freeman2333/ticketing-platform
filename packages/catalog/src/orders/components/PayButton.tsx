import { usePaymentsControllerCreateCheckoutSession } from '@ticketing/api-client';
import { Button } from '@ticketing/ui';

export function PayButton({ orderId }: { orderId: string }) {
  const { mutate: createCheckoutSession, isPending } =
    usePaymentsControllerCreateCheckoutSession();

  return (
    <Button
      disabled={isPending}
      onClick={() =>
        createCheckoutSession(
          { data: { orderId } },
          {
            onSuccess: (session) => {
              window.location.href = session.url;
            },
          },
        )
      }
    >
      Pay now
    </Button>
  );
}
