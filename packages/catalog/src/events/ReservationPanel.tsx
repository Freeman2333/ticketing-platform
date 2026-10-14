import { useNavigate } from 'react-router-dom';
import type { SeatDto } from '@ticketing/api-client';
import { useOrdersControllerCreateOrder } from '@ticketing/api-client';
import { Button } from '@ticketing/ui';

export function ReservationPanel({
  eventId,
  seats,
  selectedSeatIds,
}: {
  eventId: string;
  seats: SeatDto[];
  selectedSeatIds: Set<string>;
}) {
  const navigate = useNavigate();
  const { mutate, isPending } = useOrdersControllerCreateOrder();

  const selectedSeats = seats.filter((seat) => selectedSeatIds.has(seat.id));
  const totalPrice = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
  const count = selectedSeats.length;

  const handleReserve = () => {
    mutate(
      { data: { eventId, seatIds: [...selectedSeatIds] } },
      { onSuccess: (order) => navigate(`/orders/${order.id}`) },
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
