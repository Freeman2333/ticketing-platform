import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useEventsControllerGetRecentlyViewed,
  useEventsControllerListEvents,
} from '@ticketing/api-client';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  useDebouncedState,
} from '@ticketing/ui';
import { SearchResults } from './SearchResults';

export function Search() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { value: search, debouncedValue: debouncedSearch, setValue: setSearch } =
    useDebouncedState('');

  const isDefaultState = debouncedSearch.length === 0;

  const { data, isLoading } = useEventsControllerListEvents(
    { title: debouncedSearch },
    { query: { enabled: !isDefaultState } },
  );

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
        <CommandList>
          <SearchResults
            isDefaultState={isDefaultState}
            isLoading={isLoading}
            events={data?.items}
            recentlyViewedData={recentlyViewedData}
            onSelect={selectEvent}
          />
        </CommandList>
      </CommandDialog>
    </>
  );
}

export default Search;
