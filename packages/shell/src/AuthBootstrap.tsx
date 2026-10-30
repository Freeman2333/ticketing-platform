import { useEffect, useRef, useState, type ReactNode } from 'react';
import { setAccessToken } from '@ticketing/auth-client';
import { authRefresh } from '@ticketing/api-client';

export function AuthBootstrap({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    authRefresh()
      .then((response) => setAccessToken(response.accessToken))
      .catch(() => setAccessToken(null))
      .finally(() => setIsReady(true));
  }, []);

  if (!isReady) return null;

  return <>{children}</>;
}
