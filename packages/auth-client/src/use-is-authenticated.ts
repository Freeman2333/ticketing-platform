import { useSyncExternalStore } from 'react';
import { getAccessToken, onAuthChange } from './token-store';

function subscribe(callback: () => void): () => void {
  return onAuthChange(() => callback());
}

function getSnapshot(): boolean {
  return getAccessToken() !== null;
}

export function useIsAuthenticated(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot);
}
