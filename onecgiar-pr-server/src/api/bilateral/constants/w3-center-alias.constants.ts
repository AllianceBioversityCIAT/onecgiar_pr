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
/**
 * Ingest alias map: whatever a producer writes for a centre -> `ClarisaCenter.code`.
 *
 * Only the two Alliance-descended centres are listed, because they are the only ones
 * whose identity cannot be recovered by matching institution names: CLARISA splits them
 * into "CIAT (Alliance)" (CENTER-03, Regional Hub) and "Bioversity (Alliance)"
 * (CENTER-02, Headquarter), and **both institution names contain the word "Bioversity"**.
 * A `LIKE '%BIOVERSITY%'` therefore matches both, and picking the first row returned
 * decided the centre by database ordering. Verified on 2026-08-26: a payload sending
 * `lead_center.acronym = "BIOVERSITY"` was stored as CENTER-03, CIAT.
 *
 * The previous alias handling made it worse in the other direction — it mapped every
 * Alliance spelling, the canonical `CIAT (Alliance)` included, onto the single
 * Headquarter institution, so the two centres collapsed into CENTER-02. That is why
 * CENTER-03 has no results at all while CENTER-02 leads 5966 of them.
 *
 * Resolving straight to a centre code skips institution matching entirely, so neither
 * failure mode can come back.
 *
 * Keys are compared upper-cased with runs of whitespace collapsed — add new spellings in
 * that shape. Do not guess a code for a centre that is not Alliance-descended: plain
 * acronyms (IITA, CIP, ILRI…) already match their institution exactly and must keep
 * going through the normal path, where a wrong entry here would silently misattribute
 * every result of that centre.
 */
export const CENTER_ALIAS_TO_CLARISA_CENTER_CODE: Readonly<
  Record<string, string>
> = {
  // CIAT side — CLARISA "CIAT (Alliance)", Alliance ... Regional Hub (CIAT).
  CIAT: 'CENTER-03',
  'CIAT (ALLIANCE)': 'CENTER-03',
  'CIAT ALLIANCE': 'CENTER-03',

  // Bioversity side — CLARISA "Bioversity (Alliance)", Alliance ... Headquarter
  // (Bioversity International).
  BIOVERSITY: 'CENTER-02',
  'BIOVERSITY (ALLIANCE)': 'CENTER-02',
  'BIOVERSITY ALLIANCE': 'CENTER-02',
  'BIOVERSITY INTERNATIONAL': 'CENTER-02',

  // Pre-split spellings of the merged entity. CLARISA no longer publishes them and the
  // 2026 mapping is done per centre, so producers should send one of the two above.
  // Kept pointing at CENTER-02, which is where they already resolved and where the
  // existing data sits — a few legacy documents still carry "ABC" as their acronym.
  // They are ambiguous by nature: neither answer is right, so the answer stays the one
  // that does not move history.
  ABC: 'CENTER-02',
  'CIAT-BIOVERSITY': 'CENTER-02',
};

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
