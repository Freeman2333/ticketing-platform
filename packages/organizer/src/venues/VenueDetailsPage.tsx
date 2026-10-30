import { Suspense } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ImageIcon } from 'lucide-react';
import { useUserId } from '@ticketing/auth-client';
import {
  useVenuesFindOneSuspense,
  useVenuesGetStatsSuspense,
} from '@ticketing/api-client';
import {
  Badge,
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  ErrorBoundary,
  Skeleton,
} from '@ticketing/ui';
import { useDeleteVenue } from './hooks/useDeleteVenue';
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
  const { data: venue } = useVenuesFindOneSuspense(id);
  const { data: stats } = useVenuesGetStatsSuspense(id);
  const {
    events: venueEvents,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useMyEvents({ venueId: id });
  const { deleteVenue, isPending: isDeleting } = useDeleteVenue();

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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{venue.name}</h1>
            <Badge variant={venue.isShared ? 'success' : 'destructive'}>
              {venue.isShared ? 'Shared venue' : 'Private venue'}
            </Badge>
          </div>
          <p className="text-muted-foreground">{venue.address}</p>
        </div>
        {isOwner && (
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to={`/organizer/venues/${venue.id}/edit`}>Edit</Link>
            </Button>
            <ConfirmDialog
              trigger={<Button variant="destructive">Delete</Button>}
              title="Delete venue?"
              description={`This will permanently delete "${venue.name}". This cannot be undone.`}
              confirmLabel="Delete"
              variant="destructive"
              isLoading={isDeleting}
              onConfirm={() => deleteVenue(id)}
            />
          </div>
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
