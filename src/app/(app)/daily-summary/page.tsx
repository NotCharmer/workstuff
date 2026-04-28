import { DailySummaryClient } from "./daily-summary-client";
import { he } from "@/lib/i18n/he";

export const dynamic = "force-dynamic";

export default function DailySummaryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {he.dailySummary.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{he.dailySummary.subtitle}</p>
      </div>
      <DailySummaryClient />
    </div>
  );
}
