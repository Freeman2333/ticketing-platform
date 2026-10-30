import { Suspense } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ImageIcon } from 'lucide-react';
import { useUserId } from '@ticketing/auth-client';
import {
  useEventsControllerGetEventSuspense,
  useEventsControllerGetStatsSuspense,
  useEventsControllerListSeatTypesSuspense,
  useVenuesControllerFindOneSuspense,
} from '@ticketing/api-client';
import {
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  ErrorBoundary,
  formatDateTime,
  Skeleton,
} from '@ticketing/ui';
import { useDeleteEvent } from './hooks/useDeleteEvent';

function EventDetailsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

function EventDetailsContent({ id }: { id: string }) {
  const { data: event } = useEventsControllerGetEventSuspense(id);
  const { data: venue } = useVenuesControllerFindOneSuspense(event.venueId);
  const { data: stats } = useEventsControllerGetStatsSuspense(id);
  const { data: seatTypes } = useEventsControllerListSeatTypesSuspense(id);
  const { deleteEvent, isPending: isDeleting } = useDeleteEvent();

  const userId = useUserId();
  const isOwner = venue.organizerId === userId;

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-muted flex h-48 w-full items-center justify-center overflow-hidden rounded-md">
        {event.posterUrl ? (
          <img
            src={event.posterUrl}
            alt={event.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <ImageIcon className="text-muted-foreground size-10" />
        )}
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{event.title}</h1>
          <p className="text-muted-foreground">
            {formatDateTime(event.startsAt)}
          </p>
          <div className="flex gap-3">
            <Link
              to={`/organizer/venues/${venue.id}`}
              className="text-muted-foreground text-sm underline"
            >
              {venue.name}
            </Link>
            <Link
              to={`/${event.id}`}
              className="text-muted-foreground text-sm underline"
            >
              View public page
            </Link>
          </div>
        </div>
        {isOwner && (
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to={`/organizer/events/${event.id}/edit`}>Edit</Link>
            </Button>
            <ConfirmDialog
              trigger={<Button variant="destructive">Delete</Button>}
              title="Delete event?"
              description={`This will permanently delete "${event.title}". This cannot be undone.`}
              confirmLabel="Delete"
              variant="destructive"
              isLoading={isDeleting}
              onConfirm={() => deleteEvent(id)}
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
        <h2 className="mb-2 text-lg font-semibold">Ticket types</h2>
        {seatTypes.length === 0 ? (
          <p className="text-muted-foreground">No ticket types yet.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {seatTypes.map((seatType) => (
              <li
                key={seatType.id}
                className="flex items-center justify-between p-3"
              >
                <div>
                  <p className="font-medium">{seatType.label}</p>
                  <p className="text-muted-foreground text-sm">
                    {seatType.availableCount} available,{' '}
                    {seatType.heldCount} held, {seatType.bookedCount} booked
                  </p>
                </div>
                <p className="font-medium">${seatType.price}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function EventDetailsPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div>
      <Link
        to="/organizer"
        className="text-muted-foreground mb-4 inline-block text-sm"
      >
        ← Back to events
      </Link>

      <ErrorBoundary fallback={<p>Failed to load event.</p>}>
        <Suspense fallback={<EventDetailsSkeleton />}>
          <EventDetailsContent id={id!} />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
