## Why

Nicoleta Trifa's `user_feedback_20260714_AJ` review of the Results & ToC reporting flow surfaced several UI/UX corrections plus one state-validation bug (Jira **P2-3171**, parent P2-2338 Enhancements 2026). Users are already testing the ToC flow, so the wording must match the agreed KPI-centric language and the tab-completion status must stop showing green while a mandatory field is empty.

This change is **frontend-only** (Angular 19 client). No backend/server changes are required. It implements **all 6** acceptance criteria as pure copy/UI/validation edits. AC3 and AC5 were initially blocked on clarification and are now confirmed by Santiago Sánchez (Slack, 2026-07-16): **AC3 is text-only — the planned/unplanned logic stays exactly as-is** (no Yes/No, financial-resources, justification or ToC-levels change); **AC5's banner copy is fixed** to "Partner information is inherited/sourced from the HLO/Outcome level in the ToC." Scope is limited to the **Contributors & Partners (P25)** section per the AC wording (duplicate ToC-question copies in IPSR / share-request / bilateral are left untouched).

## What Changes

- **AC1 — Section title.** In the reporting entity-details view, rename the card header `Results planned in your {{year}} ToC` → `Report Results Linked to Program's {{year}} ToC`, preserving the dynamic reporting-phase year (do not hardcode 2026).
- **AC2 — Remove pop-up field.** In the "Report result" pop-up, remove the `Explanation of how the result aligns with/contributes to the Program's TOC pathway` field block (label + info helper + textarea + its preceding separator) from the view. The bound property stays initialized and is still sent as an empty string on save, so nothing breaks.
- **AC4 — Trim redundant wording.** In the Contributors & Partners ToC info note (CP2026 branch), remove the redundant plural `indicators` (the `/indicators` in "…outside the 2026 TOC KPI/indicators"), since it is implied by KPI. The two singular `indicator` references stay.
- **AC6 — Bug fix (completion status).** The tab completeness validator must not mark a tab green when the mandatory "contribution to target" field is empty, gated to the case where the field is actually shown/required (CP2026 + a KPI indicator selected) so other reuse contexts (IPSR, bilateral, 2025, share-request) do not regress into permanently-non-green tabs.
- **AC3 — ToC question copy.** In Contributors & Partners (2026 branch of `tocQuestionLabel`), change the question text `Can this result be mapped to a planned TOC KPI or indicator?` → `Can this result be mapped to a ToC KPI?`. **Text only** — the planned/unplanned Yes/No branching and all dependent fields/fetches are unchanged (confirmed by Santi). The differently-worded copies in IPSR / share-request / bilateral are out of scope.
- **AC5 — External Partners banner.** In the Contributors & Partners External Partners area, render an info alert with the fixed copy "Partner information is inherited/sourced from the HLO/Outcome level in the ToC.", placed page-level and gated to 2026 (CP2026) so it appears only in P25 and not in the shared IPSR selector.

No breaking changes. No API/DTO changes. No logic changes (AC3/AC5 are copy-only; AC6 only tightens an existing completion check).

## Capabilities

### New Capabilities
- `results-toc-reporting-adjustments`: The Results & ToC reporting UI corrections and the contribution-to-target tab-completion rule from Nicoleta Trifa's feedback (AC1 section title, AC2 pop-up field removal, AC4 info-note wording, AC6 completion-status validation).

### Modified Capabilities
<!-- None: no existing openspec/specs/ capability's requirements change. -->

## Impact

- **Client (Angular 19), frontend-only:**
  - `src/app/pages/result-framework-reporting/pages/entity-details/entity-details.component.html` (AC1, line ~73).
  - `.../entity-aow/.../aow-hlo-table-create-modal/aow-hlo-create-modal.component.html` (AC2, block ~96–115).
  - `src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.ts` (AC4, `tocQuestionInfoNote` CP2026 branch, line ~114).
  - `.../rd-contributors-and-partners/components/multiple-wps/multiple-wps.component.ts` (AC6, `completnessStatusValidation`, lines ~176–182).
- **No server changes**, no migrations, no API contract changes. `toc_progressive_narrative` continues to be posted (empty) by the create-result modal.
- **SDD baseline:** relates to `docs/system-design/design.md` (reporting UI copy) and the Contributors & Partners behavior established by P2-3036. Ticket: **P2-3171**.
- **Out of scope (follow-up):** AC3, AC5 — pending Santi/Nicoleta clarification.
