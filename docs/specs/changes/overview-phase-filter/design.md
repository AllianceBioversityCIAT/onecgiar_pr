# Design: Overview Phase Filter

## 1. Document Control

| Field | Value |
|---|---|
| **Spec Path** | `docs/specs/changes/overview-phase-filter/` |
| **Type** | Change · Depth Standard · Approval Mode gated |
| **Status** | Draft — pending Phase 2 approval |
| **Date** | 2026-08-28 |
| **Requirements** | `requirements.md` OPF-R-1..7, OPF-N-1..3 |
| **Baseline** | `docs/trd/trd.md` (modules, W-flows), `docs/ux-ui/design.md` §7 tokens / §8 components |

## 2. Executive Summary

One selection signal in `dashboard-lab` becomes the **single phase resolver** every Overview loader consumes; per-phase `Map` caches keyed `code::versionId` make race conditions structurally harmless; the server gains a `versionId` override on the ToC family that resolves the ToC context **from the version row itself**. Everything is additive — absent parameter ⇒ today's behavior (OPF-R-3).

## 3. Architecture Overview

```
[phase dropdown] ──▶ selectedVersionId (signal, null = follow Open)
                          │
                          ▼
        effectiveVersionId (computed; also reads reportingPhaseVersion())   ← DD-1
                          │ one value, four consumers
   ┌──────────────┬───────┴───────┬──────────────────┐
   ▼              ▼               ▼                  ▼
 meter        indicator matrix  W3/bilaterals     ToC family
 progress?    contribution-     ResultToReview    toc-results{,/2030,/intermediate}
 versionId    summary?versionId  (versionId,'all') ?versionId          ← DD-2 (server)
   │              │               │                  │
   └── per-phase Map caches, key `code::versionId`; render reads ONLY the
       current key's entry — late responses land in their own key (DD-4)
```

## 4. Extended Directory Structure

No new files required beyond specs/tests. Touched paths:

| Package | Path | Change |
|---|---|---|
| client | `pages/dashboard-lab/dashboard-lab.component.ts/.html` | selection signal, resolver, dropdown, cache rewire |
| client | `shared/services/api/results-api.service.ts` | `versionId` on 4 wrappers |
| server | `api/results-framework-reporting/results-framework-reporting.controller.ts` | optional `versionId` on 3 ToC routes |
| server | `api/results-framework-reporting/results-framework-reporting.service.ts` | pass override to ToC context |
| server | `api/results-framework-reporting/reporting-toc-context/reporting-toc-context.service.ts` | version-row override resolution |

## 5. Data Model

No schema changes. Read-model facts the design relies on:

- `version` row = phase: `{id, phase_name, phase_year, toc_pahse_id, status}`; exactly one Open reporting phase (`$_findActivePhase`).
- `sp.versions[]` (from `science-programs/progress`) = `{versionId, phaseName, phaseYear, totalResults, statuses[]}` — **but the server filters rows to ONE effective version per request** (results.service.ts ~:1817), so the array carries only the requested phase. Phase switching therefore refetches; it cannot read other phases from the cached default payload.

## 6. API Design

| Endpoint | Change | Default (param absent) |
|---|---|---|
| `GET get/science-programs/progress` | none (already accepts `?versionId`) — client wrapper gains the param | active phase — unchanged |
| `GET programs/indicator-contribution-summary` | none (done in W12) | active phase — unchanged |
| `GET toc-results` | honor existing `year` → superseded by new optional `versionId` (year kept for back-compat) | `year.active` context — unchanged |
| `GET toc-results/2030-outcomes` | + optional `versionId` | unchanged |
| `GET toc-results/intermediate-outcomes` | + optional `versionId` | unchanged |

Contract per OPF-R-6: `versionId` non-numeric or unknown → 4xx via the existing `throwServiceError` pattern; controllers normalize exactly like `getProgramIndicatorContributionSummary` does today (exemplar).

## 7. Backend Module Design

