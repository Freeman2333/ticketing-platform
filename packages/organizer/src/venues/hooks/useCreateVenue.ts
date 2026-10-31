import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  getVenuesFindMineQueryKey,
  useVenuesCreate,
  useVenuesUploadImage,
  VenuesCreateBody,
} from '@ticketing/api-client';
import type { z } from 'zod';

export function useCreateVenue() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createMutation = useVenuesCreate();
  const uploadMutation = useVenuesUploadImage();

  async function createVenue(
    values: z.infer<typeof VenuesCreateBody>,
    file: File | null,
  ) {
    const venue = await createMutation.mutateAsync({ data: values });
    if (file) {
      await uploadMutation.mutateAsync({ id: venue.id, data: { file } });
    }
    queryClient.invalidateQueries({
      queryKey: getVenuesFindMineQueryKey(),
    });
    navigate('/organizer/venues');
  }

  return {
    createVenue,
    isPending: createMutation.isPending || uploadMutation.isPending,
  };
}
