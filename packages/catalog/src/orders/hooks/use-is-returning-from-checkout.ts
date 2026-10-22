import { useSearchParams } from 'react-router-dom';

export function useIsReturningFromCheckout(): boolean {
  const [searchParams] = useSearchParams();
  return searchParams.has('session_id');
}
