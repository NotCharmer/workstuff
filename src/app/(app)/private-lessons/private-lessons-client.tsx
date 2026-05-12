"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { GraduationCap, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { he } from "@/lib/i18n/he";
import { cn } from "@/lib/utils";

type StudentOption = {
  id: string;
  name: string;
  className: string | null;
  avatarHue: number;
};

export type PrivateLessonRow = {
  id: string;
  studentId: string;
  studentName: string;
  studentClassName: string | null;
  studentAvatarHue: number;
  date: string;
  durationMinutes: number;
  subject: string | null;
  notes: string | null;
};

const CLASS_NONE = "__none__";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateHe(dateStr: string) {
  return new Intl.DateTimeFormat("he-IL", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(dateStr + "T00:00:00"));
}

function formatStudentLabel(s: StudentOption) {
  return s.className?.trim() ? `${s.name} · ${s.className.trim()}` : s.name;
}

function normalize(s: string) {
  return s.trim().toLowerCase();
}

function formatDurationLabel(minutes: number) {
  if (minutes % 60 === 0) return he.privateLessons.durationOption(minutes / 60);
  return he.privateLessons.minutesShort(minutes);
}

function matchesStudentQuery(s: StudentOption, query: string) {
  const q = normalize(query);
  if (!q) return true;
  const name = normalize(s.name);
  const cls = normalize(s.className ?? "");
  if (name.includes(q) || cls.includes(q)) return true;
  const qParts = q.split(/\s+/).filter(Boolean);
  if (qParts.length > 1) return qParts.every((t) => name.includes(t));
  return name.split(/\s+/).some((p) => p.startsWith(q));
}

