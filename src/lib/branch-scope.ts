import { cookies } from "next/headers";
import { AuthError, type CurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const ACTIVE_BRANCH_COOKIE = "lebronator_active_branch";

/** Branch used for queries/uploads — ADMIN may switch via cookie; others use home branch. */
export async function getViewBranchId(user: CurrentUser): Promise<string | null> {
  if (user.role !== "ADMIN") {
    if (!user.branchId) {
      throw new AuthError("אין בית ספר פעיל — פנו למנהל", 400);
    }
    return user.branchId;
  }

  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(ACTIVE_BRANCH_COOKIE)?.value?.trim();
  if (!fromCookie) {
    return user.branchId;
  }

  const branch = await prisma.branch.findUnique({
    where: { id: fromCookie },
    select: { id: true },
  });
  return branch?.id ?? user.branchId;
}

export async function getViewBranchContext(user: CurrentUser): Promise<{
  viewBranchId: string | null;
  viewBranchCode: string | null;
  viewBranchName: string | null;
}> {
  const viewBranchId = await getViewBranchId(user);
  if (!viewBranchId) {
    return { viewBranchId: null, viewBranchCode: null, viewBranchName: null };
  }
  const branch = await prisma.branch.findUnique({
    where: { id: viewBranchId },
    select: { id: true, code: true, name: true },
  });
  return {
    viewBranchId: branch?.id ?? null,
    viewBranchCode: branch?.code ?? null,
    viewBranchName: branch?.name ?? null,
  };
}

export async function requireViewBranchId(user: CurrentUser): Promise<string> {
  const branchId = await getViewBranchId(user);
  if (!branchId) {
    throw new AuthError("אין בית ספר פעיל — פנו למנהל", 400);
  }
  return branchId;
}
