import { useState, type Dispatch, type SetStateAction } from 'react';
import { useDebounce } from './use-debounce';

interface DebouncedState<T> {
  value: T;
  debouncedValue: T;
  setValue: Dispatch<SetStateAction<T>>;
}

export function useDebouncedState<T>(
  initialValue: T,
  delayMs = 300,
): DebouncedState<T> {
  const [value, setValue] = useState(initialValue);
  const debouncedValue = useDebounce(value, delayMs);

  return { value, debouncedValue, setValue };
}
