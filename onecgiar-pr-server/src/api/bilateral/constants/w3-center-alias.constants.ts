/**
 * Fallback alias map: W3 Registry `centerAcronym` string -> `ClarisaCenter.code`.
 *
 * CLARISA's own institution-acronym matching (`findInstitution()` in CLARISA's
 * `w3-registry-sync.service.ts`) does an exact-string match against
 * `clarisa_institutions.acronym`, which fails when a center's real CLARISA acronym
 * differs from what W3 Registry publishes (e.g. CIAT's real CLARISA acronym is
 * "ABC RH", not "CIAT"). That leaves `clarisa_projects.organization_code` NULL for
 * affected W3-sourced projects. This is a PRMS-side, code-only workaround used by
 * BilateralProjectsService.getProjectsByCenter to still surface those projects to
 * the correct center, without any CLARISA-side change.
 *
 * Only entries confirmed against real CLARISA/production data are included below.
 * THIS MAP IS DELIBERATELY INCOMPLETE — fill in the remaining W3 center acronyms
 * (AfricaRice, CIMMYT, IFPRI, CIP, SO, IITA, WorldFish, and possibly others per the
 * July 2026 analysis) once someone can query the live PRMS DB for their real
 * `clarisa_center.code` values. Do not guess — a wrong entry silently misattributes
 * a project to the wrong center.
 */
export const W3_CENTER_ACRONYM_TO_CLARISA_CENTER_CODE: Readonly<
  Record<string, string>
> = {
  CIAT: 'CENTER-03',
  BIOVERSITY: 'CENTER-02',
  ICARDA: 'CENTER-07',
};
