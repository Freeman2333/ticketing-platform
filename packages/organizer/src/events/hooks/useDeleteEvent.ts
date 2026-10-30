import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  getEventsControllerListMyEventsInfiniteQueryKey,
  useEventsControllerRemove,
} from '@ticketing/api-client';

export function useDeleteEvent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const deleteMutation = useEventsControllerRemove();

  async function deleteEvent(id: string) {
    try {
      await deleteMutation.mutateAsync({ id });
      queryClient.invalidateQueries({
        queryKey: getEventsControllerListMyEventsInfiniteQueryKey(),
      });
      toast.success('Event deleted.');
      navigate('/organizer');
    } catch {
      toast.error('This event still has sold tickets.');
    }
  }

  return { deleteEvent, isPending: deleteMutation.isPending };
}
