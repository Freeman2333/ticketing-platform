import { ImageIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { EventDto } from '@ticketing/api-client';
import { formatDateTime, Skeleton } from '@ticketing/ui';

export function EventListItem({ event }: { event: EventDto }) {
  return (
    <li>
      <Link
        to={`/organizer/events/${event.id}`}
        className="flex items-center gap-4 p-4 hover:bg-accent"
      >
        <div className="bg-muted flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md">
          {event.posterUrl ? (
            <img
              src={event.posterUrl}
              alt={event.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <ImageIcon className="text-muted-foreground size-5" />
          )}
        </div>
        <span className="font-medium">{event.title}</span>
        <span className="text-muted-foreground text-sm">
          {formatDateTime(event.startsAt)}
        </span>
      </Link>
    </li>
  );
}

export function EventListItemSkeleton() {
  return <Skeleton className="h-12 w-full" />;
}
