import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function BuyersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Buyers</h1>
        <p className="text-muted-foreground">
          Buyer organization profiles and contacts. Coming in Phase 6.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>No buyer profiles yet</CardTitle>
          <CardDescription>
            Buyer intelligence profiles will show organization details, contact
            information, procurement patterns, and AI-generated vibe scores.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-10">
          <p className="text-sm text-muted-foreground">
            Buyer data will be aggregated from contract history in Phase 6.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
