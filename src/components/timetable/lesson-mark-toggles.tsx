"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Star, Stars, UserMinus } from "lucide-react";
import { toast } from "sonner";

import { he } from "@/lib/i18n/he";
import { cn } from "@/lib/utils";
import {
  SUBJECT_IMPORTANT_EVENT,
  sameSubject,
  type LessonMarkFlags,
} from "@/lib/timetable/marks";

export function LessonMarkToggles({
  className,
  dayOfWeek,
  startTime,
  endTime,
  subject,
  initial,
  subjectWideImportant = false,
}: {
  className: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subject: string;
  initial?: LessonMarkFlags;
  subjectWideImportant?: boolean;
}) {
  const router = useRouter();
  const [flags, setFlags] = useState<LessonMarkFlags>({
    important: initial?.important ?? false,
    tutoringPull: initial?.tutoringPull ?? false,
  });
  const [allOfSubject, setAllOfSubject] = useState(subjectWideImportant);
  const [pending, setPending] = useState<"important" | "tutoringPull" | "subject" | null>(null);
  const disabled = !subject.trim() || pending !== null;

  useEffect(() => {
    setFlags({
      important: initial?.important ?? false,
      tutoringPull: initial?.tutoringPull ?? false,
    });
  }, [initial?.important, initial?.tutoringPull]);

  useEffect(() => {
    setAllOfSubject(subjectWideImportant);
  }, [subjectWideImportant]);

  useEffect(() => {
    function onSubjectImportant(event: Event) {
      const detail = (event as CustomEvent<{ subject: string; important: boolean }>).detail;
      if (!detail || !sameSubject(detail.subject, subject)) return;
      setAllOfSubject(detail.important);
      setFlags((prev) => ({ ...prev, important: detail.important }));
    }
    window.addEventListener(SUBJECT_IMPORTANT_EVENT, onSubjectImportant);
    return () => window.removeEventListener(SUBJECT_IMPORTANT_EVENT, onSubjectImportant);
  }, [subject]);

  async function patch(payload: Record<string, unknown>) {
    const res = await fetch("/api/timetable/marks", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        className,
        dayOfWeek,
        startTime,
        endTime,
        subject,
        ...payload,
      }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) {
      throw new Error(json?.error ?? he.api.saveFailed);
    }
    return json as {
      important: boolean;
      tutoringPull: boolean;
      updated?: number;
    };
  }

  async function toggle(field: "important" | "tutoringPull") {
    const next = !flags[field];
    const previous = flags;
    setFlags({ ...flags, [field]: next });
    setPending(field);
    try {
      const json = await patch({ [field]: next });
      setFlags({
        important: Boolean(json.important),
        tutoringPull: Boolean(json.tutoringPull),
      });
    } catch (error) {
      setFlags(previous);
      toast.error(error instanceof Error ? error.message : he.api.saveFailed);
    } finally {
      setPending(null);
    }
  }

  async function toggleAllOfSubject() {
    const next = !allOfSubject;
    const previousFlags = flags;
    const previousAll = allOfSubject;
    setAllOfSubject(next);
    setFlags((prev) => ({ ...prev, important: next }));
    setPending("subject");
    try {
      const json = await patch({ important: next, applyToAllOfSubject: true });
      setFlags({
        important: Boolean(json.important),
        tutoringPull: Boolean(json.tutoringPull),
      });
      setAllOfSubject(next);
      window.dispatchEvent(
        new CustomEvent(SUBJECT_IMPORTANT_EVENT, {
          detail: { subject: subject.trim(), important: next },
        })
      );
      toast.success(
        next
          ? he.timetable.markedAllImportant(json.updated ?? 0, subject.trim())
          : he.timetable.unmarkedAllImportant(subject.trim())
      );
      router.refresh();
    } catch (error) {
      setAllOfSubject(previousAll);
      setFlags(previousFlags);
      toast.error(error instanceof Error ? error.message : he.api.saveFailed);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1">
      <button
        type="button"
        disabled={disabled}
        title={he.timetable.markImportant}
        aria-pressed={flags.important}
        aria-label={he.timetable.markImportant}
        onClick={() => void toggle("important")}
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium transition-colors",
          flags.important
            ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
            : "bg-background text-muted-foreground hover:bg-secondary hover:text-foreground",
          disabled && "opacity-50"
        )}
      >
        <Star className={cn("h-3.5 w-3.5", flags.important && "fill-current")} />
        {he.timetable.importantShort}
      </button>
      <button
        type="button"
        disabled={disabled}
        title={he.timetable.markAllSubjectTitle(subject.trim())}
        aria-pressed={allOfSubject}
        aria-label={he.timetable.markAllSubjectTitle(subject.trim())}
        onClick={() => void toggleAllOfSubject()}
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium transition-colors",
          allOfSubject
            ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
            : "bg-background text-muted-foreground hover:bg-secondary hover:text-foreground",
          disabled && "opacity-50"
        )}
      >
        <Stars className="h-3.5 w-3.5" />
        {he.timetable.markAllSubject}
      </button>
      <button
        type="button"
        disabled={disabled}
        title={he.timetable.markTutoring}
        aria-pressed={flags.tutoringPull}
        aria-label={he.timetable.markTutoring}
        onClick={() => void toggle("tutoringPull")}
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium transition-colors",
          flags.tutoringPull
            ? "bg-teal-500/15 text-teal-700 dark:text-teal-400"
            : "bg-background text-muted-foreground hover:bg-secondary hover:text-foreground",
          disabled && "opacity-50"
        )}
      >
        <UserMinus className="h-3.5 w-3.5" />
        {he.timetable.tutoringShort}
      </button>
    </div>
  );
}
