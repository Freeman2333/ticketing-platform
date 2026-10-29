import { Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Button, ErrorBoundary } from '@ticketing/ui';
import { useMyEvents } from '../hooks/useMyEvents';
import {
  EventListItem,
  EventListItemSkeleton,
} from '../components/EventListItem';

const PAGE_SIZE = 10;
const SKELETON_ROW_COUNT = 5;

function SkeletonList() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: SKELETON_ROW_COUNT }, (_, i) => (
        <EventListItemSkeleton key={i} />
      ))}
    </div>
  );
}

function EventsContent() {
  const { events, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useMyEvents({ limit: PAGE_SIZE });

  if (events.length === 0) {
    return (
      <p className="text-muted-foreground">
        You don&apos;t have any events yet.
      </p>
    );
  }

  return (
    <>
      <ul className="divide-y rounded-md border">
        {events.map((event) => (
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
  );
}

export function OrganizerEventsPage() {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My Events</h1>
        <Button asChild>
          <Link to="/organizer/events/new">Add event</Link>
        </Button>
      </div>

      <ErrorBoundary fallback={<p>Failed to load events.</p>}>
        <Suspense fallback={<SkeletonList />}>
          <EventsContent />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
