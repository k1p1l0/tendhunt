import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Mail } from "lucide-react";

export interface KeyPersonnelData {
  _id: string;
  name: string;
  title?: string;
  role?: string;
  department?: string;
  email?: string;
  confidence?: number;
  extractionMethod?: string;
}

interface KeyPersonnelTabProps {
  personnel: KeyPersonnelData[];
}

const roleColors: Record<string, string> = {
  chief_executive:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  director:
    "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  procurement_lead:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  finance_director:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  cfo: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  cto: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  board_member:
    "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  chair:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  councillor:
    "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200",
  committee_chair:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
};

function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    chief_executive: "Chief Executive",
    director: "Director",
    procurement_lead: "Procurement Lead",
    finance_director: "Finance Director",
    cfo: "CFO",
    cto: "CTO",
    board_member: "Board Member",
    chair: "Chair",
    councillor: "Councillor",
    committee_chair: "Committee Chair",
  };
  return labels[role] ?? role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function extractionMethodLabel(method?: string): string | null {
  if (!method) return null;
  switch (method) {
    case "moderngov_api":
      return "via ModernGov API";
    case "website_scrape":
      return "via website scrape";
    case "claude_haiku":
      return "via AI extraction";
    default:
      return `via ${method}`;
  }
}

function confidenceColor(confidence: number): string {
  if (confidence >= 70) return "bg-green-500";
  if (confidence >= 40) return "bg-yellow-500";
  return "bg-red-500";
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

const avatarColors = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-green-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-rose-500",
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.charAt(0).toUpperCase();
}

export function KeyPersonnelTab({ personnel }: KeyPersonnelTabProps) {
  if (personnel.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
        <Users className="h-10 w-10" />
        <p className="text-sm">No key personnel found</p>
        <p className="text-xs text-center max-w-sm">
          Personnel will be extracted as the enrichment pipeline processes this
          organization.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {personnel.length} person{personnel.length !== 1 ? "nel" : ""} found
      </p>
      <div className="grid gap-3 lg:grid-cols-2">
        {personnel.map((person) => {
          const initials = getInitials(person.name);
          const colorIndex = hashCode(person.name) % avatarColors.length;
          const avatarColor = avatarColors[colorIndex];
          const roleBadgeColor =
            person.role && roleColors[person.role]
              ? roleColors[person.role]
              : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
          const methodLabel = extractionMethodLabel(person.extractionMethod);

          return (
            <Card key={person._id}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  {/* Initials avatar */}
                  <div
                    className={`${avatarColor} h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0`}
                  >
                    {initials}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div>
                      <h4 className="font-semibold text-sm truncate">
                        {person.name}
                      </h4>
                      {person.title && (
                        <p className="text-xs text-muted-foreground truncate">
                          {person.title}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {person.role && (
                        <Badge className={roleBadgeColor}>
                          {roleLabel(person.role)}
                        </Badge>
                      )}
                      {person.department && (
                        <span className="text-xs text-muted-foreground">
                          {person.department}
                        </span>
                      )}
                    </div>

                    {person.email && (
                      <a
                        href={`mailto:${person.email}`}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Mail className="h-3 w-3" />
                        {person.email}
                      </a>
                    )}

                    {/* Confidence bar */}
                    {person.confidence != null && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full ${confidenceColor(person.confidence)}`}
                            style={{ width: `${Math.min(100, person.confidence)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {person.confidence}%
                        </span>
                      </div>
                    )}

                    {methodLabel && (
                      <p className="text-[10px] text-muted-foreground">
                        {methodLabel}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
