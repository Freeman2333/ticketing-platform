import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useUserId } from '@ticketing/auth-client';
import {
  useEventsGetEvent,
  useEventsGetSeats,
  useEventsRecordView,
} from '@ticketing/api-client';
import { Button, formatDateTime } from '@ticketing/ui';
import { ReservationPanel } from './components/ReservationPanel';
import { SeatMap } from './seats/SeatMap';
import { SeatMapSkeleton } from './seats/SeatMapSkeleton';
import { useSeatAvailability } from './seats/useSeatAvailability';

export function EventDetailsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { data: event, isLoading: isEventLoading } = useEventsGetEvent(
    eventId!,
  );
  const userId = useUserId();
  const isOwner = !!event && event.organizerId === userId;
  const { data: seats, isLoading: isSeatsLoading } = useEventsGetSeats(
    eventId!,
  );
  const { mutate: recordView } = useEventsRecordView();
  
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
      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{event.title}</h1>
          <p className="text-muted-foreground">
            {formatDateTime(event.startsAt)}
          </p>
        </div>
        {isOwner && (
          <Button variant="outline" asChild>
            <Link to={`/organizer/events/${event.id}/edit`}>Edit</Link>
          </Button>
        )}
      </div>
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
