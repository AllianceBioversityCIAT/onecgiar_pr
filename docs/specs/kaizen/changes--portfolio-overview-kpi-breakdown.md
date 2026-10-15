# Kaizen Entry — changes/portfolio-overview-kpi-breakdown

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-overview-kpi-breakdown` |
| Date | 2026-10-14 |
| Branch | qa-development-2026-ss |
| Archive Run | 1 |
| Approval Mode | gated (the user said "continúa hasta que termines" after T-2) |

**Branch Context:** this run is on a spec branch, so every item below is recorded as pending and no shared file was edited. The current branch is `qa-development-2026-ss`, and the default branch is pinned to `master`.

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 3 | tasks.md |
| Reviewer FAIL rework attempts | 1 (T-2 attempt 1, 2 issues) | execution.md — POVKB-T-2 |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | — |
| PRODUCT_BUGs | n/a (no test-report) | — |
| Judgment-day severe findings | 0 | — |
| Validation FAIL / WARN | n/a (no validation-report; accepted) | archive-summary.md §4 |
| Budget | ~220 LOC estimated → 333 changed (+51%), under the 350 tripwire | execution.md §3 |

## Lessons

- **KZ-changes--portfolio-overview-kpi-breakdown-1 — A task description that restates design visuals per element can drop one, and the brief then contradicts the design.** (Product, Medium)
  - **Root cause.** The design and the task disagreed:
    - `design.md` §6 says the New/Replicated separator applies to every card, with a translucent tint on card 1.
    - `tasks.md` POVKB-T-2 restated the visuals card by card. It said "card 1 … the 4 breakdown rows" and "cards 2 and 3 … an `hlm-separator`".
    - The Leader's brief then paraphrased card 1 as "4 plain rows". The Implementer followed the task text, and the Reviewer failed it against design §6.
  - **Evidence:** execution.md — POVKB-T-2 Attempt 1 FAIL, issue 1 (Violated Rule: design.md §6).
  - **Standardization:** → P1.

## Noted, not a lesson

- **Visual check blocked by the admin guard.** The first T-3 visual check was blocked because `CheckAdminGuard` needs `role_id = 1` and the local user (575) is Guest. The spec did not name the role the check needed. A future note in `docs/infrastructure.md` §6 could say "admin-guarded routes need an admin login for visual checks". Below the lesson bar: it happened once and cost one user round trip.
- **Fixture values not distinct.** The T-2 fixture buckets were not pairwise distinct (2 = 2), even though the task's Falsifier demanded distinct values. The Reviewer caught it. The rule was already written; the issue was compliance, not a gap.
- **Diff placeholder in the Reviewer brief.** The T-1 Reviewer brief went out with a diff placeholder, and a correction message fixed it before the audit. Writing the diff to the job's tmp file and pointing the Reviewer at it worked for both tasks.
- **Raw SQL vs the screen.** A raw-SQL cross-check differs from the screen because of the `get/all/roles/filter` endpoint scope: it requires an active submitter initiative (`initiative_role_id = 1`) and excludes result types 10 and 11. This is recorded in the archive summary.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/task.md` (task Description guidance) |
| Edit | A task Description that touches UI MUST cite the design section (e.g. "per design §6") rather than restate its visual details per element. If it does restate them, the restatement MUST cover every element the design names. |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-results--program-full-names-labels-1` |
| Edit | Add the source `changes/portfolio-overview-kpi-breakdown` as a recurrence: `npx eslint` failed again because the client has no `eslint.config.*`, and the T-1 Implementer substituted `ng lint --lint-file-patterns`. This is the fourth spec. |
| Severity | High |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-results--program-full-names-labels-2` |
| Edit | Add the source `changes/portfolio-overview-kpi-breakdown` as a recurrence: ~220 LOC estimated vs 333 actual, with about half of the added lines in specs. It stayed under the tripwire. |
| Severity | Medium |
| Status | pending |
