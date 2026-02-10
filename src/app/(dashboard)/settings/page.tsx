import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Account settings and company profile. Coming in Phase 3.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account settings</CardTitle>
          <CardDescription>
            Configure your company profile, sector preferences, notification
            settings, and API keys here.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-10">
          <p className="text-sm text-muted-foreground">
            Onboarding wizard and profile setup will be added in Phase 3.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
