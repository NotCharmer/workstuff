type UserPatchActor = {
  role: string;
  branchId: string | null;
};

type UserPatchTarget = {
  role: string;
  branchId: string | null;
};

type AdminUserPatch = {
  role?: string;
  status?: string;
  branchId?: string;
};

export function getAdminUserPatchForbiddenReason(
  actor: UserPatchActor,
  target: UserPatchTarget,
  patch: AdminUserPatch
): string | null {
  if (actor.role === "ADMIN") return null;

  if (!actor.branchId || target.branchId !== actor.branchId) {
    return "Forbidden";
  }
  if (target.role === "ADMIN" || patch.role === "ADMIN") {
    return "Forbidden";
  }
  if (patch.role === "BRANCH_MANAGER") {
    return "Forbidden";
  }
  if (patch.status === "BLOCKED") {
    return "Forbidden";
  }
  if (patch.branchId && patch.branchId !== actor.branchId) {
    return "Forbidden";
  }

  return null;
}
