# Kaizen Entry — bilateral/replicated-innovations-2026-pa/center-overview-no-project-line

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bilateral/replicated-innovations-2026-pa/center-overview-no-project-line` |
| Date | 2026-10-22 |
| Branch | qa-development-2026-ss (spec branch, since `Default Branch: master`; every shared-file write below is recorded, not applied) |
| Archive Run | 1 |
| Approval Mode | gated (owner: "continue until you finish" after T-1) |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 5 of 5 (4 code + 1 HITL) | tasks.md |
| Reviewer FAIL rework attempts | 0 (every task PASS on attempt 1) | execution.md |
| HALTs / FATAL_FAILs / Pivots | 0 / 0 / 0 | execution.md |
| PRODUCT_BUGs | n/a (no `/akili-test`; absence accepted) | — |
| Validation FAIL / WARN | n/a (no `/akili-validate`; absence accepted); live T-5 12/12 ✅ | execution.md CNP-T-5 |
| Budget | 5 tasks as planned, 1 review round each, +527/−37 lines vs ~300 LOC (production ≈110 as estimated; overrun is tests + guides) | execution.md Summary |
| Runtime issues | `npx eslint` in the task rules fails again (no flat config); PRTest slow on the first T-5 attempt; low-memory reap of a background watcher | execution.md CNP-T-1, CNP-T-5 |

## Lessons

No new lesson. The one recurring root cause is recorded as a `digest-update` (P2), not as a duplicate.

## Noted, not a lesson

- The `tasks.md` §2 rules prescribed `npx eslint <files> --quiet` again, written the same day the sibling spec recorded the lint lesson. Its P1 is still pending, so specify had no working command to copy. All 4 Implementers fell back to `ng lint --lint-file-patterns=<file>` (repeated `=` form; the space-separated form errors). → P2.
- The test LOC overran again (~1.8×) with production on estimate. This is the same shape as `center-overview-w3-scope` and `bugfix--kpi-count-reconciliation`: the specify budget under-counts test LOC for falsifier-heavy tasks.
- **Worked well:** a `mkdir`-style lock directory in the scratchpad let two Implementers run in parallel while honoring "one Jest run on the machine at a time". It is worth reusing as the default brief text for parallel waves.
- **Worked well:** with the Chrome window maximized, `resize_window` is a no-op. A fixed-width same-origin iframe gave measurable 899/375 px layout checks (bounding boxes, scroll overflow) without resizing.
- The T-1 Reviewer's forward pointers (the T-2 cross-check, T-3 `group` forcing, the T-4 real signal) were copied into the later briefs and all closed. The carry-forward rule worked as designed.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/CLAUDE.md` |
| Edit | Trim to ≤ 120 lines per `onecgiar-pr-client/docs/COMPONENT-DOCS.md` §4. Move the BSC sort-key narrative (Columns) and the PMF/BSF filter history to Jira, keep the invariants, and re-stamp `Verified:`. It was 176 lines at HEAD before this spec and is 185 now. |
| Severity | Low |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-bilateral--replicated-innovations-2026-pa--center-overview-w3-scope-1` |
| Edit | Add `bilateral/replicated-innovations-2026-pa/center-overview-no-project-line` as a source (4th occurrence: CDK → admin-login → CWS → CNP). Note: "the scoped form that works without env vars is `npx ng lint --quiet --lint-file-patterns=<file>` (repeat the flag per file)". Raise to Medium: it recurs in every new client spec until its P1 lands. |
| Severity | Medium |
| Status | pending |
