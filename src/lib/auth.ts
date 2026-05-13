import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/db";
import type { UserRole, UserStatus } from "./enums";
import { authOptions } from "./auth-options";

/** When true, `next dev` still uses real NextAuth (login required). */
function isLocalAuthEnabled(): boolean {
  return process.env.NODE_ENV === "development" && process.env.ENABLE_LOCAL_AUTH === "true";
}

function isLocalAuthBypass(): boolean {
  return process.env.NODE_ENV === "development" && !isLocalAuthEnabled();
}

async function resolveLocalDevUser(): Promise<CurrentUser> {
  const branch = await prisma.branch.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true, code: true, name: true },
  });
  return {
    id: "__local_dev__",
    email: "dev@local.test",
    name: "Local Developer",
    role: "ADMIN",
    status: "ACTIVE",
    onboardingCompleted: true,
    branchId: branch?.id ?? null,
    branchCode: branch?.code ?? null,
    branchName: branch?.name ?? null,
  };
}

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

export async function getCurrentUser(): Promise<CurrentUser> {
  if (isLocalAuthBypass()) {
    try {
      return await resolveLocalDevUser();
    } catch {
      return {
        id: "__local_dev__",
        email: "dev@local.test",
        name: "Local Developer",
        role: "ADMIN",
        status: "ACTIVE",
        onboardingCompleted: true,
        branchId: null,
        branchCode: null,
        branchName: null,
      };
    }
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email || !session.user.name) {
    throw new AuthError("Unauthorized", 401);
  }
  return {
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
