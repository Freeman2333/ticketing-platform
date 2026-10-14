import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  useEventsControllerGetEvent,
  useEventsControllerGetSeats,
  useEventsControllerRecordView,
} from '@ticketing/api-client';
import { ReservationPanel } from './ReservationPanel';
import { SeatMap } from './seats/SeatMap';
import { SeatMapSkeleton } from './seats/SeatMapSkeleton';

export function EventDetailsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { data: event, isLoading: isEventLoading } = useEventsControllerGetEvent(
    eventId!,
  );
  const { data: seats, isLoading: isSeatsLoading } = useEventsControllerGetSeats(
    eventId!,
  );
  const { mutate: recordView } = useEventsControllerRecordView();

  const [selectedSeatIds, setSelectedSeatIds] = useState<Set<string>>(
    new Set(),
  );
  const toggleSeat = useCallback((seatId: string) => {
    setSelectedSeatIds((prev) => {
      const next = new Set(prev);
      if (next.has(seatId)) {
        next.delete(seatId);
      } else {
        next.add(seatId);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (eventId) recordView({ id: eventId });
  }, [eventId, recordView]);

  if (isEventLoading) return <p>Loading...</p>;
  if (!event) return <p>Event not found.</p>;

  return (
    <div className="mx-auto max-w-5xl pb-20">
      {event.posterUrl && (
        <img
          src={event.posterUrl as unknown as string}
          alt={event.title}
          className="aspect-21/9 w-full rounded-lg object-cover"
        />
      )}
      <h1 className="mt-4 text-2xl font-semibold">{event.title}</h1>
      <p className="text-muted-foreground">
        {new Date(event.startsAt).toLocaleString(undefined, {
          dateStyle: 'full',
          timeStyle: 'short',
        })}
      </p>

      <h2 className="mt-6 text-lg font-semibold">Seats</h2>
      {isSeatsLoading ? (
        <SeatMapSkeleton />
      ) : (
        <SeatMap
          seats={seats ?? []}
          selectedSeatIds={selectedSeatIds}
          onToggleSeat={toggleSeat}
        />
      )}

      <ReservationPanel
        eventId={eventId!}
        seats={seats ?? []}
        selectedSeatIds={selectedSeatIds}
      />
    </div>
  );
}