export function PrivateLessonsClient({
  students,
  initialLessons,
}: {
  students: StudentOption[];
  initialLessons: PrivateLessonRow[];
}) {
  const [lessons, setLessons] = useState<PrivateLessonRow[]>(initialLessons);
  const [classFilter, setClassFilter] = useState<string>("");
  const [studentId, setStudentId] = useState<string>(() => students[0]?.id ?? "");
  const [query, setQuery] = useState<string>(() =>
    students[0] ? formatStudentLabel(students[0]) : ""
  );
  const [listOpen, setListOpen] = useState(false);
  const comboRef = useRef<HTMLDivElement>(null);

  const [date, setDate] = useState<string>(todayStr());
  const [duration, setDuration] = useState<string>("60");
  const DURATION_OPTIONS = [60, 120, 180, 240, 300, 360] as const;
  const [subject, setSubject] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [filterStudentId, setFilterStudentId] = useState<string>("");
  const [pending, startTransition] = useTransition();

  const distinctClasses = useMemo(() => {
    const set = new Set<string>();
    for (const s of students) {
      const c = s.className?.trim();
      if (c) set.add(c);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "he"));
  }, [students]);

  const hasStudentsWithoutClass = useMemo(
    () => students.some((s) => !s.className?.trim()),
    [students]
  );

  const pool = useMemo(() => {
    if (!classFilter) return students;
    if (classFilter === CLASS_NONE) return students.filter((s) => !s.className?.trim());
    return students.filter((s) => (s.className?.trim() ?? "") === classFilter);
  }, [students, classFilter]);

  const filteredByQuery = useMemo(
    () => pool.filter((s) => matchesStudentQuery(s, query)),
    [pool, query]
  );

  // Selection resets only when the class dropdown changes (`pool` follows `classFilter`).
  useEffect(() => {
    if (!pool.length) {
      setStudentId("");
      setQuery("");
      return;
    }
    const next = pool[0]!;
    setStudentId(next.id);
    setQuery(formatStudentLabel(next));
  }, [classFilter]); // eslint-disable-line react-hooks/exhaustive-deps -- intentional: avoid resetting while searching (do not depend on `pool`/`studentId`)

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!comboRef.current?.contains(e.target as Node)) setListOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  function pickStudent(s: StudentOption) {
    setStudentId(s.id);
    setQuery(formatStudentLabel(s));
    setListOpen(false);
  }

  function resolveUniqueStudent(): StudentOption | null {
    const q = normalize(query);
    if (!q) return pool[0] ?? null;
    const hits = pool.filter((s) => matchesStudentQuery(s, query));
    if (hits.length === 1) return hits[0]!;
    const exact = pool.find((s) => normalize(formatStudentLabel(s)) === q);
    return exact ?? null;
  }

  const filteredLessons = useMemo(() => {
    if (!filterStudentId) return lessons;
    return lessons.filter((l) => l.studentId === filterStudentId);
  }, [lessons, filterStudentId]);

  function addLesson(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    let sid = studentId;
    const resolved = resolveUniqueStudent();
    if ((!sid || !pool.some((s) => s.id === sid)) && resolved) {
      sid = resolved.id;
      setStudentId(sid);
      setQuery(formatStudentLabel(resolved));
    }
    if (!sid || !students.some((s) => s.id === sid)) {
      toast.error(he.privateLessons.errors.studentRequired);
      return;
    }
    const minutes = Number.parseInt(duration, 10);
    if (Number.isNaN(minutes) || minutes < 5 || minutes > 480) {
      toast.error(he.privateLessons.errors.durationRange);
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      toast.error(he.privateLessons.errors.dateRequired);
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/private-lessons", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          studentId: sid,
          date,
          durationMinutes: minutes,
          subject: subject.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        toast.error(json?.error ?? he.privateLessons.errors.saveFailed);
        return;
      }
      const lesson = json.lesson;
      setLessons((prev) => [
        {
          id: lesson.id,
          studentId: lesson.studentId,
          studentName: `${lesson.student.firstName} ${lesson.student.lastName}`,
          studentClassName: lesson.student.className,
          studentAvatarHue: lesson.student.avatarHue,
          date: lesson.date,
          durationMinutes: lesson.durationMinutes,
          subject: lesson.subject,
          notes: lesson.notes,
        },
        ...prev,
      ]);
      setSubject("");
      setNotes("");
      toast.success(he.privateLessons.toastAdded);
    });
  }

  function removeLesson(lessonId: string) {
    if (!window.confirm(he.privateLessons.deleteConfirm)) return;
    const previous = lessons;
    setLessons((prev) => prev.filter((l) => l.id !== lessonId));
    startTransition(async () => {
      const res = await fetch(`/api/private-lessons/${lessonId}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setLessons(previous);
        toast.error(json?.error ?? he.privateLessons.errors.deleteFailed);
        return;
      }
      toast.success(he.privateLessons.toastDeleted);
    });
  }

  const canSubmit = pool.length > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{he.privateLessons.formTitle}</CardTitle>
          <CardDescription>{he.privateLessons.formDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={addLesson} className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
              <div className="space-y-1 lg:col-span-2">
                <Label htmlFor="lesson-class">{he.privateLessons.fieldClass}</Label>
                <select
                  id="lesson-class"
                  value={classFilter}
                  onChange={(e) => {
                    setClassFilter(e.target.value);
                    setListOpen(true);
                  }}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-soft focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">{he.privateLessons.fieldClassAll}</option>
                  {hasStudentsWithoutClass && (
                    <option value={CLASS_NONE}>{he.privateLessons.fieldClassNone}</option>
                  )}
                  {distinctClasses.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative space-y-1 lg:col-span-5" ref={comboRef}>
                <Label htmlFor="lesson-student-search">{he.privateLessons.fieldStudent}</Label>
                <Input
                  id="lesson-student-search"
                  type="text"
                  autoComplete="off"
                  role="combobox"
                  aria-expanded={listOpen}
                  aria-controls="student-suggest-list"
                  placeholder={he.privateLessons.studentSearchPh}
                  value={query}
                  disabled={pool.length === 0}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setListOpen(true);
                    const still = pool.find(
                      (s) => s.id === studentId && formatStudentLabel(s) === e.target.value
                    );
                    if (!still) setStudentId("");
                  }}
                  onFocus={() => setListOpen(true)}
                  onBlur={() => {
                    window.setTimeout(() => {
                      const r = resolveUniqueStudent();
                      if (r) pickStudent(r);
                    }, 120);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setListOpen(false);
                    if (e.key === "Enter" && filteredByQuery.length >= 1) {
                      e.preventDefault();
                      pickStudent(filteredByQuery[0]!);
                    }
                  }}
                  className="h-10"
                />
                {listOpen && pool.length > 0 && (
                  <ul
                    id="student-suggest-list"
                    role="listbox"
                    className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-popover py-1 text-sm shadow-card"
                  >
                    {filteredByQuery.length === 0 ? (
                      <li className="px-3 py-2 text-muted-foreground">
                        {he.privateLessons.noMatchingStudents}
                      </li>
                    ) : (
                      filteredByQuery.map((s) => (
                        <li key={s.id} role="option" aria-selected={studentId === s.id}>
                          <button
                            type="button"
                            className={cn(
                              "flex w-full items-center px-3 py-2 text-right transition-colors hover:bg-secondary",
                              studentId === s.id && "bg-secondary/80"
                            )}
                            onMouseDown={(ev) => {
                              ev.preventDefault();
                              pickStudent(s);
                            }}
                          >
                            <span className="truncate">{formatStudentLabel(s)}</span>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>

              <div className="space-y-1 lg:col-span-2">
                <Label htmlFor="lesson-date">{he.privateLessons.fieldDate}</Label>
                <Input
                  id="lesson-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  max={todayStr()}
                />
              </div>
              <div className="space-y-1 lg:col-span-2">
                <Label htmlFor="lesson-duration">{he.privateLessons.fieldDuration}</Label>
                <select
                  id="lesson-duration"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-soft focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {DURATION_OPTIONS.map((minutes) => (
                    <option key={minutes} value={String(minutes)}>
                      {minutes === 240
                        ? he.privateLessons.durationReinforcement4
                        : minutes === 360
                          ? he.privateLessons.durationReinforcement6
                          : he.privateLessons.durationOption(minutes / 60)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end lg:col-span-1">
                <Button
                  type="submit"
                  disabled={pending || !canSubmit}
                  className="w-full gap-1"
                  title={!canSubmit ? he.privateLessons.selectStudentFromList : undefined}
                >
                  {pending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {he.privateLessons.addButton}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="lesson-subject">{he.privateLessons.fieldSubject}</Label>
                <Input
                  id="lesson-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={he.privateLessons.fieldSubjectPh}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lesson-notes">{he.privateLessons.fieldNotes}</Label>
                <Input
                  id="lesson-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={he.privateLessons.fieldNotesPh}
                />
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{he.privateLessons.listTitle}</CardTitle>
            <CardDescription>{he.privateLessons.listDesc}</CardDescription>
          </div>
          <div className="min-w-[220px]">
            <select
              value={filterStudentId}
              onChange={(e) => setFilterStudentId(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-soft focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">{he.privateLessons.filterAll}</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {formatStudentLabel(s)}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredLessons.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title={he.privateLessons.emptyTitle}
              description={he.privateLessons.emptyDesc}
              className="border-0 shadow-none"
            />
          ) : (
            <ul className="divide-y divide-border/60">
              {filteredLessons.map((l) => (
                <li
                  key={l.id}
                  className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{l.studentName}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDateHe(l.date)} · {formatDurationLabel(l.durationMinutes)}
                      {l.studentClassName ? ` · ${l.studentClassName}` : ""}
                    </p>
                    {(l.subject || l.notes) && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {l.subject && (
                          <Badge variant="secondary" className="me-2 align-middle">
                            {l.subject}
                          </Badge>
                        )}
                        {l.notes}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLesson(l.id)}
                    aria-label={he.privateLessons.deleteAria}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
