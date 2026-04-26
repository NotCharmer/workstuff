import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
}) {
  const toneClasses: Record<string, string> = {
    default: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    danger: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    info: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  };

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-glow",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 font-display text-3xl font-semibold tracking-tight">
            {value}
          </p>
          {hint && (
            <p className="mt-1.5 truncate text-xs text-muted-foreground">{hint}</p>
          )}
        </div>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110",
            toneClasses[tone]
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
