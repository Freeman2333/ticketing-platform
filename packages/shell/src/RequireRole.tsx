import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useUserRole, type UserRole } from '@ticketing/auth-client';

export function RequireRole({
  role,
  children,
}: {
  role: UserRole;
  children: ReactNode;
}) {
  const currentRole = useUserRole();

  if (currentRole !== role) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
