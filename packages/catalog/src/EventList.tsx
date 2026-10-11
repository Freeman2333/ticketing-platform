import { useEventsControllerListEventsInfinite } from '@ticketing/api-client';
import { useInfiniteScrollTrigger } from '@ticketing/ui';
import { EventCard } from './EventCard';

const PAGE_SIZE = 8;
const FIRST_PAGE = 1;

export function EventList() {
  const query = useEventsControllerListEventsInfinite(
    { limit: PAGE_SIZE },
    {
      query: {
        initialPageParam: FIRST_PAGE,
        getNextPageParam: (lastPage, _pages, lastPageParam) =>
          lastPage.hasMore ? (lastPageParam ?? FIRST_PAGE) + 1 : undefined,
      },
    },
  );
  const { data, isLoading, hasNextPage, isFetchingNextPage } = query;
  const sentinelRef = useInfiniteScrollTrigger(query);

  const events = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Events</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
      {(isLoading || isFetchingNextPage) && <p>Loading...</p>}
      {hasNextPage && <div ref={sentinelRef} />}
    </div>
  );
}
