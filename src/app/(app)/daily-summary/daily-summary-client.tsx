"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Copy,
  Loader2,
  MessageCircle,
  Plus,
  RefreshCcw,
  Settings2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { he } from "@/lib/i18n/he";
import { DEFAULT_SUMMARY_CONFIG } from "@/lib/daily-summary";

type ClassVisit = {
  id: string;
  date: string;
  className: string;
  subject: string;
  durationMinutes: number;
  notes: string | null;
};

const STORAGE_KEY = "lebronator:daily-summary-config";
const DURATION_OPTIONS = [60, 120, 180, 300] as const;

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function durationLabel(minutes: number) {
  const hours = minutes / 60;
  if (hours === 1) return "שעה";
  if (hours === 2) return "שעתיים";
  if (Number.isInteger(hours)) return `${hours} שעות`;
  return `${minutes} דק׳`;
}

type LocalConfig = {
  programTitle: string;
  schoolLine: string;
  greetingLine: string;
  team: string;
};

function readConfig(): LocalConfig {
  if (typeof window === "undefined") {
    return {
      programTitle: DEFAULT_SUMMARY_CONFIG.programTitle,
      schoolLine: DEFAULT_SUMMARY_CONFIG.schoolLine,
      greetingLine: DEFAULT_SUMMARY_CONFIG.greetingLine,
      team: DEFAULT_SUMMARY_CONFIG.team.join(", "),
    };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LocalConfig>;
      return {
        programTitle: parsed.programTitle ?? DEFAULT_SUMMARY_CONFIG.programTitle,
        schoolLine: parsed.schoolLine ?? DEFAULT_SUMMARY_CONFIG.schoolLine,
        greetingLine: parsed.greetingLine ?? DEFAULT_SUMMARY_CONFIG.greetingLine,
        team: parsed.team ?? DEFAULT_SUMMARY_CONFIG.team.join(", "),
      };
    }
  } catch {
    /* ignore */
  }
  return {
    programTitle: DEFAULT_SUMMARY_CONFIG.programTitle,
    schoolLine: DEFAULT_SUMMARY_CONFIG.schoolLine,
    greetingLine: DEFAULT_SUMMARY_CONFIG.greetingLine,
    team: DEFAULT_SUMMARY_CONFIG.team.join(", "),
  };
}

