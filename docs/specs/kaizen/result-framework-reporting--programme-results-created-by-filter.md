# Kaizen Entry — result-framework-reporting/programme-results-created-by-filter

## Document Control

| Field | Value |
|---|---|
| Spec Path | `result-framework-reporting/programme-results-created-by-filter` · Prefix `CBF` |
| Date | 2026-09-03 |
| Branch | `qa-development-2026` — **spec branch** (default pin `master`); every shared-file edit below is recorded pending, none applied |
| Archive Run | 1 |
| Approval Mode | `gated` · Depth Lite |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 2 (`CBF-T-1`, `CBF-T-2`) both `[x]` | `tasks.md`, `execution.md` |
| Reviewer FAIL rework attempts | **1** (T-2 attempt 1) | `execution.md` — Task `CBF-T-2` Attempt 1 |
| HALTs / FATAL_FAILs | 0 | `execution.md` |
| Pivots | 0 | `execution.md` |
| PRODUCT_BUGs | n/a — no `test-report.md` (accepted; scoped Jest + HITL in execute) | archive-summary §4 |
| Judgment-day severe findings | 0 (no proposal / no judgment) | — |
| Validation FAIL / WARN | n/a — no `validation-report.md` (accepted) | archive-summary §8 |
| `/akili-quick` escalations | 1 (triviality gate: new filter state + URL) | session specify; not in `quick-log.md` |
| Drift attributable | none — `docs/specs/audits/` holds no report | — |
| Budget | 2 tasks / ~160 LOC / **1 review round**; T-2 used **2** (FAIL then PASS) | `design.md` §1, `execution.md` T-2 |

## Lessons

- **KZ-result-framework-reporting--programme-results-created-by-filter-1 — When a task extends a shared exported symbol, the Verification command must include every spec that pins that symbol.** (Product + Methodology, Medium)
  - Root cause: `CBF-T-2` added `createdBy` to `PROGRAMME_RESULTS_QUERY_PARAM_MAP`. The task’s Verification listed only the three `programme-results*` suites, which went green (150/150). `dashboard-lab.scope.spec.ts:318` imported the same map and pinned `toEqual(['phase','status','category','origin','center'])` — a previously-green suite flipped red. Specify never grepped consumers of the exported map, so the Implementer could not have seen the FAIL without leaving the work order.
  - Evidence: `execution.md` — Task `CBF-T-2` Attempt 1 (Violated Rule: Reviewer Stability & Integrity; Remediation: unpin the exhaustive key list). Attempt 2: 23/23 sibling + 150/150 owner suites.
  - Standardization: → P1 (local `docs/specs/general-setup/task.md`) · upstream to AKILI (`/akili-specify` task Verification / Files expected).

## Noted, not a lesson

- `/akili-quick` → specify is the intended gate for a new filter dimension; not MUDA.
- Budget 1→2 review rounds is the same FAIL as the lesson — not a second root cause.
- Popover Jest asserts parent/aria, not Tab/Enter; HITL covered keyboard open. Sub-threshold.
- `docs/specs/kaizen-log.md` is absent; no digest recurrence target exists yet.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/task.md` — after the **Files (expected)** bullet in §3 |
| Edit | Add: "If the change extends a shared exported symbol, grep `*.spec.ts` for that symbol at specify time and list every consumer spec that pins it under Verification — the owner suite alone is not evidence." |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/programme-results/CLAUDE.md` — Contract |
| Edit | Data-service options bullet: add `centerOptions` / `createdByOptions`. Filter-service state bullet: replace `selectedStatus/Category/Origin` with `selectedPhase/Status/Category/Origin/Center/CreatedBy`. |
| Severity | Low |
| Status | pending |
