"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  Loader2,
  Plus,
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
import { EmptyState } from "@/components/ui/empty-state";
import { he } from "@/lib/i18n/he";
import { cn } from "@/lib/utils";

type Task = { id: string; title: string; done: boolean; date: string };

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

function formatDateHe(dateStr: string) {
  return new Intl.DateTimeFormat("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(dateStr + "T00:00:00"));
}

export default function DailyTasksPage() {
  const todayStr = toDateStr(new Date());
  const [date, setDate] = useState(todayStr);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [adding, startAdding] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const isToday = date === todayStr;
  const isFuture = date > todayStr;

  const fetchTasks = useCallback(async (d: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/daily-tasks?date=${d}`);
      const json = await res.json();
      if (json.ok) setTasks(json.tasks);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks(date);
  }, [date, fetchTasks]);

  function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    startAdding(async () => {
      const res = await fetch("/api/daily-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, date }),
      });
      const json = await res.json();
      if (json.ok) {
        setTasks((prev) => [...prev, json.task]);
        setNewTitle("");
        inputRef.current?.focus();
        toast.success(he.dailyTasks.toastAdded);
      } else {
        toast.error(he.dailyTasks.toastError);
      }
    });
  }

  async function handleToggle(task: Task) {
    const optimistic = tasks.map((t) =>
      t.id === task.id ? { ...t, done: !t.done } : t
    );
    setTasks(optimistic);
    const res = await fetch(`/api/daily-tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !task.done }),
    });
    if (!res.ok) {
      setTasks(tasks);
      toast.error(he.dailyTasks.toastError);
    }
  }

  async function handleDelete(task: Task) {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    const res = await fetch(`/api/daily-tasks/${task.id}`, { method: "DELETE" });
    if (!res.ok) {
      setTasks((prev) => [...prev, task]);
      toast.error(he.dailyTasks.toastError);
    } else {
      toast.success(he.dailyTasks.toastDeleted);
    }
  }

  const doneCount = tasks.filter((t) => t.done).length;
  const totalCount = tasks.length;
  const allDone = totalCount > 0 && doneCount === totalCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {he.dailyTasks.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{he.dailyTasks.subtitle}</p>
        </div>

        {/* Date navigation */}
        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setDate((d) => addDays(d, -1))}
            title={he.dailyTasks.prevDay}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <div className="flex min-w-0 flex-1 items-center gap-1.5 px-2 text-sm">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="font-medium text-foreground">{formatDateHe(date)}</span>
            {isToday && (
              <span className="ms-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                {he.dailyTasks.today}
              </span>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            disabled={isToday}
            onClick={() => setDate((d) => addDays(d, 1))}
            title={he.dailyTasks.nextDay}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isToday && (
        <Button variant="outline" size="sm" onClick={() => setDate(todayStr)}>
          {he.dailyTasks.backToToday}
        </Button>
      )}

      {/* Add task form */}
      <Card>
        <CardContent className="pt-5">
          <form onSubmit={handleAddTask} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={he.dailyTasks.addPlaceholder}
              disabled={adding || isFuture}
              className={cn(
                "flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              )}
              dir="rtl"
            />
            <Button type="submit" disabled={adding || !newTitle.trim() || isFuture}>
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              <span>{adding ? he.dailyTasks.adding : he.dailyTasks.addButton}</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Task list */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle>{formatDateHe(date)}</CardTitle>
            {totalCount > 0 && (
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                  allDone
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                    : "bg-primary/10 text-primary"
                )}
              >
                {allDone ? he.dailyTasks.allDone : he.dailyTasks.doneCount(doneCount, totalCount)}
              </span>
            )}
          </div>
          {totalCount > 0 && (
            <CardDescription>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${(doneCount / totalCount) * 100}%` }}
                />
              </div>
            </CardDescription>
          )}
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : tasks.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title={he.dailyTasks.emptyTitle}
              description={isFuture ? undefined : he.dailyTasks.emptyDesc}
              className="border-0 shadow-none"
            />
          ) : (
            <ul className="space-y-2" dir="rtl">
              {tasks.map((task) => (
                <li
                  key={task.id}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl border border-border/60 px-4 py-3 transition-colors",
                    task.done
                      ? "bg-muted/40 text-muted-foreground"
                      : "bg-card hover:bg-secondary/40"
                  )}
                >
                  {/* Checkbox */}
                  <button
                    type="button"
                    aria-label={task.done ? "סמן כלא בוצע" : "סמן כבוצע"}
                    onClick={() => handleToggle(task)}
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                      task.done
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/40 hover:border-primary"
                    )}
                  >
                    {task.done && (
                      <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 fill-none stroke-current stroke-2">
                        <polyline points="1,4 4,7 9,1" />
                      </svg>
                    )}
                  </button>

                  <span
                    className={cn(
                      "flex-1 text-sm leading-snug",
                      task.done && "line-through"
                    )}
                  >
                    {task.title}
                  </span>

                  {/* Delete */}
                  <button
                    type="button"
                    aria-label={he.dailyTasks.deleteTask}
                    onClick={() => handleDelete(task)}
                    className="invisible h-6 w-6 shrink-0 rounded-md text-muted-foreground/50 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:visible"
                  >
                    <Trash2 className="mx-auto h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
