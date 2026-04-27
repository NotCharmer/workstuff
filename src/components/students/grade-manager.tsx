"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { he as dateLocaleHe } from "date-fns/locale";
import { Loader2, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatGrade, gradeBadgeTone } from "@/lib/utils";
import { he } from "@/lib/i18n/he";
import { gradeSourceHe } from "@/lib/i18n";

type GradeRow = {
  id: string;
  value: number;
  gradedAt: string;
  source: string;
  subject: { id: string; name: string; color: string; isImportant: boolean };
};

type SubjectOption = {
  id: string;
  name: string;
  isImportant: boolean;
};

export function GradeManager({
  studentId,
  initialGrades,
  initialSubjects,
}: {
  studentId: string;
  initialGrades: GradeRow[];
  initialSubjects: SubjectOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [subject, setSubject] = useState("");
  const [value, setValue] = useState("");
  const [gradedAt, setGradedAt] = useState("");

  const subjectLookup = useMemo(() => {
    return new Map(initialSubjects.map((s) => [s.name.toLowerCase(), s]));
  }, [initialSubjects]);

  async function addGrade(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const grade = Number.parseFloat(value);
    if (!subject.trim()) {
      toast.error(he.validators.subjectRequired);
      return;
    }
    if (Number.isNaN(grade) || grade < 0 || grade > 100) {
      toast.error(he.validators.gradeNumber);
      return;
    }

    const payload: { subject: string; value: number; gradedAt?: string } = {
      subject: subject.trim(),
      value: grade,
    };
    if (gradedAt) payload.gradedAt = new Date(gradedAt).toISOString();

    const res = await fetch(`/api/students/${studentId}/grades`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) {
      toast.error(json?.error ?? he.api.saveFailed);
      return;
    }

    toast.success(he.studentDetail.gradeAdded);
    setSubject("");
    setValue("");
    setGradedAt("");
    startTransition(() => router.refresh());
  }

  function removeGrade(gradeId: string) {
    if (!window.confirm(he.studentDetail.deleteGradeConfirm)) return;
    startTransition(async () => {
      const res = await fetch(`/api/grades/${gradeId}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        toast.error(json?.error ?? he.api.saveFailed);
        return;
      }
      toast.success(he.studentDetail.gradeDeleted);
      router.refresh();
    });
  }

  function toggleImportant(subjectId: string, next: boolean) {
    startTransition(async () => {
      const res = await fetch(`/api/subjects/${subjectId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isImportant: next }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        toast.error(json?.error ?? he.api.saveFailed);
        return;
      }
      toast.success(next ? he.studentDetail.subjectMarkedImportant : he.studentDetail.subjectUnmarkedImportant);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={addGrade}
        className="grid grid-cols-1 gap-2 rounded-xl border border-border/60 bg-card p-3 md:grid-cols-[1fr_110px_180px_auto]"
      >
        <div className="space-y-1">
          <Label htmlFor="manual-subject">{he.studentDetail.tableSubject}</Label>
          <Input
            id="manual-subject"
            list="subjects-list"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={he.review.placeholderSubject}
          />
          <datalist id="subjects-list">
            {initialSubjects.map((s) => (
              <option key={s.id} value={s.name} />
            ))}
          </datalist>
        </div>
        <div className="space-y-1">
          <Label htmlFor="manual-grade">{he.studentDetail.tableGrade}</Label>
          <Input
            id="manual-grade"
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0-100"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="manual-date">{he.studentDetail.tableDate}</Label>
          <Input
            id="manual-date"
            type="datetime-local"
            value={gradedAt}
            onChange={(e) => setGradedAt(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={pending} className="w-full gap-1">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {he.studentDetail.addGrade}
          </Button>
        </div>
      </form>

      <div className="rounded-xl border border-border/60 p-3">
        <p className="mb-2 text-sm font-medium">{he.studentDetail.importantSubjects}</p>
        <div className="flex flex-wrap gap-2">
          {initialSubjects.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={pending}
              onClick={() => toggleImportant(s.id, !s.isImportant)}
              className="rounded-full"
            >
              <Badge variant={s.isImportant ? "warning" : "outline"} className="gap-1.5">
                <Star className={`h-3.5 w-3.5 ${s.isImportant ? "fill-current" : ""}`} />
                {s.name}
              </Badge>
            </button>
          ))}
          {initialSubjects.length === 0 && (
            <p className="text-xs text-muted-foreground">{he.studentDetail.noSubjects}</p>
          )}
        </div>
      </div>

      {initialGrades.length > 0 && (
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-start text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3">{he.studentDetail.tableSubject}</th>
                <th className="px-5 py-3">{he.studentDetail.tableSource}</th>
                <th className="px-5 py-3">{he.studentDetail.tableDate}</th>
                <th className="px-5 py-3 text-end">{he.studentDetail.tableGrade}</th>
                <th className="px-5 py-3 text-end">{he.studentDetail.actions}</th>
              </tr>
            </thead>
            <tbody>
              {initialGrades.map((g, i) => {
                const knownSubject = subjectLookup.get(g.subject.name.toLowerCase());
                const important = knownSubject?.isImportant ?? g.subject.isImportant;
                return (
                  <tr key={g.id} className={i % 2 === 0 ? "bg-card" : "bg-muted/10"}>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: g.subject.color }}
                        />
                        <span className="font-medium">{g.subject.name}</span>
                        {important && (
                          <Badge variant="warning" className="text-[10px]">
                            <Star className="me-1 h-3 w-3 fill-current" />
                            {he.studentDetail.importantShort}
                          </Badge>
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant="outline" className="text-[11px]">
                        {gradeSourceHe(g.source)}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {format(new Date(g.gradedAt), "PPp", { locale: dateLocaleHe })}
                    </td>
                    <td className="px-5 py-3 text-end">
                      <Badge variant={gradeBadgeTone(g.value) as any}>{formatGrade(g.value)}</Badge>
                    </td>
                    <td className="px-5 py-3 text-end">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => removeGrade(g.id)}
                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
