/**
 * Which centres each reporting platform is allowed to act for, by CLARISA centre code.
 *
 * Used as the **fallback** ownership check when versioning a result through the API. The
 * primary check is `result.external_platform_id === mis.id` — "the platform that created
 * it is the one asking" — which is exact and needs no table. This map only comes into play
 * for a result that carries no originating platform, i.e. one a centre authored in the
 * reporting tool: there the only thing tying the request to the data is the centre.
 *
 * The API key resolves a **platform** (STAR, MEL, TIP), never a centre, so the link has to
 * be stated somewhere. It is stated here rather than guessed at the call site.
 *
 * Keys are the CLARISA `mis.acronym`, upper-cased. Values are `clarisa_center.code`.
 *
 * ⚠️ This drifts. When a platform starts reporting for another centre, this map is what
 * silently refuses the request — the symptom is a 403 that looks like a permissions bug.
 * Do not guess a centre code to make an error go away: look it up (`/clarisa/centers/get/all`,
 * or join `clarisa_center` / `clarisa_institutions`). A wrong entry here lets one platform
 * version another centre's results.
 *
 * A platform absent from this map can still version anything it created itself; it simply
 * has no fallback. That is the safe direction.
 */
export const PLATFORM_ACRONYM_TO_CLARISA_CENTER_CODES: Readonly<
  Record<string, readonly string[]>
> = {
  // CLARISA splits the Alliance into CENTER-03 "CIAT (Alliance)" and CENTER-02
  // "Bioversity (Alliance)" — see `w3-center-alias.constants.ts` for why that distinction
  // has to be kept explicit rather than matched by name.
  STAR: ['CENTER-02', 'CENTER-03'],
  MEL: ['CENTER-15', 'CENTER-07'],
};

/** Centre codes the platform may act for, or an empty list when it has no fallback. */
export function centerCodesForPlatform(
  acronym?: string | null,
): readonly string[] {
  if (!acronym) return [];
  return (
    PLATFORM_ACRONYM_TO_CLARISA_CENTER_CODES[acronym.trim().toUpperCase()] ?? []
  );
}
