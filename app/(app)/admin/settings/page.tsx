import { ComingSoon } from "@/components/ui/coming-soon";
import { Settings } from "lucide-react";

export default function SettingsAdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">System Settings</h1>
        <p className="text-sm text-muted">Facility-wide configuration.</p>
      </div>
      <ComingSoon icon={Settings} title="System settings in progress" description="Timezone, notification routing, photo storage limits and branding will live here." />
    </div>
  );
}
