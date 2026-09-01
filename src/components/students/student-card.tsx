import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { avatarGradient, formatGrade, gradeBadgeTone, initials } from "@/lib/utils";
import { he } from "@/lib/i18n/he";
import { StudentDeleteButton } from "@/components/students/student-delete-button";
import { StudentGenderSelect } from "@/components/students/student-gender-select";

export type StudentCardData = {
  id: string;
  firstName: string;
  lastName: string;
  externalId: string | null;
  className: string | null;
  gender: "MALE" | "FEMALE" | null;
  avatarHue: number;
  gradeCount: number;
  average: number | null;
  subjects: string[];
  latestGrade?: { value: number; subject: string } | null;
};

export function StudentCard({
  student,
  year,
}: {
  student: StudentCardData;
  year?: string;
}) {
  const name = `${student.firstName} ${student.lastName}`;
  const href = year ? `/students/${student.id}?year=${encodeURIComponent(year)}` : `/students/${student.id}`;

  return (
    <article className="group relative flex flex-col rounded-2xl border border-border/60 bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-glow">
      <Link href={href} className="absolute inset-0 z-0 rounded-2xl">
        <span className="sr-only">{name}</span>
      </Link>
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="h-11 w-11">
            <AvatarFallback
              className="text-sm font-semibold"
              style={{ background: avatarGradient(student.avatarHue) }}
            >
              {initials(student.firstName, student.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-semibold leading-tight">{name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {student.externalId ?? "—"}
              {student.className && ` · ${student.className}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <StudentDeleteButton studentId={student.id} studentName={name} />
          <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
        </div>
      </div>

      <div className="relative z-10 mt-4 flex items-end justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{he.studentCard.average}</p>
          <p className="font-display text-2xl font-semibold tracking-tight">
            {student.average !== null ? formatGrade(student.average) : "—"}
          </p>
        </div>
        <div className="text-end">
          <p className="text-xs text-muted-foreground">{he.studentCard.grades}</p>
          <p className="font-display text-lg font-semibold tracking-tight">
            {student.gradeCount}
          </p>
        </div>
      </div>

      <div className="relative z-10 mt-4 flex flex-wrap gap-1.5">
        <div className="w-full">
          <StudentGenderSelect studentId={student.id} initialGender={student.gender} compact />
        </div>
        {student.subjects.slice(0, 3).map((s) => (
          <Badge key={s} variant="secondary" className="text-[11px] font-medium">
            {s}
          </Badge>
        ))}
        {student.subjects.length > 3 && (
          <Badge variant="outline" className="text-[11px]">
            +{student.subjects.length - 3}
          </Badge>
        )}
      </div>

      {student.latestGrade && student.average !== null && (
        <div className="relative z-10 mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs">
          <span className="text-muted-foreground">
            {he.studentCard.latest} · {student.latestGrade.subject}
          </span>
          <Badge variant={gradeBadgeTone(student.latestGrade.value) as any}>
            {formatGrade(student.latestGrade.value)}
          </Badge>
        </div>
      )}
    </article>
  );
}
