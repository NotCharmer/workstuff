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

export function TimetableUploader({ activeBranchId }: { activeBranchId: string }) {
  const router = useRouter();
  const [rows, setRows] = useState<TimetableRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [draftBranchId, setDraftBranchId] = useState(activeBranchId);
  const [busy, setBusy] = useState(false);

  const warnings = useMemo(
    () => rows.filter((r) => (r.confidence ?? 1) < 0.75).length,
    [rows]
  );

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
      setRows(json.rows);
      setDraftBranchId(json.branchId ?? activeBranchId);
      setFileName(json.fileName ?? file.name);
      toast.success(he.timetable.extracted(json.rows.length));
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
    if (rows.length === 0) setDraftBranchId(activeBranchId);
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
    setBusy(true);
    try {
      const res = await fetch("/api/timetable/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ branchId: draftBranchId, rows }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        toast.error(json?.error ?? he.api.saveFailed);
        return;
      }
      toast.success(he.timetable.saved(json.saved));
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
          <div className="mt-3 flex items-center gap-2">
            <Badge variant="outline">{fileName}</Badge>
            {warnings > 0 && <Badge variant="warning">{he.timetable.lowConfidence(warnings)}</Badge>}
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Button type="button" variant="secondary" onClick={addRow}>
              {he.review.addRow}
            </Button>
            <Button type="button" onClick={save} disabled={busy}>
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
