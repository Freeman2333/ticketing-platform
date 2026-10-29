import {
  EventsControllerListMyEventsParams,
  useEventsControllerListMyEventsSuspenseInfinite,
} from '@ticketing/api-client';

const FIRST_PAGE = 1;

export function useMyEvents(params?: EventsControllerListMyEventsParams) {
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useEventsControllerListMyEventsSuspenseInfinite(params, {
      query: {
        initialPageParam: FIRST_PAGE,
        getNextPageParam: (lastPage, _pages, lastPageParam) =>
          lastPage.hasMore ? (lastPageParam ?? FIRST_PAGE) + 1 : undefined,
      },
    });

  return {
    events: data.pages.flatMap((page) => page.items),
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  };
}
