import { EventDto } from '@ticketing/api-client';
import { CommandItem } from '@ticketing/ui';

export function EventResultItem({
  event,
  onSelect,
}: {
  event: EventDto;
  onSelect: () => void;
}) {
  return (
    <CommandItem onSelect={onSelect} className="cursor-pointer gap-3">
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
  );
}
