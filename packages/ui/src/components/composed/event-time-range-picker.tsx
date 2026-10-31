import * as React from 'react';
import { CalendarIcon } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '../ui/button';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

function toTimeInputValue(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`;
}

function formatRange(startsAt: Date, endsAt: Date): string {
  const dateLabel = startsAt.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const timeFormat: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
  };
  return `${dateLabel} · ${startsAt.toLocaleTimeString(undefined, timeFormat)} – ${endsAt.toLocaleTimeString(undefined, timeFormat)}`;
}

export function EventTimeRangePicker({
  startsAt,
  endsAt,
  onStartsAtChange,
  onEndsAtChange,
  placeholder = 'Pick a date and time',
}: {
  startsAt: Date | undefined;
  endsAt: Date | undefined;
  onStartsAtChange: (date: Date | undefined) => void;
  onEndsAtChange: (date: Date | undefined) => void;
  placeholder?: string;
}) {
  function handleDaySelect(day: Date | undefined) {
    if (!day) {
      onStartsAtChange(undefined);
      onEndsAtChange(undefined);
      return;
    }

    const nextStart = new Date(day);
    if (startsAt) {
      nextStart.setHours(startsAt.getHours(), startsAt.getMinutes());
    } else {
      nextStart.setHours(9, 0, 0, 0);
    }
    onStartsAtChange(nextStart);

    const nextEnd = new Date(day);
    if (endsAt) {
      nextEnd.setHours(endsAt.getHours(), endsAt.getMinutes());
    } else {
      nextEnd.setHours(nextStart.getHours() + 1, nextStart.getMinutes(), 0, 0);
    }
    onEndsAtChange(nextEnd);
  }

  function handleStartTimeChange(event: React.ChangeEvent<HTMLInputElement>) {
    const [hours, minutes] = event.target.value.split(':').map(Number);
    const next = new Date(startsAt ?? new Date());
    next.setHours(hours, minutes, 0, 0);
    onStartsAtChange(next);
  }

  function handleEndTimeChange(event: React.ChangeEvent<HTMLInputElement>) {
    const [hours, minutes] = event.target.value.split(':').map(Number);
    const next = new Date(endsAt ?? startsAt ?? new Date());
    next.setHours(hours, minutes, 0, 0);
    onEndsAtChange(next);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'h-auto w-full justify-start gap-2 py-2.5 text-left font-normal',
            !startsAt && 'text-muted-foreground',
          )}
        >
          <CalendarIcon className="size-4 shrink-0" />
          {startsAt && endsAt ? formatRange(startsAt, endsAt) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar mode="single" selected={startsAt} onSelect={handleDaySelect} />
        <div className="grid grid-cols-2 gap-3 border-t p-3">
          <div className="grid gap-1.5">
            <span className="text-muted-foreground text-xs">Start time</span>
            <input
              type="time"
              value={startsAt ? toTimeInputValue(startsAt) : ''}
              onChange={handleStartTimeChange}
              disabled={!startsAt}
              className="border-input rounded-md border px-2 py-1 text-sm"
            />
          </div>
          <div className="grid gap-1.5">
            <span className="text-muted-foreground text-xs">End time</span>
            <input
              type="time"
              value={endsAt ? toTimeInputValue(endsAt) : ''}
              onChange={handleEndTimeChange}
              disabled={!endsAt}
              className="border-input rounded-md border px-2 py-1 text-sm"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
