import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEventsControllerListEvents } from '@ticketing/api-client';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@ticketing/ui';

export function EventSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const { data: events } = useEventsControllerListEvents(
    { title: debouncedSearch },
    { query: { enabled: debouncedSearch.length > 0 } },
  );

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
      <CommandDialog open={open} onOpenChange={setOpen} title="Search events" description="Search for an event by title">
        <CommandInput value={search} onValueChange={setSearch} placeholder="Search events..." />
        <CommandList>
          {events?.length ? (
            <CommandGroup>
              {events.map((event) => (
                <CommandItem key={event.id} onSelect={() => selectEvent(event.id)}>
                  {event.title}
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
