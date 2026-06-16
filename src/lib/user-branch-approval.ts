export function chooseApprovedBranchIdsForActivation({
  actorRole,
  actorBranchId,
  targetBranchId,
  branchIdOverride,
  requestedBranchIds,
}: {
  actorRole: string;
  actorBranchId: string | null;
  targetBranchId: string | null;
  branchIdOverride?: string | null;
  requestedBranchIds: string[];
}): string[] {
  const primaryBranchId = branchIdOverride ?? targetBranchId ?? actorBranchId;
  if (actorRole !== "ADMIN") {
    return actorBranchId ? [actorBranchId] : primaryBranchId ? [primaryBranchId] : [];
  }

  return [
    ...new Set([
      ...(primaryBranchId ? [primaryBranchId] : []),
      ...requestedBranchIds.filter(Boolean),
    ]),
  ];
}
