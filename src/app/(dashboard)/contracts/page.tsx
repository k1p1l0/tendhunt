import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ContractsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contracts</h1>
        <p className="text-muted-foreground">
          Contract feed with search and filters. Coming in Phase 4.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>No contracts yet</CardTitle>
          <CardDescription>
            The contract feed will display UK government procurement
            opportunities from Find a Tender and Contracts Finder once the data
            pipeline is operational.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-10">
          <p className="text-sm text-muted-foreground">
            Data ingestion will begin in Phase 2.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
