import { Suspense } from "react";
import { fetchContracts } from "@/lib/contracts";
import { ContractCard } from "@/components/contracts/contract-card";
import { ContractSearch } from "@/components/contracts/contract-search";
import { ContractFilters } from "@/components/contracts/contract-filters";
import { ContractCount } from "@/components/contracts/contract-count";
import { Pagination } from "@/components/contracts/pagination";
import { Skeleton } from "@/components/ui/skeleton";

function CardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-1/4" />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-10 rounded-full" />
      </div>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

async function ContractFeed({
  query,
  sector,
  region,
  minValue,
  maxValue,
  sort,
  page,
}: {
  query?: string;
  sector?: string;
  region?: string;
  minValue?: number;
  maxValue?: number;
  sort?: "date" | "score";
  page: number;
}) {
  const pageSize = 20;
  const { contracts, filteredCount, totalCount } = await fetchContracts({
    query,
    sector,
    region,
    minValue,
    maxValue,
    sort,
    page,
    pageSize,
  });

  const totalPages = Math.ceil(filteredCount / pageSize);

  return (
    <>
      <ContractCount total={totalCount} filtered={filteredCount} />

      {contracts.length === 0 ? (
        <div className="flex items-center justify-center rounded-xl border bg-card py-16">
          <p className="text-sm text-muted-foreground">
            No contracts found. Try adjusting your search or filters.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contracts.map((contract) => (
            <ContractCard
              key={String(contract._id)}
              contract={{
                _id: String(contract._id),
                title: contract.title,
                buyerName: contract.buyerName,
                buyerId: contract.buyerId ? String(contract.buyerId) : undefined,
                buyerRegion: contract.buyerRegion,
                valueMin: contract.valueMin,
                valueMax: contract.valueMax,
                publishedDate: contract.publishedDate,
                deadlineDate: contract.deadlineDate,
                source: contract.source,
                sector: contract.sector,
                vibeScore: contract.vibeScore,
              }}
            />
          ))}
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} />
    </>
  );
}

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  const query =
    typeof params.query === "string" ? params.query : undefined;
  const sector =
    typeof params.sector === "string" ? params.sector : undefined;
  const region =
    typeof params.region === "string" ? params.region : undefined;
  const sortParam =
    typeof params.sort === "string" ? params.sort : undefined;
  const sort: "date" | "score" =
    sortParam === "score" ? "score" : "date";

  const pageStr =
    typeof params.page === "string" ? params.page : undefined;
  const page = pageStr ? Math.max(1, parseInt(pageStr, 10) || 1) : 1;

  const minValueStr =
    typeof params.minValue === "string" ? params.minValue : undefined;
  const maxValueStr =
    typeof params.maxValue === "string" ? params.maxValue : undefined;
  const minValue = minValueStr ? Number(minValueStr) || undefined : undefined;
  const maxValue = maxValueStr ? Number(maxValueStr) || undefined : undefined;

  // Build a suspense key from all search params so React re-renders on param changes
  const suspenseKey = JSON.stringify({
    query,
    sector,
    region,
    minValue,
    maxValue,
    sort,
    page,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contracts</h1>
        <p className="text-muted-foreground">
          Browse UK procurement opportunities
        </p>
      </div>

      <ContractSearch />
      <ContractFilters />

      <Suspense key={suspenseKey} fallback={<FeedSkeleton />}>
        <ContractFeed
          query={query}
          sector={sector}
          region={region}
          minValue={minValue}
          maxValue={maxValue}
          sort={sort}
          page={page}
        />
      </Suspense>
    </div>
  );
}
