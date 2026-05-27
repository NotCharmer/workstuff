import { cookies } from "next/headers";
import { AuthError, type CurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUserAccessibleBranchIds } from "@/lib/user-branches";

export const ACTIVE_BRANCH_COOKIE = "lebronator_active_branch";

async function resolveActiveBranchFromCookie(
  allowedIds: string[],
  fallbackId: string | null
): Promise<string | null> {
  if (allowedIds.length === 0) return fallbackId;
  if (allowedIds.length === 1) return allowedIds[0] ?? fallbackId;

  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(ACTIVE_BRANCH_COOKIE)?.value?.trim();
  if (fromCookie && allowedIds.includes(fromCookie)) {
    return fromCookie;
  }
  return allowedIds[0] ?? fallbackId;
}

/** Branch used for queries/uploads — ADMIN and multi-branch staff may switch via cookie. */
export async function getViewBranchId(user: CurrentUser): Promise<string | null> {
  if (user.role === "ADMIN") {
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

  const accessible = await getUserAccessibleBranchIds(user.id);
  const allowedIds =
    accessible.length > 0 ? accessible : user.branchId ? [user.branchId] : [];
  return resolveActiveBranchFromCookie(allowedIds, user.branchId);
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
