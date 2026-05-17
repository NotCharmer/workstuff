"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { he } from "@/lib/i18n/he";

type School = {
  id: string;
  code: string;
  name: string;
  _count?: { students: number };
};

export function SchoolSwitcher({ canSwitch }: { canSwitch: boolean }) {
  const router = useRouter();
  const [schools, setSchools] = useState<School[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/schools");
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Failed");
      setSchools(json.branches ?? []);
      setActiveId(json.activeBranchId ?? null);
    } catch {
      toast.error(he.schools.loadFailed);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function selectSchool(branchId: string) {
    if (!canSwitch || branchId === activeId) return;
    setSwitching(branchId);
    try {
      const res = await fetch("/api/schools/active", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ branchId }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? he.schools.switchFailed);
      setActiveId(branchId);
      toast.success(he.schools.switched(json.branch?.name ?? ""));
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : he.schools.switchFailed);
    } finally {
      setSwitching(null);
    }
  }

  if (loading) {
    return (
      <div className="mx-3 mb-2 flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {he.schools.loading}
      </div>
    );
  }

  if (schools.length === 0) return null;

  return (
    <div className="mx-3 mb-3 space-y-1">
      <p className="flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Building2 className="h-3.5 w-3.5" />
        {he.schools.title}
      </p>
      <ul className="space-y-0.5">
        {schools.map((school) => {
          const active = school.id === activeId;
          const empty = (school._count?.students ?? 0) === 0;
          return (
            <li key={school.id}>
              <button
                type="button"
                disabled={!canSwitch || switching !== null}
                onClick={() => selectSchool(school.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary/15 font-medium text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  !canSwitch && "cursor-default"
                )}
              >
                <span className="truncate">{school.name}</span>
                <span className="flex shrink-0 items-center gap-1">
                  {empty && !active && (
                    <span className="text-[10px] text-muted-foreground">{he.schools.empty}</span>
                  )}
                  {switching === school.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : active ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
