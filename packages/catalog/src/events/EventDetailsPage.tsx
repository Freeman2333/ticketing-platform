import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  useEventsControllerGetEvent,
  useEventsControllerGetSeats,
  useEventsControllerRecordView,
} from '@ticketing/api-client';
import { formatDateTime } from '@ticketing/ui';
import { ReservationPanel } from './components/ReservationPanel';
import { SeatMap } from './seats/SeatMap';
import { SeatMapSkeleton } from './seats/SeatMapSkeleton';
import { useSeatAvailability } from './seats/useSeatAvailability';

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
  
  useSeatAvailability(eventId!);
  
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
          fetchPriority="high"
        />
      )}
      <h1 className="mt-4 text-2xl font-semibold">{event.title}</h1>
      <p className="text-muted-foreground">
        {formatDateTime(event.startsAt)}
      </p>
      {event.description && <p className="mt-4">{event.description}</p>}

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
        onSelectionChange={setSelectedSeatIds}
      />
    </div>
  );
}
