"use client";

import { useState, useTransition, type MouseEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { he } from "@/lib/i18n/he";
import { cn } from "@/lib/utils";
import {
  TUTORING_URGENCIES,
  formatTutoringWhen,
  type TutoringUrgency,
} from "@/lib/tutoring";

function stop(e: MouseEvent) {
  e.stopPropagation();
}

async function patchStudent(studentId: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/students/${studentId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) {
    throw new Error(json?.error ?? he.students.updateError);
  }
  return json;
}

const URGENCY_TONE: Record<TutoringUrgency, string> = {
  URGENT: "border-red-500/50 bg-red-500/10 text-red-800 dark:text-red-300",
  MEDIUM: "border-amber-500/50 bg-amber-500/10 text-amber-950 dark:text-amber-200",
  LIGHT: "border-sky-500/50 bg-sky-500/10 text-sky-950 dark:text-sky-200",
  STANDARD: "border-teal-500/40 bg-teal-500/10 text-teal-800 dark:text-teal-300",
};

export function StudentTutoringUrgencySelect({
  studentId,
  initial,
  compact = false,
  onSaved,
}: {
  studentId: string;
  initial: TutoringUrgency | null;
  compact?: boolean;
  onSaved?: (next: TutoringUrgency | null) => void;
}) {
  const [urgency, setUrgency] = useState<TutoringUrgency | null>(initial);
  const [pending, startTransition] = useTransition();
  const fieldId = `tutoring-urgency-${studentId}`;

  function onChange(value: string) {
    const next: TutoringUrgency | null = value ? (value as TutoringUrgency) : null;
    const previous = urgency;
    setUrgency(next);
    startTransition(async () => {
      try {
        await patchStudent(studentId, { tutoringUrgency: next });
        onSaved?.(next);
        toast.success(
          next ? he.students.tutoringUrgencySaved(he.students.tutoringUrgency[next]) : he.students.tutoringOff
        );
      } catch (error) {
        setUrgency(previous);
        toast.error(error instanceof Error ? error.message : he.students.updateError);
      }
    });
  }

  return (
    <div className={compact ? "flex w-full flex-col gap-1" : "flex w-full flex-col gap-1.5 sm:w-72"} onClick={stop}>
      <label htmlFor={fieldId} className="text-xs font-medium text-muted-foreground">
        {he.students.tutoringUrgencyLabel}
      </label>
      <div className="relative">
        <select
          id={fieldId}
          value={urgency ?? ""}
          disabled={pending}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full rounded-lg border bg-background shadow-soft focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-70",
            compact ? "h-9 px-2.5 pe-8 text-xs" : "h-10 px-3 pe-9 text-sm",
            urgency ? URGENCY_TONE[urgency] : "border-input text-foreground"
          )}
        >
          <option value="">{he.students.tutoringNo}</option>
          {TUTORING_URGENCIES.map((level) => (
            <option key={level} value={level}>
              {he.students.tutoringUrgency[level]}
            </option>
          ))}
        </select>
        {pending && (
          <Loader2 className="pointer-events-none absolute end-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>
    </div>
  );
}

export function TutoringScheduleEditor({
  studentId,
  scheduledFor,
  onSaved,
}: {
  studentId: string;
  scheduledFor: string | null;
  onSaved?: (next: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(scheduledFor ?? "");
  const [pending, startTransition] = useTransition();

  function openEditor(e: MouseEvent) {
    stop(e);
    setDraft(scheduledFor ?? "");
    setEditing(true);
  }

  function save(e: MouseEvent) {
    stop(e);
    if (!draft) return;
    startTransition(async () => {
      try {
        await patchStudent(studentId, { tutoringScheduledFor: draft });
        onSaved?.(draft);
        setEditing(false);
        toast.success(he.students.tutoringScheduleSaved);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : he.students.updateError);
      }
    });
  }

  function clear(e: MouseEvent) {
    stop(e);
    startTransition(async () => {
      try {
        await patchStudent(studentId, { tutoringScheduledFor: null });
        onSaved?.(null);
        setDraft("");
        setEditing(false);
        toast.success(he.students.tutoringScheduleCleared);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : he.students.updateError);
      }
    });
  }

  const whenLabel = formatTutoringWhen(scheduledFor);

  return (
    <div className="space-y-1.5" onClick={stop}>
      {editing ? (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground" htmlFor={`tutoring-when-${studentId}`}>
            {he.students.tutoringScheduleWhen}
          </label>
          <input
            id={`tutoring-when-${studentId}`}
            type="datetime-local"
            value={draft}
            disabled={pending}
            onChange={(e) => setDraft(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background px-2 text-xs shadow-soft focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-70"
          />
          <div className="flex gap-1.5">
            <button
              type="button"
              disabled={pending || !draft}
              onClick={save}
              className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-lg bg-primary px-2 text-xs font-medium text-primary-foreground disabled:opacity-60"
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {he.students.tutoringScheduleSave}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={(e) => {
                stop(e);
                setEditing(false);
              }}
              className="inline-flex h-8 items-center rounded-lg border border-border px-2 text-xs text-muted-foreground hover:bg-secondary"
            >
              {he.students.cancel}
            </button>
          </div>
        </div>
      ) : whenLabel ? (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-foreground">
            {he.students.tutoringScheduledPrefix}: {whenLabel}
          </p>
          <div className="flex gap-1.5">
            <button
              type="button"
              disabled={pending}
              onClick={openEditor}
              className="inline-flex h-8 flex-1 items-center justify-center rounded-lg border border-border px-2 text-xs font-medium hover:bg-secondary"
            >
              {he.students.tutoringScheduleChange}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={clear}
              className="inline-flex h-8 items-center rounded-lg border border-border px-2 text-xs text-muted-foreground hover:bg-secondary"
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : he.students.tutoringScheduleClear}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={openEditor}
          className="inline-flex h-8 w-full items-center justify-center gap-1 rounded-lg border border-teal-500/40 bg-teal-500/10 px-2 text-xs font-medium text-teal-800 hover:bg-teal-500/20 dark:text-teal-300"
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {he.students.tutoringScheduleSet}
        </button>
      )}
    </div>
  );
}

export function StudentTutoringPanel({
  studentId,
  initialUrgency,
  initialScheduledFor,
  compact = false,
}: {
  studentId: string;
  initialUrgency: TutoringUrgency | null;
  initialScheduledFor: string | null;
  compact?: boolean;
}) {
  const [urgency, setUrgency] = useState<TutoringUrgency | null>(initialUrgency);
  const [when, setWhen] = useState<string | null>(initialScheduledFor);

  return (
    <div className={compact ? "flex w-full flex-col gap-2" : "flex w-full min-w-0 flex-col gap-2 sm:w-72"}>
      <StudentTutoringUrgencySelect
        studentId={studentId}
        initial={initialUrgency}
        compact={compact}
        onSaved={(next) => {
          setUrgency(next);
          if (!next) setWhen(null);
        }}
      />
      {urgency ? (
        <TutoringScheduleEditor studentId={studentId} scheduledFor={when} onSaved={setWhen} />
      ) : null}
    </div>
  );
}
