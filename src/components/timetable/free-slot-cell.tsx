"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { he } from "@/lib/i18n/he";
import { cn } from "@/lib/utils";

export function FreeSlotCell({
  dayOfWeek,
  startTime,
  endTime,
  initialTitle,
  onTitleChange,
}: {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  initialTitle: string | null;
  onTitleChange: (title: string | null) => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [draft, setDraft] = useState(initialTitle ?? "");
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipBlurRef = useRef(false);

  useEffect(() => {
    setTitle(initialTitle);
    if (!editing) setDraft(initialTitle ?? "");
  }, [initialTitle, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function startEdit() {
    setDraft(title ?? "");
    setEditing(true);
  }

  async function save(nextRaw: string) {
    const next = nextRaw.trim();
    const previous = title;
    if ((previous ?? "") === next) {
      setEditing(false);
      return;
    }
    setPending(true);
    setTitle(next || null);
    setEditing(false);
    onTitleChange(next || null);
    try {
      const res = await fetch("/api/timetable/personal-slots", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dayOfWeek, startTime, endTime, title: next }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setTitle(previous);
        onTitleChange(previous);
        toast.error(json?.error ?? he.api.saveFailed);
        return;
      }
      const saved = typeof json.title === "string" ? json.title : null;
      setTitle(saved);
      onTitleChange(saved);
      toast.success(saved ? he.timetable.freeSlotSaved : he.timetable.freeSlotCleared);
    } catch {
      setTitle(previous);
      onTitleChange(previous);
      toast.error(he.api.saveFailed);
    } finally {
      setPending(false);
    }
  }

  if (editing) {
    return (
      <form
        className="space-y-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          void save(draft);
        }}
      >
        <Input
          ref={inputRef}
          value={draft}
          disabled={pending}
          maxLength={80}
          placeholder={he.timetable.freeSlotPlaceholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              skipBlurRef.current = true;
              setEditing(false);
              setDraft(title ?? "");
            }
          }}
          onBlur={() => {
            if (skipBlurRef.current) {
              skipBlurRef.current = false;
              return;
            }
            void save(draft);
          }}
        />
        <p className="text-[10px] text-muted-foreground">{he.timetable.freeSlotEditHint}</p>
      </form>
    );
  }

  if (title) {
    return (
      <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-2 shadow-soft">
        <p className="text-sm font-semibold leading-tight">{title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-medium text-sky-800 dark:text-sky-300">
            {he.timetable.personalShort}
          </span>
          <button
            type="button"
            disabled={pending}
            title={he.timetable.editFreeSlot}
            aria-label={he.timetable.editFreeSlot}
            onClick={startEdit}
            className="inline-flex items-center rounded p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            type="button"
            disabled={pending}
            title={he.timetable.clearFreeSlot}
            aria-label={he.timetable.clearFreeSlot}
            onClick={() => void save("")}
            className="inline-flex items-center rounded p-0.5 text-muted-foreground hover:bg-background hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={startEdit}
      className={cn(
        "flex h-full min-h-20 w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border/80 px-2 py-3 text-center transition-colors",
        "text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
      )}
    >
      <span className="text-xs font-medium">{he.timetable.freeSlot}</span>
      <span className="inline-flex items-center gap-0.5 text-[10px]">
        <Plus className="h-3 w-3" />
        {he.timetable.freeSlotHint}
      </span>
    </button>
  );
}
