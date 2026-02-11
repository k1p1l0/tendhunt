import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchContractById } from "@/lib/contracts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ExternalLink,
  Calendar,
  MapPin,
  Building2,
  Tag,
  Coins,
} from "lucide-react";

const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "long",
});

function formatDate(date?: string | Date | null) {
  if (!date) return null;
  return dateFormatter.format(new Date(date));
}

function formatValue(valueMin?: number | null, valueMax?: number | null) {
  if (valueMin != null && valueMax != null && valueMin !== valueMax) {
    return `${currencyFormatter.format(valueMin)} - ${currencyFormatter.format(valueMax)}`;
  }
  if (valueMax != null) return currencyFormatter.format(valueMax);
  if (valueMin != null) return currencyFormatter.format(valueMin);
  return null;
}

function statusColor(status: string) {
  switch (status) {
    case "OPEN":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "CLOSED":
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    case "AWARDED":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "CANCELLED":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  }
}

function scoreColor(score: number) {
  if (score >= 7)
    return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
  if (score >= 4)
    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
  return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
}

function sourceLabel(source: string) {
  return source === "FIND_A_TENDER" ? "Find a Tender" : "Contracts Finder";
}

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contract = await fetchContractById(id);

  if (!contract) {
    notFound();
  }

  const value = formatValue(contract.valueMin, contract.valueMax);
  const published = formatDate(contract.publishedDate);
  const deadline = formatDate(contract.deadlineDate);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <Link
          href="/contracts"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to contracts
        </Link>

        <div className="flex flex-wrap items-start gap-3">
          <h1 className="text-2xl font-bold flex-1">{contract.title}</h1>
          <Badge className={statusColor(contract.status)}>
            {contract.status}
          </Badge>
        </div>

        {contract.vibeScore != null && (
          <div className="flex items-center gap-3">
            <Badge className={`text-lg px-3 py-1 ${scoreColor(contract.vibeScore)}`}>
              {contract.vibeScore.toFixed(1)}
            </Badge>
            {contract.vibeReasoning && (
              <p className="text-sm text-muted-foreground">
                {contract.vibeReasoning}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Details grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column: Contract Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contract Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Building2 className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">Buyer</p>
                <p className="text-sm font-bold">{contract.buyerName}</p>
                {contract.buyerOrg &&
                  contract.buyerOrg !== contract.buyerName && (
                    <p className="text-sm text-muted-foreground">
                      {contract.buyerOrg}
                    </p>
                  )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">Region</p>
                <p className="text-sm">
                  {contract.buyerRegion || "Not specified"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Tag className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">Sector</p>
                <p className="text-sm">
                  {contract.sector || "Not classified"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Tag className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">Stage</p>
                <Badge variant="outline">{contract.stage}</Badge>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">Published</p>
                <p className="text-sm">{published || "Unknown"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">Deadline</p>
                <p className="text-sm">{deadline || "No deadline"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right column: Value & Classification */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Value & Classification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Coins className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">Value</p>
                <p className="text-sm font-bold">
                  {value || "Not specified"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Coins className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">Currency</p>
                <p className="text-sm">{contract.currency || "GBP"}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">CPV Codes</p>
              {contract.cpvCodes && contract.cpvCodes.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {contract.cpvCodes.map((code: string) => (
                    <Badge key={code} variant="outline">
                      {code}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">None</p>
              )}
            </div>

            <div className="flex items-start gap-3">
              <ExternalLink className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">Source</p>
                <p className="text-sm">{sourceLabel(contract.source)}</p>
                {contract.sourceUrl && (
                  <a
                    href={contract.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    View original listing
                  </a>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Description</CardTitle>
        </CardHeader>
        <CardContent>
          {contract.description ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="whitespace-pre-wrap">{contract.description}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No description available
            </p>
          )}
        </CardContent>
      </Card>

      {/* Source link button */}
      {contract.sourceUrl && (
        <div>
          <Button variant="outline" asChild>
            <a
              href={contract.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              View on {sourceLabel(contract.source)}
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}
