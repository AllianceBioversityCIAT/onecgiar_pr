# Proposal: Overview Phase Filter

## 1. Document Control

| Field | Value |
|---|---|
| **Spec Path** | `docs/specs/changes/overview-phase-filter/` |
| **Type** | Change |
| **Approval Mode** | gated |
| **Status** | Proposed |
| **Date** | 2026-08-28 |
| **Author** | Juan Carlos Cadavid (via AKILI `/akili-propose`) |
| **Depends on** | none (builds on archived `bugfix/w12-overview-phase-origin-alignment`) |
| **Parallel-safe** | yes (no shared migrations; touches dashboard-lab + RFR endpoints only) |

## 2. Intent

Let the person viewing a Science Program **Overview** (`/result-framework-reporting/entity-details/:sp/overview`) pick which **reporting phase** the whole page shows — instead of being locked to the phase the system marks as active. Defaults stay exactly as today (the Open phase, e.g. *Reporting 2026*), so nothing changes until the viewer touches the filter.

## 3. Problem / Current Behavior

All Overview charts show the active phase today, but they reach it through **three different mechanisms** (audited 2026-08-28):

| Card | Endpoint | Phase source today | Param exists? |
|---|---|---|---|
| Progress meter (W1/W2) | `get/science-programs/progress` | `$_findActivePhase` (server) | Server yes (`?versionId`); client wrapper doesn't expose it |
| Indicator matrix (heatmap/bars) | `programs/indicator-contribution-summary` | Client sends `versionId` (phase-preferring), versioned cache `code::versionId` | **Yes, end to end** (W12) |
| W3 / Bilateral cards | `GET_ResultToReview(code, …, versionId, 'all')` | Client sends `versionId` | Yes (known reactivity gap in `loadBilateralRows`) |
| ToC map + Progress by AoW | `toc-results`, `toc-results/2030-outcomes`, `toc-results/intermediate-outcomes` | `ReportingTocContextService.resolve()` → **`year.active` row**, not the phase table | Partial: `toc-results` accepts `?year` (unused); the other two accept nothing |

Consequences:

1. The viewer **cannot look back** at a closed phase (e.g. *Reporting 2025*) from the Overview — they lose the comparison the admin Phases table makes obvious (see Visual Reference: phases are first-class rows with Open/Closed status, portfolio, and their own ToC phase).
2. The ToC family scopes by the decoupled **`year.active`** config row while everything else scopes by the **`version`** (phase) table — they coincide today, but nothing enforces it (documented as W12-DD-3 residual).

## 4. Proposed Outcome

- A **phase selector** on the Overview page, populated from the phases the SP actually has (`sp.versions`, which already arrives per program and is inherently portfolio-correct — SPs are portfolio 2025-2030, so 2022-2024 phases never appear).
- Default selection = the **Open** phase (current behavior, zero regression when untouched).
- Changing the selection re-scopes **all four card families** to that phase in one gesture: meter, indicator matrix, W3/bilateral cards, and the ToC map / Progress by AoW.
- One canonical parameter: **`versionId`** (the phase id, e.g. 36 = Reporting 2026). The server derives the ToC context (`phase_year` → `toc_pahse_id`) from it — the viewer never thinks in "years" vs "phases".

## 5. Scope

**Client (`onecgiar-pr-client`, dashboard-lab):**
- `selectedVersionId` signal + dropdown (PrimeNG select, per `docs/ux-ui/design.md` tokens); replaces the implicit `latestVersion(sp) ?? reportingCurrentPhase.phaseId` resolution in every Overview loader.
- Expose `versionId` in `GET_ScienceProgramsProgress()` wrapper; pass phase into the ToC-family calls.
- Per-phase caching for the loaders that lack it (the matrix already has `code::versionId`); close the `loadBilateralRows` reactivity gap (recorded follow-up from W12).

**Server (`onecgiar-pr-server`, results-framework-reporting):**
- Accept optional `versionId` on `toc-results/2030-outcomes` and `toc-results/intermediate-outcomes`; honor it in `toc-results`.
- Resolve the override through the existing `ReportingTocContextService.resolve(yearOverride)` path by mapping `versionId → phase_year` (the `version` row already carries both, plus `toc_pahse_id`).

## 6. Non-Goals

- No change to the **Results tab**, the admin **Phases** table, or how the active phase is configured.
- No multi-phase comparison view (one phase at a time).
- No URL deep-linking of the selected phase (recorded as a MAY for specify to price; not required).
- No touching of the two documented W12 residuals (meter vs matrix `status_id != 4` / `result_level` join) — same-phase semantics stay as they are.

## 7. Affected Users, Systems, And Specs

