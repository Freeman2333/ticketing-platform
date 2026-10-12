import { Skeleton } from '@ticketing/ui';

const SKELETON_ROWS = 5;

export function SearchResultsSkeleton() {
  return (
    <div className="p-1">
      {Array.from({ length: SKELETON_ROWS }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-2 py-3">
          <Skeleton className="h-12 w-12 shrink-0 rounded" />
          <div className="flex flex-col gap-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
