import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Building2,
  Radio,
  Coins,
  ArrowRight,
  Filter,
} from "lucide-react";
import { getContractStats, fetchContracts } from "@/lib/contracts";
import { ContractCard } from "@/components/contracts/contract-card";

export default async function DashboardPage() {
  const [stats, { contracts: recentContracts }] = await Promise.all([
    getContractStats(),
    fetchContracts({ page: 1, pageSize: 5 }),
  ]);

  const statCards = [
    {
      title: "Active Contracts",
      value: stats.contractCount.toLocaleString(),
      description: "In the database",
      icon: FileText,
    },
    {
      title: "Buyer Organizations",
      value: stats.buyerCount.toLocaleString(),
      description: "Tracked buyers",
      icon: Building2,
    },
    {
      title: "Buying Signals",
      value: stats.signalCount.toLocaleString(),
      description: "Pre-tender opportunities",
      icon: Radio,
    },
    {
      title: "Credits Remaining",
      value: "10",
      description: "Free tier",
      icon: Coins,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to TendHunt. Your procurement intelligence platform.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Filters */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium text-muted-foreground">
            Quick Filters
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/contracts?status=OPEN">
            <Badge
              variant="secondary"
              className="cursor-pointer hover:bg-secondary/80 px-3 py-1"
            >
              Open Tenders
            </Badge>
          </Link>
          <Link href="/contracts">
            <Badge
              variant="secondary"
              className="cursor-pointer hover:bg-secondary/80 px-3 py-1"
            >
              Recently Published
            </Badge>
          </Link>
          <Link href="/contracts?minValue=1000000">
            <Badge
              variant="secondary"
              className="cursor-pointer hover:bg-secondary/80 px-3 py-1"
            >
              {"High Value (>1M)"}
            </Badge>
          </Link>
        </div>
      </div>

      {/* Recent Contracts */}
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Recent Contracts
        </h2>

        {recentContracts.length > 0 ? (
          <>
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recentContracts.map((contract) => (
                <ContractCard
                  key={String(contract._id)}
                  contract={{
                    _id: String(contract._id),
                    title: contract.title,
                    buyerName: contract.buyerName,
                    valueMin: contract.valueMin,
                    valueMax: contract.valueMax,
                    publishedDate: contract.publishedDate,
                    deadlineDate: contract.deadlineDate,
                    source: contract.source as
                      | "FIND_A_TENDER"
                      | "CONTRACTS_FINDER",
                    sector: contract.sector,
                    vibeScore: contract.vibeScore,
                  }}
                />
              ))}
            </div>
            <div className="mt-4 flex justify-center">
              <Button variant="outline" asChild>
                <Link
                  href="/contracts"
                  className="inline-flex items-center gap-2"
                >
                  View all contracts
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </>
        ) : (
          <Card className="mt-4">
            <CardContent className="flex items-center justify-center py-10">
              <p className="text-sm text-muted-foreground">
                No contracts ingested yet.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