- **Users:** SP leaders / viewers of the Overview (read-only benefit); no admin impact.
- **Systems:** `dashboard-lab` component + `results-api.service`; RFR controller/service + `ReportingTocContextService`.
- **Specs:** builds directly on archived `bugfix/w12-overview-phase-origin-alignment` (versionId plumbing, versioned cache) and `changes/overview-toc-map` (ToC card). No open spec overlaps.

## 8. Visual Reference

- Source: User-provided screenshot (admin Phases table — how phases actually work)
- Location: `docs/specs/changes/overview-phase-filter/reference/admin-phases-table.png`
- Notes: shows phases as first-class rows — id (36 = Reporting 2026), reporting year, portfolio (2022-2024 vs 2025-2030), **ToC phase per row**, Open/Closed status. Two design facts follow: (a) the selector must offer only the SP's portfolio phases; (b) selecting a phase must also switch the **ToC context** to that row's ToC phase, not just the result counts. No new-UI mockup needed — the selector reuses existing PrimeNG select patterns already on the page family.

## 9. Requirement Delta Preview

### ADDED
- Phase selector on the Overview, defaulting to the Open phase, listing the SP's phases (name + year, Open badge).
- `versionId` support on the 3 ToC-family endpoints (2 new params, 1 honored-but-unused param wired through).
- Per-phase client caching + empty states for closed phases with sparse data.

### MODIFIED
- All four Overview loaders read the phase from one selection signal instead of three implicit resolutions.
- `GET_ScienceProgramsProgress()` client wrapper gains an optional `versionId`.
- `loadBilateralRows` becomes phase-reactive (closes the recorded W12 follow-up).

### REMOVED
- None. Absent/untouched selector ⇒ byte-identical behavior to today.

## 10. Approach Options

| Option | What | Trade-off |
|---|---|---|
| **A. Partial (client-only)** | Selector drives only meter/matrix/bilaterals (params exist); ToC map stays pinned to active phase | Smallest, but the page silently mixes two phases — worse than no filter |
| **B. Full versionId standardization** ✅ | Selector drives all 4 families; server ToC endpoints accept `versionId` and derive ToC context from the phase row | ~2 endpoints touched + 1 mapping; consistent page, kills the `year.active` divergence risk for this page |
| **C. Global app-level phase switcher** | Header-level phase context for the whole RFR module | Right long-term shape, but cross-cutting (routing, every tab) — 4-5× the scope for the same Overview benefit |

## 11. Recommended Approach

**Option B.** It is the smallest change that keeps the page **internally consistent** (one phase everywhere — mixing phases per card is a data-integrity trap for readers), reuses every piece W12 already built (`versionId` plumbing, versioned cache, phase-preferring resolution), and is purely additive server-side (optional params defaulting to today's behavior). Option C can layer on top later without rework — the selection signal becomes its consumer.

## 12. Risks, Dependencies, And Open Questions

| # | Kind | Item |
|---|---|---|
| R1 | Risk | Signal-reactivity regressions around `reportingCurrentPhase` — **KZ-W12-2 applies verbatim**: every computed/effect deriving from the phase must also read `reportingPhaseVersion()`; the new selection signal must not reintroduce the cache-HIT staleness class |
| R2 | Risk | Closed phases can have sparse/zero data → every card needs its empty state verified per phase (heatmap, meter, ToC map muted nodes) |
| R3 | Risk | `versionId → phase_year` mapping: two phases of the same portfolio could in theory share a `phase_year`; the mapping must go through the version row itself, never year-only equality |
| D1 | Dependency | `sp.versions` payload must carry name/year/status for the dropdown labels — verify; if it lacks `Open/Closed`, derive from `reportingCurrentPhase` equality |
| OQ1 | Open question | Should the selection persist across navigation (per-session) or reset to Open on each visit? Proposal default: reset (predictable) |
| OQ2 | Open question | Deep-link `?phase=` in the URL — MAY, priced at specify |

## 13. Success Criteria

1. With the selector untouched, the Overview is **byte-identical** to today (active/Open phase everywhere) — verified against the live 11=11=11 SP04 baseline.
2. Selecting *Reporting 2025* re-renders all four card families with that phase's data (matrix counts, meter, bilateral cards, ToC progress) — no card left on 2026.
3. Switching back and forth serves correct data from cache without staleness (KZ-W12-2 class covered by tests).
4. No endpoint changes behavior when `versionId` is absent (regression suites stay green).

## 14. Next Step

```text
/akili-specify changes/overview-phase-filter
```

Standard depth (touches 2 packages + an API contract; not Lite). The `versionId → ToC context` mapping and the reactivity work are the correctness-critical pieces — specify should route their tasks at high effort per the registry's dial.
