import { Skeleton } from "@/components/ui/skeleton";

function SkeletonRow() {
  return (
    <div className="grid grid-cols-12 gap-4 items-center px-4 py-3">
      {/* Organization */}
      <div className="col-span-4 flex items-center gap-3 pl-2">
        <Skeleton className="h-8 w-8 rounded" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      {/* Sector */}
      <div className="col-span-2">
        <Skeleton className="h-5 w-20 rounded" />
      </div>
      {/* Region */}
      <div className="col-span-2">
        <Skeleton className="h-3 w-24" />
      </div>
      {/* Contracts */}
      <div className="col-span-1 flex justify-end pr-4">
        <Skeleton className="h-4 w-8" />
      </div>
      {/* Org Type */}
      <div className="col-span-2">
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      {/* Score */}
      <div className="col-span-1 flex justify-end">
        <Skeleton className="h-4 w-6" />
      </div>
    </div>
  );
}

export function BuyerTableSkeleton() {
  return (
    <div className="min-w-[900px]">
      {/* Header */}
      <div className="grid grid-cols-12 gap-4 px-4 py-2 border-b border-border mb-1">
        <div className="col-span-4 pl-2">
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="col-span-2">
          <Skeleton className="h-3 w-12" />
        </div>
        <div className="col-span-2">
          <Skeleton className="h-3 w-14" />
        </div>
        <div className="col-span-1 flex justify-end pr-4">
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="col-span-2">
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="col-span-1 flex justify-end">
          <Skeleton className="h-3 w-10" />
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
