import { useParams } from 'react-router-dom';

export function EventDetailsPage() {
  const { eventId } = useParams();
  return <h1>Event {eventId}</h1>;
}
