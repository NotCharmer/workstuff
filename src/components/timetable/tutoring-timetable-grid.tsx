"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Copy, UserMinus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  StudentTutoringUrgencySelect,
  TutoringScheduleEditor,
} from "@/components/students/student-tutoring-controls";
import { he } from "@/lib/i18n/he";
import { cn } from "@/lib/utils";
import { DAY_CANONICAL_ORDER, SCHOOL_PERIODS, canonicalDay, dayOrderOf, padTime } from "@/lib/timetable/days";
import { personalSlotKey, sameClassName } from "@/lib/timetable/marks";
import { formatTutoringCadetsCopy } from "@/lib/timetable/tutoring-copy";
import {
  TUTORING_URGENCY_RANK,
  effectiveTutoringUrgency,
  formatTutoringWhen,
  type TutoringUrgency,
} from "@/lib/tutoring";

export type TutoringCadet = {
  id: string;
  firstName: string;
  lastName: string;
  className: string | null;
  needsTutoring: boolean;
  tutoringUrgency: string | null;
  tutoringScheduledFor: string | null;
};

export type TutoringPull = {
  className: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subject: string;
};

const URGENCY_TEXT: Record<TutoringUrgency, string> = {
  URGENT: "text-red-700 dark:text-red-300",
  MEDIUM: "text-amber-800 dark:text-amber-200",
  LIGHT: "text-sky-800 dark:text-sky-200",
  STANDARD: "text-teal-800 dark:text-teal-300",
};

const SCHOOL_DAYS = DAY_CANONICAL_ORDER.filter((d) => d !== "שבת");

function toMinutes(time: string): number {
  const m = time.match(/(\d{1,2}):(\d{2})/);
  if (!m) return Number.MAX_SAFE_INTEGER;
  return Number.parseInt(m[1], 10) * 60 + Number.parseInt(m[2], 10);
}

