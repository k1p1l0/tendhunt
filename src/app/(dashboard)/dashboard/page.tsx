import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileText, Building2, Radio, Coins } from "lucide-react";

const stats = [
  {
    title: "Active Contracts",
    value: "0",
    description: "Matching your profile",
    icon: FileText,
  },
  {
    title: "Buyer Organizations",
    value: "0",
    description: "In your sectors",
    icon: Building2,
  },
  {
    title: "Buying Signals",
    value: "0",
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

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to TendHunt. Your procurement intelligence platform.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
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

      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Recent Contracts
        </h2>
        <Card className="mt-4">
          <CardContent className="flex items-center justify-center py-10">
            <p className="text-sm text-muted-foreground">
              No contracts ingested yet. Data pipeline coming in Phase 2.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
