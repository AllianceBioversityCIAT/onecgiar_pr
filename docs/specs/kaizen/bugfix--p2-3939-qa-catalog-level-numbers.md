# Kaizen Entry — bugfix/p2-3939-qa-catalog-level-numbers

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/p2-3939-qa-catalog-level-numbers` |
| Date | 2026-11-23 |
| Branch | qa-development-2026-ss (spec branch: integration pin is `staging`; no shared-file writes) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 3 | tasks.md |
| Reviewer FAIL rework attempts | 0 | execution.md |
| HALTs / FATAL_FAILs / Pivots | 0 / 0 / 0 | execution.md |
| Blockers escalated to user | 1 (P-7: test DB unreachable; settled by user decision) | execution.md — LVL-T-2 |
| Budget tripwire | fired at T-2: ~770 LOC vs ~260 expected (tripwire 400); final ~800; overrun accepted | execution.md — LVL-T-2, LVL-T-3 |
| PRODUCT_BUGs | 0 | test-report.md |
| Validation FAIL / WARN | 0 / 4 (3 fixed, 1 accepted) | validation-report.md |
| Tasks closed under `REVIEW_WAIVED` | 0 | execution.md |
| Tasks closed under `REVIEW_SKIPPED` | 0 | execution.md |
| Escaped defects | 0 | test-report.md / validation-report.md |

## Lessons

- **KZ-bugfix--p2-3939-qa-catalog-level-numbers-1 — The LOC budget priced the tests as one regression spec, while the tasks' own falsifiers required a behavioural case and a mutation per enumerated member.** (Product + Methodology, Medium)
  - Root cause: `design.md` §10 budgeted "tests ~130". `tasks.md` LVL-T-2 required "Run (a) on **each** of the 4 evidence lists and on each of the 3 current-use lists (enumeration-wide)", plus structural guards. That is 7 gates × several fixtures, each needing a mutation-proof assertion. Tests came to ≈ 600 LOC (≈ 75 % of the change), and the tripwire stopped the run at T-2. Related to the earlier test-LOC under-counts (KZ-changes--portfolio-overview-revamp--w3-projects-section-2, KZ-REH-1). The cause here is different: the multiplier is visible in the falsifier text at specify time.
  - Evidence: design.md §10; tasks.md LVL-T-2 Verification; execution.md LVL-T-2 "Running totals vs budget".
  - Standardization: → P1 (local), P2 (upstream)
- **KZ-bugfix--p2-3939-qa-catalog-level-numbers-2 — The Leader offered the user a premise-settling decision built on a secondary source without first checking it against the code's own citation of the primary.** (Methodology, Low)
  - Root cause: the Implementer found the function body only in migration `1769532691577-CreatIPSRGreen.ts` (≈108 lines), and the Leader framed a "complementary not checked" amendment from it. `ipsr-step-3.ts` already cited the deployed function at VS3:231-264, a longer body read on 2026-10-09. One line-number comparison would have shown the migration was stale. The user answered once on the wrong premise; the Leader withdrew the answer before any edit. Cost: one extra HITL round, no rework.
  - Evidence: execution.md — LVL-T-2, "Leader correction (same day)".
  - Standardization: → P3 (upstream only)

## Noted, not a lesson

- The P-12 consumer grep searched for the changed keys, not the version literal. Version pins in `qa-catalog.service.spec.ts:173` and `qa-catalog.shape.spec.ts:1029` were found and fixed in T-3 with no rework. Same area as KZ-bugfix--toc-kpi-optional-green-check-1 (revision bumps): a "version bump" task should grep the old `year.revision` literal across specs.
- The `akili-tester` wrapper is bound to `sonnet`, which is also the Implementer model. `/akili-test` therefore cannot use it under author ≠ tester and ran inline on `opus`. If this recurs, the registry's Claude Code Tester binding should differ from the T2 Implementer.
- `npm run migration:check` needs a DB connection, so agents cannot run it (recurs from bugfix--toc-kpi-optional-green-check). LVL-NFR-2 was verified by inspection.
- CRLF working copy vs LF snapshot. The T-3 Implementer used a temporary LF `git worktree` with a `node_modules` junction, which worked. Remove the junction (`rmdir`) before `git worktree remove` so the real `node_modules` is not deleted.
- Implementer spawn sizes: T-1 140 calls / ~238k tokens; T-2 47 calls / ~220k; T-3 37 calls / ~138k.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` (Budget section) |
| Edit | When a task's Falsifier says "each" / "enumeration-wide" over N members, budget test LOC as N × (fixtures + one mutation-proof assertion), not as one regression spec. |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | upstream |
| Target | methodology |
| Edit | `/akili-specify` Step 2.4 (budget): derive expected test LOC from the tasks' Falsifier enumerations (members × cases), and flag a budget whose test share is below the falsifier count. |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | upstream |
| Target | methodology |
| Edit | `/akili-execute` Pivot / blocker handling: before offering the user a decision based on a secondary source (migration, dump, doc) for a deployed artifact, compare it with the code's own citations of the primary (line ranges, dates). If they disagree, say so in the question. |
| Severity | Low |
| Status | pending |
