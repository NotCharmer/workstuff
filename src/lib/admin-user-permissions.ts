import type { UserRole } from "./enums";

type UserUpdateActor = {
  role: UserRole;
  branchId: string | null;
};

type UserUpdateTarget = {
  role: string;
  branchId: string | null;
};

type UserPatch = {
  role?: UserRole;
  branchId?: string;
  password?: string;
};

export function canPatchAdminUser(
  actor: UserUpdateActor,
  target: UserUpdateTarget,
  patch: UserPatch
) {
  if (actor.role === "ADMIN") return true;
  if (actor.role !== "BRANCH_MANAGER") return false;
  if (!actor.branchId || target.branchId !== actor.branchId) return false;
  if (target.role === "ADMIN") return false;

  return patch.role === undefined && patch.branchId === undefined;
}
