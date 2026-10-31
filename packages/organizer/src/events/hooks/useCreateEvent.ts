import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  getEventsListMyEventsInfiniteQueryKey,
  useEventsCreate,
  useEventsCreateSeats,
  useEventsUploadPoster,
} from '@ticketing/api-client';

export function useCreateEvent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createMutation = useEventsCreate();
  const uploadMutation = useEventsUploadPoster();
  const createSeatsMutation = useEventsCreateSeats();

  async function createEvent(
    values: { venueId: string; title: string; startsAt: Date; endsAt: Date },
    seatTypes: { label: string; price: number; count: number }[],
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
    await createSeatsMutation.mutateAsync({
      id: event.id,
      data: { rows: seatTypes },
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
    isPending:
      createMutation.isPending ||
      createSeatsMutation.isPending ||
      uploadMutation.isPending,
  };
}
