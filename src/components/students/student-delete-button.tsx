"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { he } from "@/lib/i18n/he";

type Props = {
  studentId: string;
  studentName: string;
};

export function StudentDeleteButton({ studentId, studentName }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      disabled={pending}
      aria-label={he.students.delete}
      className="relative z-10 h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!window.confirm(he.students.deleteConfirm(studentName))) return;

        startTransition(async () => {
          try {
            const res = await fetch(`/api/students/${studentId}`, { method: "DELETE" });
            const json = await res.json().catch(() => null);
            if (!res.ok || !json?.ok) {
              toast.error(json?.error ?? he.students.deleteError);
              return;
            }
            toast.success(he.students.deleteSuccess);
            router.refresh();
          } catch {
            toast.error(he.students.deleteError);
          }
        });
      }}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </Button>
  );
}
