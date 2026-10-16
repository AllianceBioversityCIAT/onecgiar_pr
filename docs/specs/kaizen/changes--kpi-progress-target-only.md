# Kaizen Entry — changes/kpi-progress-target-only

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/kpi-progress-target-only` |
| Date | 2026-10-16 |
| Branch | qa-development-2026-ss (spec branch: Default Branch pin is `master`) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 8 (6 planned + 2 from amendments A-1, A-2) | tasks.md |
| Reviewer FAIL rework attempts | 1 (T-3 / T-4 layout rework, attempt 2: breakpoint off-by-one) | execution.md — KTO-T-6 table L-3 |
| Extra review rounds beyond budget | 3 (T-6 layout: L-1/L-2 fix, L-3 FAIL→PASS, L-4 Target-first) | execution.md — KTO-T-6 |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 (T-1 disqualifier adjudicated, no pivot; T-4 disqualifier escalated → user layout decision) | execution.md — T-1 adjudication, T-6 L-4 |
| Scope amendments | 2 (A-1 global Target filter, A-2 Overview card) | requirements.md Amendments |
| PRODUCT_BUGs | n/a (no test-report.md) | — |
| Validation FAIL / WARN | n/a (no validation-report.md) | — |
| Drift attributable | none found | — |

## Lessons

- **KZ-changes--kpi-progress-target-only-1 — Complementary breakpoint classes were paired one pixel apart (`max-[639px]` / `min-[640px]`), although the trap was already documented in the folder guide.** (Product, Medium)
  - Root cause: Tailwind v4 compiles `max-[N]:` to `width < N`. The Implementer used N−1 for the `max-*` half, which left a 1 px window where both the desktop and mobile split lines, and both copies of the Target section, showed. The rule existed only in `reporting-aow-table/CLAUDE.md` (Trampas, "By AOW" bullet). It was not in the client-wide rules the Implementer reads first.
  - Evidence: execution.md — KTO-T-6 table L-3 (Reviewer FAIL attempt 2, citing `reporting-aow-table/CLAUDE.md` Trampas).
  - Standardization: → P1

- **KZ-changes--kpi-progress-target-only-2 — The spec gated execution on a second stakeholder's sign-off that the user did not need.** (Product, Low)
  - Root cause: `/akili-specify` turned a past contrary request (Nicoleta, 2026-09-09) into a blocking execute gate, KTO-OQ-1. The team's rule is that the ticket requester sets product rules, and earlier contrary requests are recorded as history instead of gated. The user lifted the gate at the first prompt ("si angel fue quien lo pidio debemos de hacerlo").
  - Evidence: execution.md §2 (gate decision record); tasks.md §2 pre-flight.
  - Standardization: → P2

## Noted, not a lesson

- **Recurrence of `KZ-OAH-1` (jsdom measures no layout).** Three layout defects reached T-6 with every Jest gate green: the 375 px split-line wrap, the Target axis unreachable at 768 px, and Target clipped at 1280 px with 9 centers. Each cost a review round. → P3 `digest-update`.
- The 375 px code-chip overlap is the same left-zone starvation family as `changes--aow-identity-column-starvation` (recurrence #4 there). It is pre-existing and was not fixed here.
- design.md §6.2 said `where-to-report-modal` and `results-center-reporting-guide` "only push `buildRatio` output". That was wrong for their AoW rows, which come from the server roll-up. T-1's disqualifier caught it, and the Leader adjudicated with no pivot. It happened once and is below the lesson bar.
- The shipped spec #5 query skips the target rule, found during T-5. A cross-spec rule change landed after the other spec had executed. Feeds the recurrence check.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `onecgiar-pr-client/CLAUDE.md` §5 "Hard UI rules" → Code |
| Edit | Add: "26. **Breakpoint pairs share one number.** Tailwind v4 `max-[N]:` = `width < N`, `min-[N]:` = `width >= N` — complementary show/hide classes use the same N (`max-[640px]` ↔ `min-[640px]`), never `max-[639px]`." |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | root `AGENTS.md` §6 Cross-cutting constraints |
| Edit | Add: "- **Product-rule tickets:** the ticket requester sets the rule. A stakeholder's earlier contrary request is recorded as history in the spec (timeline in `execution.md`), not turned into an execute gate." |
| Severity | Low |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-OAH-1` |
| Edit | Add source `changes/kpi-progress-target-only` (T-6: 375 px wrap, 768 px unreachable Target axis, 1280 px clip — 3 extra review rounds, all Jest-green). Recurrence note: UI tasks with a layout disqualifier should get a Leader browser check at their own gate, not only at the final HITL task. |
| Severity | Medium |
| Status | pending |
