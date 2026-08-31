# Requirements — Stop ToC-reference "not found" notes when unmapped

## 1. Document Control

- **Module:** `results` (Contributors & Partners, `rd-contributors-and-partners`), reused component also reached from `ipsr`
- **Sub-feature:** `toc-unmapped-orange-notes`
- **Depth:** Lite (Bug Mode)
- **Status:** draft
- **Proposal:** `docs/specs/bugfix/toc-unmapped-orange-notes/proposal.md`

## 2. Context

2026-phase Contributors & Partners splits Centers / Science Program / External Partners into "from the mapped ToC node" vs "Other(s)", falling back to an orange "not found" note when the mapped node carries no matches (P2-2998 AC4 / P2-2929). The note's gate only checks `isCP2026()`, not whether the result is actually mapped — so answering **No** to "Can this result be mapped to a ToC KPI?" (no node ever selected) makes all three notes fire unconditionally, misreporting a normal unmapped state as "nothing found." Confirmed root cause: `docs/specs/bugfix/toc-unmapped-orange-notes/proposal.md` §9. User confirmed (2026-08-28) the Centers/Science notes are not reachable in IPSR; only External Partners is, via the shared `normal-selector` component.

Touches `docs/trd/trd.md` frontend module layout (`rd-contributors-and-partners`) — no PRD/product-scope change, pure defect correction.

## 3. In Scope / Out of Scope

**In scope**
- Suppress the "not found" note (and the reference-filtered dropdown behind it) for Centers, Science Program, and External Partners when `partnersBody.result_toc_result.planned_result === false`.
- Regression coverage proving both the fixed state (No → no note) and the preserved AC4 state (Yes + empty refs → note still shows).

**Out of scope**
- The "Please select a TOC result above" bilateral-projects note (`hasTocResultMapped()`) — different condition, not reported.
- The Level/Output/Outcome ToC selector shown on **No** in legacy (non-2026) phases — intentional, unrelated.
- Any IPSR Centers/Science UI — confirmed not to exist in that template.

## 4. Functional Requirements

### Required (MUST)

- **TOC-R-1** WHEN a 2026-phase result's `result_toc_result.planned_result` is `false` (answered **No**), the system MUST render Contributing CGIAR Centers, Contributing Science Program/Accelerator, and External Partners as the plain full-catalog dropdown, and MUST NOT render the "No ... related to the established HLO/Outcomes were found" note for any of the three.
- **TOC-R-2** WHEN a 2026-phase result's `planned_result` is `true` (answered **Yes**) and the mapped ToC node returns no matching centers/programs/partners, the system MUST continue to show the existing "not found" note for the affected section(s) (AC4 behavior unchanged).
- **TOC-R-3** The External Partners fix (shared `normal-selector` component) MUST apply identically wherever it renders, including the IPSR P25 flow.

### Scenarios

#### TOC-R-1 — No answer suppresses all three notes

- GIVEN a 2026-phase result in Contributors & Partners
- WHEN the user answers **No** to "Can this result be mapped to a ToC KPI?"
- THEN Contributing CGIAR Centers, Science Program/Accelerator, and External Partners each show their plain full-catalog dropdown
- AND none of the three orange "not found" notes render
- BUT the dropdowns MUST NOT be empty or disabled — they must offer the same full catalogs as the pre-2026 (legacy) behavior

#### TOC-R-2 — Yes + genuinely empty ToC node still warns

- GIVEN a 2026-phase result answered **Yes**
- AND the mapped ToC node has no linked centers (or programs, or partners)
- WHEN the section renders
- THEN the corresponding "not found" note still appears
- AND IT MUST NOT be suppressed by this fix

#### TOC-R-3 — Shared component parity (IPSR)

- GIVEN an IPSR P25 result whose phase is 2026+
- WHEN the user answers **No** to "Does this result align with the Program's planned TOC indicators?"
- THEN the External Partners section (rendered via the shared `normal-selector` component) shows the plain dropdown with no "not found" note

## 5. Non-Functional Requirements

| Dimension | Target |
|---|---|
| Backwards compatibility | MUST NOT change the pre-2026 (legacy) Centers/Partners rendering, already unaffected today. |
| Regression safety | MUST NOT regress AC4 (Yes + empty refs still warns) — covered by TOC-R-2's scenario. |

## 6. Defect Classes & Verification Mapping

| Defect class | Catching command |
|---|---|
| Note renders on **No** (the bug) | Component spec assertion: render with `planned_result: false`, assert `.pr-message` absent for all three sections. |
| AC4 regression (note silently disappears on **Yes** + empty refs) | Component spec assertion: render with `planned_result: true` and empty reference ids, assert `.pr-message` present. |
| Dropdown becomes empty/wrong catalog on **No** | Component spec assertion: options bound equal the full catalog signal, not the (empty) reference-filtered list. |

All three classes are covered by Jest/Angular TestBed component specs — no class needs a human/visual substitute; this is a conditional-render bug with no new visual pattern.

## 7. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| TOC-AC-1 | 2026-phase result, Contributors & Partners rendered | `planned_result` set to `false` | No `.pr-message` orange note renders for Centers, Science Program, or External Partners; each renders its full-catalog dropdown |
| TOC-AC-2 | 2026-phase result, `planned_result` set to `true`, ToC reference ids empty | Section renders | The corresponding "not found" note(s) still render (unchanged) |
| TOC-AC-3 | IPSR P25 result, phase 2026+, `planned_result` set to `false` | `normal-selector` renders | External Partners shows plain dropdown, no note |

## 8. Dependencies & Assumptions

- Depends on existing `RdContributorsAndPartnersService.partnersBody.result_toc_result.planned_result` state — no new service method needed.
- Assumes `isCP2026()` / `hasReferenceCenters()` / `hasReferenceScience()` / `hasReferencePartners()` computeds are otherwise correct (not touched by this fix).

## 9. Open Questions

None — confirmed with user (2026-08-28) that IPSR Centers/Science notes are not reachable; only External Partners parity (TOC-R-3) applies there.

## Required cross-references

- `docs/specs/bugfix/toc-unmapped-orange-notes/proposal.md` (Bug Diagnosis, root cause)
- `docs/trd/trd.md` (frontend module layout — `results` module)
- `onecgiar-pr-client/CLAUDE.md`, `onecgiar-pr-client/src/CLAUDE.md`
- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/CLAUDE.md`