export function TutoringTimetableGrid({
  cadets,
  pulls,
}: {
  cadets: TutoringCadet[];
  pulls: TutoringPull[];
}) {
  const [rows, setRows] = useState(cadets);
  useEffect(() => {
    setRows(cadets);
  }, [cadets]);

  const listed = useMemo(() => {
    return [...rows].sort((a, b) => {
      const rankA = TUTORING_URGENCY_RANK[effectiveTutoringUrgency(a.needsTutoring, a.tutoringUrgency) ?? "STANDARD"];
      const rankB = TUTORING_URGENCY_RANK[effectiveTutoringUrgency(b.needsTutoring, b.tutoringUrgency) ?? "STANDARD"];
      if (rankA !== rankB) return rankA - rankB;
      const classCmp = (a.className ?? "").localeCompare(b.className ?? "", "he");
      if (classCmp) return classCmp;
      return a.lastName.localeCompare(b.lastName, "he") || a.firstName.localeCompare(b.firstName, "he");
    });
  }, [rows]);

  const days = useMemo(() => {
    const fromRows = pulls.map((p) => canonicalDay(p.dayOfWeek));
    return [...new Set([...SCHOOL_DAYS, ...fromRows])].sort((a, b) => dayOrderOf(a) - dayOrderOf(b));
  }, [pulls]);

  const slots = useMemo(() => {
    const fromRows = Array.from(
      new Set(pulls.map((p) => `${padTime(p.startTime)}__${padTime(p.endTime)}`))
    ).map((slot) => {
      const [startTime, endTime] = slot.split("__");
      return { startTime, endTime };
    });
    const seen = new Set(fromRows.map((s) => `${s.startTime}__${s.endTime}`));
    const defaults = SCHOOL_PERIODS.filter((s) => !seen.has(`${s.startTime}__${s.endTime}`));
    return [...fromRows, ...defaults].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
  }, [pulls]);

  const byCell = useMemo(() => {
    const map = new Map<string, TutoringPull[]>();
    for (const p of pulls) {
      const key = personalSlotKey(p);
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    }
    return map;
  }, [pulls]);

  async function copyCadetList() {
    const ordered = [...rows].sort(
      (a, b) =>
        (a.className ?? "").localeCompare(b.className ?? "", "he") ||
        a.lastName.localeCompare(b.lastName, "he") ||
        a.firstName.localeCompare(b.firstName, "he")
    );
    const text = formatTutoringCadetsCopy(
      ordered.map((c) => {
        const urgency = effectiveTutoringUrgency(c.needsTutoring, c.tutoringUrgency);
        return {
          firstName: c.firstName,
          lastName: c.lastName,
          className: c.className,
          urgencyLabel: urgency ? he.students.tutoringUrgency[urgency] : null,
          urgencyRank: urgency ? TUTORING_URGENCY_RANK[urgency] : 99,
          scheduledFor: c.tutoringScheduledFor,
        };
      }),
      pulls,
      he.timetable.tutoringNoClass,
      he.students.tutoringScheduledPrefix
    );
    if (!text) {
      toast.error(he.timetable.tutoringCopyEmpty);
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success(he.timetable.tutoringCopied);
    } catch {
      toast.error(he.timetable.tutoringCopyFailed);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-l from-teal-500/10 via-transparent to-transparent">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>{he.timetable.tutoringGridTitle}</CardTitle>
              <CardDescription>{he.timetable.tutoringGridDesc}</CardDescription>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/timetable">{he.timetable.goToClasses}</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {pulls.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">{he.timetable.tutoringNoPull}</p>
          ) : (
            <div className="overflow-x-auto">
              <div
                className="min-w-[720px]"
                style={{
                  display: "grid",
                  gridTemplateColumns: `7.5rem repeat(${days.length}, minmax(9rem, 1fr))`,
                }}
              >
                <div className="sticky start-0 z-10 border-b border-e border-border bg-muted/40 p-2 text-xs font-semibold text-muted-foreground">
                  {he.timetable.time}
                </div>
                {days.map((day) => (
                  <div
                    key={day}
                    className="border-b border-e border-border bg-muted/40 p-2 text-center text-sm font-semibold"
                  >
                    {day}
                  </div>
                ))}
                {slots.map((slot, rowIdx) => {
                  const key = `${slot.startTime}__${slot.endTime}`;
                  return (
                    <Fragment key={key}>
                      <div
                        className={cn(
                          "sticky start-0 z-10 border-b border-e border-border/60 px-2 py-3 text-xs font-medium",
                          rowIdx % 2 ? "bg-muted/20" : "bg-card"
                        )}
                      >
                        {slot.startTime}–{slot.endTime}
                      </div>
                      {days.map((day) => {
                        const cell = byCell.get(`${day}__${slot.startTime}__${slot.endTime}`) ?? [];
                        return (
                          <div
                            key={`${key}-${day}`}
                            className={cn(
                              "min-h-28 border-b border-e border-border/60 p-2",
                              rowIdx % 2 ? "bg-muted/10" : "bg-card"
                            )}
                          >
                            {cell.length === 0 ? (
                              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                                —
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                {cell.map((pull) => {
                                  const names = rows.filter((c) =>
                                    sameClassName(c.className, pull.className)
                                  );
                                  return (
                                    <div
                                      key={`${pull.className}-${pull.subject}`}
                                      className="rounded-lg border border-teal-500/30 bg-teal-500/10 p-2 shadow-soft"
                                    >
                                      <p className="text-sm font-semibold leading-tight">{pull.subject}</p>
                                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                                        {pull.className}
                                      </p>
                                      {names.length === 0 ? (
                                        <p className="mt-1 text-[11px] text-muted-foreground">
                                          {he.timetable.tutoringNoCadetsInClass}
                                        </p>
                                      ) : (
                                        <ul className="mt-1 space-y-1">
                                          {names.map((c) => {
                                            const urgency = effectiveTutoringUrgency(
                                              c.needsTutoring,
                                              c.tutoringUrgency
                                            );
                                            const when = formatTutoringWhen(c.tutoringScheduledFor);
                                            return (
                                              <li key={c.id}>
                                                <Link
                                                  href={`/students/${c.id}`}
                                                  className="text-xs font-medium text-foreground hover:underline"
                                                >
                                                  {c.firstName} {c.lastName}
                                                  {urgency && (
                                                    <span className={cn("mt-0.5 block text-[10px] font-semibold", URGENCY_TEXT[urgency])}>
                                                      {he.students.tutoringUrgencyShort[urgency]}
                                                      {when ? ` · ${when}` : ""}
                                                    </span>
                                                  )}
                                                </Link>
                                              </li>
                                            );
                                          })}
                                        </ul>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </Fragment>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserMinus className="h-4 w-4" />
              {he.timetable.tutoringCadetsTitle}
            </CardTitle>
            <CardDescription>
              <Badge variant="outline">{rows.length}</Badge>
            </CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="w-full gap-1"
            disabled={rows.length === 0}
            aria-label={he.timetable.tutoringCopyAria}
            onClick={() => void copyCadetList()}
          >
            <Copy className="h-4 w-4" />
            {he.timetable.tutoringCopy}
          </Button>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{he.timetable.tutoringCadetsEmpty}</p>
          ) : (
            <ul className="space-y-3">
              {listed.map((c) => {
                const urgency = effectiveTutoringUrgency(c.needsTutoring, c.tutoringUrgency);
                return (
                  <li key={c.id} className="space-y-2 rounded-lg border border-border/60 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <Link href={`/students/${c.id}`} className="text-sm font-medium hover:underline">
                        {c.firstName} {c.lastName}
                      </Link>
                      <span className="text-xs text-muted-foreground">{c.className ?? "—"}</span>
                    </div>
                    <StudentTutoringUrgencySelect
                      studentId={c.id}
                      initial={urgency}
                      compact
                      onSaved={(next) => {
                        if (!next) {
                          setRows((prev) => prev.filter((row) => row.id !== c.id));
                          return;
                        }
                        setRows((prev) =>
                          prev.map((row) =>
                            row.id === c.id
                              ? { ...row, needsTutoring: true, tutoringUrgency: next }
                              : row
                          )
                        );
                      }}
                    />
                    <TutoringScheduleEditor
                      studentId={c.id}
                      scheduledFor={c.tutoringScheduledFor}
                      onSaved={(next) =>
                        setRows((prev) =>
                          prev.map((row) =>
                            row.id === c.id ? { ...row, tutoringScheduledFor: next } : row
                          )
                        )
                      }
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
