import { useMemo } from 'react';
import type { SeatDto } from '@ticketing/api-client';
import { Seat } from './Seat';
import { parseSeatLabel } from './parseSeatLabel';

export function SeatMap({
  seats,
  selectedSeatIds,
  onToggleSeat,
}: {
  seats: SeatDto[];
  selectedSeatIds: Set<string>;
  onToggleSeat: (seatId: string) => void;
}) {
  const rows = useMemo(() => {
    const byRow = new Map<string, { seat: SeatDto; number: string }[]>();
    for (const seat of seats) {
      const { row, number } = parseSeatLabel(seat.label);
      const entries = byRow.get(row);
      if (entries) {
        entries.push({ seat, number });
      } else {
        byRow.set(row, [{ seat, number }]);
      }
    }
    for (const entries of byRow.values()) {
      entries.sort((a, b) => Number(a.number) - Number(b.number));
    }
    return byRow;
  }, [seats]);

  return (
    <div className="flex flex-col gap-2">
      {[...rows.entries()].map(([row, entries]) => (
        <div key={row} className="flex items-center gap-2">
          <span className="text-muted-foreground w-12 shrink-0 text-sm">
            Row {row}
          </span>
          <div className="flex flex-wrap gap-1">
            {entries.map(({ seat, number }) => (
              <Seat
                key={seat.id}
                seat={seat}
                number={number}
                selected={selectedSeatIds.has(seat.id)}
                onToggle={onToggleSeat}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
