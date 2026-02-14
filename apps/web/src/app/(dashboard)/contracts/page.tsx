import { Suspense } from "react";
import { fetchContracts } from "@/lib/contracts";
import { ContractsListBreadcrumb } from "./breadcrumb";
import { ContractsToolbar } from "@/components/contracts/contracts-toolbar";
import { ContractsTable } from "@/components/contracts/contracts-table";
import { TableSkeleton } from "@/components/contracts/table-skeleton";
import { Pagination } from "@/components/contracts/pagination";

async function ContractFeed({
  query,
  sector,
  region,
  minValue,
  maxValue,
  mechanism,
  contractType,
  smeOnly,
  vcoOnly,
  sort,
  page,
}: {
  query?: string;
  sector?: string;
  region?: string;
  minValue?: number;
  maxValue?: number;
  mechanism?: string;
  contractType?: string;
  smeOnly?: boolean;
  vcoOnly?: boolean;
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
    mechanism,
    contractType,
    smeOnly,
    vcoOnly,
    sort,
    page,
    pageSize,
  });

  const totalPages = Math.ceil(filteredCount / pageSize);

  return (
    <>
      <ContractsToolbar total={totalCount} filtered={filteredCount} />

      <ContractsTable
        contracts={contracts.map((contract) => ({
          _id: String(contract._id),
          title: contract.title,
          buyerName: contract.buyerName,
          buyerId: contract.buyerId ? String(contract.buyerId) : undefined,
          buyerRegion: contract.buyerRegion,
          buyerLogoUrl: contract.buyerLogoUrl,
          valueMin: contract.valueMin,
          valueMax: contract.valueMax,
          deadlineDate: contract.deadlineDate,
          source: contract.source,
          sector: contract.sector,
          status: contract.status,
          contractMechanism: contract.contractMechanism,
          contractEndDate: contract.contractEndDate,
        }))}
      />

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

  const mechanism =
    typeof params.mechanism === "string" ? params.mechanism : undefined;

  const minValueStr =
    typeof params.minValue === "string" ? params.minValue : undefined;
  const maxValueStr =
    typeof params.maxValue === "string" ? params.maxValue : undefined;
  const minValue = minValueStr ? Number(minValueStr) || undefined : undefined;
  const maxValue = maxValueStr ? Number(maxValueStr) || undefined : undefined;

  const contractType =
    typeof params.contractType === "string" ? params.contractType : undefined;
  const smeOnly = params.smeOnly === "true" ? true : undefined;
  const vcoOnly = params.vcoOnly === "true" ? true : undefined;

  const suspenseKey = JSON.stringify({
    query,
    sector,
    region,
    mechanism,
    minValue,
    maxValue,
    contractType,
    smeOnly,
    vcoOnly,
    sort,
    page,
  });

  return (
    <div className="space-y-4">
      <ContractsListBreadcrumb />
      <Suspense key={suspenseKey} fallback={<TableSkeleton />}>
        <ContractFeed
          query={query}
          sector={sector}
          region={region}
          minValue={minValue}
          maxValue={maxValue}
          mechanism={mechanism}
          contractType={contractType}
          smeOnly={smeOnly}
          vcoOnly={vcoOnly}
          sort={sort}
          page={page}
        />
      </Suspense>
    </div>
  );
}
