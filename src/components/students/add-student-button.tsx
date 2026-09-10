"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { he } from "@/lib/i18n/he";

type Row = {
  key: string;
  firstName: string;
  lastName: string;
  externalId: string;
};

function newRow(): Row {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    firstName: "",
    lastName: "",
    externalId: "",
  };
}

function emptyRows(n: number): Row[] {
  return Array.from({ length: n }, () => newRow());
}

export function AddStudentButton({ classOptions }: { classOptions: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [className, setClassName] = useState("");
  const [rows, setRows] = useState<Row[]>(() => emptyRows(5));

  function reset() {
    setClassName("");
    setRows(emptyRows(5));
  }

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows((prev) => [...prev, newRow()]);
  }

  function removeRow(key: string) {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((row) => row.key !== key)));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    const filled = rows
      .map((row) => ({
        firstName: row.firstName.trim(),
        lastName: row.lastName.trim(),
        externalId: row.externalId.trim(),
      }))
      .filter((row) => row.firstName || row.lastName || row.externalId);

    if (filled.length === 0) {
      toast.error(he.students.needOneStudent);
      return;
    }
    const incomplete = filled.find((row) => !row.firstName || !row.lastName);
    if (incomplete) {
      toast.error(he.validators.nameRequired);
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          students: filled.map((row) => ({
            firstName: row.firstName,
            lastName: row.lastName,
            className: className.trim() || null,
            externalId: row.externalId || null,
          })),
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        toast.error(json?.error ?? he.students.createError);
        return;
      }
      const created = Number(json.created) || 0;
      const skipped = Number(json.skipped) || 0;
      toast.success(
        skipped > 0
          ? he.students.createdSome(created, skipped)
          : created === 1
            ? he.students.created
            : he.students.createdMany(created)
      );
      setOpen(false);
      reset();
      router.refresh();
    } catch {
      toast.error(he.students.createError);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={() => { reset(); setOpen(true); }}>
        <UserPlus className="h-4 w-4" />
        {he.students.addStudents}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <form onSubmit={(e) => void save(e)}>
            <DialogHeader>
              <DialogTitle>{he.students.addStudents}</DialogTitle>
              <DialogDescription>{he.students.addStudentDesc}</DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="add-students-class">{he.students.sharedClass}</Label>
                <Input
                  id="add-students-class"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  list="add-student-class-options"
                  placeholder={he.students.classPlaceholder}
                  autoComplete="off"
                />
                <datalist id="add-student-class-options">
                  {classOptions.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_1fr_7rem_auto] gap-2 text-xs font-medium text-muted-foreground">
                  <span>{he.students.firstName}</span>
                  <span>{he.students.lastName}</span>
                  <span>{he.students.externalIdShort}</span>
                  <span className="w-8" />
                </div>
                {rows.map((row) => (
                  <div key={row.key} className="grid grid-cols-[1fr_1fr_7rem_auto] items-center gap-2">
                    <Input
                      value={row.firstName}
                      onChange={(e) => updateRow(row.key, { firstName: e.target.value })}
                      autoComplete="off"
                    />
                    <Input
                      value={row.lastName}
                      onChange={(e) => updateRow(row.key, { lastName: e.target.value })}
                      autoComplete="off"
                    />
                    <Input
                      value={row.externalId}
                      onChange={(e) => updateRow(row.key, { externalId: e.target.value })}
                      autoComplete="off"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 text-muted-foreground hover:text-destructive"
                      disabled={rows.length <= 1}
                      aria-label={he.students.removeRow}
                      onClick={() => removeRow(row.key)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="secondary" size="sm" onClick={addRow}>
                  <Plus className="h-4 w-4" />
                  {he.students.addRow}
                </Button>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                {he.students.cancel}
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                {he.students.addStudents}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
