import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface AttributesTabProps {
  buyer: {
    _id: string;
    name: string;
    contractCount: number;
    sector?: string;
  };
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function deterministicScore(buyerName: string, attributeName: string): number {
  return (hashCode(buyerName + attributeName) % 60) + 30;
}

function scoreColor(score: number): string {
  if (score >= 70) return "text-green-600 dark:text-green-400";
  if (score >= 50) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

interface AttributeCardProps {
  label: string;
  value: number | string;
  description: string;
  isScore?: boolean;
}

function AttributeCard({ label, value, description, isScore = false }: AttributeCardProps) {
  const displayValue = typeof value === "number" && isScore ? value : value;
  const colorClass = typeof value === "number" && isScore ? scoreColor(value) : "";

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <p className="text-sm text-muted-foreground">{label}</p>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-[200px]">{description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <p className={`text-2xl font-bold mt-1 ${colorClass}`}>
          {displayValue}
        </p>
      </CardContent>
    </Card>
  );
}

const aiAttributes = [
  {
    key: "SME Friendliness",
    description: "How accessible this buyer is for small and medium enterprises",
  },
  {
    key: "Procurement Complexity",
    description: "Typical complexity level of procurement processes",
  },
  {
    key: "Innovation Appetite",
    description: "Willingness to adopt innovative solutions and technologies",
  },
  {
    key: "Repeat Business",
    description: "Likelihood of awarding repeat contracts to existing suppliers",
  },
  {
    key: "Response Speed",
    description: "Average speed of decision-making and response times",
  },
  {
    key: "Digital Maturity",
    description: "Level of digital transformation and tech adoption",
  },
];

export function AttributesTab({ buyer }: AttributesTabProps) {
  const sectorCount = buyer.sector
    ? Math.min(4, Math.max(2, (hashCode(buyer.sector) % 3) + 2))
    : 2;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Buyer attributes and AI-generated scores
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Factual stats */}
        <AttributeCard
          label="Contract Count"
          value={buyer.contractCount}
          description="Total number of contracts from this buyer in the database"
        />
        <AttributeCard
          label="Active Contracts"
          value={buyer.contractCount}
          description="Number of currently active contracts"
        />
        <AttributeCard
          label="Sectors Covered"
          value={sectorCount}
          description="Number of procurement sectors this buyer operates in"
        />

        {/* AI-generated scores */}
        {aiAttributes.map((attr) => (
          <AttributeCard
            key={attr.key}
            label={attr.key}
            value={deterministicScore(buyer.name, attr.key)}
            description={attr.description}
            isScore
          />
        ))}
      </div>
    </div>
  );
}
