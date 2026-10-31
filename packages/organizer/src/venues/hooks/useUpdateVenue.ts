import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  getVenuesFindMineQueryKey,
  getVenuesFindOneQueryKey,
  useVenuesUpdate,
  useVenuesUploadImage,
  VenuesUpdateBody,
} from '@ticketing/api-client';
import type { z } from 'zod';

export function useUpdateVenue(id: string) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const updateMutation = useVenuesUpdate();
  const uploadMutation = useVenuesUploadImage();

  async function updateVenue(
    values: z.infer<typeof VenuesUpdateBody>,
    file: File | null,
  ) {
    await updateMutation.mutateAsync({ id, data: values });
    if (file) {
      await uploadMutation.mutateAsync({ id, data: { file } });
    }
    queryClient.invalidateQueries({
      queryKey: getVenuesFindMineQueryKey(),
    });
    queryClient.invalidateQueries({
      queryKey: getVenuesFindOneQueryKey(id),
    });
    navigate(`/organizer/venues/${id}`);
  }

  return {
    updateVenue,
    isPending: updateMutation.isPending || uploadMutation.isPending,
  };
}
