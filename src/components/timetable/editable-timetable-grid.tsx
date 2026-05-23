"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { he } from "@/lib/i18n/he";
import { cn } from "@/lib/utils";
import { DAY_CANONICAL_ORDER, canonicalDay, dayOrderOf } from "@/lib/timetable/days";

type Entry = {
  id: string;
  className: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subject: string;
  teacher: string | null;
  room: string | null;
};

const DAY_OPTIONS = [...DAY_CANONICAL_ORDER];

function toMinutes(time: string): number {
  const m = time.match(/(\d{1,2}):(\d{2})/);
  if (!m) return Number.MAX_SAFE_INTEGER;
  const hour = Number.parseInt(m[1], 10);
  const minute = Number.parseInt(m[2], 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return Number.MAX_SAFE_INTEGER;
  return hour * 60 + minute;
}

// Zero-pad H:M or H:MM forms to HH:MM so <input type="time"> and the strict
// isValidTime check work the same on imported and freshly entered values.
function padTime(value: string): string {
  const m = value.trim().match(/^(\d{1,2}):(\d{1,2})$/);
  if (!m) return value.trim();
  return `${m[1].padStart(2, "0")}:${m[2].padStart(2, "0")}`;
}

function serializeRows(rows: Entry[]): string {
  return JSON.stringify(
    rows
      .map((r) => ({
        className: r.className.trim(),
        dayOfWeek: r.dayOfWeek.trim(),
        startTime: r.startTime.trim(),
        endTime: r.endTime.trim(),
        subject: r.subject.trim(),
        teacher: (r.teacher ?? "").trim(),
        room: (r.room ?? "").trim(),
      }))
      .sort((a, b) => {
        const dayDiff = dayOrderOf(a.dayOfWeek) - dayOrderOf(b.dayOfWeek);
        if (dayDiff !== 0) return dayDiff;
        const startDiff = toMinutes(a.startTime) - toMinutes(b.startTime);
        if (startDiff !== 0) return startDiff;
        const endDiff = toMinutes(a.endTime) - toMinutes(b.endTime);
        if (endDiff !== 0) return endDiff;
        return a.subject.localeCompare(b.subject);
      })
  );
}

// Normalize legacy DB rows (English day names, "יום ראשון", "8:15", etc.) into
// the canonical Hebrew + zero-padded form the grid expects. This makes the
// grid forgiving of older imports that pre-date the parser fixes.
function normalizeEntry(e: Entry): Entry {
  return {
    ...e,
    dayOfWeek: canonicalDay(e.dayOfWeek),
    startTime: padTime(e.startTime),
    endTime: padTime(e.endTime),
  };
}

function isValidTime(value: string): boolean {
  return /^\d{2}:\d{2}$/.test(value) && toMinutes(value) !== Number.MAX_SAFE_INTEGER;
}

export function EditableTimetableGrid({
  branchId,
  className,
  initialRows,
}: {
  branchId: string;
  className: string;
  initialRows: Entry[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const normalizedInitial = useMemo(() => initialRows.map(normalizeEntry), [initialRows]);
  const [rows, setRows] = useState<Entry[]>(normalizedInitial);
  const [baselineRows, setBaselineRows] = useState<Entry[]>(normalizedInitial);
  const [draftBranchId, setDraftBranchId] = useState(branchId);
  const currentSnapshot = useMemo(() => serializeRows(rows), [rows]);
  const baselineSnapshot = useMemo(() => serializeRows(baselineRows), [baselineRows]);
  const hasUnsavedChanges = currentSnapshot !== baselineSnapshot;
  const invalidRows = useMemo(() => {
    return rows.filter((r) => {
      if (
        !r.className.trim() ||
        !r.dayOfWeek.trim() ||
        !r.startTime.trim() ||
        !r.endTime.trim() ||
        !r.subject.trim()
      ) {
        return true;
      }
      if (!isValidTime(r.startTime) || !isValidTime(r.endTime)) return true;
      return toMinutes(r.startTime) >= toMinutes(r.endTime);
    }).length;
  }, [rows]);

  const days = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.dayOfWeek))).sort(
        (a, b) => dayOrderOf(a) - dayOrderOf(b)
      ),
    [rows]
  );

  const slots = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => `${r.startTime}__${r.endTime}`)))
        .map((slot) => {
          const [startTime, endTime] = slot.split("__");
          return { startTime, endTime };
        })
        .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime)),
    [rows]
  );

  const byCell = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const r of rows) {
      const key = `${r.dayOfWeek}__${r.startTime}__${r.endTime}`;
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return map;
  }, [rows]);

  function updateRow(id: string, patch: Partial<Entry>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function updateDayColumn(oldDay: string, newDay: string) {
    setRows((prev) =>
      prev.map((r) => (r.dayOfWeek === oldDay ? { ...r, dayOfWeek: newDay } : r))
    );
  }

  function updateTimeSlot(
    oldStartTime: string,
    oldEndTime: string,
    patch: { startTime?: string; endTime?: string }
  ) {
    setRows((prev) =>
      prev.map((r) =>
        r.startTime === oldStartTime && r.endTime === oldEndTime ? { ...r, ...patch } : r
      )
    );
  }

  function addLesson() {
    const fallbackDay = days[0] ?? "ראשון";
    const fallbackStart = slots[0]?.startTime ?? "08:00";
    const fallbackEnd = slots[0]?.endTime ?? "08:45";
    setRows((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        className,
        dayOfWeek: fallbackDay,
        startTime: fallbackStart,
        endTime: fallbackEnd,
        subject: "",
        teacher: "",
        room: "",
      },
    ]);
  }

  function addLessonAt(dayOfWeek: string, startTime: string, endTime: string) {
    setRows((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        className,
        dayOfWeek,
        startTime,
        endTime,
        subject: "",
        teacher: "",
        room: "",
      },
    ]);
  }

  function duplicateLesson(lesson: Entry) {
    setRows((prev) => [
      ...prev,
      {
        ...lesson,
        id: crypto.randomUUID(),
      },
    ]);
  }

  function cancelEditing() {
    setRows(baselineRows);
    setEditing(false);
  }

  const saveChanges = useCallback(async () => {
    if (!hasUnsavedChanges) return;
    if (invalidRows > 0) {
      toast.error(he.timetable.invalidRows(invalidRows));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/timetable/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          branchId: draftBranchId,
          rows: rows.map((r) => ({
            id: r.id,
            className: r.className,
            dayOfWeek: r.dayOfWeek,
            startTime: r.startTime,
            endTime: r.endTime,
            subject: r.subject,
            teacher: r.teacher || null,
            room: r.room || null,
            confidence: 1,
          })),
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        toast.error(json?.error ?? he.api.saveFailed);
        return;
      }
      setBaselineRows(rows);
      toast.success(he.timetable.updated);
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }, [draftBranchId, hasUnsavedChanges, invalidRows, rows, router]);

  useEffect(() => {
    if (hasUnsavedChanges) return;
    setRows(normalizedInitial);
    setBaselineRows(normalizedInitial);
    setDraftBranchId(branchId);
  }, [branchId, hasUnsavedChanges, normalizedInitial]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        if (saving || !hasUnsavedChanges) return;
        e.preventDefault();
        void saveChanges();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [saving, hasUnsavedChanges, saveChanges]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-l from-primary/10 via-transparent to-transparent">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>{className}</CardTitle>
            <CardDescription>{he.timetable.classSchedule}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              {rows.length} {he.timetable.lessons}
            </Badge>
            {hasUnsavedChanges && (
              <Badge variant="warning">{he.timetable.unsavedChanges}</Badge>
            )}
            {invalidRows > 0 && (
              <Badge variant="danger">{he.timetable.invalidRows(invalidRows)}</Badge>
            )}
            {!editing ? (
              <Button type="button" size="sm" variant="secondary" onClick={() => setEditing(true)}>
                <Pencil className="me-1 h-4 w-4" />
                {he.timetable.editTable}
              </Button>
            ) : (
              <>
                <Button type="button" size="sm" variant="outline" onClick={addLesson}>
                  <Plus className="me-1 h-4 w-4" />
                  {he.timetable.addLesson}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={cancelEditing}>
                  <X className="me-1 h-4 w-4" />
                  {he.notes.cancel}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={saveChanges}
                  disabled={saving || !hasUnsavedChanges || invalidRows > 0}
                >
                  {saving ? (
                    <Loader2 className="me-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="me-1 h-4 w-4" />
                  )}
                  {he.notes.save}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="overflow-auto p-0">
        <div className="min-w-[820px]" dir="rtl">
          <div
            className="grid border-t border-border/60"
            style={{ gridTemplateColumns: `120px repeat(${Math.max(1, days.length)}, minmax(140px, 1fr))` }}
          >
            <div className="sticky right-0 z-10 border-b border-e border-border/60 bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {he.timetable.time}
            </div>
            {(days.length ? days : ["—"]).map((day) => (
              <div
                key={day}
                className="border-b border-e border-border/60 bg-muted/40 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {day === "—" || !editing ? (
                  day
                ) : (
                  <Select value={day} onValueChange={(value) => updateDayColumn(day, value)}>
                    <SelectTrigger className="h-8 border-border/50 bg-background/80 text-xs font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAY_OPTIONS.map((dayOption) => (
                        <SelectItem key={dayOption} value={dayOption}>
                          {dayOption}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}

            {(slots.length
              ? slots
              : [{ startTime: "08:00", endTime: "08:45" }]
            ).map((slot, rowIdx) => (
              <Fragment key={`${slot.startTime}-${slot.endTime}`}>
                <div
                  className={cn(
                    "sticky right-0 z-10 border-b border-e border-border/60 px-3 py-3 text-xs font-medium",
                    rowIdx % 2 ? "bg-muted/20" : "bg-card"
                  )}
                >
                  {editing ? (
                    <>
                      <Input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) =>
                          updateTimeSlot(slot.startTime, slot.endTime, {
                            startTime: e.target.value,
                          })
                        }
                        className="h-8 text-xs"
                      />
                      <Input
                        type="time"
                        value={slot.endTime}
                        onChange={(e) =>
                          updateTimeSlot(slot.startTime, slot.endTime, {
                            endTime: e.target.value,
                          })
                        }
                        className="mt-1 h-8 text-xs text-muted-foreground"
                      />
                    </>
                  ) : (
                    <>
                      <div>{slot.startTime}</div>
                      <div className="text-muted-foreground">{slot.endTime}</div>
                    </>
                  )}
                </div>
                {(days.length ? days : ["—"]).map((day, dayIdx) => {
                  const key = `${day}__${slot.startTime}__${slot.endTime}`;
                  const cell = byCell.get(key) ?? [];
                  return (
                    <div
                      key={`${key}-${dayIdx}`}
                      className={cn(
                        "min-h-28 border-b border-e border-border/60 p-2",
                        rowIdx % 2 ? "bg-muted/10" : "bg-card"
                      )}
                    >
                      {cell.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
                          <span>—</span>
                          {editing && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => addLessonAt(day, slot.startTime, slot.endTime)}
                            >
                              <Plus className="me-1 h-3.5 w-3.5" />
                              {he.timetable.addHere}
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {cell.map((lesson) => (
                            <div
                              key={lesson.id}
                              className="rounded-lg border border-primary/20 bg-primary/5 p-2 shadow-soft"
                            >
                              {!editing ? (
                                <>
                                  <p className="text-sm font-semibold leading-tight">{lesson.subject}</p>
                                  <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                                    {lesson.teacher && (
                                      <span className="rounded bg-background px-1.5 py-0.5">
                                        {he.timetable.teacher}: {lesson.teacher}
                                      </span>
                                    )}
                                    {lesson.room && (
                                      <span className="rounded bg-background px-1.5 py-0.5">
                                        {he.timetable.room}: {lesson.room}
                                      </span>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <div className="space-y-1.5">
                                  <Input
                                    value={lesson.subject}
                                    onChange={(e) => updateRow(lesson.id, { subject: e.target.value })}
                                    placeholder={he.timetable.subject}
                                  />
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <Input
                                      value={lesson.teacher ?? ""}
                                      onChange={(e) => updateRow(lesson.id, { teacher: e.target.value })}
                                      placeholder={he.timetable.teacher}
                                    />
                                    <Input
                                      value={lesson.room ?? ""}
                                      onChange={(e) => updateRow(lesson.id, { room: e.target.value })}
                                      placeholder={he.timetable.room}
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <Input
                                      value={lesson.startTime}
                                      onChange={(e) => updateRow(lesson.id, { startTime: e.target.value })}
                                      type="time"
                                      placeholder="08:00"
                                    />
                                    <Input
                                      value={lesson.endTime}
                                      onChange={(e) => updateRow(lesson.id, { endTime: e.target.value })}
                                      type="time"
                                      placeholder="08:45"
                                    />
                                  </div>
                                  <Select
                                    value={lesson.dayOfWeek}
                                    onValueChange={(value) => updateRow(lesson.id, { dayOfWeek: value })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder={he.timetable.day} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {DAY_OPTIONS.map((dayOption) => (
                                        <SelectItem key={dayOption} value={dayOption}>
                                          {dayOption}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <div className="flex items-center gap-1.5">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      className="text-muted-foreground hover:bg-secondary"
                                      onClick={() => duplicateLesson(lesson)}
                                    >
                                      <Copy className="me-1 h-4 w-4" />
                                      {he.timetable.duplicateLesson}
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      className="text-destructive hover:bg-destructive/10"
                                      onClick={() => removeRow(lesson.id)}
                                    >
                                      <Trash2 className="me-1 h-4 w-4" />
                                      {he.timetable.deleteLesson}
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
