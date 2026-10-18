import { useRef } from 'react';
import { skipToken, useQueryClient } from '@tanstack/react-query';
import type { QueryFunction, QueryKey } from '@tanstack/react-query';

const DEFAULT_DELAY_MS = 200;

export function usePrefetchOnHover(
  queryOptions: {
    queryKey: QueryKey;
    queryFn?: QueryFunction | typeof skipToken;
  },
  delayMs = DEFAULT_DELAY_MS,
) {
  const queryClient = useQueryClient();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const onMouseEnter = () => {
    const { queryKey, queryFn } = queryOptions;
    if (typeof queryFn !== 'function') return;
    timeoutRef.current = setTimeout(() => {
      queryClient.query({ queryKey, queryFn }).catch(() => {});
    }, delayMs);
  };

  const onMouseLeave = () => {
    clearTimeout(timeoutRef.current);
  };

  return { onMouseEnter, onMouseLeave };
}
