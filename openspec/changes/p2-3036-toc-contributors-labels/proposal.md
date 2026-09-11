## Why

P2-3036 reorganizes the **Contributors & Partners** section (P25 reporting, ToC alignment) for the 2026 cycle. The authoritative spec is the Excel `PRMS_2026_Contributors_and_Partners_section_20260611_AJ.xlsx`. The full ticket is large (new fields, validations, show/hide logic, and backend work), so it is split into phases. **This change is Phase 1 — copy-only**: update the labels, info notes, and field help text that the user reads in the existing UI, with **no** behavioral, structural, validation, or backend changes. Doing the copy first delivers visible value fast and lets the team validate wording (via a before/after PDF) before the riskier phases.

## What Changes

Frontend only, inside the P25 component `rd-contributors-and-partners` and its `multiple-wps-content` subcomponent. Five copy changes on **existing** UI elements (no new fields, no logic):

1. **Rename the main ToC question** label from `"Does this result align with the Program's planned TOC indicators?"` to `"Can this result be mapped to a planned TOC KPI or indicator?"` (also the matching contributor string built in the component TS).
2. **Update the ToC question info note** (the `app-alert-status` under the question) to the new 2026/2027 wording from the Excel (row 5).
3. **Rename the `"Indicator"` field label** to `"KPI Statement/description"` (Excel row 11).
4. **Add field help text (info note) on `"KPI Statement/description"`**: `"Maps to TOC: [KPI Statement – deliverable short name and indicator description]"` (Excel row 12), rendered via the existing `description` input of the field (inline help text, the pattern already used in these components).
5. **Update the `"Contribution to indicator target"` info note** to the new 2026 wording from the Excel (row 18), including the Knowledge Product 1/0 guidance.

Explicitly **out of scope** (later phases, listed so reviewers know this is intentional):
- Remove `Submitter`; remove `Level` / `HLO` in the NO scenario; change "Why is the result being reported?" word limit 30→50.
- New read-only fields (`HLO/.../Statement`, `Indicator Tipology`) and their tooltips; new mandatory radio `"Did the Program invest financial resources…?"` and its info note.
- `Other(s)` dropdowns; Contributing CGIAR Centers / Science Program "from ToC" behavior; W3/Bilateral "by submitter SP" logic; multiple-HLO support.
- `Lead center` reposition (Excel says move; Ángel's Jira comment says do NOT move — to confirm before Phase 2).
- All backend changes (exposing ToC statements, indicator typology, persisting the new radio).

## Capabilities

### New Capabilities
- `toc-contributors-copy`: The user-facing copy (question label, info notes, field label, field help text) of the P25 Contributors & Partners ToC-alignment block, aligned to the 2026 Excel. Scope is wording only — no field behavior, validation, or visibility rules.

### Modified Capabilities
<!-- None. No existing spec under openspec/specs/ governs this section's requirements; this change introduces a copy capability and does not alter requirement-level behavior of other capabilities. -->

## Impact

- **Files (client):**
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.html` (question label + its info note).
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.component.ts` (contributor string mirroring the question label).
  - `onecgiar-pr-client/.../rd-contributors-and-partners/components/multiple-wps/components/multiple-wps-content/multiple-wps-content.component.html` (Indicator label, its help text, Contribution Target info note).
- **No** API, DTO, entity, routing, or theme changes. **No** backend impact.
- **Tests:** this component tree is excluded from Jest coverage (`collectCoverageFrom` excludes `rd-contributors-and-partners/**`), so the gate is a successful build/compile plus visual before/after verification (PDF).
- **i18n note:** these labels are currently hardcoded English in a P25-only component (no `term` pipe usage here); Phase 1 keeps the existing hardcoded pattern to avoid expanding scope.
- **Risk:** very low — text-only edits to existing elements; no control flow touched.
