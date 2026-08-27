# `changes/american-english-copy` — Design

## 1. Summary

Copy-only, client-wide respelling of British English to American English via a **classified word-list sweep**: a curated regex of British stems enumerates every match; each hit is classified as rendered copy / comment / identifier / **data-coupled name**; only rendered copy and the tests pinning it are edited. No structural, route, API, field-name, or persisted-key change. Linked: `requirements.md` (AEC-R-1..3), `proposal.md` §10 Option A.

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Client modules touched (rendered-copy hotspots):**
  - `pages/result-framework-reporting/pages/dashboard-lab/` (reporting-program-band heading, lab-report-form, reporting-aow-table, program-overview, dashboard-lab templates)
  - `pages/result-framework-reporting/pages/portfolio-overview/` (templates; note the `'programme'` SortKey stays — DD-3)
  - `pages/result-framework-reporting/pages/programme-results/` (template copy, error `'Programme "…" was not found.'`, group label `'Programme-level'`, CSV filename fallback `'programme'`)
  - `pages/result-framework-reporting/pages/bilateral-results/...result-review-drawer/components/kp-content/` (heading "Licence:" → "License:")
  - `pages/results/...results-list-filters/` (label `'Knowledge Product — licence'` → license; key `s7_kp_licence` stays — DD-4)
  - `pages/bilateral/` (bilateral-sp-selector, section-contributors templates)
  - `shared/components/` (change-phase-modal; reporting-nav-sidebar hits are comments — verify per-hit)
- **Server modules touched:** none (all server British hits are comments or an ops log message — out of scope).
- **External integrations touched:** none.

### 2.2 Flow

Sweep (word-list regex → enumerate → classify → edit copy hits) → update pinned Jest expectations → gates (jest, audit classification, identifier/field guard) → HITL diff review for bound-data transformations.

## 3. Data Model Changes

None. The `licence` entity field and DB column are explicitly preserved (AEC-R-2).

## 4. API Surface

None. `licence` in payloads and `s7_kp_licence` in filter/export keys are contracts and stay byte-identical.

## 5. Backend Module Design

None.

## 6. Frontend / UX Component Architecture

No component structure changes — only string literals. Classification rules per hit:

| Category | Examples | Rule |
|---|---|---|
| Rendered copy (EDIT) | template text/attributes (tooltips, aria-labels, banners), TS user-facing literals: heading builder `reporting-program-band.component.ts:211`, `'Programme "SP99" was not found.'`, `'Programme-level'`, CSV fallback `'programme'`, `<h4>Licence:</h4>`, `'Knowledge Product — licence'` | Case- and inflection-preserving American respelling |
| Test pins (EDIT) | e.g. `reporting-program-band.component.spec.ts` | Update in same commit |
| Comments (KEEP) | `centre`/`catalogue`/`colour`/`favourites`/`behaviour` in JSDoc & HTML comments | Optional tidy only in already-touched files |
| Identifiers (KEEP) | `programmeCode`, `programmeRows`, `ProgrammeResultsComponent`, SortKey `'programme'`, storage key `pr.programmeResults.visibleColumns`, folders/routes | Never edit |
| Data-coupled names (KEEP) | `licence` DTO/entity field + DB column (CGSpace `Rights` mapping), `s7_kp_licence`, CLARISA centre codes/aliases | Never edit — external contracts |

## 7. Shared Contracts or Package Extensions

None.

## 8. Design Decisions

- **`AEC-DD-1` — Classified word-list sweep over blind replace.** Curated British-stem regex (from the ~50-stem measurement) enumerates matches; classification precedes any edit. Rejected: global `sed` (breaks lazy routes, storage keys, and the `licence` contract); identifier/field renames (API/DB breaking, zero user value). Source: proposal §10.
- **`AEC-DD-2` — Identifier/field guard as over-replacement gate.** Pre-change grep counts of `programmeCode|ProgrammeResults|pr\.programmeResults|\.licence|s7_kp_licence` recorded; post-change counts must be equal. Catches accidental renames that still compile.
- **`AEC-DD-3` — Sort-key literal `'programme'` stays.** In `portfolio-overview.component.ts` it is a `SortKey`/column `key` value, not copy (its `label` already reads "Science program"). Only `label` fields are copy.
- **`AEC-DD-4` — `licence` splits by role within the same files.** The word is simultaneously display copy (edit: "License:", filter label) and a data contract (keep: DTO field, DB column reads, `s7_kp_licence`). Classification is per-hit, never per-file or per-word.
- **Reversion challenge (Step 2.3):** skipped — no DD removes, disables, or inverts delivered behavior; Lite depth, pure respelling.

## 9. Budget (Step 2.4)

| Metric | Estimate |
|---|---|
| Expected tasks | 2 |
| Expected LOC (changed lines) | ~70–110 (string edits across ~18–22 files, incl. tests) |
| Expected review rounds | 1 |

Depth re-check: still matches Lite. `/akili-execute` trips and escalates if actuals exceed this.
