import { prisma } from "@/lib/db";
import { SCHOOL_CODES } from "@/lib/schools";

export function parseRequestedBranchCodes(value: string | null | undefined): string[] {
  if (!value) return [];
  return [...new Set(value.split(",").map((code) => code.trim()).filter(Boolean))];
}

export function formatRequestedBranchCodes(codes: string[]): string {
  return [...new Set(codes.map((c) => c.trim()).filter(Boolean))].join(",");
}

export async function getUserAccessibleBranchIds(userId: string): Promise<string[]> {
  const rows = await prisma.userBranchAccess.findMany({
    where: { userId },
    select: { branchId: true },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((row) => row.branchId);
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

export function approvedBranchAccessIds(branchId: string | null | undefined): string[] {
  return branchId ? [branchId] : [];
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
