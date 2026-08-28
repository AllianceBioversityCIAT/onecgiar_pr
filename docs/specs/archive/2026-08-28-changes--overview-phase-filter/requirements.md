# Requirements: Overview Phase Filter

## 1. Document Control

| Field | Value |
|---|---|
| **Spec Path** | `docs/specs/changes/overview-phase-filter/` |
| **Type** | Change |
| **Depth** | Standard |
| **Approval Mode** | gated (inherited from proposal) |
| **Status** | Draft — pending Phase 1 approval |
| **Date** | 2026-08-28 |
| **Baseline** | `docs/prd.md`, `docs/trd/trd.md`, `docs/ux-ui/design.md` |
| **Builds on** | archived `bugfix/w12-overview-phase-origin-alignment` (versionId plumbing, versioned cache), archived `changes/overview-toc-map` (ToC card) |

## 2. Executive Summary

The Science Program Overview always shows the phase the system marks as active. This spec adds a **phase selector** so a viewer can re-scope the entire page — progress meter, indicator matrix, W3/bilateral cards, and the ToC map — to any reporting phase the program has (e.g. look back at *Reporting 2025*). Default remains the Open phase: an untouched selector produces today's page, byte for byte.

## 3. Glossary

| Term | Meaning |
|---|---|
| **Phase / version** | A row of the `version` table (e.g. id 36 = "Reporting 2026", `phase_year` 2026, status Open). The admin Phases table is its UI. |
| **Open phase** | The single phase with active reporting status — what `$_findActivePhase(REPORTING)` returns. |
| **ToC context** | The ToC phase (`toc_pahse_id`) tied to a `version` row; scopes ToC structure, indicators, and targets. |
| **Card families** | The four Overview data surfaces: (1) progress meter, (2) indicator contribution matrix, (3) W3/Bilateral cards, (4) ToC map + Progress by AoW. |
| **`sp.versions`** | Per-program phase list already delivered by `science-programs/progress` — `{versionId, phaseName, phaseYear}` per row. |

## 4. System Context & Scope

**In scope:** the Overview tab of `/result-framework-reporting/entity-details/:sp/overview` (client `dashboard-lab` page) and the four endpoints feeding it (`get/science-programs/progress`, `programs/indicator-contribution-summary`, `GET_ResultToReview`, and the `toc-results` family in `results-framework-reporting`).

**Out of scope (non-goals):** the Results tab, the admin Phases table, active-phase configuration, multi-phase comparison views, the two documented W12 same-phase residuals (`status_id != 4` and `result_level` join asymmetries between meter and matrix).

## 5. Stakeholders / Personas

| Persona | Interest |
|---|---|
| SP leader / Overview viewer | Look back at closed phases without asking an admin; trust that all cards show the same phase. |
| PRMS admin | No change to their workflow; phase configuration remains the single source. |
| Developers | One canonical phase parameter (`versionId`) instead of three resolution mechanisms. |

## 6. Functional Requirements

### OPF-R-1: Phase selector — options and default

The Overview SHALL show a phase selector listing exactly the phases the selected program has (`sp.versions`), labeled with phase name and year, with the Open phase visually marked and selected by default.

