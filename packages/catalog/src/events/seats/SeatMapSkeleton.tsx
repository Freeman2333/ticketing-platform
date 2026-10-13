import { Skeleton } from '@ticketing/ui';

const SKELETON_ROWS = 3;
const SKELETON_SEATS_PER_ROW = 10;

export function SeatMapSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: SKELETON_ROWS }, (_, row) => (
        <div key={row} className="flex items-center gap-2">
          <Skeleton className="h-4 w-12 shrink-0" />
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: SKELETON_SEATS_PER_ROW }, (_, seat) => (
              <Skeleton key={seat} className="size-8 rounded-md" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
