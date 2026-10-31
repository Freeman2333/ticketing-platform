import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  getEventsListMyEventsInfiniteQueryKey,
  useEventsCreate,
  useEventsUploadPoster,
} from '@ticketing/api-client';

export function useCreateEvent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createMutation = useEventsCreate();
  const uploadMutation = useEventsUploadPoster();

  async function createEvent(
    values: { venueId: string; title: string; startsAt: Date; endsAt: Date },
    file: File | null,
  ) {
    const event = await createMutation.mutateAsync({
      data: {
        venueId: values.venueId,
        title: values.title,
        startsAt: values.startsAt.toISOString(),
        endsAt: values.endsAt.toISOString(),
      },
    });
    if (file) {
      await uploadMutation.mutateAsync({ id: event.id, data: { file } });
    }
    queryClient.invalidateQueries({
      queryKey: getEventsListMyEventsInfiniteQueryKey(),
    });
    navigate(`/organizer/events/${event.id}`);
  }

  return {
    createEvent,
    isPending: createMutation.isPending || uploadMutation.isPending,
  };
}
