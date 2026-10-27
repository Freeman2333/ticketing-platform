import { ImageIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { VenueDto } from '@ticketing/api-client';
import { Skeleton } from '@ticketing/ui';

export function VenueListItem({ venue }: { venue: VenueDto }) {
  return (
    <li>
      <Link
        to={`/organizer/venues/${venue.id}`}
        className="flex items-center gap-4 p-4 hover:bg-accent"
      >
        <div className="bg-muted flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md">
          {venue.imageUrl ? (
            <img
              src={venue.imageUrl}
              alt={venue.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <ImageIcon className="text-muted-foreground size-5" />
          )}
        </div>
        <span className="font-medium">{venue.name}</span>
        <span className="text-muted-foreground text-sm">
          {venue.address}
        </span>
      </Link>
    </li>
  );
}

export function VenueListItemSkeleton() {
  return <Skeleton className="h-12 w-full" />;
}
