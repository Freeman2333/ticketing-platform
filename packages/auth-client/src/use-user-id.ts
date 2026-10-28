import { useSyncExternalStore } from 'react';
import { getAccessToken, onAuthChange } from './token-store';

interface AccessTokenPayload {
  sub: string;
}

function decodeUserId(token: string): string | null {
  try {
    const payload: AccessTokenPayload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export function getUserId(): string | null {
  const token = getAccessToken();
  return token ? decodeUserId(token) : null;
}

function subscribe(callback: () => void): () => void {
  return onAuthChange(() => callback());
}

export function useUserId(): string | null {
  return useSyncExternalStore(subscribe, getUserId);
}
