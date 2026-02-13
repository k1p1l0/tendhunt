import { Skeleton } from "@/components/ui/skeleton";

function SkeletonRow() {
  return (
    <div className="grid grid-cols-12 gap-4 items-center px-4 py-3">
      {/* Title & Buyer */}
      <div className="col-span-5 flex flex-col gap-2 pl-2">
        <Skeleton className="h-4 w-3/4" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      {/* Value */}
      <div className="col-span-2">
        <Skeleton className="h-4 w-20" />
      </div>
      {/* Status */}
      <div className="col-span-1">
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      {/* Deadline */}
      <div className="col-span-2">
        <Skeleton className="h-3 w-24" />
      </div>
      {/* Sector */}
      <div className="col-span-2">
        <Skeleton className="h-5 w-20 rounded" />
      </div>
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="min-w-[800px]">
      {/* Header */}
      <div className="grid grid-cols-12 gap-4 px-4 py-2 border-b border-border mb-1">
        <div className="col-span-5 pl-2">
          <Skeleton className="h-3 w-28" />
        </div>
        <div className="col-span-2">
          <Skeleton className="h-3 w-12" />
        </div>
        <div className="col-span-1">
          <Skeleton className="h-3 w-12" />
        </div>
        <div className="col-span-2">
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="col-span-2">
          <Skeleton className="h-3 w-14" />
        </div>
      </div>
      {/* Rows */}
      <div className="space-y-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}
