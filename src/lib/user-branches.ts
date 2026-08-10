import { prisma } from "@/lib/db";
import { SCHOOL_CODES } from "@/lib/schools";

export function parseRequestedBranchCodes(value: string | null | undefined): string[] {
  if (!value) return [];
  return [...new Set(value.split(",").map((code) => code.trim()).filter(Boolean))];
}

export function formatRequestedBranchCodes(codes: string[]): string {
  return [...new Set(codes.map((c) => c.trim()).filter(Boolean))].join(",");
}

export function approvedBranchAccessIds(branchId: string | null | undefined): string[] {
  return branchId ? [branchId] : [];
}

export function trustedBranchAccessIdsForUser(
  user: { branchId: string | null; requestedBranchCode: string | null } | null,
  branchIds: string[]
): string[] {
  const uniqueBranchIds = [...new Set(branchIds.filter(Boolean))];
  if (!user?.requestedBranchCode) {
    return uniqueBranchIds;
  }

  // Self-registration records requested branches, not approved branches.
  // Until a reviewer syncs access rows, trust only the approved primary branch.
  const approvedBranchIds = approvedBranchAccessIds(user.branchId);
  const matchesApprovedBranch =
    uniqueBranchIds.length === approvedBranchIds.length &&
    uniqueBranchIds.every((branchId) => branchId === approvedBranchIds[0]);
  return matchesApprovedBranch ? uniqueBranchIds : approvedBranchIds;
}

export async function getUserAccessibleBranchIds(userId: string): Promise<string[]> {
  const [user, rows] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { branchId: true, requestedBranchCode: true },
    }),
    prisma.userBranchAccess.findMany({
      where: { userId },
      select: { branchId: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  return trustedBranchAccessIdsForUser(
    user,
    rows.map((row) => row.branchId)
  );
}

export async function syncUserBranchAccess(userId: string, branchIds: string[]): Promise<void> {
  const unique = [...new Set(branchIds.filter(Boolean))];
  await prisma.$transaction([
    prisma.userBranchAccess.deleteMany({ where: { userId } }),
    ...(unique.length > 0
      ? [
          prisma.userBranchAccess.createMany({
            data: unique.map((branchId) => ({ userId, branchId })),
            skipDuplicates: true,
          }),
        ]
      : []),
  ]);
}

export async function syncApprovedBranchAccess(
  userId: string,
  branchId: string | null | undefined
): Promise<void> {
  await syncUserBranchAccess(userId, approvedBranchAccessIds(branchId));
}

export async function userCanSwitchBranches(userId: string, role: string): Promise<boolean> {
  if (role === "ADMIN") return true;
  const accessible = await getUserAccessibleBranchIds(userId);
  return accessible.length > 1;
}

export function isValidSchoolBranchCode(code: string): boolean {
  return (SCHOOL_CODES as readonly string[]).includes(code);
}

export async function resolveBranchIdsFromCodes(codes: string[]): Promise<
  | { ok: true; branches: { id: string; code: string }[] }
  | { ok: false; error: string }
> {
  const uniqueCodes = [...new Set(codes.map((c) => c.trim()).filter(Boolean))];
  if (uniqueCodes.length === 0) {
    return { ok: false, error: "missing" };
  }
  for (const code of uniqueCodes) {
    if (!isValidSchoolBranchCode(code)) {
      return { ok: false, error: code };
    }
  }
  const branches = await prisma.branch.findMany({
    where: { code: { in: uniqueCodes } },
    select: { id: true, code: true },
  });
  if (branches.length !== uniqueCodes.length) {
    return { ok: false, error: "not_found" };
  }
  const byCode = new Map(branches.map((b) => [b.code, b]));
  return {
    ok: true,
    branches: uniqueCodes.map((code) => byCode.get(code)!),
  };
}
