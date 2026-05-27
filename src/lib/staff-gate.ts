import { createHmac, timingSafeEqual } from "node:crypto";
import { getDefaultStaffPassword, getStaffGateEmail, getStaffGatePassword } from "@/lib/server-env";

const AUTH_SECRET =
  process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "dev-only-secret-change-me";

export const STAFF_GATE_COOKIE = "staff_gate";
export const STAFF_GATE_MAX_AGE_SEC = 30 * 60;

export function isStaffGateEmail(email: string): boolean {
  return email.trim().toLowerCase() === getStaffGateEmail().toLowerCase();
}

export function verifyStaffGateCredentials(email: string, password: string): boolean {
  return (
    isStaffGateEmail(email) &&
    password === getStaffGatePassword()
  );
}

export function createStaffGateToken(): string {
  const exp = Date.now() + STAFF_GATE_MAX_AGE_SEC * 1000;
  const sig = createHmac("sha256", AUTH_SECRET).update(`staff-gate:${exp}`).digest("hex");
  return `${exp}.${sig}`;
}

export function verifyStaffGateToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const [expStr, sig] = token.split(".");
  if (!expStr || !sig) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const expected = createHmac("sha256", AUTH_SECRET).update(`staff-gate:${exp}`).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(sig, "utf8"), Buffer.from(expected, "utf8"));
  } catch {
    return false;
  }
}

export function staffGateCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: STAFF_GATE_MAX_AGE_SEC,
  };
}

/** Email reserved for the shared entry gate — not a real user account. */
export function isReservedStaffGateEmail(email: string): boolean {
  return isStaffGateEmail(email);
}

export function getStaffGateHintPassword(): string {
  return getDefaultStaffPassword();
}
