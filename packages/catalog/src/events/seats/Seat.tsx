import { memo } from 'react';
import { X } from 'lucide-react';
import type { SeatDto } from '@ticketing/api-client';

export const Seat = memo(function Seat({
  seat,
  number,
  selected,
  onToggle,
}: {
  seat: SeatDto;
  number: string;
  selected: boolean;
  onToggle: (seatId: string) => void;
}) {
  const isAvailable = seat.status === 'available';

  const statusClasses = !isAvailable
    ? 'bg-muted text-muted-foreground border-transparent cursor-not-allowed'
    : selected
      ? 'bg-primary text-primary-foreground border-primary'
      : 'hover:bg-accent';

  return (
    <button
      type="button"
      disabled={!isAvailable}
      aria-label={`Seat ${seat.label}, ${seat.status}, $${seat.price}`}
      aria-pressed={isAvailable ? selected : undefined}
      onClick={() => onToggle(seat.id)}
      className={`flex size-8 items-center justify-center rounded-md border text-xs font-medium transition-colors ${statusClasses}`}
    >
      {isAvailable ? number : <X className="size-3.5" />}
    </button>
  );
});
