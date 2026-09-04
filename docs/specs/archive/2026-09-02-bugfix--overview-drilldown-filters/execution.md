# `bugfix/overview-drilldown-filters` — Execution Log

## 1. Document Control

| Attribute | Value |
|---|---|
| **Spec** | `docs/specs/bugfix/overview-drilldown-filters/` |
| **Approval mode** | gated |
| **Branch** | `qa-development-2026` |
| **Triad** | Leader: session model (T1) · Implementers: `akili-implementer` (T2) · Reviewers: `akili-reviewer` (T3, read-only) |
| **Budget (design §7)** | 3 tasks · ~60–90 LOC · 1 review round per task |
| **Pre-flight** | Confirmed root cause and reproduction documented; no DB migrations; client-only scope. |

## 2. Task Execution History

### `ODF-T-1` — Add Funding Source (`origin: 'W1/W2'`) to W1/W2 Link Factories

- **Status:** PASS (attempt 1) · 2026-09-02 · Implementer: `akili-implementer-writer` · Reviewer: `akili-reviewer`
- **Files:** `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.ts`
- **What:**
  - In `buildOverviewStatusSegments`: `linkOf` now produces `{ origin: 'W1/W2', status: statusNameOf(statusId) }` for all segments with count > 0.
  - In `overviewW12Heatmap`: cells for columns 0–2 now emit `{ origin: 'W1/W2', category: item.resultTypeName, status: cols[c] }`. Column 3 ('Other') preserved as `null`.
- **Verification:** `program-overview.charts.spec.ts` (80/80 passed); `ng lint` clean.
- **Reviewer Verdict:** **STATUS: PASS** — link factories confirmed emitting `origin: 'W1/W2'`; column 3 remains `null`; no regressions.

### `ODF-T-2` — Propagate Effective Overview Phase in `onOverviewLink`

- **Status:** PASS (attempt 1) · 2026-09-02 · Implementer: `akili-implementer-writer` · Reviewer: `akili-reviewer`
- **Files:** `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.ts`
- **What:**
  - In `onOverviewLink`: if `queryParams.phase` is not set by `link.phase`, resolves `effectivePhase` using fallback cascade: `homeSE.overviewSelectedPhase()`, `latestVersion.phaseName`, `phaseYear`, `reportingCurrentPhase.phaseName`.
  - Injects `effectivePhase` into `queryParams.phase`.
- **Verification:** `ng lint` clean; `tsc --noEmit` clean.
- **Reviewer Verdict:** **STATUS: PASS** — correctly checks absence of phase, resolves via cascade, preserves explicit `link.phase`, preserves all other dimensions (`origin`, `status`, `category`, `center`).

### `ODF-T-3` — Unit & Regression Test Suite for Overview Deep-Links

- **Status:** PASS (attempt 1) · 2026-09-02 · Implementer: `akili-implementer-writer` · Reviewer: `akili-reviewer`
- **Files:** `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.spec.ts`, `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.scope.spec.ts`
- **What:**
  - Updated status segment link assertions to verify `origin: 'W1/W2'`.
  - Updated heatmap cell link assertions to verify `origin: 'W1/W2'`.
  - Updated `onOverviewLink` assertions to verify effective `phase` is propagated into `queryParams`.
  - Added dedicated regression tests for `ODF-R-3` and `ODF-R-4`:
    - `onOverviewLink preserves explicit link.phase when present (ODF-R-3)`.
    - `onOverviewLink uses homeSE.overviewSelectedPhase when set (ODF-R-3, ODF-R-4)`.
  - Updated `dashboard-lab.scope.spec.ts` to include `origin: 'W1/W2'` on `overviewStatusSegments` expectations.
- **Verification:**
  - `dashboard-lab` tests: 7/7 suites passed, 157/157 tests green.
  - `programme-results` tests: 3/3 suites passed, 126/126 tests green.
  - `ng lint` clean.
- **Reviewer Verdict:** **STATUS: PASS** — tests exhaustively cover effective phase resolution, explicit phase preservation, and `origin: 'W1/W2'` on all W1/W2 links. All assertions passing.



