import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Radar, Building2, ArrowRight } from "lucide-react";

const actions = [
  {
    title: "Contracts",
    description: "Browse active tenders and opportunities",
    href: "/contracts",
    icon: FileText,
  },
  {
    title: "Scanners",
    description: "AI-powered opportunity analysis",
    href: "/scanners",
    icon: Radar,
  },
  {
    title: "Buyers",
    description: "Explore buyer organizations",
    href: "/buyers",
    icon: Building2,
  },
];

export function QuickActions() {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">
        Quick Actions
      </h2>
      <div className="grid gap-3 grid-cols-1">
        {actions.map((action) => (
          <Link key={action.href} href={action.href}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <action.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{action.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {action.description}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
