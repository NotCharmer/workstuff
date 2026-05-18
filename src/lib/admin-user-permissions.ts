import type { UserRole, UserStatus } from "./enums";

type UserPatchActor = {
  role: UserRole;
  branchId: string | null;
};

type UserPatchTarget = {
  role: string;
  branchId: string | null;
};

type AdminUserPatch = {
  role?: UserRole;
  status?: UserStatus;
  branchId?: string;
  password?: string;
};

export function canPatchAdminUser(
  actor: UserPatchActor,
  target: UserPatchTarget,
  patch: AdminUserPatch
): boolean {
  if (actor.role === "ADMIN") return true;
  if (actor.role !== "BRANCH_MANAGER") return false;
  if (!actor.branchId || target.branchId !== actor.branchId) return false;
  if (target.role === "ADMIN") return false;

  return patch.role === undefined && patch.status === undefined && patch.branchId === undefined;
}
