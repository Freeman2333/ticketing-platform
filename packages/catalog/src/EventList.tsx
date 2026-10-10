import { useEventsControllerListEvents } from '@ticketing/api-client';
import { EventCard } from './EventCard';

export function EventList() {
  const { data: events, isLoading } = useEventsControllerListEvents();

  if (isLoading) return <p>Loading...</p>;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Events</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {events?.map((event) => <EventCard key={event.id} event={event} />)}
      </div>
    </div>
  );
}
