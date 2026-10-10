import { Link } from 'react-router-dom';
import { Card, CardContent } from '@ticketing/ui';
import type { EventDto } from '@ticketing/api-client';

export function EventCard({ event }: { event: EventDto }) {
  return (
    <Link to={event.id}>
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        <div className="bg-muted aspect-video">
          {event.posterUrl && (
            <img
              src={event.posterUrl}
              alt={event.title}
              className="h-full w-full object-cover"
            />
          )}
        </div>
        <CardContent className="flex flex-col gap-1">
          <h3 className="font-semibold">{event.title}</h3>
          <p className="text-muted-foreground text-sm">
            {new Date(event.startsAt).toLocaleDateString(undefined, {
              dateStyle: 'medium',
            })}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
