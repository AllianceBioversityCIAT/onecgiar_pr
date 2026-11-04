# Kaizen Entry — bugfix/sidebar-scroll-zoom-overflow

## Document Control

| Field | Value |
|---|---|
| Spec Path | `bugfix/sidebar-scroll-zoom-overflow` |
| Date | 2026-11-03 |
| Branch | `qa-development-2026-mc-2`, a spec branch (≠ pin `master`/`staging`). Every shared-file edit is recorded as pending; nothing is applied |
| Archive Run | 1 |
| Approval Mode | gated |
| Archive | `docs/specs/archive/2026-11-03-bugfix--sidebar-scroll-zoom-overflow/` |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 2 of 3 (SBZ-T-1, SBZ-T-2 done; SBZ-T-3 manual, accepted as open follow-up) | tasks.md |
| Reviewer FAIL rework attempts | 2 (SBZ-T-2 attempts 1 and 2 — both evidence/harness gaps, fix logic unchanged throughout) | execution.md — SBZ-T-2 |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 — Reviewer explicitly ruled attempt 1's FAIL "not a Pivot" (harness defect, not a design/requirement error) | execution.md — SBZ-T-2 attempt 1 |
| PRODUCT_BUGs | 0 | — |
| Judgment-day severe findings | 3 severe (round 1) + 1 severe/1 High (round 2), all resolved and re-verified before `tasks.md` was written | judgment.md |
| Validation FAIL / WARN | not run as a separate phase; accepted (verification performed inline per task) | archive-summary.md §8 |
| Budget | 2/3 tasks (SBZ-T-3 accepted follow-up) · LOC ~375 vs ~100–180 (over) · review rounds: SBZ-T-2 alone 3 vs ≤2 budget (exceeded by 1, user-approved both times) | execution.md Document Control |

## Lessons

- **KZ-bugfix--sidebar-scroll-zoom-overflow-1 — A CT harness mounted the sidebar without the production wrapper that sets the CSS custom property the test measures, turning the width-regression check into a no-op.** (Product + Methodology, Medium-High)
  - **Root cause:** `sidebar-root-zoom-reachability.cy.ts`'s original `mountSidebar()` mounted `ReportingNavSidebarComponent` directly. In production, `app.component.html:11-13` always wraps it in `<div hlmSidebarWrapper sidebarWidth="260px" sidebarWidthIcon="64px">`, which is what actually binds `--sidebar-width`. Without that wrapper, `width: var(--sidebar-width)` (no fallback) resolved to `auto`, so the harness's width assertion measured content-driven width under every candidate — it could not discriminate the accepted fix from the rejected counter-zoom candidate regardless of which one shipped. This cost a full Reviewer FAIL round (attempt 1) to re-derive wiring that should have been checked when the test was authored.
    - This is also the *second* time this exact spec's lifecycle produced this defect class: `judgment.md`'s F-1 (design-time Judgment Day) already flagged "a test that cannot fail" once, and a materially identical gap reappeared in execution despite that history.
  - **Evidence:** `execution.md` — SBZ-T-2 attempt 1 Reviewer FAIL (root-cause section); `judgment.md` F-1.
  - **Standardization:** → P1 (local template) + upstream recommendation (P2).

- **KZ-bugfix--sidebar-scroll-zoom-overflow-2 — A Falsifier's "stays green" half was written up as observed when Mocha's fail-fast semantics meant it never ran.** (Methodology, Medium)
  - **Root cause:** the main `it()` asserted the width check (case 2) before the reachability check (case 1). Mocha/Chai stops a test at its first failing `expect()`, so at every failing scale case 2's failure pre-empted case 1 — yet the test's own banner comment and `design.md`'s Premise Ledger row P-11 both stated case 1 had been "observed GREEN." A separate keyboard-focus block was mistakenly treated as standing in for case 1, but it covers a narrower surface (no `elementFromPoint` occlusion check). This cost a second full Reviewer FAIL round (attempt 2), caught only because the Reviewer reasoned through Cypress's command-queue/assertion-order semantics instead of accepting the quoted split at face value.
  - **Evidence:** `execution.md` — SBZ-T-2 attempt 2 Reviewer FAIL.
  - **Standardization:** → P3 (local template) + upstream recommendation (P4).

## Noted, not a lesson

- **Pivot-Detection spec-tension routing worked as designed.** `SBZ-T-1`'s Reviewer flagged a flat-vs-proportional wording contradiction (L-1) as a spec tension rather than absorbing it as a dormant advisory; the Leader routed it to the user as a one-line amendment at the gate, the user approved it, and it cost zero extra rework. Positive confirmation, no process change indicated.
- **Budget Tripwire fired correctly, twice, and was never auto-approved.** Both the review-round overage and the LOC overage on `SBZ-T-2` required and received explicit user sign-off, per the constitutional rule. Positive confirmation.
- **Effort Ceiling held correctly.** Attempt 3 needed an escalation path beyond `xhigh`/T2; none existed distinct from the Reviewer's own T3 model in this project's registry, so the ceiling was held rather than an escalation invented. Feeds the recurrence check for "is a usable distinct T3-tier Implementer escalation ever available here."
- **SCSS dead-code finding** (two `!important` blocks in `reporting-nav-sidebar.component.scss` are unreachable under Angular view-encapsulation scoping) is a real, separate finding but has no process root cause — recorded only as a follow-up in `archive-summary.md`, not as a lesson.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/task.md` (Verification / test-authoring guidance) |
| Edit | A component test (CT/Cypress) that asserts on a CSS custom property a wrapper/host component sets must mount through that real production wrapper, not the bare component — otherwise the property can silently fall back (e.g. to `auto`) and the assertion becomes a no-op regardless of which implementation ships. |
| Severity | Medium-High |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization (methodology upstream) |
| Target | AKILI methodology repo → `tdd` skill / `/akili-specify` task template, test-authoring guidance |
| Edit | Same rule as P1, generalized: any component-level test asserting on state a parent/wrapper component supplies must mount through that real wiring, not a bare instance. |
| Severity | Medium-High |
| Status | pending (recommend upstreaming) |

### P3

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/task.md` (Falsifier guidance) |
| Edit | A Falsifier claim of the form "A stays green while B goes red" must be provable from the test's own pass/fail output: order A's assertions before B's within the same `it()`, or split A and B into separate `it()` blocks — otherwise Mocha/Chai's fail-fast semantics can let an unobserved half get written up as "observed." |
| Severity | Medium |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | standardization (methodology upstream) |
| Target | AKILI methodology repo → `tdd` skill, Falsifier/red-green guidance |
| Edit | Same rule as P3, generalized to any Mocha/Jest-style fail-fast test runner. |
| Severity | Medium |
| Status | pending (recommend upstreaming) |
