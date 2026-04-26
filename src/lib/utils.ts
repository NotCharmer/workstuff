import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(first: string, last?: string | null) {
  const f = (first ?? "").trim();
  const l = (last ?? "").trim();
  const a = f[0] ?? "";
  const b = l[0] ?? f[1] ?? "";
  return (a + b).toUpperCase() || "?";
}

export function formatGrade(value: number) {
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(1);
}

export function gradeColor(value: number) {
  if (value >= 90) return "text-emerald-600 dark:text-emerald-400";
  if (value >= 75) return "text-sky-600 dark:text-sky-400";
  if (value >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

export function gradeBadgeTone(value: number) {
  if (value >= 90) return "success";
  if (value >= 75) return "info";
  if (value >= 60) return "warning";
  return "danger";
}

export function avatarGradient(hue: number) {
  const a = hue % 360;
  const b = (hue + 45) % 360;
  return `linear-gradient(135deg, hsl(${a} 75% 60%), hsl(${b} 70% 50%))`;
}

export function percent(n: number, d: number) {
  if (!d) return 0;
  return Math.round((n / d) * 100);
}

export function assertOk<T>(v: T | null | undefined, message = "Not found"): T {
  if (v === null || v === undefined) throw new Error(message);
  return v;
}
