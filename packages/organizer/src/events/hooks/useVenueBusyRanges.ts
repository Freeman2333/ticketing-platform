import { useEventsListEvents } from '@ticketing/api-client';

export function useVenueBusyRanges(
  venueId: string | undefined,
  excludeEventId?: string,
) {
  const { data } = useEventsListEvents(
    { venueId, excludeEventId, limit: 500 },
    { query: { enabled: !!venueId } },
  );

  return (data?.items ?? []).map((event) => ({
    start: new Date(event.startsAt),
    end: new Date(event.endsAt),
  }));
}
