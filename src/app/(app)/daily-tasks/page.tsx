"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
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

type TaskAuthor = { id: string; name: string } | null;
type Task = {
  id: string;
  title: string;
  done: boolean;
  date: string;
  assigneeId: string | null;
  authorId: string | null;
  author?: TaskAuthor;
  assignee?: TaskAuthor;
};

type Assignee = { id: string; name: string; email: string; role: string };

type ManagerTab = "general" | "personal";

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

function doneStats(tasks: Task[]) {
  const doneCount = tasks.filter((t) => t.done).length;
  const totalCount = tasks.length;
  const allDone = totalCount > 0 && doneCount === totalCount;
  return { doneCount, totalCount, allDone };
}

function TaskList({
  tasks,
  loading,
  isFuture,
  emptyTitle,
  emptyDesc,
  currentUserId,
  onToggle,
  onDelete,
}: {
  tasks: Task[];
  loading: boolean;
  isFuture: boolean;
  emptyTitle: string;
  emptyDesc?: string;
  currentUserId: string | null;
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        title={emptyTitle}
        description={isFuture ? undefined : emptyDesc}
        className="border-0 shadow-none"
      />
    );
  }

  return (
    <ul className="space-y-2" dir="rtl">
      {tasks.map((task) => {
        const assignedByOther =
          task.assigneeId &&
          task.author?.id &&
          task.author.id !== task.assigneeId;
        return (
          <li
            key={task.id}
            className={cn(
              "group flex items-center gap-3 rounded-xl border border-border/60 px-4 py-3 transition-colors",
              task.done ? "bg-muted/40 text-muted-foreground" : "bg-card hover:bg-secondary/40"
            )}
          >
            <button
              type="button"
              aria-label={task.done ? "סמן כלא בוצע" : "סמן כבוצע"}
              onClick={() => onToggle(task)}
              disabled={isFuture}
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                task.done
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted-foreground/40 hover:border-primary",
                isFuture && "cursor-not-allowed opacity-50"
              )}
            >
              {task.done && (
                <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 fill-none stroke-current stroke-2">
                  <polyline points="1,4 4,7 9,1" />
                </svg>
              )}
            </button>

            <div className="min-w-0 flex-1">
              <span className={cn("block text-sm leading-snug", task.done && "line-through")}>
                {task.title}
              </span>
              {assignedByOther && task.author?.name && (
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  {he.dailyTasks.assignedBy(task.author.name)}
                </span>
              )}
            </div>

            <button
              type="button"
              aria-label={he.dailyTasks.deleteTask}
              onClick={() => onDelete(task)}
              className="invisible h-6 w-6 shrink-0 rounded-md text-muted-foreground/50 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:visible"
            >
              <Trash2 className="mx-auto h-3.5 w-3.5" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function TaskSection({
  title,
  description,
  tasks,
  loading,
  isFuture,
  emptyTitle,
  emptyDesc,
  placeholder,
  newTitle,
  setNewTitle,
  onAdd,
  adding,
  onToggle,
  onDelete,
}: {
  title: string;
  description?: string;
  tasks: Task[];
  loading: boolean;
  isFuture: boolean;
  emptyTitle: string;
  emptyDesc?: string;
  placeholder: string;
  newTitle: string;
  setNewTitle: (v: string) => void;
  onAdd: (e: React.FormEvent) => void;
  adding: boolean;
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  const { doneCount, totalCount, allDone } = doneStats(tasks);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            {description && <CardDescription className="mt-1">{description}</CardDescription>}
          </div>
          {totalCount > 0 && (
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
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
      <CardContent className="space-y-4">
        <form onSubmit={onAdd} className="flex gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={placeholder}
            disabled={adding || isFuture}
            className={cn(
              "flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            )}
            dir="rtl"
          />
          <Button type="submit" disabled={adding || !newTitle.trim() || isFuture}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span>{adding ? he.dailyTasks.adding : he.dailyTasks.addButton}</span>
          </Button>
        </form>

        <TaskList
          tasks={tasks}
          loading={loading}
          isFuture={isFuture}
          emptyTitle={emptyTitle}
          emptyDesc={emptyDesc}
          currentUserId={null}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      </CardContent>
    </Card>
  );
}

export default function DailyTasksPage() {
  const todayStr = toDateStr(new Date());
  const [date, setDate] = useState(todayStr);
  const [generalTasks, setGeneralTasks] = useState<Task[]>([]);
  const [personalTasks, setPersonalTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [managerTab, setManagerTab] = useState<ManagerTab>("general");
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>("");
  const [newGeneralTitle, setNewGeneralTitle] = useState("");
  const [newPersonalTitle, setNewPersonalTitle] = useState("");
  const [addingGeneral, startAddingGeneral] = useTransition();
  const [addingPersonal, startAddingPersonal] = useTransition();

  const isToday = date === todayStr;
  const isFuture = date > todayStr;

  const selectedAssignee = assignees.find((a) => a.id === selectedAssigneeId);

  const fetchTasks = useCallback(
    async (d: string, options?: { scope?: string; assigneeId?: string }) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ date: d });
        if (options?.scope) params.set("scope", options.scope);
        if (options?.assigneeId) params.set("assigneeId", options.assigneeId);

        const res = await fetch(`/api/daily-tasks?${params}`);
        const json = await res.json();
        if (json.ok) {
          setGeneralTasks(json.general ?? []);
          setPersonalTasks(json.personal ?? []);
          setCanManage(Boolean(json.canManage));
          setCurrentUserId(json.userId ?? null);
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!canManage) return;
    fetch("/api/daily-tasks/assignees")
      .then((res) => res.json())
      .then((json) => {
        if (json.ok && json.assignees?.length) {
          setAssignees(json.assignees);
          setSelectedAssigneeId((prev) => prev || json.assignees[0].id);
        }
      })
      .catch(() => toast.error(he.dailyTasks.assigneeLoadFailed));
  }, [canManage]);

  useEffect(() => {
    if (canManage && managerTab === "personal" && selectedAssigneeId) {
      void fetchTasks(date, { scope: "personal", assigneeId: selectedAssigneeId });
      return;
    }
    if (canManage && managerTab === "general") {
      void fetchTasks(date, { scope: "general" });
      return;
    }
    if (!canManage) {
      void fetchTasks(date);
    }
  }, [date, canManage, managerTab, selectedAssigneeId, fetchTasks]);

  async function patchTask(task: Task, done: boolean) {
    const res = await fetch(`/api/daily-tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done }),
    });
    if (!res.ok) {
      toast.error(he.dailyTasks.toastError);
      return false;
    }
    return true;
  }

  function updateTaskInLists(task: Task, updater: (t: Task) => Task) {
    const apply = (list: Task[]) => list.map((t) => (t.id === task.id ? updater(t) : t));
    setGeneralTasks((prev) => apply(prev));
    setPersonalTasks((prev) => apply(prev));
  }

  function removeTaskFromLists(task: Task) {
    setGeneralTasks((prev) => prev.filter((t) => t.id !== task.id));
    setPersonalTasks((prev) => prev.filter((t) => t.id !== task.id));
  }

  async function handleToggle(task: Task) {
    const nextDone = !task.done;
    updateTaskInLists(task, (t) => ({ ...t, done: nextDone }));
    const ok = await patchTask(task, nextDone);
    if (!ok) {
      updateTaskInLists(task, (t) => ({ ...t, done: task.done }));
    }
  }

  async function handleDelete(task: Task) {
    removeTaskFromLists(task);
    const res = await fetch(`/api/daily-tasks/${task.id}`, { method: "DELETE" });
    if (!res.ok) {
      if (task.assigneeId) {
        setPersonalTasks((prev) => [...prev, task]);
      } else {
        setGeneralTasks((prev) => [...prev, task]);
      }
      toast.error(he.dailyTasks.toastError);
    } else {
      toast.success(he.dailyTasks.toastDeleted);
    }
  }

  function handleAddGeneral(e: React.FormEvent) {
    e.preventDefault();
    const title = newGeneralTitle.trim();
    if (!title) return;
    startAddingGeneral(async () => {
      const res = await fetch("/api/daily-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, date, assigneeId: null }),
      });
      const json = await res.json();
      if (json.ok) {
        setGeneralTasks((prev) => [...prev, json.task]);
        setNewGeneralTitle("");
        toast.success(he.dailyTasks.toastAdded);
      } else {
        toast.error(json.error ?? he.dailyTasks.toastError);
      }
    });
  }

  function handleAddPersonal(e: React.FormEvent) {
    e.preventDefault();
    const title = newPersonalTitle.trim();
    if (!title) return;

    const assigneeId =
      canManage && managerTab === "personal" && selectedAssigneeId
        ? selectedAssigneeId
        : currentUserId;

    if (!assigneeId) return;

    startAddingPersonal(async () => {
      const res = await fetch("/api/daily-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, date, assigneeId }),
      });
      const json = await res.json();
      if (json.ok) {
        setPersonalTasks((prev) => [...prev, json.task]);
        setNewPersonalTitle("");
        toast.success(he.dailyTasks.toastAdded);
      } else {
        toast.error(json.error ?? he.dailyTasks.toastError);
      }
    });
  }

  const showStaffLayout = !canManage;
  const showManagerGeneral = canManage && managerTab === "general";
  const showManagerPersonal = canManage && managerTab === "personal";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {he.dailyTasks.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {canManage ? he.dailyTasks.subtitle : he.dailyTasks.subtitleStaff}
          </p>
        </div>

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

      {canManage && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={managerTab === "general" ? "default" : "outline"}
            size="sm"
            onClick={() => setManagerTab("general")}
          >
            {he.dailyTasks.tabGeneral}
          </Button>
          <Button
            type="button"
            variant={managerTab === "personal" ? "default" : "outline"}
            size="sm"
            onClick={() => setManagerTab("personal")}
          >
            {he.dailyTasks.tabPersonal}
          </Button>
        </div>
      )}

      {showManagerPersonal && assignees.length > 0 && (
        <div className="max-w-md space-y-1">
          <label htmlFor="assignee" className="text-sm font-medium">
            {he.dailyTasks.selectEmployee}
          </label>
          <select
            id="assignee"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={selectedAssigneeId}
            onChange={(e) => setSelectedAssigneeId(e.target.value)}
          >
            {assignees.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {(showStaffLayout || showManagerGeneral) && (
        <TaskSection
          title={he.dailyTasks.generalTitle}
          description={he.dailyTasks.generalSubtitle}
          tasks={generalTasks}
          loading={loading}
          isFuture={isFuture}
          emptyTitle={he.dailyTasks.generalEmptyTitle}
          emptyDesc={he.dailyTasks.generalEmptyDesc}
          placeholder={he.dailyTasks.addGeneralPlaceholder}
          newTitle={newGeneralTitle}
          setNewTitle={setNewGeneralTitle}
          onAdd={handleAddGeneral}
          adding={addingGeneral}
          onToggle={handleToggle}
          onDelete={handleDelete}
        />
      )}

      {(showStaffLayout || showManagerPersonal) && (
        <TaskSection
          title={
            canManage && selectedAssignee
              ? he.dailyTasks.personalSubtitle(selectedAssignee.name)
              : he.dailyTasks.personalTitleMine
          }
          description={canManage ? undefined : he.dailyTasks.personalTitle}
          tasks={personalTasks}
          loading={loading}
          isFuture={isFuture}
          emptyTitle={he.dailyTasks.personalEmptyTitle}
          emptyDesc={he.dailyTasks.personalEmptyDesc}
          placeholder={
            canManage && selectedAssignee
              ? he.dailyTasks.addPersonalForPlaceholder(selectedAssignee.name)
              : he.dailyTasks.addPersonalPlaceholder
          }
          newTitle={newPersonalTitle}
          setNewTitle={setNewPersonalTitle}
          onAdd={handleAddPersonal}
          adding={addingPersonal}
          onToggle={handleToggle}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
