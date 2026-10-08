import { useEffect, useState, type ReactNode } from 'react';
import { httpClient, setAccessToken } from '@ticketing/auth-client';

export function AuthBootstrap({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    httpClient
      .post<{ accessToken: string }>('/auth/refresh')
      .then((response) => setAccessToken(response.data.accessToken))
      .catch(() => setAccessToken(null))
      .finally(() => setIsReady(true));
  }, []);

  if (!isReady) return null;

  return <>{children}</>;
}
