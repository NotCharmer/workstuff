"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Plus,
  PenLine,
  Save,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import type { ParseResult, ExtractedRow } from "@/lib/ocr/types";
import { he } from "@/lib/i18n/he";
import {
  hasStudentsEligibleForTargetFilter,
  TARGET_SUBJECT_FILTER_EMPTY_ERROR,
} from "@/lib/upload/target-subjects-client";
import {
  createEmptyRow,
  createManualPendingReview,
  PENDING_REVIEW_SESSION_KEY,
  savePendingReviewToSession,
} from "@/lib/upload/manual-review";

async function readApiJson(res: Response): Promise<{
  ok?: boolean;
  error?: string;
  saved?: number;
  studentsCreated?: number;
}> {
  const text = await res.text();
  if (!text) {
    return { error: res.ok ? undefined : `שגיאת שרת (${res.status})` };
  }
  try {
    return JSON.parse(text) as {
      ok?: boolean;
      error?: string;
      saved?: number;
      studentsCreated?: number;
    };
  } catch {
    return {
      error: res.ok
        ? he.review.toastSaveError
        : `שגיאת שרת (${res.status}) — בדקו ש-DATABASE_URL מוגדר ב-Vercel`,
    };
  }
}

type Pending = ParseResult & { fileName: string; branchId?: string };

type EditableRow = ExtractedRow & { errors?: Record<string, string> };

function newRow(): EditableRow {
  return createEmptyRow();
}

function validate(rows: EditableRow[]) {
  const err = he.review.errors;
  let valid = true;
  const updated = rows.map((r) => {
    const errors: Record<string, string> = {};
    if (!r.studentName.trim()) errors.studentName = err.name;
    if (!r.subject.trim()) errors.subject = err.subject;
    if (Number.isNaN(r.grade)) errors.grade = err.grade;
    else if (r.grade < 0 || r.grade > 100) errors.grade = err.range;
    if (Object.keys(errors).length) valid = false;
    return { ...r, errors };
  });
  return { valid, rows: updated };
}

