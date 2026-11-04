# Tasks — Overview W1/W2 Contributor Badge

Links: `requirements.md` · `design.md` (same folder).

- **Status:** implemented — pending manual browser verification and commit/PR
- **Owner:** santiago.sanchez@cgiar.org

## Pre-flight

- [x] `requirements.md` / `design.md` approved (Lite, single-shot with this run).
- [ ] No conflicting in-flight spec on `bilateral-overview/` (re-check: `overview-replicated-new-badges` just merged its code, not yet committed — coordinate so both land together or sequentially, not conflicting).

## Task list

### `BOV2-T-1` — Add center-wide W1/W2 contributor count and badge [x]

- **Type:** `client`
- **Description:** Extend `buildTotalResultsKpi` (`bilateral-overview.aggregate.ts`) with `w1w2ContributorCount` — `row.source !== 'API' && Number(row.is_leading_result) !== 1` — in the existing single loop. Add the field to `OverviewTotalResultsKpi`. Render a third badge on the "Total results" card (`bilateral-overview.component.html`), `pi-link` icon, same conditional token pattern as the replicated/new badges (`text-[var(--pr-color-secondary-400)]` at count > 0, else `text-[var(--pr-color-accents-4)]` — apply this from the start, this is the exact defect `BOV-T-1`'s attempt 1 failed review on). Label: `{{count}} {{count === 1 ? 'result' : 'results'}}`, mirroring `bilateral-projects-panel.component.html:297` exactly. Update `aria-label` to include the new count. Update `bilateral-overview/CLAUDE.md` in the same commit (re-stamp `Verified:`).
- **Implements:** `BOV2-R-1`, `BOV2-R-2`, `BOV2-R-3`, `BOV2-R-4`
- **Files:**
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-overview/bilateral-overview.aggregate.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-overview/bilateral-overview.aggregate.spec.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-overview/bilateral-overview.component.html`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-overview/bilateral-overview.component.spec.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-overview/CLAUDE.md`
- **Depends on:** — (assumes `BOV-T-1`'s badges are already in place on disk, which they are)
- **Estimate:** `S`
- **Verification:**
  - **Falsifier:** fixture with 4 combinations (W3/lead, W3/contributor, W1W2/lead, W1W2/contributor, 2 rows each = 8 total) → `w1w2ContributorCount === 2` (only the W1W2/contributor rows). If a W3 row or a W1W2-lead row is counted, the task is wrong.
  - **Red run:** `npx jest --testPathPattern="bilateral-overview.aggregate.spec|bilateral-overview.component.spec" --silent --reporters=summary --no-coverage` (from `onecgiar-pr-client/`) — new assertions must fail before the change, pass after.
  - **Disqualifier:** if `is_leading_result` or `source` are found missing on any Overview-tab row at implementation time (contradicting the already-verified `BOV-P-1`/`BOV-P-2` premises from the prior spec), stop and re-specify.
- **Definition of done:**
  - [x] Lint clean: `npx ng lint --quiet`.
  - [x] Tests added/updated, scoped run green (73/73).
  - [x] `CLAUDE.md` updated + `Verified:` re-stamped (took 3 attempts: line-cap FAIL, then a factual-accuracy FAIL introduced while trimming, then PASS — see `execution.md`).
  - [x] Token conditional applied from the first attempt (did not repeat `BOV-T-1`'s attempt-1 mistake).
  - [ ] **Not done — accepted risk:** manual browser check + visual side-by-side, deferred per `requirements.md` §5 (no automated gate), same as `BOV-T-1`. Recommended before merge.

## Dependency graph

```
BOV2-T-1  (single task, no dependencies)
```
