"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UploadCloud, FileImage, FileSpreadsheet, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ParseResult } from "@/lib/ocr/types";
import { he } from "@/lib/i18n/he";

const SESSION_KEY = "lebronator:pending-review";

type PendingReview = ParseResult & { fileName: string };

export function UploadDropzone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsing, setParsing] = useState(false);

  const onChoose = useCallback((picked: File | null) => {
    if (!picked) return;
    setFile(picked);
    if (picked.type.startsWith("image/")) {
      const url = URL.createObjectURL(picked);
      setPreview(url);
    } else {
      setPreview(null);
    }
  }, []);

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onChoose(f);
  }

  async function parse() {
    if (!file) return;
    setParsing(true);
    try {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(SESSION_KEY);
      }
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload/parse", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? he.uploadDrop.toastExtractError);
        return;
      }
      const payload: PendingReview = {
        fileName: json.fileName,
        rows: json.rows,
        avgConfidence: json.avgConfidence,
        warnings: json.warnings ?? [],
        rawText: json.rawText,
      };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
      const conf = `${Math.round(payload.avgConfidence * 100)}%`;
      toast.success(he.uploadDrop.toastSuccess(payload.rows.length, conf));
      router.push("/upload/review");
    } catch {
      toast.error(he.uploadDrop.toastNet);
    } finally {
      setParsing(false);
    }
  }

  function clear() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-4">
      <div
        role="button"
        tabIndex={0}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={cn(
          "group relative flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-muted/30 p-8 text-center transition-all",
          isDragging
            ? "scale-[1.01] border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/50"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf,.csv,text/csv,application/csv"
          className="hidden"
          onChange={(e) => onChoose(e.target.files?.[0] ?? null)}
        />

        {preview ? (
          <div className="flex w-full flex-col items-center gap-4">
            <img
              src={preview}
              alt={he.uploadDrop.altPreview}
              className="max-h-64 rounded-xl border border-border shadow-card"
            />
            <div className="flex items-center gap-2 text-sm">
              <FileImage className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{file?.name}</span>
              <span className="text-muted-foreground">
                · {((file?.size ?? 0) / 1024).toFixed(0)} KB
              </span>
            </div>
          </div>
        ) : file ? (
          <div className="flex items-center gap-3 text-sm">
            {/\.csv$/i.test(file.name) || file.type === "text/csv" || file.type === "application/csv" ? (
              <FileSpreadsheet className="h-5 w-5 text-primary" />
            ) : (
              <FileImage className="h-5 w-5 text-primary" />
            )}
            <span className="font-medium">{file.name}</span>
          </div>
        ) : (
          <>
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
              <UploadCloud className="h-6 w-6" />
            </div>
            <p className="font-display text-lg font-semibold">
              {he.uploadDrop.dropOrBrowse} <span className="text-primary">{he.uploadDrop.browse}</span>
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {he.uploadDrop.formats}
            </p>
            <a
              href="/grades-template.csv"
              download
              onClick={(e) => e.stopPropagation()}
              className="mt-2 text-sm text-primary underline-offset-4 hover:underline"
            >
              {he.uploadDrop.downloadTemplate}
            </a>
          </>
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        {file && (
          <Button variant="ghost" onClick={clear} disabled={parsing}>
            <X className="h-4 w-4" />
            {he.uploadDrop.remove}
          </Button>
        )}
        <Button onClick={parse} disabled={!file || parsing}>
          {parsing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {he.uploadDrop.extracting}
            </>
          ) : (
            <>
              <UploadCloud className="h-4 w-4" />
              {he.uploadDrop.extract}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
