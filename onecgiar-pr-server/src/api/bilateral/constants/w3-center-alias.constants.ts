/**
 * Fallback alias map: W3 Registry `centerAcronym` string -> `ClarisaCenter.code`.
 *
 * CLARISA's own institution-acronym matching (`findInstitution()` in CLARISA's
 * `w3-registry-sync.service.ts`) does an exact-string match against
 * `clarisa_institutions.acronym`, which fails when a center's real CLARISA acronym
 * differs from what W3 Registry publishes. Confirmed against a live query
 * (2026-08-18) that this only actually bites the two Alliance-descended
 * institutions: CLARISA disambiguates them as "CIAT (Alliance)" and "Bioversity
 * (Alliance)", while W3 Registry still sends the plain pre-merger acronyms "CIAT"
 * / "BIOVERSITY" — those never match, so their projects land with
 * `organization_code = NULL`. This is a PRMS-side, code-only workaround used by
 * BilateralProjectsService.getProjectsByCenter to still surface those projects to
 * the correct center, without any CLARISA-side change.
 *
 * Every W3 center acronym observed in the July 2026 analysis is covered below.
 * The other 7 entries (AfricaRice, CIMMYT, CIP, IFPRI, IITA, WorldFish, SO) have
 * exact-matching acronyms in both systems already (confirmed against the same
 * query), so CLARISA's own matching should resolve them fine on its own — they're
 * included here as defense-in-depth, not because a mismatch was confirmed.
 *
 * If a new W3 center acronym shows up that isn't listed here, do not guess its
 * `clarisa_center.code` — look it up first (e.g. `/clarisa/centers/get/all`, or
 * join `clarisa_center`/`clarisa_institutions`). A wrong entry silently
 * misattributes a project to the wrong center.
 */
export const W3_CENTER_ACRONYM_TO_CLARISA_CENTER_CODE: Readonly<
  Record<string, string>
> = {
  CIAT: 'CENTER-03',
  BIOVERSITY: 'CENTER-02',
  ICARDA: 'CENTER-07',
  AfricaRice: 'CENTER-01',
  CIMMYT: 'CENTER-05',
  CIP: 'CENTER-06',
  IFPRI: 'CENTER-10',
  IITA: 'CENTER-11',
  WorldFish: 'CENTER-15',
  // "System Office" (institution_id 10961) — distinct from CENTER-16 "SMO" /
  // "CGIAR System Organization" (institution_id 221). Don't conflate the two.
  SO: 'CENTER-17',
};