export function DailySummaryClient() {
  const [date, setDate] = useState<string>(todayStr());
  const [visits, setVisits] = useState<ClassVisit[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(false);
  const [className, setClassName] = useState<string>("י' 3");
  const [subject, setSubject] = useState<string>("");
  const [duration, setDuration] = useState<string>("60");
  const [notes, setNotes] = useState<string>("");
  const [adding, startAdding] = useTransition();
  const [config, setConfig] = useState<LocalConfig>(() => readConfig());
  const [showSettings, setShowSettings] = useState(false);
  const [summary, setSummary] = useState<string>("");
  const [generating, startGenerating] = useTransition();

  const teamArray = useMemo(
    () =>
      config.team
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean),
    [config.team]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    let cancelled = false;
    const loadVisits = async () => {
      setLoadingVisits(true);
      setVisits([]);
      try {
        const res = await fetch(`/api/class-visits?date=${date}`);
        const json = await res.json().catch(() => null);
        if (!cancelled) setVisits(json?.ok ? json.visits : []);
      } finally {
        if (!cancelled) setLoadingVisits(false);
      }
    };

    void loadVisits();
    return () => {
      cancelled = true;
    };
  }, [date]);

  function addVisit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!className.trim() || !subject.trim()) {
      toast.error(he.dailySummary.errors.required);
      return;
    }
    startAdding(async () => {
      const res = await fetch("/api/class-visits", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          date,
          className: className.trim(),
          subject: subject.trim(),
          durationMinutes: Number.parseInt(duration, 10),
          notes: notes.trim() || null,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        toast.error(json?.error ?? he.dailySummary.errors.saveFailed);
        return;
      }
      setVisits((prev) => [json.visit, ...prev]);
      setSubject("");
      setNotes("");
      toast.success(he.dailySummary.toastVisitAdded);
    });
  }

  function deleteVisit(id: string) {
    const visit = visits.find((v) => v.id === id);
    if (!visit || visit.date !== date || loadingVisits) return;
    if (!window.confirm(he.dailySummary.deleteVisitConfirm)) return;
    const previous = visits;
    setVisits((prev) => prev.filter((v) => v.id !== id));
    fetch(`/api/class-visits/${id}`, { method: "DELETE" })
      .then((r) => r.json())
      .then((json) => {
        if (!json?.ok) {
          setVisits(previous);
          toast.error(he.dailySummary.errors.deleteFailed);
        } else {
          toast.success(he.dailySummary.toastVisitDeleted);
        }
      })
      .catch(() => {
        setVisits(previous);
        toast.error(he.dailySummary.errors.deleteFailed);
      });
  }

  function generate() {
    startGenerating(async () => {
      const params = new URLSearchParams({
        date,
        team: teamArray.join(","),
        programTitle: config.programTitle,
        schoolLine: config.schoolLine,
        greetingLine: config.greetingLine,
      });
      const res = await fetch(`/api/daily-summary?${params.toString()}`);
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        toast.error(json?.error ?? he.dailySummary.errors.generateFailed);
        return;
      }
      setSummary(json.text);
      toast.success(he.dailySummary.toastGenerated);
    });
  }

  async function copyToClipboard() {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary);
      toast.success(he.dailySummary.toastCopied);
    } catch {
      toast.error(he.dailySummary.errors.copyFailed);
    }
  }

  function shareWhatsApp() {
    if (!summary) return;
    const url = `https://wa.me/?text=${encodeURIComponent(summary)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {he.dailySummary.generateTitle}
            </CardTitle>
            <CardDescription>{he.dailySummary.generateDesc}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-auto"
            />
            <Button onClick={generate} disabled={generating} className="gap-1">
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
              {he.dailySummary.generateButton}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={he.dailySummary.settingsAria}
              onClick={() => setShowSettings((v) => !v)}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        {showSettings && (
          <CardContent className="grid grid-cols-1 gap-3 border-t border-border/60 pt-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="cfg-title">{he.dailySummary.cfgTitle}</Label>
              <Input
                id="cfg-title"
                value={config.programTitle}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, programTitle: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cfg-school">{he.dailySummary.cfgSchool}</Label>
              <Input
                id="cfg-school"
                value={config.schoolLine}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, schoolLine: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cfg-greet">{he.dailySummary.cfgGreeting}</Label>
              <Input
                id="cfg-greet"
                value={config.greetingLine}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, greetingLine: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cfg-team">{he.dailySummary.cfgTeam}</Label>
              <Input
                id="cfg-team"
                value={config.team}
                onChange={(e) => setConfig((c) => ({ ...c, team: e.target.value }))}
                placeholder={he.dailySummary.cfgTeamPh}
              />
            </div>
          </CardContent>
        )}
        <CardContent className="space-y-3">
          <Textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="min-h-[260px] whitespace-pre-wrap text-sm leading-relaxed"
            placeholder={he.dailySummary.placeholder}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={copyToClipboard} disabled={!summary} variant="secondary" className="gap-1">
              <Copy className="h-4 w-4" />
              {he.dailySummary.copy}
            </Button>
            <Button onClick={shareWhatsApp} disabled={!summary} className="gap-1">
              <MessageCircle className="h-4 w-4" />
              {he.dailySummary.shareWhatsApp}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{he.dailySummary.visitsTitle}</CardTitle>
          <CardDescription>{he.dailySummary.visitsDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            onSubmit={addVisit}
            className="grid grid-cols-1 gap-3 md:grid-cols-[120px_1fr_140px_auto]"
          >
            <div className="space-y-1">
              <Label htmlFor="vis-class">{he.dailySummary.fieldClass}</Label>
              <Input
                id="vis-class"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="י' 3"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="vis-subject">{he.dailySummary.fieldSubject}</Label>
              <Input
                id="vis-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder='מתמטיקה 5 יח"ל'
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="vis-duration">{he.dailySummary.fieldDuration}</Label>
              <select
                id="vis-duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-soft focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {DURATION_OPTIONS.map((m) => (
                  <option key={m} value={String(m)}>
                    {durationLabel(m)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={adding} className="w-full gap-1">
                {adding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {he.dailySummary.addVisit}
              </Button>
            </div>
            <div className="space-y-1 md:col-span-4">
              <Label htmlFor="vis-notes">{he.dailySummary.fieldNotes}</Label>
              <Input
                id="vis-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={he.dailySummary.fieldNotesPh}
              />
            </div>
          </form>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {he.dailySummary.visitsToday(date)}
            </p>
            {loadingVisits ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : visits.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {he.dailySummary.visitsEmpty}
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-border/60">
                {visits.map((v) => (
                  <li
                    key={v.id}
                    className="flex items-start justify-between gap-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {v.className} · {v.subject}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {durationLabel(v.durationMinutes)}
                        {v.notes ? ` · ${v.notes}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[11px]">
                        {durationLabel(v.durationMinutes)}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => deleteVisit(v.id)}
                        aria-label={he.dailySummary.deleteVisitAria}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
