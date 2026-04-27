"use client";

import { Star } from "lucide-react";
import { formatGrade } from "@/lib/utils";
import { he } from "@/lib/i18n/he";

export function SubjectAverages({
  items,
}: {
  items: { subject: string; avg: number; color: string; isImportant: boolean }[];
}) {
  if (!items.length) {
    return (
      <p className="text-sm text-muted-foreground">
        {he.dashboard.noSubjectAverages}
      </p>
    );
  }

  const sorted = [...items].sort((a, b) => b.avg - a.avg);

  return (
    <ul className="space-y-3">
      {sorted.map((s) => (
        <li key={s.subject}>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              {s.subject}
              {s.isImportant && (
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
              )}
            </span>
            <span className="tabular-nums text-muted-foreground">
              {formatGrade(s.avg)}
            </span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full max-w-full rounded-full transition-[width] duration-700"
              style={{
                width: `${Math.min(100, Math.max(0, s.avg))}%`,
                backgroundColor: s.color,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
