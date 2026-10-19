import { isAxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useIsAuthenticated } from '@ticketing/auth-client';
import type { SeatDto } from '@ticketing/api-client';
import {
  getEventsControllerGetSeatsQueryKey,
  useOrdersControllerCreateOrder,
} from '@ticketing/api-client';
import { Button } from '@ticketing/ui';

export function ReservationPanel({
  eventId,
  seats,
  selectedSeatIds,
  onSelectionChange,
}: {
  eventId: string;
  seats: SeatDto[];
  selectedSeatIds: Set<string>;
  onSelectionChange: (next: Set<string>) => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAuthenticated = useIsAuthenticated();
  const seatsQueryKey = getEventsControllerGetSeatsQueryKey(eventId);
  const { mutate, isPending } = useOrdersControllerCreateOrder();

  const selectedSeats = seats.filter((seat) => selectedSeatIds.has(seat.id));
  const totalPrice = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
  const count = selectedSeats.length;

  const handleReserve = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const seatIds = [...selectedSeatIds];
    const previousSeats = queryClient.getQueryData<SeatDto[]>(seatsQueryKey);

    queryClient.setQueryData<SeatDto[]>(seatsQueryKey, (current) =>
      current?.map((seat) =>
        seatIds.includes(seat.id) ? { ...seat, status: 'held' as const } : seat,
      ),
    );

    mutate(
      { data: { eventId, seatIds } },
      {
        onSuccess: (order) => navigate(`/orders/${order.id}`),
        onError: async (error) => {
          queryClient.setQueryData(seatsQueryKey, previousSeats);

          if (isAxiosError(error) && error.response?.status === 409) {
            toast.error(
              'Some of your selected seats are no longer available',
            );
            await queryClient.invalidateQueries({ queryKey: seatsQueryKey });
            const freshSeats =
              queryClient.getQueryData<SeatDto[]>(seatsQueryKey) ?? [];
            const stillAvailable = new Set(
              freshSeats
                .filter((seat) => seat.status === 'available')
                .map((seat) => seat.id),
            );
            onSelectionChange(
              new Set(seatIds.filter((id) => stillAvailable.has(id))),
            );
          }
        },
      },
    );
  };

  return (
    <div className="bg-background fixed inset-x-0 bottom-0 border-t">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <span className="text-sm font-medium">
          {count > 0
            ? `${count} seat${count > 1 ? 's' : ''} selected · $${totalPrice}`
            : 'Select seats to reserve'}
        </span>
        <Button disabled={count === 0 || isPending} onClick={handleReserve}>
          {isPending ? 'Reserving...' : 'Reserve'}
        </Button>
      </div>
    </div>
  );
}