- **`ReportingTocContextService`** gains a version-row override path: given a `versionId`, load the `version` row and derive `{reportingYear: phase_year, phaseUuid: toc_pahse_id}` **directly from that row** — never via year-equality lookup (closes risk R3, satisfies OPF-R-6 "AND IT MUST"). The existing `resolve(yearOverride)` path stays untouched for current callers.
- The three ToC service methods accept the optional normalized `versionId` and pass it through; absent → current `resolve()` behavior byte-for-byte.
- Unit specs follow the KZ-W12-1 rule: any raw SQL touched asserts placeholder-count === params length; no `?` in SQL comments.

## 8. Frontend / UX Component Architecture

- **Selector** (OPF-R-1): PrimeNG select in the Overview header band (next to the cycle eyebrow that already reads `reportingCurrentPhase`), tokens per `docs/ux-ui/design.md` §7; options = **`PhasesService.phases.reporting` filtered to the selected program's portfolio** (NOT `sp.versions` — §5 records that the progress payload carries exactly one version per request, so it can never populate a selector; corrected 2026-08-28 after the OPF-T-4 Reviewer FAIL), sorted `phase_year` desc; option label "«phase_name» · «phase_year»"; an "Open" tag on the phase whose `status` is open. The portfolio filter is what enforces OPF-R-1's BUT-clause. Keyboard/reader semantics come free with the component (OPF-N-2).
- **Selection state** (DD-1): `selectedVersionId` signal, `null` = follow the Open phase. `effectiveVersionId` computed = selection ?? today's resolution (`latestVersion(sp) ?? reportingCurrentPhase.phaseId`) **and reads `reportingPhaseVersion()`** so a late-arriving phase converges (KZ-W12-2, OPF-R-4). Selection resets to `null` on program change and on component init (OQ1 default; OPF-R-7 deferred).
- **Loaders**: all four families take their phase from `effectiveVersionId()` — the three implicit resolutions in `loadBilateralRows`, `refreshSelectedSummaries`, and the ToC loaders collapse into this one source. The meter refetches `GET_ScienceProgramsProgress(versionId)` only when selection ≠ default; the default path keeps using the already-loaded shared payload (OPF-N-1: zero extra requests untouched).
- **Caches & race guard** (DD-4): every phase-scoped store becomes (or already is) a `Map` keyed `code::versionId` (`summaryCacheKey` is the exemplar). Renders read through the *current* key only; a late phase-B response writes B's key and is invisible under A — no cancellation logic needed (OPF-R-4 BUT-clause).
- **States**: per-card loading while a key's fetch is in flight; existing empty states cover sparse phases (OPF-R-5) — verified per card at HITL (defect class D4).

## 9. Shared Contracts / Package Extensions

None. No shared package changes; the client wrappers' new optional parameters are additive.

## 10. Design Decisions

| ID | Decision | Rationale / rejected alternative |
|---|---|---|
| DD-1 | **One resolver computed** consumed by all loaders | Three implicit resolutions caused the W12 divergence class; cites KZ-W12-2. Rejected: per-loader resolution (status quo) — re-invites drift |
| DD-2 | ToC context override resolves **from the version row** (`toc_pahse_id`, `phase_year`) | OPF-R-6; rejected: mapping `versionId → year → resolve(year)` — reintroduces year-equality ambiguity (risk R3) |
| DD-3 | Meter switches phase by **refetching with `versionId`** | Server payload carries one version per request (verified §5); rejected: multi-version payload — changes the home page contract, violates OPF-R-3 |
| DD-4 | **Key-scoped caches as the race guard** (read-through-current-key) | Structurally stale-free, no cancellation machinery; exemplar already shipped (`summaryCacheKey`) |
| DD-5 | Selection **resets each visit**; `?phase=` deep-link deferred | OQ1 default per proposal; MAY out of budget |
| DD-6 | No new component — dropdown lives in `dashboard-lab` band | Single consumer today; extraction is trivial later if the Results tab wants it |

**Reversion challenge (Step 2.3):** skipped with cause — every DD is additive; nothing shipped is removed, disabled, or inverted.

## 11. Budget (Step 2.4 — tripwire for `/akili-execute`)

| Metric | Expected |
|---|---|
| Tasks | 5 |
| LOC (prod + tests) | ~520 |
| Review rounds | 5 (1 per task) |

Depth re-check: matches Standard (multi-package, API contract, no migrations). No depth change.
