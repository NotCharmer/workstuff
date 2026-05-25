import { getDefaultStaffPassword } from "@/lib/server-env";

export function resolveStaffPassword(provided?: string | null): string {
  const trimmed = provided?.trim();
  if (trimmed && trimmed.length >= 8) return trimmed;
  return getDefaultStaffPassword();
}
