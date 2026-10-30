import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  setAccessToken,
  useIsAuthenticated,
  useUserRole,
} from '@ticketing/auth-client';
import { useAuthLogout } from '@ticketing/api-client';
import { Button } from '@ticketing/ui';
import { lazyProvider } from './mf';
import { ProviderBoundary } from './ProviderBoundary';

const ProviderCatalogSearch = lazyProvider('catalog', 'Search');
const NON_CATALOG_PATH_PREFIXES = ['/login', '/register'];

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const isLoggedIn = useIsAuthenticated();
  const role = useUserRole();
  const logoutMutation = useAuthLogout();
  const showSearch = !NON_CATALOG_PATH_PREFIXES.some((prefix) =>
    location.pathname.startsWith(prefix),
  );

  async function handleLogout() {
    try {
      await logoutMutation.mutateAsync();
    } finally {
      setAccessToken(null);
      navigate('/');
    }
  }

  return (
    <header className="bg-background sticky top-0 z-50 grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b p-4">
      <Link to="/" className="font-semibold">
        Ticketing
      </Link>
      {showSearch && (
        <ProviderBoundary
          name="catalog search"
          fallback={
            <div className="text-muted-foreground flex w-64 items-center rounded-md border px-3 py-2 text-sm opacity-50">
              Search events...
            </div>
          }
        >
          <ProviderCatalogSearch />
        </ProviderBoundary>
      )}
      <nav className="col-start-3 flex justify-end gap-2">
        {isLoggedIn ? (
          <>
            {role === 'organizer' && (
              <Button variant="ghost" asChild>
                <Link to="/organizer">Organizer</Link>
              </Button>
            )}
            <Button variant="outline" onClick={handleLogout}>
              Log out
            </Button>
          </>
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
