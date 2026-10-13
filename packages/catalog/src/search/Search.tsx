import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useEventsControllerGetRecentlyViewed,
  useEventsControllerListEventsInfinite,
} from '@ticketing/api-client';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  useDebouncedState,
  useInfiniteScrollTrigger,
} from '@ticketing/ui';
import { SearchResults } from './SearchResults';

const PAGE_SIZE = 10;
const FIRST_PAGE = 1;

export function Search() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { value: search, debouncedValue: debouncedSearch, setValue: setSearch } =
    useDebouncedState('');

  const isDefaultState = debouncedSearch.length === 0;

  const searchQuery = useEventsControllerListEventsInfinite(
    { title: debouncedSearch, limit: PAGE_SIZE },
    {
      query: {
        enabled: !isDefaultState,
        initialPageParam: FIRST_PAGE,
        getNextPageParam: (lastPage, _pages, lastPageParam) =>
          lastPage.hasMore ? (lastPageParam ?? FIRST_PAGE) + 1 : undefined,
      },
    },
  );
  const sentinelRef = useInfiniteScrollTrigger(searchQuery);
  const events = searchQuery.data?.pages.flatMap((page) => page.items);

  const { data: recentlyViewedData } = useEventsControllerGetRecentlyViewed({
    query: { enabled: open && isDefaultState },
  });

  function selectEvent(eventId: string) {
    navigate(`/${eventId}`);
    setSearch('');
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-muted-foreground flex w-64 items-center rounded-md border px-3 py-2 text-sm"
      >
        Search events...
      </button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search events"
        description="Search for an event by title"
        shouldFilter={false}
      >
        <CommandInput
          value={search}
          onValueChange={setSearch}
          placeholder="Search events..."
        />
        <CommandList className="min-h-75">
          <SearchResults
            isDefaultState={isDefaultState}
            isLoading={searchQuery.isLoading}
            events={events}
            recentlyViewedData={recentlyViewedData}
            onSelect={selectEvent}
            hasNextPage={searchQuery.hasNextPage}
            isFetchingNextPage={searchQuery.isFetchingNextPage}
            sentinelRef={sentinelRef}
          />
        </CommandList>
      </CommandDialog>
    </>
  );
}

export default Search;
