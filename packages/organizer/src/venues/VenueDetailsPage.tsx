import { Suspense } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ImageIcon } from 'lucide-react';
import { useUserId } from '@ticketing/auth-client';
import {
  useVenuesControllerFindOneSuspense,
  useVenuesControllerGetStatsSuspense,
} from '@ticketing/api-client';
import {
  Button,
  Card,
  CardContent,
  ErrorBoundary,
  Skeleton,
} from '@ticketing/ui';
import { useMyEvents } from '../hooks/useMyEvents';
import { EventListItem } from '../components/EventListItem';

function VenueDetailsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

function VenueDetailsContent({ id }: { id: string }) {
  const { data: venue } = useVenuesControllerFindOneSuspense(id);
  const { data: stats } = useVenuesControllerGetStatsSuspense(id);
  const {
    events: venueEvents,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useMyEvents({ venueId: id });
  
  const userId = useUserId();
  const isOwner = venue.organizerId === userId;
  
  return (
    <div className="flex flex-col gap-6">
      <div className="bg-muted flex h-48 w-full items-center justify-center overflow-hidden rounded-md">
        {venue.imageUrl ? (
          <img
            src={venue.imageUrl}
            alt={venue.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <ImageIcon className="text-muted-foreground size-10" />
        )}
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{venue.name}</h1>
          <p className="text-muted-foreground">{venue.address}</p>
        </div>
        {isOwner && (
          <Button variant="outline" asChild>
            <Link to={`/organizer/venues/${venue.id}/edit`}>Edit</Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent>
            <p className="text-muted-foreground text-sm">Tickets sold</p>
            <p className="text-2xl font-semibold">{stats.ticketsSold}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-muted-foreground text-sm">Revenue</p>
            <p className="text-2xl font-semibold">${stats.revenue}</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold">Events</h2>
        {venueEvents.length === 0 ? (
          <p className="text-muted-foreground">
            No events at this venue yet.
          </p>
        ) : (
          <>
            <ul className="divide-y rounded-md border">
              {venueEvents.map((event) => (
                <EventListItem key={event.id} event={event} />
              ))}
            </ul>
            {hasNextPage && (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  disabled={isFetchingNextPage}
                  onClick={() => fetchNextPage()}
                >
                  {isFetchingNextPage ? 'Loading...' : 'Load more'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function VenueDetailsPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div>
      <Link
        to="/organizer/venues"
        className="text-muted-foreground mb-4 inline-block text-sm"
      >
        ← Back to venues
      </Link>

      <ErrorBoundary fallback={<p>Failed to load venue.</p>}>
        <Suspense fallback={<VenueDetailsSkeleton />}>
          <VenueDetailsContent id={id!} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
