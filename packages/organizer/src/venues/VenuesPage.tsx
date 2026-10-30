import { Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useVenuesFindMineSuspense } from '@ticketing/api-client';
import { Button, ErrorBoundary } from '@ticketing/ui';
import {
  VenueListItem,
  VenueListItemSkeleton,
} from './components/VenueListItem';

const SKELETON_ROW_COUNT = 5;

function SkeletonList() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: SKELETON_ROW_COUNT }, (_, i) => (
        <VenueListItemSkeleton key={i} />
      ))}
    </div>
  );
}

function VenuesContent() {
  const { data: venues } = useVenuesFindMineSuspense();

  if (venues.length === 0) {
    return (
      <p className="text-muted-foreground">
        You don&apos;t have any venues yet.
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-md border">
      {venues.map((venue) => (
        <VenueListItem key={venue.id} venue={venue} />
      ))}
    </ul>
  );
}

export function VenuesPage() {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My Venues</h1>
        <Button asChild>
          <Link to="/organizer/venues/new">Add venue</Link>
        </Button>
      </div>

      <ErrorBoundary fallback={<p>Failed to load venues.</p>}>
        <Suspense fallback={<SkeletonList />}>
          <VenuesContent />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
