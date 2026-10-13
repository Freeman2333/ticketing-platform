import type { RefObject } from 'react';
import { EventDto, RecentlyViewedDto } from '@ticketing/api-client';
import { CommandEmpty, CommandGroup } from '@ticketing/ui';
import { EventResultItem } from './EventResultItem';
import { SearchResultsSkeleton } from './SearchResultsSkeleton';

export function SearchResults({
  isDefaultState,
  isLoading,
  events,
  recentlyViewedData,
  onSelect,
  hasNextPage,
  isFetchingNextPage,
  sentinelRef,
}: {
  isDefaultState: boolean;
  isLoading: boolean;
  events: EventDto[] | undefined;
  recentlyViewedData: RecentlyViewedDto | undefined;
  onSelect: (eventId: string) => void;
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
  sentinelRef: RefObject<HTMLDivElement | null>;
}) {
  if (isDefaultState) {
    return (
      <>
        {recentlyViewedData?.recentlyViewed.length ? (
          <CommandGroup heading="Recently viewed">
            {recentlyViewedData.recentlyViewed.map((event) => (
              <EventResultItem
                key={event.id}
                event={event}
                onSelect={() => onSelect(event.id)}
              />
            ))}
          </CommandGroup>
        ) : null}
        {recentlyViewedData?.upcoming.length ? (
          <CommandGroup heading="Upcoming">
            {recentlyViewedData.upcoming.map((event) => (
              <EventResultItem
                key={event.id}
                event={event}
                onSelect={() => onSelect(event.id)}
              />
            ))}
          </CommandGroup>
        ) : null}
      </>
    );
  }

  if (isLoading) return <SearchResultsSkeleton />;

  if (events?.length) {
    return (
      <CommandGroup>
        {events.map((event) => (
          <EventResultItem
            key={event.id}
            event={event}
            onSelect={() => onSelect(event.id)}
          />
        ))}
        {isFetchingNextPage && <SearchResultsSkeleton rows={2} />}
        {hasNextPage && <div ref={sentinelRef} />}
      </CommandGroup>
    );
  }

  return (
    <CommandEmpty className="flex h-75 flex-col items-center justify-center text-center text-sm">
      No events found.
    </CommandEmpty>
  );
}
