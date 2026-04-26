"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Loader2, Pencil, Plus, Trash2, X, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { NoteSchema, type NoteInput } from "@/lib/validators";
import { he } from "@/lib/i18n/he";
import { dateLocaleHe } from "@/lib/i18n";

type Note = {
  id: string;
  body: string;
  category: "GENERAL" | "BEHAVIOR" | "PROGRESS" | "CONCERN" | "STRENGTH";
  createdAt: string;
  updatedAt: string;
  author?: { name: string } | null;
};

const CATEGORY_STYLES: Record<Note["category"], { label: string; variant: any }> = {
  GENERAL: { label: he.notes.categories.GENERAL, variant: "secondary" },
  BEHAVIOR: { label: he.notes.categories.BEHAVIOR, variant: "info" },
  PROGRESS: { label: he.notes.categories.PROGRESS, variant: "default" },
  CONCERN: { label: he.notes.categories.CONCERN, variant: "danger" },
  STRENGTH: { label: he.notes.categories.STRENGTH, variant: "success" },
};

export function NotesPanel({
  studentId,
  initialNotes,
}: {
  studentId: string;
  initialNotes: Note[];
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<NoteInput>({
    resolver: zodResolver(NoteSchema),
    defaultValues: { body: "", category: "GENERAL" },
  });
  const category = watch("category");

  async function onCreate(values: NoteInput) {
    const res = await fetch(`/api/students/${studentId}/notes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      toast.error(json.error ?? he.api.invalidInput);
      return;
    }
    setNotes([json.note, ...notes]);
    reset({ body: "", category: "GENERAL" });
    toast.success(he.notes.noteAdded);
    startTransition(() => router.refresh());
  }

  async function onUpdate(id: string, values: NoteInput) {
    const res = await fetch(`/api/notes/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      toast.error(json.error ?? he.api.invalidInput);
      return;
    }
    setNotes((prev) => prev.map((n) => (n.id === id ? json.note : n)));
    setEditingId(null);
    toast.success(he.notes.noteUpdated);
    startTransition(() => router.refresh());
  }

  async function onDelete(id: string) {
    if (!confirm(he.notes.deleteConfirm)) return;
    const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error(he.api.noteNotFound);
      return;
    }
    setNotes((prev) => prev.filter((n) => n.id !== id));
    toast.success(he.notes.noteDeleted);
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={handleSubmit(onCreate)}
        className="space-y-3 rounded-2xl border border-border/60 bg-card p-4 shadow-soft"
      >
        <div className="flex items-center gap-3">
          <Label className="shrink-0">{he.notes.category}</Label>
          <Select
            value={category}
            onValueChange={(v) => setValue("category", v as NoteInput["category"])}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(CATEGORY_STYLES) as Note["category"][]).map((k) => (
                <SelectItem key={k} value={k}>
                  {CATEGORY_STYLES[k].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Textarea
          {...register("body")}
          placeholder={he.notes.placeholder}
          rows={3}
        />
        {errors.body && <p className="text-xs text-destructive">{errors.body.message}</p>}

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting} className="gap-1">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {he.notes.saving}
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                {he.notes.add}
              </>
            )}
          </Button>
        </div>
      </form>

      {notes.length === 0 ? (
        <EmptyState
          icon={Pencil}
          title={he.notes.noNotes}
          description={he.notes.noNotesDesc}
        />
      ) : (
        <ul className="space-y-3">
          {notes.map((n) =>
            editingId === n.id ? (
              <EditRow
                key={n.id}
                note={n}
                onCancel={() => setEditingId(null)}
                onSave={(vals) => onUpdate(n.id, vals)}
              />
            ) : (
              <li
                key={n.id}
                className="group rounded-2xl border border-border/60 bg-card p-4 shadow-soft transition-colors hover:border-primary/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={CATEGORY_STYLES[n.category].variant}>
                      {CATEGORY_STYLES[n.category].label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(n.createdAt), {
                        addSuffix: true,
                        locale: dateLocaleHe,
                      })}
                      {n.author?.name && ` · ${n.author.name}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => setEditingId(n.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"
                      aria-label={he.notes.edit}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(n.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label={he.notes.delete}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                  {n.body}
                </p>
              </li>
            )
          )}
        </ul>
      )}

      {isPending && <p className="text-xs text-muted-foreground">{he.notes.sync}</p>}
    </div>
  );
}

function EditRow({
  note,
  onCancel,
  onSave,
}: {
  note: Note;
  onCancel: () => void;
  onSave: (v: NoteInput) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting, errors },
  } = useForm<NoteInput>({
    resolver: zodResolver(NoteSchema),
    defaultValues: { body: note.body, category: note.category },
  });

  return (
    <li className="rounded-2xl border border-primary/50 bg-card p-4 shadow-card">
      <form onSubmit={handleSubmit(onSave)} className="space-y-3">
        <Select
          value={watch("category")}
          onValueChange={(v) => setValue("category", v as NoteInput["category"])}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(CATEGORY_STYLES) as Note["category"][]).map((k) => (
              <SelectItem key={k} value={k}>
                {CATEGORY_STYLES[k].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Textarea rows={3} {...register("body")} />
        {errors.body && <p className="text-xs text-destructive">{errors.body.message}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel} className="gap-1">
            <X className="h-4 w-4" />
            {he.notes.cancel}
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-1">
            <Check className="h-4 w-4" />
            {he.notes.save}
          </Button>
        </div>
      </form>
    </li>
  );
}
