import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import type { SeatDto } from '@ticketing/api-client';
import { getEventsGetSeatsQueryKey } from '@ticketing/api-client';

export function useSeatAvailability(eventId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = io(process.env.NX_PUBLIC_API_URL);
    const seatsQueryKey = getEventsGetSeatsQueryKey(eventId);
    let hasConnectedBefore = false;

    socket.on('connect', () => {
      socket.emit('joinEvent', eventId);
      if (hasConnectedBefore) {
        // A dropped connection may have missed updates - refetch to be sure.
        queryClient.invalidateQueries({ queryKey: seatsQueryKey });
      }
      hasConnectedBefore = true;
    });

    socket.on('seatsUpdated', (seats: SeatDto[]) => {
      queryClient.setQueryData(seatsQueryKey, seats);
    });

    return () => {
      socket.emit('leaveEvent', eventId);
      socket.disconnect();
    };
  }, [eventId, queryClient]);
}
