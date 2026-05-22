import { getServerSession } from "next-auth/next";
import type { UserRole, UserStatus } from "./enums";
import { authOptions } from "./auth-options";
import { prisma } from "./db";
import { USER_ROLES, USER_STATUSES } from "./enums";

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

const roleSet = new Set<string>(USER_ROLES);
const statusSet = new Set<string>(USER_STATUSES);

type GetCurrentUserOptions = {
  allowInactive?: boolean;
};

export async function getCurrentUser(options: GetCurrentUserOptions = {}): Promise<CurrentUser> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new AuthError("Unauthorized", 401);
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { branch: true },
  });
  if (!dbUser) {
    throw new AuthError("Unauthorized", 401);
  }

  const role: UserRole = roleSet.has(dbUser.role) ? (dbUser.role as UserRole) : "STAFF";
  const status: UserStatus = statusSet.has(dbUser.status)
    ? (dbUser.status as UserStatus)
    : "PENDING";

  const user: CurrentUser = {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role,
    status,
    onboardingCompleted: dbUser.onboardingCompleted,
    branchId: dbUser.branchId ?? null,
    branchCode: dbUser.branch?.code ?? null,
    branchName: dbUser.branch?.name ?? null,
  };

  if (!options.allowInactive) {
    if (!user.onboardingCompleted) {
      throw new AuthError("Onboarding required", 403);
    }
    if (user.status !== "ACTIVE") {
      throw new AuthError("Account pending approval", 403);
    }
  }

  return user;
}

export async function requireActiveUser(): Promise<CurrentUser> {
  return getCurrentUser();
}

export async function requireRole(roles: UserRole[]): Promise<CurrentUser> {
  const user = await requireActiveUser();
  if (!roles.includes(user.role)) {
    throw new AuthError("Forbidden", 403);
  }
  return user;
}

export async function getCurrentUserOrRedirect(): Promise<CurrentUser> {
  try {
    const user = await getCurrentUser({ allowInactive: true });
    if (!user.onboardingCompleted) {
      const { redirect } = await import("next/navigation");
      redirect("/onboarding");
    }
    if (user.status !== "ACTIVE") {
      const { redirect } = await import("next/navigation");
      redirect("/pending-approval");
    }
    if (user.role !== "ADMIN" && !user.branchId) {
      const { redirect } = await import("next/navigation");
      redirect("/pending-approval");
    }
    return user;
  } catch (error) {
    if (error instanceof AuthError && error.status === 401) {
      const { redirect } = await import("next/navigation");
      redirect("/login");
    }
    throw error;
  }
}
