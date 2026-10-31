import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  getEventsGetEventQueryKey,
  getEventsListMyEventsInfiniteQueryKey,
  getEventsListSeatTypesQueryKey,
  useEventsCreateSeats,
  useEventsUpdate,
  useEventsUpdateSeatType,
  useEventsUploadPoster,
} from '@ticketing/api-client';

export function useUpdateEvent(id: string) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const updateMutation = useEventsUpdate();
  const updateSeatTypeMutation = useEventsUpdateSeatType();
  const createSeatsMutation = useEventsCreateSeats();
  const uploadMutation = useEventsUploadPoster();

  async function updateEvent(
    values: { title: string; startsAt?: Date; endsAt?: Date },
    existingSeatTypes: { seatTypeId: string; price: number }[],
    originalSeatTypes: { id: string; price: number }[],
    newSeatTypes: { label: string; price: number; count: number }[],
    file: File | null,
  ) {
    const priceUpdates = existingSeatTypes.filter((updated) => {
      const original = originalSeatTypes.find(
        (seatType) => seatType.id === updated.seatTypeId,
      );
      return original && original.price !== updated.price;
    });

    await updateMutation.mutateAsync({
      id,
      data: {
        title: values.title,
        startsAt: values.startsAt?.toISOString(),
        endsAt: values.endsAt?.toISOString(),
      },
    });

    await Promise.all(
      priceUpdates.map((update) =>
        updateSeatTypeMutation.mutateAsync({
          id,
          seatTypeId: update.seatTypeId,
          data: { price: update.price },
        }),
      ),
    );

    if (newSeatTypes.length > 0) {
      await createSeatsMutation.mutateAsync({
        id,
        data: { rows: newSeatTypes },
      });
    }

    if (file) {
      await uploadMutation.mutateAsync({ id, data: { file } });
    }

    queryClient.invalidateQueries({ queryKey: getEventsGetEventQueryKey(id) });
    queryClient.invalidateQueries({
      queryKey: getEventsListSeatTypesQueryKey(id),
    });
    queryClient.invalidateQueries({
      queryKey: getEventsListMyEventsInfiniteQueryKey(),
    });
    navigate(`/organizer/events/${id}`);
  }

  return {
    updateEvent,
    isPending:
      updateMutation.isPending ||
      updateSeatTypeMutation.isPending ||
      createSeatsMutation.isPending ||
      uploadMutation.isPending,
  };
}
