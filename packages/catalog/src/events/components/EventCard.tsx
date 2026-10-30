import { Link } from 'react-router-dom';
import {
  getEventsGetEventQueryOptions,
  type EventDto,
} from '@ticketing/api-client';
import { Card, CardContent, formatDateTime, Skeleton } from '@ticketing/ui';
import { usePrefetchOnHover } from '../hooks/usePrefetchOnHover';

export function EventCard({ event }: { event: EventDto }) {
  const prefetchHandlers = usePrefetchOnHover(
    getEventsGetEventQueryOptions(event.id),
  );

  return (
    <Link to={event.id} {...prefetchHandlers}>
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
            {formatDateTime(event.startsAt, 'medium')}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

export function EventCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-video w-full rounded-none" />
      <CardContent className="flex flex-col gap-1">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardContent>
    </Card>
  );
}
