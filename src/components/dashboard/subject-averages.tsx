"use client";

import { useState } from "react";
import Link from "next/link";
import { Star, ArrowRight } from "lucide-react";
import { formatGrade, initials, gradeBadgeTone, avatarGradient } from "@/lib/utils";
import type { GradeAggregationMode } from "@/lib/stats";
import { he } from "@/lib/i18n/he";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

type SubjectAverage = {
  subject: string;
  avg: number;
  color: string;
  isImportant: boolean;
  students: {
    id: string;
    name: string;
    className: string | null;
    grade: number;
    gradeId: string;
  }[];
};

export function SubjectAverages({
  items,
  gradeAggregation = "latest",
}: {
  items: SubjectAverage[];
  gradeAggregation?: GradeAggregationMode;
}) {
  const [active, setActive] = useState<SubjectAverage | null>(null);

  if (!items.length) {
    return (
      <p className="text-sm text-muted-foreground">
        {he.dashboard.noSubjectAverages}
      </p>
    );
  }

  const sorted = [...items].sort((a, b) => b.avg - a.avg);

  return (
    <>
      <ul className="space-y-3">
        {sorted.map((s) => (
          <li key={s.subject}>
            <button
              type="button"
              onClick={() => setActive(s)}
              className="group block w-full rounded-lg p-2 -m-2 text-right transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label={`${s.subject} — ${he.dashboard.subjectBreakdownTitle(s.subject)}`}
            >
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
                <span className="tabular-nums text-muted-foreground transition-colors group-hover:text-foreground">
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
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={active !== null} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="max-w-md">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: active.color }}
                  />
                  {he.dashboard.subjectBreakdownTitle(active.subject)}
                  {active.isImportant && (
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                  )}
                </DialogTitle>
                <DialogDescription>
                  {gradeAggregation === "latest"
                    ? he.dashboard.subjectBreakdownDesc(
                        active.students.length,
                        formatGrade(active.avg)
                      )
                    : he.dashboard.subjectBreakdownDescAllRows(
                        active.students.length,
                        formatGrade(active.avg)
                      )}
                </DialogDescription>
              </DialogHeader>

              {active.students.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {he.dashboard.subjectBreakdownEmpty}
                </p>
              ) : (
                <ul className="-mx-2 max-h-[60vh] divide-y divide-border/60 overflow-y-auto">
                  {active.students.map((stu, i) => (
                    <li key={stu.gradeId}>
                      <Link
                        href={`/students/${stu.id}`}
                        onClick={() => setActive(null)}
                        className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-secondary"
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarFallback
                            className="text-xs"
                            style={{ background: avatarGradient(i * 40) }}
                          >
                            {initials(stu.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{stu.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {stu.className ?? "—"}
                          </p>
                        </div>
                        <Badge variant={gradeBadgeTone(stu.grade)}>
                          {formatGrade(stu.grade)}
                        </Badge>
                        <ArrowRight
                          className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 [dir=rtl]:-scale-x-100"
                          aria-hidden
                        />
                        <span className="sr-only">{he.dashboard.viewStudent}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
