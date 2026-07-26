"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { he } from "@/lib/i18n/he";
import type { TimetableRow } from "@/lib/timetable/types";

const LOW_CONFIDENCE = 0.9;

export function TimetableUploader() {
  const router = useRouter();
  const [rows, setRows] = useState<TimetableRow[]>([]);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [replaceAcknowledged, setReplaceAcknowledged] = useState(false);

  const lowConfidenceCount = useMemo(
    () => rows.filter((r) => (r.confidence ?? 1) < LOW_CONFIDENCE).length,
    [rows]
  );

  const classes = useMemo(
    () =>
      Array.from(
        new Set(rows.map((r) => r.className.trim()).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b, "he")),
    [rows]
  );

  const needsReplaceAck = parseWarnings.length > 0 || lowConfidenceCount > 0;

  async function onFileChange(file?: File | null) {
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/timetable/parse", { method: "POST", body: form });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        toast.error(json?.error ?? he.api.saveFailed);
        return;
      }
      const warnings = Array.isArray(json.warnings)
        ? json.warnings.filter((w: unknown): w is string => typeof w === "string" && w.trim().length > 0)
        : [];
      setRows(json.rows ?? []);
      setParseWarnings(warnings);
      setReplaceAcknowledged(false);
      setFileName(json.fileName ?? file.name);
      if (warnings.length > 0) {
        toast.warning(he.timetable.parseWarnings(warnings.length));
      } else {
        toast.success(he.timetable.extracted(json.rows?.length ?? 0));
      }
    } finally {
      setBusy(false);
    }
  }

  function updateRow(id: string, key: keyof TimetableRow, value: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function addRow() {
    setRows((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        className: "",
        dayOfWeek: "",
        startTime: "",
        endTime: "",
        subject: "",
        teacher: "",
        room: "",
        confidence: 1,
      },
    ]);
  }

  async function save() {
    if (!rows.length) return;
    if (needsReplaceAck && !replaceAcknowledged) {
      toast.error(he.timetable.acknowledgeRequired);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/timetable/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        toast.error(json?.error ?? he.api.saveFailed);
        return;
      }
      toast.success(he.timetable.saved(json.saved));
      setParseWarnings([]);
      setReplaceAcknowledged(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground hover:bg-muted/30">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
          {he.timetable.pickFile}
          <input
            type="file"
            className="hidden"
            accept=".csv,image/*"
            onChange={(e) => onFileChange(e.target.files?.[0])}
            disabled={busy}
          />
        </label>
        {fileName && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="outline">{fileName}</Badge>
            {lowConfidenceCount > 0 && (
              <Badge variant="warning">{he.timetable.lowConfidence(lowConfidenceCount)}</Badge>
            )}
            {parseWarnings.length > 0 && (
              <Badge variant="warning">{he.timetable.parseWarnings(parseWarnings.length)}</Badge>
            )}
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <div className="space-y-3">
          {classes.length > 0 && (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
              {he.timetable.replaceWarning(classes.join(", "))}
            </p>
          )}

          {parseWarnings.length > 0 && (
            <ul className="max-h-40 space-y-1 overflow-auto rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              {parseWarnings.map((warning, idx) => (
                <li key={`${idx}-${warning}`}>{warning}</li>
              ))}
            </ul>
          )}

          {needsReplaceAck && (
            <label className="flex items-start gap-2 rounded-xl border border-border/60 bg-card px-3 py-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={replaceAcknowledged}
                onChange={(e) => setReplaceAcknowledged(e.target.checked)}
              />
              <span>{he.timetable.acknowledgeReplace}</span>
            </label>
          )}

          <div className="flex items-center justify-between">
            <Button type="button" variant="secondary" onClick={addRow}>
              {he.review.addRow}
            </Button>
            <Button
              type="button"
              onClick={save}
              disabled={busy || (needsReplaceAck && !replaceAcknowledged)}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : he.review.confirmSave}
            </Button>
          </div>
          <div className="overflow-auto rounded-xl border border-border/60">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-2 py-2">{he.timetable.className}</th>
                  <th className="px-2 py-2">{he.timetable.day}</th>
                  <th className="px-2 py-2">{he.timetable.start}</th>
                  <th className="px-2 py-2">{he.timetable.end}</th>
                  <th className="px-2 py-2">{he.timetable.subject}</th>
                  <th className="px-2 py-2">{he.timetable.teacher}</th>
                  <th className="px-2 py-2">{he.timetable.room}</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={r.id} className={idx % 2 ? "bg-muted/10" : ""}>
                    <td className="p-1"><Input value={r.className} onChange={(e) => updateRow(r.id, "className", e.target.value)} /></td>
                    <td className="p-1"><Input value={r.dayOfWeek} onChange={(e) => updateRow(r.id, "dayOfWeek", e.target.value)} /></td>
                    <td className="p-1"><Input value={r.startTime} onChange={(e) => updateRow(r.id, "startTime", e.target.value)} /></td>
                    <td className="p-1"><Input value={r.endTime} onChange={(e) => updateRow(r.id, "endTime", e.target.value)} /></td>
                    <td className="p-1"><Input value={r.subject} onChange={(e) => updateRow(r.id, "subject", e.target.value)} /></td>
                    <td className="p-1"><Input value={r.teacher ?? ""} onChange={(e) => updateRow(r.id, "teacher", e.target.value)} /></td>
                    <td className="p-1"><Input value={r.room ?? ""} onChange={(e) => updateRow(r.id, "room", e.target.value)} /></td>
                    <td className="p-1">
                      <Button type="button" size="icon" variant="ghost" onClick={() => removeRow(r.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
