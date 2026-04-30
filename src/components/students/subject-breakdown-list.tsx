"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Star } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatGrade, gradeBadgeTone, gradeColor } from "@/lib/utils";
import { he } from "@/lib/i18n/he";
import { dateLocaleHe, gradeSourceHe } from "@/lib/i18n";

export type SubjectBreakdownItem = {
  subject: string;
  avg: number;
  count: number;
  min: number;
  max: number;
  isImportant: boolean;
  color: string | null;
  grades: {
    id: string;
    value: number;
    gradedAt: string;
    source: string;
  }[];
};

export function SubjectBreakdownList({ items }: { items: SubjectBreakdownItem[] }) {
  const [active, setActive] = useState<SubjectBreakdownItem | null>(null);

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{he.studentDetail.noSubjects}</p>;
  }

  const sorted = [...items].sort((a, b) => b.avg - a.avg);

  return (
    <>
      <div className="space-y-3">
        {sorted.map((s) => (
          <button
            key={s.subject}
            type="button"
            onClick={() => setActive(s)}
            className="block w-full rounded-lg p-2 -m-2 text-right transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label={he.studentDetail.subjectGradesTitle(s.subject)}
          >
            <div className="flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-1.5 truncate font-medium">
                {s.color && (
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                )}
                {s.subject}
                {s.isImportant && (
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                )}
              </span>
              <span className={`tabular-nums ${gradeColor(s.avg)}`}>
                {formatGrade(s.avg)}
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary/80 transition-[width] duration-700"
                style={{
                  width: `${Math.min(100, s.avg)}%`,
                  ...(s.color ? { backgroundColor: s.color } : {}),
                }}
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {he.studentDetail.gradeCountLine(
                s.count,
                formatGrade(s.min),
                formatGrade(s.max)
              )}
            </p>
          </button>
        ))}
      </div>

      <Dialog open={active !== null} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="max-w-md">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {active.color && (
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: active.color }}
                    />
                  )}
                  {he.studentDetail.subjectGradesTitle(active.subject)}
                  {active.isImportant && (
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                  )}
                </DialogTitle>
                <DialogDescription>
                  {he.studentDetail.subjectGradesDesc(
                    active.grades.length,
                    formatGrade(active.avg)
                  )}
                </DialogDescription>
              </DialogHeader>

              <ul className="-mx-2 max-h-[60vh] divide-y divide-border/60 overflow-y-auto">
                {[...active.grades]
                  .sort((a, b) => +new Date(b.gradedAt) - +new Date(a.gradedAt))
                  .map((g) => (
                    <li
                      key={g.id}
                      className="flex items-center justify-between gap-3 px-2 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium tabular-nums">
                          {format(new Date(g.gradedAt), "PP", { locale: dateLocaleHe })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {gradeSourceHe(g.source)}
                        </p>
                      </div>
                      <Badge variant={gradeBadgeTone(g.value)}>
                        {formatGrade(g.value)}
                      </Badge>
                    </li>
                  ))}
              </ul>

              <div className="mt-1 flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs">
                <span className="text-muted-foreground">
                  {he.studentDetail.subjectRange(
                    formatGrade(active.min),
                    formatGrade(active.max)
                  )}
                </span>
                <span className="font-medium">
                  {he.studentDetail.subjectAvg(formatGrade(active.avg))}
                </span>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
