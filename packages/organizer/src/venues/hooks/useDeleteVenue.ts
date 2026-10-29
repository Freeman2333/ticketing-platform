import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  getVenuesControllerFindMineQueryKey,
  useVenuesControllerRemove,
} from '@ticketing/api-client';

export function useDeleteVenue() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const deleteMutation = useVenuesControllerRemove();

  async function deleteVenue(id: string) {
    try {
      await deleteMutation.mutateAsync({ id });
      queryClient.invalidateQueries({
        queryKey: getVenuesControllerFindMineQueryKey(),
      });
      toast.success('Venue deleted.');
      navigate('/organizer/venues');
    } catch {
      toast.error('This venue still has events. Delete or move them first.');
    }
  }

  return { deleteVenue, isPending: deleteMutation.isPending };
}
