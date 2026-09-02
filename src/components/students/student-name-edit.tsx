"use client";

import { useState, useTransition, type FormEvent, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil } from "lucide-react";
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

export function StudentNameEdit({
  studentId,
  firstName,
  lastName,
}: {
  studentId: string;
  firstName: string;
  lastName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [first, setFirst] = useState(firstName);
  const [last, setLast] = useState(lastName);

  function openDialog(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setFirst(firstName);
    setLast(lastName);
    setOpen(true);
  }

  function save(e: FormEvent) {
    e.preventDefault();
    const nextFirst = first.trim();
    const nextLast = last.trim();
    if (!nextFirst || !nextLast) {
      toast.error(he.validators.nameRequired);
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch(`/api/students/${studentId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ firstName: nextFirst, lastName: nextLast }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) {
          toast.error(json?.error ?? he.students.nameSaveFailed);
          return;
        }
        toast.success(he.students.nameSaved);
        setOpen(false);
        router.refresh();
      } catch {
        toast.error(he.students.nameSaveFailed);
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label={he.students.editNameAria}
        className="relative z-10 h-8 w-8 text-muted-foreground hover:bg-primary/10 hover:text-primary"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={openDialog}
      >
        <Pencil className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-sm"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <DialogHeader className="text-start">
            <DialogTitle>{he.students.editName}</DialogTitle>
            <DialogDescription>
              {firstName} {lastName}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor={`first-${studentId}`}>{he.students.firstName}</Label>
              <Input
                id={`first-${studentId}`}
                value={first}
                onChange={(e) => setFirst(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`last-${studentId}`}>{he.students.lastName}</Label>
              <Input
                id={`last-${studentId}`}
                value={last}
                onChange={(e) => setLast(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {he.students.saveName}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
