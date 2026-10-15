"use client";

import { Fragment, useMemo } from "react";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { he } from "@/lib/i18n/he";
import { cn } from "@/lib/utils";
import { DAY_CANONICAL_ORDER } from "@/lib/timetable/days";
import {
  busyGradeHours,
  formatBusyHours,
  formatPlanTime,
  formatSubjectLessonTime,
  formatTutoringPlans,
  slotsForClass,
  subjectDoneTotal,
  subjectSlotsForClass,
  type BusyHour,
  type PlanSlot,
  type TutoringPlanRequest,
} from "@/lib/requests/tutoring-plan";

const BUSY_DAYS = DAY_CANONICAL_ORDER.filter((day) => day !== "שבת");

function busyRanges(hours: BusyHour[]) {
  const seen = new Map<string, { startTime: string; endTime: string }>();
  for (const hour of hours) {
    const key = `${hour.startTime}__${hour.endTime}`;
    if (!seen.has(key)) seen.set(key, { startTime: hour.startTime, endTime: hour.endTime });
  }
  return [...seen.values()].sort(
    (a, b) => a.startTime.localeCompare(b.startTime) || a.endTime.localeCompare(b.endTime)
  );
}

function planLabels() {
  return {
    noStudent: he.requests.planNoStudent,
    noClass: he.requests.planNoClass,
    pullTitle: he.requests.planPullTitle,
    pullEmpty: he.requests.planPullEmpty,
    subjectTitle: he.requests.planSubjectTitle,
    subjectEmpty: he.requests.planSubjectEmpty,
    doneCount: he.requests.sessionCount,
  };
}

