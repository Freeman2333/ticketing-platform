import { Link, useNavigate } from 'react-router-dom';
import { setAccessToken } from '@ticketing/auth-client';
import { useAuthControllerLogout } from '@ticketing/api-client';
import { Button } from '@ticketing/ui';

export function OrganizerHeader() {
  const navigate = useNavigate();
  const logoutMutation = useAuthControllerLogout();

  async function handleLogout() {
    try {
      await logoutMutation.mutateAsync();
    } finally {
      setAccessToken(null);
      navigate('/');
    }
  }

  return (
    <header className="bg-background sticky top-0 z-50 flex items-center justify-between gap-4 border-b p-4">
      <div className="flex items-center gap-6">
        <Link to="/" className="font-semibold">
          Ticketing
        </Link>
        <nav className="flex gap-4">
          <Link to="/organizer">Events</Link>
          <Link to="/organizer/venues">Venues</Link>
        </nav>
      </div>
      <Button variant="outline" onClick={handleLogout}>
        Log out
      </Button>
    </header>
  );
}
