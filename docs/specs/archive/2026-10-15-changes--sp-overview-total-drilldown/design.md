# Design — SP Overview: Total General reconciles + drill-down

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `changes/sp-overview-total-drilldown` |
| Depth | Standard |
| Requirements | `requirements.md` (STD-R-1 … STD-R-5) |
| Skills | `angular-developer`, `tailwind-design-system`, `tdd` (math/predicate), `frontend-design` (bar) |
| Status | approved (2026-10-15) |

## 2. Executive Summary

Client-only change in three places: (1) `program-overview` sums three figures, renders a DOM stacked bar and emits a typed "open segment" intent; (2) the `dashboard-lab` host turns that intent into navigation (Results tab or Bilateral review tab), bypassing the AoW-scope stamping; (3) `programme-results` gains a `replication` filter dimension wired through the existing filter service, query-param map, URL effects, popover and chips.

## 3. Architecture Overview

```
program-overview (presentational)
  totalBreakdown input ──► programResultsTotal = r + n + p          (STD-R-1)
                       ──► totalSegments computed (kind, count, pct, color)  (STD-R-2)
  row / segment click ──► output openTotalSegment(kind)              (STD-R-3)
        │
dashboard-lab host  onTotalSegment(kind)
  'replicated' | 'new' ──► /entity-details/:code/results
                           ?origin=W1/W2&replication=<kind>&phase=<effective label>   (no section)
  'pendingReview'      ──► /entity-details/:code/bilateral-review
                           ?status=pending&phase=<effectiveVersionId>
        │
programme-results  URL→filter effect hydrates selectedReplication
                   filter service predicate on row.isReplicated              (STD-R-4)
```

## 4. Extended Directory Structure (touched files)

| File | Change |
|---|---|
| `dashboard-lab/components/program-overview/program-overview.component.ts` | headline sum; `totalSegments` computed; `openTotalSegment` output; `TotalSegmentKind` type; remove row `setActiveSection` use |
| `…/program-overview.component.html` | headline tooltip; bar markup (skeleton / empty track / segments); rows → navigation buttons with dot + trailing arrow |
| `…/program-overview.component.spec.ts` | rewrite KPI 1 tests (headline 77, bar, emits) |
| `dashboard-lab/dashboard-lab.component.ts` | `onTotalSegment(kind)`; extract `effectivePhaseLabel()` from `onOverviewLink` (reused, not duplicated) |
| `dashboard-lab/dashboard-lab.component.html` | bind `(openTotalSegment)` |
| `dashboard-lab/dashboard-lab.component.spec.ts` | navigation tests |
| `programme-results/services/programme-results-query-params.ts` | `replication` param + map entry |
| `programme-results/services/programme-results-filter.service.ts` | dimension, state, signal, predicate, chips, toggle/clear |
| `programme-results/programme-results.component.{ts,html}` | options, popover control, URL effects both directions |
| `programme-results/**/*.spec.ts` | predicate + URL round-trip tests |
| `program-overview/CLAUDE.md`, `programme-results/CLAUDE.md` | guide updates |

## 5. Data Model

No server / DB change. Client types:

- `TotalSegmentKind = 'replicated' | 'new' | 'pendingReview'`.
- `TotalSegment = { kind, count, widthPct, label, colorClass }` (view model, local to program-overview).
- `ProgrammeResultsReplicationValue = 'new' | 'replicated'` (filter value space; URL value = same string).

## 6. API Design

None. Existing data already on the client: meter `replicatedResults/newResults` (`GET_ScienceProgramsProgress`), `bilateralRows()` status 5 (`GET_ResultToReview`), row `isReplicated` (`GET_AllResultsWithUseRole`). Population parity confirmed by scout: Results tab and meter share `AllResultsByRoleUserAndInitiativeFiltered` (owner-only, `source='Result'` = `origin=W1/W2`); Bilateral review pending and Overview pending share `GET_ResultToReview` status 5.

## 7. Backend Module Design

N/A.

## 8. Frontend / UX Component Architecture

### 8.1 Headline (STD-R-1)
`programResultsTotal = replicated + new + pendingReview`. Still reads only `totalBreakdown` (host computed is already scope-independent — no change there). Tooltip: "Program-wide: W1/W2 replicated + W1/W2 new + W3/Bilateral awaiting review".

