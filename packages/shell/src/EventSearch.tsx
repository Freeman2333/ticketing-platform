import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEventsControllerListEvents } from '@ticketing/api-client';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Skeleton,
  useDebouncedState,
} from '@ticketing/ui';

const SKELETON_ROWS = 5;

export function EventSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { value: search, debouncedValue: debouncedSearch, setValue: setSearch } =
    useDebouncedState('');

  const { data, isLoading } = useEventsControllerListEvents(
    { title: debouncedSearch },
    { query: { enabled: debouncedSearch.length > 0 } },
  );
  const events = data?.items;

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
        <CommandInput value={search} onValueChange={setSearch} placeholder="Search events..." />
        <CommandList>
          {debouncedSearch.length === 0 ? null : isLoading ? (
            <div className="p-1">
              {Array.from({ length: SKELETON_ROWS }, (_, i) => (
                <div key={i} className="flex items-center gap-3 px-2 py-3">
                  <Skeleton className="h-12 w-12 shrink-0 rounded" />
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : events?.length ? (
            <CommandGroup>
              {events.map((event) => (
                <CommandItem
                  key={event.id}
                  onSelect={() => selectEvent(event.id)}
                  className="cursor-pointer gap-3"
                >
                  <div className="bg-muted h-12 w-12 shrink-0 overflow-hidden rounded">
                    {event.posterUrl && (
                      <img
                        src={event.posterUrl}
                        alt={event.title}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">{event.title}</span>
                    <span className="text-muted-foreground text-xs">
                      {new Date(event.startsAt).toLocaleDateString(undefined, {
                        dateStyle: 'medium',
                      })}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : (
            <CommandEmpty>No events found.</CommandEmpty>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
