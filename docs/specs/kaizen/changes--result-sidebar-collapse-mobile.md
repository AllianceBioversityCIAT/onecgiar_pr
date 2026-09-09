# Kaizen — `changes/result-sidebar-collapse-mobile`

| Field | Value |
|---|---|
| Date | 2026-09-08 |
| Branch context | spec branch (`qa-development-2026-ss` ≠ pin `master`) — every shared-file edit recorded as pending, nothing applied |
| Archive | `docs/specs/archive/2026-09-08-changes--result-sidebar-collapse-mobile/` |

## Metrics

| Signal | Value |
|---|---|
| Reviewer FAIL rework | 0 of 5 Reviewer-adjudicated tasks (`SBAR-T-1..T-5`) took a second attempt — all first-attempt PASS |
| Direct-execution FAIL rework (`SBAR-T-6`, environment-dependent, no Reviewer sub-agent) | **4 of 5 attempts FAILED** before PASS — 3-attempt ceiling exceeded with explicit user approval to continue |
| HALT / FATAL_FAIL | 1 HALT (`SBAR-T-6`, after attempt 3) — lifted by attempt 5's resolution |
| Pivot Record | 0 (one user-approved scope addition mid-execution, not a pivot — see `archive-summary.md` §7) |
| PRODUCT_BUG findings | 0 |
| Judgment-day severe findings | not run |
| Validation FAIL/WARN | not run (`validation-report.md` not produced this cycle) |
| `/akili-quick` escalations | 0 |
| Budget | 6 tasks estimated / 6 actual · ~180 LOC (+~320 incl. specs) estimated / in range · ≤1 review round/task — held for `T-1..T-5`, `T-6` needed 5 direct-execution rounds (environment-dependent task, not Reviewer-gated) |

## Lessons

- **KZ-SBAR-1 — A plausible-looking Cypress selector for an existing UI region can target a component that is structurally dead code, and nothing about the failure looks different from a real bug.** (Product, High)
  - Root cause: `sidebar-collapse.cy.ts`'s `SBAR-AC-3` scenario targeted `.panel_menu .sections a` to find the result-detail section-switch link. That selector belongs to `result-detail/panel-menu/`, which `result-sections-sidebar/CLAUDE.md` already documents outright as legacy dead code ("declarada... pero sin template que la use") — the live component (`result-sections-sidebar.component.html`) uses a completely different structure (`[data-testid="result-sections-sidebar"] nav a`). Because the dead selector matches zero elements, three consecutive rework attempts each found and fixed a real, separate, unrelated bug (a missing `cy.loginByToken()` call; a portfolio-specific section-name assumption; a discoverability-hint interference hypothesis) while the test kept failing regardless — the actual cause was never touched until attempt 5, one attempt past the loop's own 3-attempt ceiling.
  - Evidence: `execution.md` `SBAR-T-6` attempts 2–5 (`docs/specs/changes/result-sidebar-collapse-mobile/execution.md:140-169`); `result-sections-sidebar/CLAUDE.md`'s existing "legacy dead code" note (pre-dates this spec).
  - Standardization → P1: before locking in a Cypress selector for an existing, already-documented component region, check that region's own `CLAUDE.md` for a "legacy"/"dead code" note — a selector that resolves to nothing produces the same symptom as every other kind of E2E failure and gives no hint that the component itself is the problem.

## Noted, not a lesson

- The `SBAR-T-6` HALT-then-lift sequence followed the protocol correctly: no automatic rollback was performed (would have discarded `SBAR-T-1..T-5`'s already-PASSed work sitting in the same working tree), the user was asked before a 4th attempt past the ceiling, and a genuine environment outage (local backend unresponsive) was distinguished from a fix failure rather than counted against the attempt budget. No methodology gap — the loop's guardrails worked as designed under real pressure.
- The mid-execution scope addition (`data-guide="sidebar-toggle"` also added to `shell-topbar.component.html`) was surfaced by a Reviewer during an *earlier*, unrelated task (`SBAR-T-3`) and correctly carried forward to the task that actually needed it (`SBAR-T-5`) rather than silently expanding `SBAR-T-3`'s own scope. Good precedent, not a new rule — matches existing "adjudicate before review, don't launder scope" guidance.

## Pending Items

| # | Kind | Target | Edit (verbatim) | Severity | Status |
|---|---|---|---|---|---|
| 1 | standardization (KZ-SBAR-1) | `onecgiar-pr-client/src/CLAUDE.md` §22 Anti-patterns to avoid | Add: "**Writing a new Cypress/E2E selector against an existing UI region without checking that region's own `CLAUDE.md` for a 'legacy dead code' note** — a selector matching zero elements (because the component it targets never renders) fails exactly like a real bug and gives no signal that the component itself is the problem; `result-detail/panel-menu/` is a known example (see `result-sections-sidebar/CLAUDE.md`)." | High | pending |
| 2 | guide-sync | `onecgiar-pr-client/src/app/shared/components/shell-topbar/CLAUDE.md` | Add under Contract: "The toggle button also carries `data-guide=\"sidebar-toggle\"` (P2-… / `SBAR-T-5`) — the always-visible anchor for the result-sidebar discoverability hint (`ReportingGuideService.startResultSidebarHint()`), paired with the same attribute on `reporting-nav-sidebar`'s collapsed-state toggle so exactly one anchor is ever present regardless of sidebar state." | Medium | pending |
| 3 | guide-sync | `onecgiar-pr-client/src/app/pages/results/pages/result-detail/CLAUDE.md` | Add a short entry noting `result-detail.component.ts` now subscribes to the route's `id` param (`distinctUntilChanged`) to (a) auto-collapse the nav sidebar via `HlmSidebarService.collapseForCompactEntry()` when `isCompact()` (≤1366px) and expanded, and (b) fire `ReportingGuideService.startResultSidebarHint()` once per unseen user, independent of viewport — both live in the same `watchCompactEntry()`-named subscription, which now covers two unrelated concerns (naming trap for a future reader). | Low | pending |
| 4 | factual-sweep | root guides | No falsified root-guide claims found this cycle — purely additive client feature, touches no documented invariant. | — | n/a |
| 5 | trd-adr | — | No TRD ADR overturned — `docs/trd/trd.md` has no existing section on the sidebar or tour to supersede (confirmed in `design.md` §12/Required cross-references). | — | n/a |
| 6 | digest-update | — | No recurrence of an existing `docs/specs/kaizen-log.md` lesson found (checked `panel_menu`/dead-code/Cypress-selector history across `docs/specs/kaizen/` — no prior match). | — | n/a |

*(Apply phase runs on `master`; nothing above was written to shared files from this branch.)*
