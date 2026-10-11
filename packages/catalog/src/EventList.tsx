import { Suspense } from 'react';
import { useEventsControllerListEventsSuspenseInfinite } from '@ticketing/api-client';
import { useInfiniteScrollTrigger } from '@ticketing/ui';
import { ErrorBoundary } from './ErrorBoundary';
import { EventCard, EventCardSkeleton } from './EventCard';

const PAGE_SIZE = 8;
const FIRST_PAGE = 1;

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: PAGE_SIZE }, (_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  );
}

function EventListContent() {
  const query = useEventsControllerListEventsSuspenseInfinite(
    { limit: PAGE_SIZE },
    {
      query: {
        initialPageParam: FIRST_PAGE,
        getNextPageParam: (lastPage, _pages, lastPageParam) =>
          lastPage.hasMore ? (lastPageParam ?? FIRST_PAGE) + 1 : undefined,
      },
    },
  );
  const { data, hasNextPage, isFetchingNextPage } = query;
  const sentinelRef = useInfiniteScrollTrigger(query);

  const events = data.pages.flatMap((page) => page.items);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
        {isFetchingNextPage &&
          Array.from({ length: PAGE_SIZE }, (_, i) => (
            <EventCardSkeleton key={`skeleton-${i}`} />
          ))}
      </div>
      {hasNextPage && <div ref={sentinelRef} />}
    </>
  );
}

export function EventList() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Events</h1>
      <ErrorBoundary fallback={<p>Failed to load events.</p>}>
        <Suspense fallback={<SkeletonGrid />}>
          <EventListContent />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
