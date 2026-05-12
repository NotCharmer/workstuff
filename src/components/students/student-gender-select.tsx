"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { he } from "@/lib/i18n/he";

type StudentGender = "MALE" | "FEMALE";

export function StudentGenderSelect({
  studentId,
  initialGender,
  compact = false,
}: {
  studentId: string;
  initialGender: StudentGender | null;
  compact?: boolean;
}) {
  const [gender, setGender] = useState<StudentGender>(initialGender ?? "MALE");
  const [pending, startTransition] = useTransition();
  const fieldId = `student-gender-${studentId}`;

  function onChange(nextValue: string) {
    const nextGender: StudentGender = nextValue as "MALE" | "FEMALE";
    const previousGender = gender;
    setGender(nextGender);

    startTransition(async () => {
      const res = await fetch(`/api/students/${studentId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ gender: nextGender }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setGender(previousGender);
        toast.error(json?.error ?? he.studentGender.saveFailed);
        return;
      }
      toast.success(he.studentGender.saved);
    });
  }

  return (
    <div className={compact ? "flex w-full flex-col gap-1" : "flex w-full flex-col gap-1.5 sm:w-64"}>
      <label htmlFor={fieldId} className="text-xs font-medium text-muted-foreground">
        {he.studentGender.label}
      </label>
      <div className="relative">
        <select
          id={fieldId}
          value={gender}
          onChange={(e) => onChange(e.target.value)}
          disabled={pending}
          className={
            compact
              ? "h-9 w-full rounded-lg border border-input bg-background px-2.5 pe-9 text-xs shadow-soft focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-70"
              : "h-10 w-full rounded-lg border border-input bg-background px-3 pe-9 text-sm shadow-soft focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-70"
          }
        >
          <option value="MALE">{he.studentGender.male}</option>
          <option value="FEMALE">{he.studentGender.female}</option>
        </select>
        {pending && (
          <Loader2 className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>
      {!compact && (
        <p className="text-[11px] text-muted-foreground">
          {pending ? he.studentGender.saving : he.studentGender.help}
        </p>
      )}
    </div>
  );
}
