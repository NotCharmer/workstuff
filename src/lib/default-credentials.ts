import { getDefaultStaffPassword } from "@/lib/server-env";

/**
 * Accounts created before custom temporary passwords became mandatory may
 * still have the shared, publicly documented first-login password.
 */
export function isLegacySharedStaffPassword(password: string): boolean {
  return password === getDefaultStaffPassword();
}
