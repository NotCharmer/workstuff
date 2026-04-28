"use client";

import { useMemo, useState, useTransition } from "react";
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

export function PrivateLessonsClient({
  students,
  initialLessons,
}: {
  students: StudentOption[];
  initialLessons: PrivateLessonRow[];
}) {
  const [lessons, setLessons] = useState<PrivateLessonRow[]>(initialLessons);
  const [studentId, setStudentId] = useState<string>(students[0]?.id ?? "");
  const [date, setDate] = useState<string>(todayStr());
  const [duration, setDuration] = useState<string>("60");
  const DURATION_OPTIONS = [60, 120, 180, 300] as const;
  const [subject, setSubject] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [filterStudentId, setFilterStudentId] = useState<string>("");
  const [pending, startTransition] = useTransition();

  const filteredLessons = useMemo(() => {
    if (!filterStudentId) return lessons;
    return lessons.filter((l) => l.studentId === filterStudentId);
  }, [lessons, filterStudentId]);

  function addLesson(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!studentId) {
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
          studentId,
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{he.privateLessons.formTitle}</CardTitle>
          <CardDescription>{he.privateLessons.formDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={addLesson}
            className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_120px_auto]"
          >
            <div className="space-y-1">
              <Label htmlFor="lesson-student">{he.privateLessons.fieldStudent}</Label>
              <select
                id="lesson-student"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                disabled={students.length === 0}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-soft focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
              >
                {students.length === 0 && <option value="">—</option>}
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.className ? ` · ${s.className}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="lesson-date">{he.privateLessons.fieldDate}</Label>
              <Input
                id="lesson-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={todayStr()}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lesson-duration">{he.privateLessons.fieldDuration}</Label>
              <select
                id="lesson-duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-soft focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {DURATION_OPTIONS.map((minutes) => (
                  <option key={minutes} value={String(minutes)}>
                    {he.privateLessons.durationOption(minutes / 60)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button
                type="submit"
                disabled={pending || students.length === 0}
                className="w-full gap-1"
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {he.privateLessons.addButton}
              </Button>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="lesson-subject">{he.privateLessons.fieldSubject}</Label>
              <Input
                id="lesson-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={he.privateLessons.fieldSubjectPh}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="lesson-notes">{he.privateLessons.fieldNotes}</Label>
              <Input
                id="lesson-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={he.privateLessons.fieldNotesPh}
              />
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
                  {s.name}
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
                      {formatDateHe(l.date)} ·{" "}
                      {he.privateLessons.minutesShort(l.durationMinutes)}
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