export function ReviewEditor({ activeBranchId }: { activeBranchId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<Pending | null>(null);
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const raw =
      typeof window !== "undefined" ? sessionStorage.getItem(PENDING_REVIEW_SESSION_KEY) : null;
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Pending;
        setPending(parsed);
        setRows(parsed.rows.map((r) => ({ ...r })));
      } catch {
        /* ignore */
      }
    }
    setHydrated(true);
  }, []);

  const lowConfidence = useMemo(
    () => rows.filter((r) => (r.confidence ?? 1) < 0.8).length,
    [rows]
  );

  const eligibleForSave = useMemo(() => hasStudentsEligibleForTargetFilter(rows), [rows]);

  function update(id: string, patch: Partial<EditableRow>) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch, errors: undefined } : r))
    );
  }

  function remove(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function addRow() {
    setRows((prev) => [...prev, newRow()]);
  }

  async function save() {
    const { valid, rows: validated } = validate(rows);
    setRows(validated);
    if (!valid) {
      toast.error(he.review.toastInvalid);
      return;
    }
    if (!pending) return;
    if (!pending.branchId) {
      toast.error("טיוטת השמירה אינה משויכת לבית ספר — פענחו או הזינו מחדש לפני השמירה");
      return;
    }

    if (!hasStudentsEligibleForTargetFilter(validated)) {
      toast.error(TARGET_SUBJECT_FILTER_EMPTY_ERROR);
      return;
    }

    setSaving(true);
    try {
      let res: Response;
      try {
        res = await fetch("/api/upload/confirm", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            fileName: pending.fileName,
            branchId: pending.branchId,
            rows: validated.map((r) => ({
              id: r.id,
              studentName: r.studentName,
              subject: r.subject,
              grade: Number(r.grade),
              externalId: r.externalId || null,
              className: r.className || null,
              confidence: r.confidence,
            })),
            avgConfidence: pending.avgConfidence,
          }),
        });
      } catch {
        toast.error(he.uploadDrop.toastNet);
        return;
      }

      const json = await readApiJson(res);
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? he.review.toastSaveError);
        return;
      }
      sessionStorage.removeItem(PENDING_REVIEW_SESSION_KEY);
      toast.success(he.review.toastSaved(json.saved ?? 0, json.studentsCreated ?? 0));
      router.push("/dashboard");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (!hydrated) return null;

  if (!pending) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title={he.review.emptyTitle}
        description={he.review.emptyDesc}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              type="button"
              className="gap-1"
              onClick={() => {
                const payload = createManualPendingReview(5, activeBranchId);
                savePendingReviewToSession(payload);
                setPending(payload);
                setRows(payload.rows.map((r) => ({ ...r })));
              }}
            >
              <PenLine className="h-4 w-4" />
              {he.review.startManual}
            </Button>
            <Button asChild variant="secondary">
              <Link href="/upload" className="gap-1">
                <ArrowLeft className="h-4 w-4 [dir=rtl]:-scale-x-100" />
                {he.review.goUpload}
              </Link>
            </Button>
          </div>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryStat label={he.review.summary.rows} value={rows.length} />
        <SummaryStat
          label={he.review.summary.confidence}
          value={`${Math.round((pending.avgConfidence ?? 0) * 100)}%`}
          tone={
            pending.avgConfidence >= 0.9
              ? "success"
              : pending.avgConfidence >= 0.8
                ? "info"
                : "warning"
          }
        />
        <SummaryStat
          label={he.review.summary.lowConf}
          value={lowConfidence}
          tone={lowConfidence ? "warning" : "success"}
        />
        <SummaryStat label={he.review.summary.file} value={pending.fileName} small />
      </div>

      {!eligibleForSave && rows.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <CardTitle className="text-sm text-destructive">לא ניתן לשמור את הטבלה הזו</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-destructive/90">
            {TARGET_SUBJECT_FILTER_EMPTY_ERROR}
          </CardContent>
        </Card>
      )}

      {pending.warnings?.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <CardTitle className="text-sm text-amber-900 dark:text-amber-200">
                {he.review.doubleCheck}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="list-disc space-y-1 pe-5 text-xs text-amber-800 dark:text-amber-200/90">
              {pending.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>{he.review.tableTitle}</CardTitle>
            <CardDescription>{he.review.tableDesc}</CardDescription>
          </div>
          <Button variant="secondary" onClick={addRow} className="gap-1">
            <Plus className="h-4 w-4" />
            {he.review.addRow}
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <Th>{he.review.thStudent}</Th>
                  <Th>{he.review.thId}</Th>
                  <Th>{he.review.thClass}</Th>
                  <Th>{he.review.thSubject}</Th>
                  <Th className="text-end">{he.review.thGrade}</Th>
                  <Th className="w-10">{he.review.thConfShort}</Th>
                  <Th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">
                      {he.review.noRows}
                    </td>
                  </tr>
                )}
                {rows.map((row, idx) => {
                  const low = (row.confidence ?? 1) < 0.8;
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        "transition-colors",
                        idx % 2 === 0 ? "bg-card" : "bg-muted/20",
                        low && "bg-amber-50/60 dark:bg-amber-950/20"
                      )}
                    >
                      <Td>
                        <CellInput
                          value={row.studentName}
                          error={row.errors?.studentName}
                          onChange={(v) => update(row.id, { studentName: v })}
                          placeholder={he.review.placeholderName}
                        />
                      </Td>
                      <Td>
                        <CellInput
                          value={row.externalId ?? ""}
                          onChange={(v) => update(row.id, { externalId: v })}
                          placeholder="—"
                        />
                      </Td>
                      <Td>
                        <CellInput
                          value={row.className ?? ""}
                          onChange={(v) => update(row.id, { className: v })}
                          placeholder={he.review.placeholderClass}
                        />
                      </Td>
                      <Td>
                        <CellInput
                          value={row.subject}
                          error={row.errors?.subject}
                          onChange={(v) => update(row.id, { subject: v })}
                          placeholder={he.review.placeholderSubject}
                        />
                      </Td>
                      <Td className="text-end">
                        <CellInput
                          type="number"
                          value={String(row.grade)}
                          error={row.errors?.grade}
                          onChange={(v) => update(row.id, { grade: Number(v) })}
                          className="text-end tabular-nums"
                          min={0}
                          max={100}
                          step={0.5}
                        />
                      </Td>
                      <Td className="text-center">
                        <Badge
                          variant={
                            (row.confidence ?? 1) >= 0.9
                              ? "success"
                              : (row.confidence ?? 1) >= 0.8
                                ? "info"
                                : "warning"
                          }
                        >
                          {Math.round((row.confidence ?? 1) * 100)}
                        </Badge>
                      </Td>
                      <Td className="text-end">
                        <button
                          type="button"
                          onClick={() => remove(row.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          aria-label={he.review.removeRow}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <Button variant="ghost" asChild>
          <Link href="/upload" className="gap-1">
            <ArrowLeft className="h-4 w-4 [dir=rtl]:-scale-x-100" />
            {he.review.backUpload}
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            {he.review.notSaved}
          </div>
          <Button
            onClick={save}
            disabled={saving || rows.length === 0 || !eligibleForSave}
            className="gap-1"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {he.review.saving}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {he.review.confirmSave}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  tone = "default",
  small,
}: {
  label: string;
  value: string | number;
  tone?: "default" | "success" | "info" | "warning";
  small?: boolean;
}) {
  const toneRing: Record<string, string> = {
    default: "",
    success: "ring-emerald-500/30",
    info: "ring-sky-500/30",
    warning: "ring-amber-500/30",
  };
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 shadow-soft ring-1 ring-transparent",
        toneRing[tone]
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-display font-semibold tracking-tight",
          small ? "truncate text-sm" : "text-2xl"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "sticky top-0 border-b border-border px-3 py-2 text-start text-xs font-semibold uppercase tracking-wider text-muted-foreground",
        className
      )}
    >
      {children}
    </th>
  );
}

function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("border-b border-border/60 p-2 align-middle", className)}>{children}</td>;
}

function CellInput({
  value,
  onChange,
  error,
  className,
  ...rest
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-9 rounded-md border-transparent bg-transparent px-2 shadow-none",
          "focus-visible:border-primary/50 focus-visible:bg-background",
          error && "border-destructive/70 bg-destructive/5",
          className
        )}
        {...rest}
      />
      {error && <p className="mt-1 px-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}


