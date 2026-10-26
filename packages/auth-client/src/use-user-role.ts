import { useSyncExternalStore } from 'react';
import { getAccessToken, onAuthChange } from './token-store';

export type UserRole = 'attendee' | 'organizer' | 'admin';

interface AccessTokenPayload {
  sub: string;
  role: UserRole;
}

function decodeRole(token: string): UserRole | null {
  try {
    const payload: AccessTokenPayload = JSON.parse(atob(token.split('.')[1]));
    return payload.role ?? null;
  } catch {
    return null;
  }
}

export function getUserRole(): UserRole | null {
  const token = getAccessToken();
  return token ? decodeRole(token) : null;
}

function subscribe(callback: () => void): () => void {
  return onAuthChange(() => callback());
}

export function useUserRole(): UserRole | null {
  return useSyncExternalStore(subscribe, getUserRole);
}
