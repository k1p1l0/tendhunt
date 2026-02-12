import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

interface ContractData {
  _id: string;
  title: string;
  valueMin?: number | null;
  valueMax?: number | null;
  publishedDate?: string | Date | null;
  status?: string;
  sector?: string | null;
  source?: string;
}

interface ContractsTabProps {
  contracts: ContractData[];
}

const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
});

function formatValue(min?: number | null, max?: number | null) {
  if (min != null && max != null && min !== max) {
    return `${currencyFormatter.format(min)} - ${currencyFormatter.format(max)}`;
  }
  if (max != null) return currencyFormatter.format(max);
  if (min != null) return currencyFormatter.format(min);
  return null;
}

function formatDate(date?: string | Date | null) {
  if (!date) return null;
  return dateFormatter.format(new Date(date));
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

export function ContractsTab({ contracts }: ContractsTabProps) {
  if (contracts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
        <FileText className="h-10 w-10" />
        <p className="text-sm">No contracts found for this buyer</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {contracts.length} contract{contracts.length !== 1 ? "s" : ""} found
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {contracts.map((contract) => {
          const value = formatValue(contract.valueMin, contract.valueMax);
          const published = formatDate(contract.publishedDate);

          return (
            <Link key={String(contract._id)} href={`/contracts/${contract._id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="line-clamp-2 text-sm">
                    {contract.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {value && (
                    <p className="text-sm font-medium">{value}</p>
                  )}
                  {published && (
                    <p className="text-xs text-muted-foreground">
                      Published: {published}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {contract.status && (
                      <Badge className={statusColor(contract.status)}>
                        {contract.status}
                      </Badge>
                    )}
                    {contract.sector && (
                      <Badge variant="outline">{contract.sector}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
