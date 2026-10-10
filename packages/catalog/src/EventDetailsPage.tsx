import { useParams } from 'react-router-dom';
import {
  useEventsControllerGetEvent,
  useEventsControllerGetSeats,
} from '@ticketing/api-client';

export function EventDetailsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { data: event, isLoading: isEventLoading } = useEventsControllerGetEvent(
    eventId!,
  );
  const { data: seats, isLoading: isSeatsLoading } = useEventsControllerGetSeats(
    eventId!,
  );

  if (isEventLoading) return <p>Loading...</p>;
  if (!event) return <p>Event not found.</p>;

  return (
    <div>
      {event.posterUrl && (
        <img
          src={event.posterUrl as unknown as string}
          alt={event.title}
          className="aspect-video w-full rounded-lg object-cover"
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
        <p>Loading seats...</p>
      ) : (
        <p>{seats?.length ?? 0} seats total</p>
      )}
    </div>
  );
}
