# Kaizen Entry — changes/portfolio-overview-revamp/typology-view

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-overview-revamp/typology-view` |
| Date | 2026-10-15 |
| Branch | qa-development-2026-ss |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 4 (3 code + 1 HITL browser check) | tasks.md |
| Reviewer FAIL rework attempts | 2 (T-2 x1 page-wide Unclassified column; T-3 x1 guide over the 120-line cap) | execution.md: TYV-T-2, TYV-T-3 |
| HITL live findings | 1 (tab list overflowed its card at 375 px, so T-2 was reopened after T-4) | execution.md: TYV-T-4 and its remediation |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | n/a (no test-report) | — |
| Validation FAIL / WARN | n/a (no validation-report; T-4 PASS after remediation) | execution.md: TYV-T-4 |
| Budget | ≈ 450 LOC estimated → ≈ 730 (+62 %); the 650 tripwire was raised after T-2 and the user said to continue | execution.md: Budget Tripwire |
| Drift | No audit report in `docs/specs/audits/` | — |

## Lessons

- **KZ-changes--portfolio-overview-revamp--typology-view-1 — A design that picks a Helm component must state its fixed-size classes and the narrow-viewport override, not leave all responsiveness to the HITL check.** (Product, Medium)
  - Root cause: design.md §7.3 chose Spartan Tabs (TYV-DD-4) but did not mention that `hlm-tabs-list` ships `w-fit` and its triggers ship `whitespace-nowrap`. Those classes are concatenated, not merged, which is already documented in `src/CLAUDE.md` §21.7. The T-2 Disqualifier also routed every responsive check to T-4, so jsdom could not catch it. The overflow surfaced only at the live 375 px check, which cost a reopen and a second review round after the spec looked done.
  - Evidence: execution.md, TYV-T-4 results row "No horizontal page overflow at 375" ❌ (`hlm-tabs-list` 382 px inside a 335 px card), and the "TYV-T-4 remediation: TYV-T-2 reopened" block (`max-sm:!w-full`, `max-sm:!whitespace-normal`).
  - Standardization: → P4

## Noted, not a lesson

- T-1 implemented `Breakdown.showUnclassified` per dimension although design §4 says it is "page-wide"; the T-1 Reviewer passed it, and T-2's Reviewer caught the consequence (the Unclassified column missing in By Center). An aggregate type documented as page-wide but computed per input. Seen once.
- The T-1 Implementer kept hardcoded English labels in the pure aggregate; they would have bypassed T-2's "no hardcoded English in the template" Done check. The Reviewer flagged it as an advisory and the Leader forwarded it as a pointer, so it cost nothing. Forward pointers worked as designed.
- The window resize again did not change the viewport (it stayed at 2560); same-origin iframes at 1280 / 768 / 375 were used again. This is the second spec in the family to need that substitute (see `changes--portfolio-overview-revamp--centers-new-vs-replicated.md`). It is now worth a line in `docs/infrastructure.md` §6.
- Real data cannot exercise the ≥ 4 px segment clamp (Impact is 0 page-wide on P25). A presence-only class check is the only evidence.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-results--program-full-names-labels-1` |
| Edit | Add `changes/portfolio-overview-revamp/typology-view` as a recurrence (seventh spec). Every task's lint ran through `ESLINT_USE_FLAT_CONFIG=false npx eslint <files> --quiet` because ESLint 9 finds no flat config in the client (only `.eslintrc.json`). Pin that exact command in root `AGENTS.md` → agent-lean verification table for the client. |
| Severity | High |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-results--program-full-names-labels-2` |
| Edit | Add `changes/portfolio-overview-revamp/typology-view` as a recurrence: ≈ 450 LOC estimated vs ≈ 730 actual. Most of the excess is the block template (105 lines) and its 16 DOM tests (186 lines). The second family child in a row to trip the tripwire. |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-changes--aow-identity-column-starvation-1` |
| Edit | Add `changes/portfolio-overview-revamp/typology-view` as a recurrence. The T-3 brief did not name `onecgiar-pr-client/docs/COMPONENT-DOCS.md` (120-line cap), and `portfolio-overview/CLAUDE.md` was already exactly 120 lines, so adding a 10-line section cost a Reviewer FAIL. Repeat of the folder-guide-cap class in `bugfix--emerging-contribution-not-required` and `bugfix--reporting-table-actions-clipped`. |
| Severity | Medium |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` (Frontend / UX component architecture section) |
| Edit | When a design adopts a Helm/Spartan component, list the fixed-size or no-wrap classes it ships (e.g. `w-fit`, `h-9`, `whitespace-nowrap`; concatenated, not merged, per `onecgiar-pr-client/src/CLAUDE.md` §21.7) and the `max-sm:` override needed for 375 px. Do not defer that override to the HITL check. |
| Severity | Medium |
| Status | pending |
