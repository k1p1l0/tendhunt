import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { fetchBuyers } from "@/lib/buyers";
import { BuyerTable } from "@/components/buyers/buyer-table";
import { Pagination } from "@/components/contracts/pagination";
import { Skeleton } from "@/components/ui/skeleton";

function TableSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

async function BuyerFeed({
  sort,
  order,
  page,
}: {
  sort?: string;
  order?: string;
  page: number;
}) {
  const pageSize = 25;
  const validSort = (["name", "sector", "region", "contracts", "orgType", "enrichmentScore"] as const).includes(
    sort as "name" | "sector" | "region" | "contracts" | "orgType" | "enrichmentScore"
  )
    ? (sort as "name" | "sector" | "region" | "contracts" | "orgType" | "enrichmentScore")
    : "name";
  const validOrder = order === "desc" ? "desc" : "asc";

  const { buyers, total } = await fetchBuyers({
    sort: validSort,
    order: validOrder,
    page,
    pageSize,
  });

  const totalPages = Math.ceil(total / pageSize);

  // Serialize ObjectIds for client component
  const serializedBuyers = buyers.map((b) => ({
    _id: String(b._id),
    name: b.name ?? "",
    sector: b.sector ?? undefined,
    region: b.region ?? undefined,
    contractCount: b.contractCount ?? 0,
    orgType: b.orgType ?? undefined,
    enrichmentScore: b.enrichmentScore ?? undefined,
    website: b.website ?? undefined,
  }));

  return (
    <>
      <BuyerTable buyers={serializedBuyers} total={total} />
      <Pagination currentPage={page} totalPages={totalPages} />
    </>
  );
}

export default async function BuyersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const params = await searchParams;

  const sort = typeof params.sort === "string" ? params.sort : undefined;
  const order = typeof params.order === "string" ? params.order : undefined;
  const pageStr = typeof params.page === "string" ? params.page : undefined;
  const page = pageStr ? Math.max(1, parseInt(pageStr, 10) || 1) : 1;

  const suspenseKey = JSON.stringify({ sort, order, page });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Buyers</h1>
        <p className="text-muted-foreground">
          Explore buyer organizations and enrichment data
        </p>
      </div>

      <Suspense key={suspenseKey} fallback={<TableSkeleton />}>
        <BuyerFeed sort={sort} order={order} page={page} />
      </Suspense>
    </div>
  );
}
