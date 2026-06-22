import { getServerSession } from "next-auth/next";
import type { UserRole, UserStatus } from "./enums";
import { authOptions } from "./auth-options";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  onboardingCompleted: boolean;
  branchId: string | null;
  branchCode: string | null;
  branchName: string | null;
};

export class AuthError extends Error {
  status: number;
  constructor(message = "Unauthorized", status = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

type GetCurrentUserOptions = {
  allowInactive?: boolean;
};

export async function getCurrentUser(options: GetCurrentUserOptions = {}): Promise<CurrentUser> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email || !session.user.name) {
    throw new AuthError("Unauthorized", 401);
  }
  const user = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role ?? "STAFF",
    status: session.user.status ?? "PENDING",
    onboardingCompleted: session.user.onboardingCompleted ?? false,
    branchId: session.user.branchId ?? null,
    branchCode: session.user.branchCode ?? null,
    branchName: session.user.branchName ?? null,
  };
  if (!options.allowInactive && user.status !== "ACTIVE") {
    throw new AuthError("Account pending approval", 403);
  }
  return user;
}

export async function requireRole(roles: UserRole[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (user.status !== "ACTIVE") {
    throw new AuthError("Account pending approval", 403);
  }
  if (!roles.includes(user.role)) {
    throw new AuthError("Forbidden", 403);
  }
  return user;
}

export async function getCurrentUserOrRedirect(): Promise<CurrentUser> {
  try {
    return await getCurrentUser();
  } catch (error) {
    if (error instanceof AuthError && error.status === 401) {
      const { redirect } = await import("next/navigation");
      redirect("/login");
    }
    throw error;
  }
}