### 8.2 Composition bar (STD-R-2)
- Plain DOM flex track (same discipline as the card's other bars — no canvas, per guide "Bars are plain DOM"), height 10px, radius 999, 2px gap between segments, track `bg-white/15`.
- Width per segment = `count / total * 100`, computed in TS (guide's "TS-computed widths" rule). Minimum `6px` via `min-width`; flex-shrink lets others absorb — total proportion error stays ≤ ~1 point at card widths ≥ 320px.
- Segment with count 0 → not in `totalSegments`. Total 0 → empty track, no buttons (S-2.3). Loading → skeleton track (S-2.5).
- Each segment is a `<button>` (`aria-label` "View 62 innovations replicated for update"), tooltip via existing `prTooltip`/`title` pattern used in the card.
- Colors (on gradient `#4a1d96 → #793ce8`), chosen for ≥3:1 vs both gradient ends (measured at T-5: white 11.0/5.8, cyan-300 7.6/4.0, amber-300 7.6/4.0). Cyan-300 vs amber-300 is 1:1 in luminance — accepted 2026-10-15 (2px gap, distinct hues, rows carry count + label):

| Segment | Fill | Note |
|---|---|---|
| Replicated | `white` | ~10:1 / ~5:1 vs gradient ends |
| New | Tailwind `cyan-300` (`#67e8f9`) | `purple-200` rejected: too close to the white neighbour; verify at HITL |
| Awaiting review | Tailwind `amber-300` (`#fcd34d`) | verify at HITL |

  `--pr-chart-*` tokens are purples (`#4a2bb8…#c4a0f7`) and fail 3:1 on this purple card, so default Tailwind palette (already used on this card: `purple-200`, `white/15`) is used. Recorded as DD-4. Final hexes are confirmed by the T6/manual contrast check (requirements §8).
- Row = legend: an 8px dot with the segment color before each label.

### 8.3 Rows (STD-R-3)
- Rows remain `<button>`s (same layout, dot added, trailing `pi-arrow-right` visible on hover/focus), `(click)` → `openTotalSegment.emit(kind)`. `aria-pressed` and `bg-white/15` active state removed; `aria-label` "View N new results".
- Rows and segments emit the same intent — one handler, no duplicate routing logic.

### 8.4 Host navigation (STD-R-3)
`onTotalSegment(kind)` in `dashboard-lab`:
- `replicated` / `new` → `router.navigate([... 'entity-details', code, 'results'], { queryParams: { origin: 'W1/W2', replication: kind, phase: effectivePhaseLabel() } })` — param names via `PROGRAMME_RESULTS_QUERY_PARAM_MAP`. **Does not call `onOverviewLink`**, so no `section` is stamped (S-3.1 AND IT MUST).
- `pendingReview` → `[... code, 'bilateral-review']` with `BILATERAL_REVIEW_QUERY_PARAM_MAP.status = 'pending'`, `.phase = effectiveVersionId()` (omitted when null).
- `effectivePhaseLabel()` is the phase-fallback chain currently inline in `onOverviewLink`, extracted so both paths share it.

### 8.5 Results tab Replication filter (STD-R-4)
- Service: dimension `'replication'`, `selectedReplication = signal<string[]>([])`, state field, predicate: empty or both → pass; `['new']` → `!row.isReplicated`; `['replicated']` → `row.isReplicated`. Unknown values are dropped at hydration (S-4.3) by whitelisting against the value space.
- Chips: label "Replication: New" / "Replication: Previously reported", placed after Funding source in toolbar order; `clearChip`, `clearAll`, `hasActiveFilters` cases.
- Component: static options `[{value:'new',label:'New'},{value:'replicated',label:'Previously reported'}]`; `app-pr-filter-multiselect` in the popover after Funding source; URL→filter effect parses `?replication=`; filter→URL effect writes `joinListParam` (empty → `null`, key removed).
- My results board: shares the service but never hydrates or renders the control → predicate is a no-op there (S-4.5).

## 9. Shared Contracts

- `PROGRAMME_RESULTS_QUERY_PARAM_MAP` gains `replication` (additive; old links unchanged).
- `OverviewLink` is **not** extended — total-segment navigation has its own output (DD-2).

## 10. Design Decisions

| ID | Decision | Rejected alternative | Why |
|---|---|---|---|
| DD-1 | Headline = r + n + pending (status 5 only) | All review statuses 5/6/7 | User decision OQ-1; matches the three visible rows |
| DD-2 | New output `openTotalSegment(kind)` + host `onTotalSegment` | Reuse `openResults`/`OverviewLink` with a `replication` key | `onOverviewLink` stamps the AoW scope as `section`; KPI 1 is program-wide, and the bilateral destination isn't the Results tab |
| DD-3 | Filter on existing row `isReplicated` | Server-side filter param | Data already on client; no API change |
| DD-4 | Segment colors from default Tailwind palette (white / cyan-300 / amber-300) | `--pr-chart-*` tokens | Chart tokens are purples that fail 3:1 on the purple gradient card |
| DD-5 | Results link passes phase **label** (like every other Overview link) | Pass `versionId` for exact match | `versionId` would make the chip read "Phase: 36"; fuzzy year match risk handled by live parity check (STD-R-5) |
| DD-6 | Rows stop toggling the section | Keep toggle + add a separate "view" icon | User asked rows to open the list; two actions on one tiny row is ambiguous |

### Reversion challenges (Step 2.3)

| Reverted behavior | What does removing it break? | Resolution |
|---|---|---|
| STG-R-2 headline = r + n | Only consumer of `programResultsTotal` is this card's headline (grep). Spec `program-overview.component.spec.ts:1059-1092` asserts 69 → rewritten deliberately. The old tooltip "Program-wide W1/W2 results" would become false → replaced (S-1.3) | Addressed |
| SR-164368 row → section toggle (Nicoleta's request) | Users lose the one-click section switch from the card; spec `:1117-1134` asserts it. Section switching still exists in the host Filter popover (`hideInlineFilters` true) and the URL `?section=` | Accepted: Filter popover remains the section control; note in guide. Flag to Nicoleta in the handoff |

## 11. Budget (Step 2.4 — tripwire for `/akili-execute`)

| Metric | Estimate |
|---|---|
| Tasks | 5 |
| LOC (prod + tests) | ~350 (prod ~150, tests ~200) |
| Review rounds | 1–2 |

Matches Standard depth.
