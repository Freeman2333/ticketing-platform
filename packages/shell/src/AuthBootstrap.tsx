import { useEffect, useState, type ReactNode } from 'react';
import { setAccessToken } from '@ticketing/auth-client';
import { authControllerRefresh } from '@ticketing/api-client';

export function AuthBootstrap({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    authControllerRefresh()
      .then((response) => setAccessToken(response.accessToken))
      .catch(() => setAccessToken(null))
      .finally(() => setIsReady(true));
  }, []);

  if (!isReady) return null;

  return <>{children}</>;
}
