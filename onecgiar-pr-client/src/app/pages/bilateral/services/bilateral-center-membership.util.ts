/**
 * `ASC-T-5` (`docs/specs/changes/admin-sees-all-centers/design.md` `ASC-DD-7`) — "is this user a
 * Center User of the CURRENT centre", answered from the user's own assignments
 * (`RolesService.getMyCenters()`), never from `RolesService.isAdmin`.
 *
 * Deliberately its own pure function rather than a copy of the two existing gates that already
 * read `getMyCenters()` — `api.service.ts:295-297` (`canPerformResultAction`) and
 * `bilateral-results-list.component.ts:409-412` (`canManageW3`) — because BOTH of those
 * short-circuit `true` on `rolesSE.isAdmin` first. That short-circuit is exactly the bug `ASC-R-15`
 * exists to not repeat here: a platform admin who is not a Center User of this centre must read as
 * a non-member on the AI-draft act surfaces (promote, discard, the AI create entry), even though
 * the server now lets that same admin *read* the drafts (`ASC-DD-7`, server side).
 */
export interface CenterAssignmentLike {
  center_id?: string | number | null;
  center_acronym?: string | null;
}

/**
 * Mirrors the matching convention the two gates above already use: a center identity may be
 * carried as the CLARISA code (`center_id`) or the acronym (`center_acronym`), and either one
 * matching is membership.
 */
export function isCenterMember(
  centers: readonly CenterAssignmentLike[] | null | undefined,
  centerId: string | null | undefined,
  centerAcronym: string | null | undefined,
): boolean {
  if (!centers?.length) return false;
  return centers.some(
    center =>
      (!!centerId && center?.center_id === centerId) || (!!centerAcronym && center?.center_acronym === centerAcronym)
  );
}
