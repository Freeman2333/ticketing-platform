import * as React from 'react';
import { CalendarIcon } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '../ui/button';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

const SLOT_MINUTES = 30;
const SLOTS_PER_DAY = (24 * 60) / SLOT_MINUTES;

interface TimeRange {
  start: Date;
  end: Date;
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

function formatSlotLabel(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getDaySlots(day: Date): TimeRange[] {
  const slots: TimeRange[] = [];
  for (let i = 0; i < SLOTS_PER_DAY; i++) {
    const start = new Date(day);
    start.setHours(0, i * SLOT_MINUTES, 0, 0);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + SLOT_MINUTES);
    slots.push({ start, end });
  }
  return slots;
}

function isSlotDisabled(slot: TimeRange, disabledRanges: TimeRange[]): boolean {
  return disabledRanges.some(
    (range) => slot.start < range.end && slot.end > range.start,
  );
}

function getDatesInRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cursor <= last) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export function EventTimeRangePicker({
  startsAt,
  endsAt,
  onStartsAtChange,
  onEndsAtChange,
  placeholder = 'Pick a date and time',
  disabled = false,
  disabledRanges = [],
}: {
  startsAt: Date | undefined;
  endsAt: Date | undefined;
  onStartsAtChange: (date: Date | undefined) => void;
  onEndsAtChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  disabledRanges?: TimeRange[];
}) {
  const [pickedDay, setPickedDay] = React.useState<Date | undefined>(
    startsAt ?? new Date(),
  );
  const [pickingEnd, setPickingEnd] = React.useState(false);

  function handleDaySelect(day: Date | undefined) {
    setPickedDay(day);
    setPickingEnd(false);
    if (!day) {
      onStartsAtChange(undefined);
      onEndsAtChange(undefined);
    }
  }

  function handleSlotClick(slot: TimeRange) {
    if (!pickingEnd || !startsAt || slot.start <= startsAt) {
      onStartsAtChange(slot.start);
      onEndsAtChange(undefined);
      setPickingEnd(true);
      return;
    }

    const daySlots = getDaySlots(pickedDay!);
    const startIndex = daySlots.findIndex(
      (s) => s.start.getTime() === startsAt.getTime(),
    );
    const clickedIndex = daySlots.findIndex(
      (s) => s.start.getTime() === slot.start.getTime(),
    );

    let clampedEnd = slot.end;
    for (let i = startIndex; i <= clickedIndex; i++) {
      if (isSlotDisabled(daySlots[i], disabledRanges)) {
        clampedEnd = daySlots[i].start;
        break;
      }
    }
    onEndsAtChange(clampedEnd);
    setPickingEnd(false);
  }

  const daySlots = pickedDay ? getDaySlots(pickedDay) : [];
  const busyDays = disabledRanges.flatMap((range) =>
    getDatesInRange(range.start, range.end),
  );

  return (
    <Popover>
      <PopoverTrigger asChild disabled={disabled}>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'h-auto w-full justify-start gap-2 py-2.5 text-left font-normal',
            !startsAt && 'text-muted-foreground',
          )}
        >
          <CalendarIcon className="size-4 shrink-0" />
          {startsAt && endsAt
            ? formatRange(startsAt, endsAt)
            : startsAt
              ? `${formatSlotLabel(startsAt)} – pick an end time`
              : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={pickedDay}
          onSelect={handleDaySelect}
          modifiers={{ busy: busyDays }}
          modifiersClassNames={{ busy: 'bg-accent' }}
        />
        {pickedDay && (
          <div className="grid grid-cols-4 gap-1 border-t p-3">
            {daySlots.map((slot) => {
              const slotDisabled = isSlotDisabled(slot, disabledRanges);
              const isStartSlot =
                startsAt && slot.start.getTime() === startsAt.getTime();
              const isInRange =
                startsAt &&
                endsAt &&
                slot.start >= startsAt &&
                slot.start < endsAt;
              const isSelected = isStartSlot || isInRange;

              return (
                <Button
                  key={slot.start.toISOString()}
                  type="button"
                  size="sm"
                  variant={isSelected ? 'default' : 'outline'}
                  disabled={slotDisabled}
                  onClick={() => handleSlotClick(slot)}
                  className="text-xs"
                >
                  {formatSlotLabel(slot.start)}
                </Button>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
