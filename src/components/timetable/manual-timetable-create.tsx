"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EditableTimetableGrid } from "@/components/timetable/editable-timetable-grid";
import { he } from "@/lib/i18n/he";

export function ManualTimetableCreate({ existingClasses }: { existingClasses: string[] }) {
  const [className, setClassName] = useState("");
  const [draftClass, setDraftClass] = useState<string | null>(null);

  useEffect(() => {
    if (draftClass && existingClasses.includes(draftClass)) {
      setDraftClass(null);
    }
  }, [existingClasses, draftClass]);

  function start(e: FormEvent) {
    e.preventDefault();
    const name = className.trim();
    if (!name) {
      toast.error(he.timetable.classRequired);
      return;
    }
    if (existingClasses.some((c) => c === name) || draftClass === name) {
      toast.error(he.timetable.classExists);
      return;
    }
    setDraftClass(name);
    setClassName("");
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{he.timetable.manualTitle}</CardTitle>
          <CardDescription>{he.timetable.manualDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={start} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-1">
              <Label htmlFor="manual-class">{he.timetable.className}</Label>
              <Input
                id="manual-class"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder={he.timetable.manualClassPh}
              />
            </div>
            <Button type="submit" className="shrink-0 gap-1">
              <Plus className="h-4 w-4" />
              {he.timetable.manualStart}
            </Button>
          </form>
        </CardContent>
      </Card>

      {draftClass && (
        <EditableTimetableGrid
          key={draftClass}
          className={draftClass}
          initialRows={[]}
          startEditing
          keepSchoolDays
        />
      )}
    </div>
  );
}
