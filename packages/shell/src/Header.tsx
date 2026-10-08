import { Link, useNavigate } from 'react-router-dom';
import {
  httpClient,
  setAccessToken,
  useIsAuthenticated,
} from '@ticketing/auth-client';
import { Button } from '@ticketing/ui';

export function Header() {
  const navigate = useNavigate();
  const isLoggedIn = useIsAuthenticated();

  async function handleLogout() {
    try {
      await httpClient.post('/auth/logout');
    } finally {
      setAccessToken(null);
      navigate('/');
    }
  }

  return (
    <header className="bg-background sticky top-0 z-50 flex items-center justify-between border-b p-4">
      <span className="font-semibold">Ticketing</span>
      <nav className="flex gap-2">
        {isLoggedIn ? (
          <Button variant="outline" onClick={handleLogout}>
            Log out
          </Button>
        ) : (
          <>
            <Button variant="ghost" asChild>
              <Link to="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link to="/register">Register</Link>
            </Button>
          </>
        )}
      </nav>
    </header>
  );
}
