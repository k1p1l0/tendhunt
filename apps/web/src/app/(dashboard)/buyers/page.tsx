import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { fetchBuyers } from "@/lib/buyers";
import { dbConnect } from "@/lib/mongodb";
import Buyer from "@/models/buyer";
import { BuyersListBreadcrumb } from "./breadcrumb";
import { BuyersToolbar } from "@/components/buyers/buyers-toolbar";
import { BuyersTable } from "@/components/buyers/buyers-table";
import { BuyerTableSkeleton } from "@/components/buyers/buyer-table-skeleton";
import { Pagination } from "@/components/contracts/pagination";

function cleanSort(values: string[]): string[] {
  return values.filter((v) => v != null && v !== "").sort();
}

async function BuyerFeed({
  sort,
  order,
  page,
  q,
  sector,
  orgType,
  region,
}: {
  sort?: string;
  order?: string;
  page: number;
  q?: string;
  sector?: string;
  orgType?: string;
  region?: string;
}) {
  const pageSize = 25;
  const validSort = (["name", "sector", "region", "contracts", "orgType", "enrichmentScore"] as const).includes(
    sort as "name" | "sector" | "region" | "contracts" | "orgType" | "enrichmentScore"
  )
    ? (sort as "name" | "sector" | "region" | "contracts" | "orgType" | "enrichmentScore")
    : "enrichmentScore";
  const validOrder = order === "desc" ? "desc" : (sort ? "asc" : "desc");

  await dbConnect();
  const [filterOptions, buyerResult] = await Promise.all([
    Promise.all([
      Buyer.distinct("sector"),
      Buyer.distinct("orgType"),
      Buyer.distinct("region"),
    ]),
    fetchBuyers({
      sort: validSort,
      order: validOrder,
      page,
      pageSize,
      q,
      sector,
      orgType,
      region,
    }),
  ]);

  const [sectors, orgTypes, regions] = filterOptions;
  const { buyers, total, filteredCount } = buyerResult;

  const totalPages = Math.ceil(filteredCount / pageSize);

  const serializedBuyers = buyers.map((b) => ({
    _id: String(b._id),
    name: b.name ?? "",
    sector: b.sector ?? undefined,
    region: b.region ?? undefined,
    contractCount: b.contractCount ?? 0,
    orgType: b.orgType ?? undefined,
    enrichmentScore: b.enrichmentScore ?? undefined,
    website: b.website ?? undefined,
    logoUrl: b.logoUrl ?? undefined,
  }));

  return (
    <>
      <BuyersToolbar
        total={total}
        filtered={filteredCount}
        sectors={cleanSort(sectors)}
        orgTypes={cleanSort(orgTypes)}
        regions={cleanSort(regions)}
      />
      <BuyersTable buyers={serializedBuyers} sort={validSort} order={validOrder} />
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
  const q = typeof params.q === "string" ? params.q : undefined;
  const sector = typeof params.sector === "string" ? params.sector : undefined;
  const orgType = typeof params.orgType === "string" ? params.orgType : undefined;
  const region = typeof params.region === "string" ? params.region : undefined;

  const suspenseKey = JSON.stringify({ sort, order, page, sector, orgType, region });

  return (
    <div className="space-y-4">
      <BuyersListBreadcrumb />
      <Suspense key={suspenseKey} fallback={<BuyerTableSkeleton />}>
        <BuyerFeed
          sort={sort}
          order={order}
          page={page}
          q={q}
          sector={sector}
          orgType={orgType}
          region={region}
        />
      </Suspense>
    </div>
  );
}
