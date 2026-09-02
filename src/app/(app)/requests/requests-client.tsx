"use client";

import { useMemo, useState, useTransition } from "react";
import {
  ClipboardList,
  GraduationCap,
  Loader2,
  Package,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetricCard } from "@/components/dashboard/metric-card";
import { he } from "@/lib/i18n/he";
import { cn } from "@/lib/utils";
import type { RequestKind, RequestStatus } from "@/lib/enums";

export type StudentOption = {
  id: string;
  name: string;
  className: string | null;
};

export type RequestRow = {
  id: string;
  kind: RequestKind;
  title: string;
  details: string | null;
  quantity: number | null;
  status: RequestStatus;
  createdAt: string;
  authorName: string | null;
  studentId: string | null;
  studentName: string | null;
  studentClassName: string | null;
};

type StatusFilter = "all" | RequestStatus;

function StudentPickers({
  idPrefix,
  studentLabel,
  classFilter,
  onClassChange,
  classes,
  studentId,
  onStudentChange,
  studentsInClass,
}: {
  idPrefix: string;
  studentLabel: string;
  classFilter: string;
  onClassChange: (value: string) => void;
  classes: string[];
  studentId: string;
  onStudentChange: (value: string) => void;
  studentsInClass: StudentOption[];
}) {
  return (
    <>
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-class`}>{he.requests.fieldClass}</Label>
        <select
          id={`${idPrefix}-class`}
          value={classFilter}
          onChange={(e) => onClassChange(e.target.value)}
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="">{he.requests.fieldClassAll}</option>
          {classes.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-student`}>{studentLabel}</Label>
        <select
          id={`${idPrefix}-student`}
          value={studentId}
          onChange={(e) => onStudentChange(e.target.value)}
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
        >
          {studentsInClass.length === 0 && <option value="">{he.requests.noStudent}</option>}
          {studentsInClass.map((s) => (
            <option key={s.id} value={s.id}>
              {s.className ? `${s.name} · ${s.className}` : s.name}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

function formatDateHe(iso: string) {
  return new Intl.DateTimeFormat("he-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function RequestsClient({
  students,
  initialRequests,
}: {
  students: StudentOption[];
  initialRequests: RequestRow[];
}) {
  const [requests, setRequests] = useState<RequestRow[]>(initialRequests);
  const [tab, setTab] = useState<RequestKind>("TUTORING");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [classFilter, setClassFilter] = useState("");
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [subject, setSubject] = useState("");
  const [tutoringDetails, setTutoringDetails] = useState("");

  const [item, setItem] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [equipmentDetails, setEquipmentDetails] = useState("");

  const [pending, startTransition] = useTransition();

  const classes = useMemo(() => {
    const set = new Set<string>();
    for (const s of students) {
      const c = s.className?.trim();
      if (c) set.add(c);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "he"));
  }, [students]);

  const studentsInClass = useMemo(() => {
    if (!classFilter) return students;
    return students.filter((s) => (s.className?.trim() ?? "") === classFilter);
  }, [students, classFilter]);

  const selectedStudentStillVisible = studentsInClass.some((s) => s.id === studentId);
  const effectiveStudentId = selectedStudentStillVisible
    ? studentId
    : studentsInClass[0]?.id ?? "";

  const tutoring = requests.filter((r) => r.kind === "TUTORING");
  const equipment = requests.filter((r) => r.kind === "EQUIPMENT");
  const openTutoring = tutoring.filter((r) => r.status === "OPEN").length;
  const openEquipment = equipment.filter((r) => r.status === "OPEN").length;
  const doneCount = requests.filter((r) => r.status === "DONE").length;

  function applyFilter(list: RequestRow[]) {
    const filtered =
      statusFilter === "all" ? list : list.filter((r) => r.status === statusFilter);
    return [...filtered].sort((a, b) => {
      if (a.status !== b.status) return a.status === "OPEN" ? -1 : 1;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }

  function submitTutoring(e: React.FormEvent) {
    e.preventDefault();
    if (!effectiveStudentId) {
      toast.error(he.requests.studentRequired);
      return;
    }
    const title = subject.trim();
    if (!title) {
      toast.error(he.requests.titleRequired);
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "TUTORING",
          studentId: effectiveStudentId,
          title,
          details: tutoringDetails.trim() || null,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        toast.error(json.error ?? he.requests.toastError);
        return;
      }
      setRequests((prev) => [mapApiRequest(json.request), ...prev]);
      setSubject("");
      setTutoringDetails("");
      toast.success(he.requests.toastAdded);
    });
  }

  function submitEquipment(e: React.FormEvent) {
    e.preventDefault();
    if (!effectiveStudentId) {
      toast.error(he.requests.studentRequired);
      return;
    }
    const title = item.trim();
    if (!title) {
      toast.error(he.requests.titleRequired);
      return;
    }
    const qty = Number.parseInt(quantity, 10);
    startTransition(async () => {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "EQUIPMENT",
          studentId: effectiveStudentId,
          title,
          quantity: Number.isFinite(qty) && qty >= 1 ? qty : 1,
          details: equipmentDetails.trim() || null,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        toast.error(json.error ?? he.requests.toastError);
        return;
      }
      setRequests((prev) => [mapApiRequest(json.request), ...prev]);
      setItem("");
      setQuantity("1");
      setEquipmentDetails("");
      toast.success(he.requests.toastAdded);
    });
  }

  async function toggleStatus(row: RequestRow) {
    const next: RequestStatus = row.status === "OPEN" ? "DONE" : "OPEN";
    setRequests((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: next } : r)));
    const res = await fetch(`/api/requests/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (!res.ok) {
      setRequests((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: row.status } : r)));
      toast.error(he.requests.toastError);
      return;
    }
    toast.success(he.requests.toastUpdated);
  }

  async function remove(row: RequestRow) {
    if (!window.confirm(he.requests.deleteConfirm)) return;
    setRequests((prev) => prev.filter((r) => r.id !== row.id));
    const res = await fetch(`/api/requests/${row.id}`, { method: "DELETE" });
    if (!res.ok) {
      setRequests((prev) => [row, ...prev]);
      toast.error(he.requests.toastError);
      return;
    }
    toast.success(he.requests.toastDeleted);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {he.requests.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{he.requests.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          label={he.requests.tabTutoring}
          value={openTutoring}
          hint={he.requests.openFilter}
          icon={GraduationCap}
          tone="info"
        />
        <MetricCard
          label={he.requests.tabEquipment}
          value={openEquipment}
          hint={he.requests.openFilter}
          icon={Package}
          tone="warning"
        />
        <MetricCard
          label={he.requests.doneCount}
          value={doneCount}
          hint={he.requests.statusDone}
          icon={ClipboardList}
          tone="success"
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as RequestKind)}>
        <TabsList>
          <TabsTrigger value="TUTORING">{he.requests.tabTutoring}</TabsTrigger>
          <TabsTrigger value="EQUIPMENT">{he.requests.tabEquipment}</TabsTrigger>
        </TabsList>

        <TabsContent value="TUTORING" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{he.requests.tutoringFormTitle}</CardTitle>
              <CardDescription>{he.requests.tutoringFormDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitTutoring} className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <StudentPickers
                  idPrefix="tutoring"
                  studentLabel={he.requests.fieldStudent}
                  classFilter={classFilter}
                  onClassChange={setClassFilter}
                  classes={classes}
                  studentId={effectiveStudentId}
                  onStudentChange={setStudentId}
                  studentsInClass={studentsInClass}
                />
                <div className="space-y-1">
                  <Label htmlFor="req-subject">{he.requests.fieldSubject}</Label>
                  <Input
                    id="req-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={he.requests.fieldSubjectPh}
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor="req-tutoring-details">{he.requests.fieldDetails}</Label>
                  <Textarea
                    id="req-tutoring-details"
                    value={tutoringDetails}
                    onChange={(e) => setTutoringDetails(e.target.value)}
                    placeholder={he.requests.fieldDetailsPh}
                  />
                </div>
                <div>
                  <Button type="submit" disabled={pending}>
                    {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {he.requests.addTutoring}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
          <RequestList
            title={he.requests.listTutoringTitle}
            emptyTitle={he.requests.emptyTutoring}
            emptyDesc={he.requests.emptyTutoringDesc}
            items={applyFilter(tutoring)}
            statusFilter={statusFilter}
            onStatusFilter={setStatusFilter}
            onToggle={toggleStatus}
            onDelete={remove}
            kind="TUTORING"
          />
        </TabsContent>

        <TabsContent value="EQUIPMENT" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{he.requests.equipmentFormTitle}</CardTitle>
              <CardDescription>{he.requests.equipmentFormDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitEquipment} className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <StudentPickers
                  idPrefix="equipment"
                  studentLabel={he.requests.fieldCadet}
                  classFilter={classFilter}
                  onClassChange={setClassFilter}
                  classes={classes}
                  studentId={effectiveStudentId}
                  onStudentChange={setStudentId}
                  studentsInClass={studentsInClass}
                />
                <div className="space-y-1">
                  <Label htmlFor="req-item">{he.requests.fieldItem}</Label>
                  <Input
                    id="req-item"
                    value={item}
                    onChange={(e) => setItem(e.target.value)}
                    placeholder={he.requests.fieldItemPh}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="req-qty">{he.requests.fieldQuantity}</Label>
                  <Input
                    id="req-qty"
                    type="number"
                    min={1}
                    max={999}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor="req-eq-details">{he.requests.fieldDetails}</Label>
                  <Textarea
                    id="req-eq-details"
                    value={equipmentDetails}
                    onChange={(e) => setEquipmentDetails(e.target.value)}
                    placeholder={he.requests.fieldDetailsPh}
                  />
                </div>
                <div>
                  <Button type="submit" disabled={pending}>
                    {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {he.requests.addEquipment}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
          <RequestList
            title={he.requests.listEquipmentTitle}
            emptyTitle={he.requests.emptyEquipment}
            emptyDesc={he.requests.emptyEquipmentDesc}
            items={applyFilter(equipment)}
            statusFilter={statusFilter}
            onStatusFilter={setStatusFilter}
            onToggle={toggleStatus}
            onDelete={remove}
            kind="EQUIPMENT"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function mapApiRequest(r: {
  id: string;
  kind: string;
  title: string;
  details: string | null;
  quantity: number | null;
  status: string;
  createdAt: string | Date;
  author?: { name: string } | null;
  student?: { id: string; firstName: string; lastName: string; className: string | null } | null;
}): RequestRow {
  return {
    id: r.id,
    kind: r.kind === "EQUIPMENT" ? "EQUIPMENT" : "TUTORING",
    title: r.title,
    details: r.details,
    quantity: r.quantity,
    status: r.status === "DONE" ? "DONE" : "OPEN",
    createdAt: typeof r.createdAt === "string" ? r.createdAt : r.createdAt.toISOString(),
    authorName: r.author?.name ?? null,
    studentId: r.student?.id ?? null,
    studentName: r.student ? `${r.student.firstName} ${r.student.lastName}` : null,
    studentClassName: r.student?.className ?? null,
  };
}

function RequestList({
  title,
  emptyTitle,
  emptyDesc,
  items,
  statusFilter,
  onStatusFilter,
  onToggle,
  onDelete,
  kind,
}: {
  title: string;
  emptyTitle: string;
  emptyDesc: string;
  items: RequestRow[];
  statusFilter: StatusFilter;
  onStatusFilter: (v: StatusFilter) => void;
  onToggle: (row: RequestRow) => void;
  onDelete: (row: RequestRow) => void;
  kind: RequestKind;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>{title}</CardTitle>
        <div className="flex flex-wrap gap-2">
          {(["all", "OPEN", "DONE"] as const).map((key) => (
            <Button
              key={key}
              type="button"
              size="sm"
              variant={statusFilter === key ? "default" : "outline"}
              onClick={() => onStatusFilter(key)}
            >
              {key === "all"
                ? he.requests.allFilter
                : key === "OPEN"
                  ? he.requests.openFilter
                  : he.requests.doneFilter}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState
            icon={kind === "TUTORING" ? GraduationCap : Package}
            title={emptyTitle}
            description={emptyDesc}
            className="border-0 shadow-none"
          />
        ) : (
          <ul className="divide-y divide-border/60">
            {items.map((row) => (
              <li
                key={row.id}
                className={cn(
                  "flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between",
                  row.status === "DONE" && "opacity-70"
                )}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">
                      {kind === "EQUIPMENT" && row.quantity
                        ? `${row.title} ${he.requests.quantityLabel(row.quantity)}`
                        : row.title}
                    </p>
                    <Badge variant={row.status === "OPEN" ? "info" : "secondary"}>
                      {row.status === "OPEN" ? he.requests.statusOpen : he.requests.statusDone}
                    </Badge>
                  </div>
                  {(kind === "TUTORING" || row.studentName) && (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {row.studentName ?? he.requests.noStudent}
                      {row.studentClassName ? ` · ${row.studentClassName}` : ""}
                    </p>
                  )}
                  {row.details && (
                    <p className="mt-1 text-sm text-muted-foreground">{row.details}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateHe(row.createdAt)}
                    {row.authorName ? ` · ${he.requests.byAuthor(row.authorName)}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={() => onToggle(row)}>
                    {row.status === "OPEN" ? he.requests.markDone : he.requests.markOpen}
                  </Button>
                  <button
                    type="button"
                    aria-label={he.requests.deleteAria}
                    onClick={() => onDelete(row)}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
