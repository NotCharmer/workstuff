"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { Star, UserMinus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { he } from "@/lib/i18n/he";
import { cn } from "@/lib/utils";
import { DAY_CANONICAL_ORDER, SCHOOL_PERIODS, canonicalDay, dayOrderOf, padTime } from "@/lib/timetable/days";
import { personalSlotKey } from "@/lib/timetable/marks";
import { FreeSlotCell } from "@/components/timetable/free-slot-cell";

export type PersonalLesson = {
  className: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subject: string;
  important: boolean;
  tutoringPull: boolean;
};

export type PersonalCustomSlot = {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  title: string;
};

type Filter = "all" | "important" | "tutoring";

const SCHOOL_DAYS = DAY_CANONICAL_ORDER.filter((d) => d !== "שבת");

function toMinutes(time: string): number {
  const m = time.match(/(\d{1,2}):(\d{2})/);
  if (!m) return Number.MAX_SAFE_INTEGER;
  return Number.parseInt(m[1], 10) * 60 + Number.parseInt(m[2], 10);
}

export function PersonalTimetableGrid({
  lessons,
  customSlots,
}: {
  lessons: PersonalLesson[];
  customSlots: PersonalCustomSlot[];
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [customByKey, setCustomByKey] = useState<Record<string, string>>(() => {
    const rec: Record<string, string> = {};
    for (const slot of customSlots) {
      rec[personalSlotKey(slot)] = slot.title;
    }
    return rec;
  });

  const visible = useMemo(() => {
    return lessons.filter((l) => {
      if (filter === "important") return l.important;
      if (filter === "tutoring") return l.tutoringPull;
      return l.important || l.tutoringPull;
    });
  }, [lessons, filter]);

  const occupiedKeys = useMemo(() => {
    const set = new Set<string>();
    for (const r of lessons) {
      if (r.important || r.tutoringPull) {
        set.add(personalSlotKey(r));
      }
    }
    return set;
  }, [lessons]);

  const days = useMemo(() => {
    const fromRows = Array.from(new Set(lessons.map((r) => canonicalDay(r.dayOfWeek))));
    const set = new Set<string>([...SCHOOL_DAYS, ...fromRows]);
    return [...set].sort((a, b) => dayOrderOf(a) - dayOrderOf(b));
  }, [lessons]);

  const slots = useMemo(() => {
    const fromRows = Array.from(
      new Set(lessons.map((r) => `${padTime(r.startTime)}__${padTime(r.endTime)}`))
    ).map((slot) => {
      const [startTime, endTime] = slot.split("__");
      return { startTime, endTime };
    });
    const seen = new Set(fromRows.map((s) => `${s.startTime}__${s.endTime}`));
    const defaults = SCHOOL_PERIODS.filter((s) => !seen.has(`${s.startTime}__${s.endTime}`));
    return [...fromRows, ...defaults].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
  }, [lessons]);

  const byCell = useMemo(() => {
    const map = new Map<string, PersonalLesson[]>();
    for (const r of visible) {
      const key = personalSlotKey(r);
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return map;
  }, [visible]);

  const counts = useMemo(
    () => ({
      all: lessons.filter((l) => l.important || l.tutoringPull).length,
      important: lessons.filter((l) => l.important).length,
      tutoring: lessons.filter((l) => l.tutoringPull).length,
    }),
    [lessons]
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-l from-primary/10 via-transparent to-transparent">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>{he.timetable.myGridTitle}</CardTitle>
            <CardDescription>{he.timetable.myGridDesc}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                ["all", he.timetable.filterAll, counts.all],
                ["important", he.timetable.importantShort, counts.important],
                ["tutoring", he.timetable.tutoringShort, counts.tutoring],
              ] as const
            ).map(([id, label, count]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  filter === id
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                {label}
                <Badge variant="outline" className="h-5 min-w-5 px-1 text-[10px]">
                  {count}
                </Badge>
              </button>
            ))}
            <Button asChild size="sm" variant="outline">
              <Link href="/timetable">{he.timetable.goToClasses}</Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
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
                    const cellKey = `${day}__${slot.startTime}__${slot.endTime}`;
                    const cell = byCell.get(cellKey) ?? [];
                    const occupied = occupiedKeys.has(cellKey);
                    const customTitle = customByKey[cellKey] ?? null;
                    return (
                      <div
                        key={`${key}-${day}`}
                        className={cn(
                          "min-h-28 border-b border-e border-border/60 p-2",
                          rowIdx % 2 ? "bg-muted/10" : "bg-card"
                        )}
                      >
                        {occupied ? (
                          cell.length === 0 ? (
                            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                              —
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {cell.map((lesson) => (
                                <div
                                  key={`${lesson.className}-${lesson.subject}`}
                                  className={cn(
                                    "rounded-lg border p-2 shadow-soft",
                                    lesson.important
                                      ? "border-amber-500/30 bg-amber-500/10"
                                      : "border-teal-500/30 bg-teal-500/10"
                                  )}
                                >
                                  <p className="text-sm font-semibold leading-tight">{lesson.subject}</p>
                                  <p className="mt-0.5 text-[11px] text-muted-foreground">{lesson.className}</p>
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {lesson.important && (
                                      <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-300">
                                        <Star className="h-3 w-3 fill-current" />
                                        {he.timetable.importantShort}
                                      </span>
                                    )}
                                    {lesson.tutoringPull && (
                                      <span className="inline-flex items-center gap-0.5 rounded bg-teal-500/15 px-1.5 py-0.5 text-[10px] font-medium text-teal-800 dark:text-teal-300">
                                        <UserMinus className="h-3 w-3" />
                                        {he.timetable.tutoringShort}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        ) : (
                          <FreeSlotCell
                            dayOfWeek={day}
                            startTime={slot.startTime}
                            endTime={slot.endTime}
                            initialTitle={customTitle}
                            onTitleChange={(next) => {
                              setCustomByKey((prev) => {
                                const copy = { ...prev };
                                if (next) copy[cellKey] = next;
                                else delete copy[cellKey];
                                return copy;
                              });
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </Fragment>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