#### Scenario: Default on load
- GIVEN a viewer opens the Overview of SP04 and Reporting 2026 is the Open phase
- WHEN the page finishes loading
- THEN the selector shows "Reporting 2026" selected without any user action
- AND the options list every phase SP04 has (e.g. Reporting 2025, Reporting 2026), newest first
- BUT it must NOT list phases the program lacks (other portfolios' 2022–2024 phases never appear)
- AND IT MUST render the Open marker only on the phase equal to the active reporting phase

### OPF-R-2: Single-phase consistency across all cards

WHEN a phase is selected, ALL four card families SHALL show data scoped to that phase — including the ToC map's indicator progress, which MUST use that phase's ToC context.

#### Scenario: Select a closed phase
- GIVEN SP04's Overview showing Reporting 2026 with matrix total 11
- WHEN the viewer selects Reporting 2025
- THEN the meter, matrix, W3/bilateral cards, and ToC map all re-render with Reporting 2025 data
- AND the ToC indicator progress reflects the ToC phase tied to the Reporting 2025 version row
- BUT it must NOT leave any card showing Reporting 2026 data (a page mixing two phases is a defect, not a partial success)
- AND IT MUST show a loading state on each card while its re-fetch is in flight

### OPF-R-3: Untouched selector ⇒ today's behavior

With the selector untouched, the Overview SHALL be functionally identical to today, and every touched endpoint SHALL behave exactly as today when the phase parameter is absent.

#### Scenario: Regression guard
- GIVEN the live SP04 baseline (matrix statusTotals `{editing:10, submitted:1, total:11}` on the Open phase)
- WHEN the Overview loads and the viewer never touches the selector
- THEN all cards show the same values as before this spec
- AND requests carry the same effective phase as today
- BUT it must NOT add duplicate requests for the default path
- AND IT MUST keep all existing server and client suites green with no assertion changes for absent-parameter calls

### OPF-R-4: Phase switching is stale-free and reactive

Switching phases (including back to a previously viewed one) SHALL always serve data belonging to the selected phase — never a stale response from another phase, and never a stale cache entry (KZ-W12-2 defect class).

#### Scenario: A → B → A round trip
- GIVEN the viewer switched Reporting 2026 → Reporting 2025 → Reporting 2026
- WHEN the final selection resolves
- THEN each card shows Reporting 2026 data identical to the first render
- AND cached responses may be reused per phase (no forced refetch on return)
- BUT it must NOT serve phase-B data under a phase-A selection, even transiently after responses race
- AND IT MUST derive every phase-dependent computed/effect from the selection state such that a late-resolving active phase still converges (the plain-object + version-signal pairing rule)

### OPF-R-5: Sparse or empty closed phases degrade gracefully

WHEN the selected phase has few or zero results, every card SHALL render its empty state without errors.

#### Scenario: Phase with no data
- GIVEN a phase where the program reported nothing
- WHEN the viewer selects it
- THEN each card shows its existing empty state (matrix "No results", muted ToC nodes, zeroed meter)
- BUT it must NOT render a broken chart, a thrown error, or an infinite loading state
- AND IT MUST keep the selector usable so the viewer can navigate back

### OPF-R-6: Server phase-parameter contract

The `toc-results`, `toc-results/2030-outcomes`, and `toc-results/intermediate-outcomes` endpoints SHALL accept an optional `versionId`; all Overview endpoints SHALL resolve an absent `versionId` to the active reporting phase and reject an unknown one.

#### Scenario: Explicit versionId on a ToC endpoint
- GIVEN version row 34 (Reporting 2025) exists with its own ToC phase
- WHEN a client calls `toc-results/2030-outcomes?programId=SP04&versionId=34`
- THEN the response is scoped to Reporting 2025's year AND its ToC phase (`toc_pahse_id` of row 34)
- AND IT MUST derive year and ToC phase from the version row itself, never from year-only equality or the `year.active` config row
- BUT it must NOT change any response when `versionId` is absent (active-phase default preserved)
- AND IT MUST return a 4xx error (not empty-200) for a non-numeric or nonexistent `versionId`

### OPF-R-7 (MAY): Deep-link / persistence

The selection MAY be reflected in the URL (`?phase=`) for shareable links. Default for this spec: the selection resets to the Open phase on each visit. *(Priced in design; implement only if the budget absorbs it.)*

## 7. Non-Functional Requirements

| ID | Requirement |
|---|---|
| OPF-N-1 | The default path (untouched selector) performs no additional HTTP requests versus today. |
| OPF-N-2 | The selector is keyboard-operable and labeled for screen readers (standard PrimeNG select semantics; tokens per `docs/ux-ui/design.md` §7). |
| OPF-N-3 | Phase switches reuse per-phase caches; a repeat visit to a phase in the same session does not refetch unchanged data. |

## 8. Defect Classes → Gates

| # | Defect class | Gate | Failing input the gate can see |
|---|---|---|---|
| D1 | Wrong per-phase counts server-side (SQL predicate / param binding) | Server Jest per-predicate specs **plus placeholder-count === params assertions** (KZ-W12-1: mocked-`query` specs are blind to binding bugs) | A spec fixture whose SQL carries an extra `?`, or a predicate test seeding rows of the wrong version |
| D2 | Cross-phase staleness in the client (cache key, untracked signal) | Client Jest phase-switch specs whose fixtures put **different data in each phase** (KZ-TCM-1: fixture must include the axis that diverges) | Cache primed with phase-A data, selection switched to B — a wrong impl returns A's numbers |
| D3 | Live wiring (HTTP 500s, stale server, real-DB divergence) — invisible to all unit suites (KZ-W12-1 evidence) | **Human check at the HITL pause**: authenticated live probe of each endpoint with an explicit `versionId`, compared against the Results tab | An endpoint that 500s or returns zeros only against a real database |
| D4 | Visual rendering of selector, loading and empty states — jsdom cannot evaluate | **HITL visual check (T6)** on the running app, per phase | A selector rendered but unclickable, an empty state that shows a broken chart |
| D5 | Regression of the absent-parameter default | Existing server + client suites, unmodified for default-path assertions | Any behavior change when `versionId` is omitted |

D3 and D4 have no automated gate by design — they are named HITL substitutes, not accepted risks.

## 9. Requirement ID Index

| ID | Name | Strength |
|---|---|---|
| OPF-R-1 | Phase selector — options and default | SHALL |
| OPF-R-2 | Single-phase consistency across all cards | SHALL |
| OPF-R-3 | Untouched selector ⇒ today's behavior | SHALL |
| OPF-R-4 | Stale-free, reactive switching | SHALL |
| OPF-R-5 | Graceful sparse/empty phases | SHALL |
| OPF-R-6 | Server phase-parameter contract | SHALL |
| OPF-R-7 | Deep-link / persistence | MAY |
| OPF-N-1..3 | Performance, a11y, caching | SHOULD |
