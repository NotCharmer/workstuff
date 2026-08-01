/**
 * Decide how upload confirm should treat a reliable externalId match.
 *
 * After school-year rollover, graduated יב students keep their school IDs.
 * Matching them (or creating a second row with the same unique externalId)
 * either sinks current-year grades onto invisible graduated records or fails
 * with P2002 mid-import. Prefer ACTIVE only; skip when only a graduate holds
 * the ID.
 */
export type ExternalIdUploadTarget =
  | { kind: "active" }
  | { kind: "create" }
  | { kind: "skip_graduated" };

export function resolveExternalIdUploadTarget(opts: {
  activeMatch: boolean;
  graduatedMatch: boolean;
}): ExternalIdUploadTarget {
  if (opts.activeMatch) return { kind: "active" };
  if (opts.graduatedMatch) return { kind: "skip_graduated" };
  return { kind: "create" };
}
