"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PenLine, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { he } from "@/lib/i18n/he";
import { createManualPendingReview, savePendingReviewToSession } from "@/lib/upload/manual-review";

export function ManualEntryPanel({ activeBranchId }: { activeBranchId: string }) {
  const router = useRouter();
  const [starterRows, setStarterRows] = useState("5");

  function startReview(rowCount: number) {
    savePendingReviewToSession(createManualPendingReview(rowCount, activeBranchId));
    router.push("/upload/review");
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <PenLine className="h-6 w-6" />
        </div>
        <p className="font-display text-lg font-semibold">{he.upload.manualTitle}</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{he.upload.manualDesc}</p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button type="button" size="lg" className="gap-2" onClick={() => startReview(5)}>
            <PenLine className="h-4 w-4" />
            {he.upload.manualStart}
          </Button>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{he.upload.manualRowCount}</span>
            <Input
              type="number"
              min={1}
              max={50}
              className="h-9 w-16 text-center"
              value={starterRows}
              onChange={(e) => setStarterRows(e.target.value)}
            />
            <Button
              type="button"
              variant="secondary"
              className="gap-1"
              onClick={() => {
                const n = Math.min(50, Math.max(1, parseInt(starterRows, 10) || 5));
                startReview(n);
              }}
            >
              <Plus className="h-4 w-4" />
              {he.upload.manualStartCustom}
            </Button>
          </div>
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground">{he.upload.manualHint}</p>
    </div>
  );
}