export function TutoringRequestPlan({
  requests,
  pulls,
  lessons,
  coverage,
  recordingId,
  onRecord,
}: {
  requests: TutoringPlanRequest[];
  pulls: PlanSlot[];
  lessons: PlanSlot[];
  coverage: PlanSlot[];
  recordingId: string | null;
  onRecord: (id: string) => void;
}) {
  const plans = useMemo(
    () =>
      [...requests].sort((a, b) => {
        if (a.status !== b.status) return a.status === "OPEN" ? -1 : 1;
        const classCmp = (a.className ?? "").localeCompare(b.className ?? "", "he");
        if (classCmp) return classCmp;
        const nameCmp = (a.studentName ?? "").localeCompare(b.studentName ?? "", "he");
        if (nameCmp) return nameCmp;
        return a.subject.localeCompare(b.subject, "he");
      }),
    [requests]
  );
  const busy = useMemo(() => busyGradeHours(coverage), [coverage]);

  async function copyPlan() {
    const busyText = formatBusyHours(busy, {
      title: he.requests.busyTitle,
      empty: he.requests.busyEmpty,
      grades: he.requests.busyGrades,
      tutor: he.requests.busyTutor,
      enter: he.requests.busyEnter,
    });
    const people = formatTutoringPlans(plans, pulls, lessons, planLabels());
    const text = [busyText, people].filter(Boolean).join("\n\n");
    if (!text) {
      toast.error(he.requests.planCopyEmpty);
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success(he.requests.planCopied);
    } catch {
      toast.error(he.requests.planCopyFailed);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{he.requests.busyTitle}</CardTitle>
          <CardDescription>{he.requests.busyDesc}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {busy.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">{he.requests.busyEmpty}</p>
          ) : (
            <div className="overflow-x-auto">
              <div
                className="min-w-[760px]"
                style={{
                  display: "grid",
                  gridTemplateColumns: `7.5rem repeat(${BUSY_DAYS.length}, minmax(8.5rem, 1fr))`,
                }}
              >
                <div className="sticky start-0 z-10 border-b border-e border-border bg-muted/40 p-2 text-xs font-semibold text-muted-foreground">
                  {he.timetable.time}
                </div>
                {BUSY_DAYS.map((day) => (
                  <div
                    key={day}
                    className="border-b border-e border-border bg-muted/40 p-2 text-center text-sm font-semibold"
                  >
                    {day}
                  </div>
                ))}
                {busyRanges(busy).map((range, rowIdx) => {
                  const rangeKey = `${range.startTime}__${range.endTime}`;
                  return (
                    <Fragment key={rangeKey}>
                      <div
                        className={cn(
                          "sticky start-0 z-10 border-b border-e border-border/60 px-2 py-3 text-xs font-medium",
                          rowIdx % 2 ? "bg-muted/20" : "bg-card"
                        )}
                      >
                        {range.startTime}–{range.endTime}
                      </div>
                      {BUSY_DAYS.map((day) => {
                        const hour = busy.find(
                          (item) =>
                            item.dayOfWeek === day &&
                            item.startTime === range.startTime &&
                            item.endTime === range.endTime
                        );
                        return (
                          <div
                            key={`${rangeKey}-${day}`}
                            className={cn(
                              "min-h-24 border-b border-e border-border/60 p-2",
                              rowIdx % 2 ? "bg-muted/10" : "bg-card"
                            )}
                          >
                            {hour ? (
                              <div
                                className={cn(
                                  "rounded-lg border p-2",
                                  hour.grades.length >= 2
                                    ? "border-amber-500/40 bg-amber-500/10"
                                    : "border-teal-500/30 bg-teal-500/10"
                                )}
                              >
                                {hour.grades.length >= 2 ? (
                                  <p className="text-xs font-semibold text-amber-950 dark:text-amber-200">
                                    {he.requests.busyGrades(hour.grades.join(", "))}
                                  </p>
                                ) : null}
                                <ul className={cn("space-y-1", hour.grades.length >= 2 && "mt-1")}>
                                  {hour.entries.map((entry) => (
                                    <li
                                      key={`${entry.grade}-${entry.className}-${entry.subject}`}
                                      className="text-xs leading-snug"
                                    >
                                      <span className="font-medium">{entry.subject}</span>
                                      <span className="text-muted-foreground">
                                        {" · "}
                                        {entry.className}
                                        {entry.canTutor ? ` · ${he.requests.busyTutor}` : ""}
                                        {entry.canEnter ? ` · ${he.requests.busyEnter}` : ""}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : (
                              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                                —
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
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{he.requests.planTitle}</CardTitle>
            <CardDescription>{he.requests.planDesc}</CardDescription>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="shrink-0 gap-1"
            disabled={plans.length === 0 && busy.length === 0}
            onClick={() => void copyPlan()}
          >
            <Copy className="h-4 w-4" />
            {he.requests.planCopy}
          </Button>
        </CardHeader>
        <CardContent>
          {plans.length === 0 ? (
            <p className="text-sm text-muted-foreground">{he.requests.planEmpty}</p>
          ) : (
            <ul className="space-y-3">
              {plans.map((request) => {
                const classPulls = slotsForClass(request.className, pulls);
                const classLessons = subjectSlotsForClass(request.className, request.subject, lessons);
                const done = subjectDoneTotal(request, plans);
                const pending = recordingId === request.id;
                return (
                  <li key={request.id} className="rounded-xl border border-border/70 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">
                          {request.studentName?.trim() || he.requests.planNoStudent}
                        </p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {request.className?.trim() || he.requests.planNoClass}
                          {" · "}
                          {request.subject}
                        </p>
                        <p className="mt-1 text-sm font-medium">{he.requests.sessionCount(done, request.subject)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {request.status === "DONE" ? (
                          <Badge variant="secondary">{he.requests.statusDone}</Badge>
                        ) : null}
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={pending}
                          onClick={() => onRecord(request.id)}
                        >
                          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          {he.requests.recordSession}
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold">{he.requests.planPullTitle}</p>
                        {classPulls.length === 0 ? (
                          <p className="mt-1 text-xs text-muted-foreground">{he.requests.planPullEmpty}</p>
                        ) : (
                          <ul className="mt-1 space-y-1">
                            {classPulls.map((slot) => (
                              <li key={`${request.id}-pull-${formatPlanTime(slot, true)}`} className="text-sm">
                                {formatPlanTime(slot, true)}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold">{he.requests.planSubjectTitle}</p>
                        {classLessons.length === 0 ? (
                          <p className="mt-1 text-xs text-muted-foreground">{he.requests.planSubjectEmpty}</p>
                        ) : (
                          <ul className="mt-1 space-y-1">
                            {classLessons.map((slot) => (
                              <li
                                key={`${request.id}-lesson-${formatPlanTime(slot, true)}`}
                                className="text-sm"
                              >
                                {formatSubjectLessonTime(slot, request.subject)}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
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
