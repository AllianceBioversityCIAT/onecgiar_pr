# Kaizen Entry — changes/tooltip-keyboard-accessibility

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/tooltip-keyboard-accessibility` |
| Date | 2026-09-11 |
| Branch | qa-development-2026-ss (spec branch — default is `master`) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 5 (`TIP-T-1`..`TIP-T-5`); `TIP-T-6` accepted via user manual testing, not run as a task | tasks.md, execution.md |
| Reviewer FAIL rework attempts | 2 (`TIP-T-4` attempt 1 scroll test was structurally inert; `TIP-T-5` attempt 2 found 1 real issue → attempt 3) | execution.md |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| `/akili-quick` escalations into this spec | 0 | — |
| PRODUCT_BUGs | 0 | execution.md |
| Validation FAIL / WARN | 0 (no `validation-report.md`; Reviewer PASS embedded per task) | execution.md |
| Concurrency collisions | 2 occurrences, same root cause, same shared file | execution.md — "Leader intervention" and "Second occurrence" notes |

## Lessons

- **KZ-changes--tooltip-keyboard-accessibility-1 — The Concurrency Protocol's shared-file collision case did not name *temporary* mutations (revert-to-prove-falsifiability) as a collision, only permanent edits, so two rework threads ran the same dangerous pattern twice before it was caught.** (Methodology, Medium)
  - Root cause: `TIP-T-1`/`TIP-T-3`'s established verification technique for this directive is to temporarily revert it to prove a test is genuinely falsifiable, then restore it. `TIP-T-4` and `TIP-T-5` both needed this technique in parallel rework threads on the same directive. The Leader's concurrency guidance covers files two tasks *permanently* touch, but a temporary revert-and-restore cycle is a different collision shape and wasn't explicitly named — so it recurred a second time (a `TIP-T-5` attempt-2 Reviewer read the directive mid-revert and reported a stale, transient state as a real regression) before the Leader paused one thread until the checkout was quiet.
  - Evidence: `execution.md` — "Leader intervention — concurrency collision, 2026-09-07" and the immediately following "Second occurrence" note ("This confirms the collision is systemic to running these two tasks' rework concurrently, not a one-off").
  - No local project edit proposed — root cause is in the AKILI Leader persona itself. Recommend upstreaming to the AKILI methodology repository: the Concurrency Protocol should explicitly cover temporary/reverted mutations to a shared dependency, not only permanent edits.
  - Standardization: recorded as pending item, Methodology target (upstream only, no local file).

## Noted, not a lesson

- `TIP-T-4` attempt 1's Cypress scroll test being structurally inert (a "test that cannot fail") was caught and fixed within the same spec's normal Reviewer/rework loop — the protocol worked as designed here, this is not itself the lesson (the lesson is the *concurrency* side-effect of the fix technique, above).
- `TIP-T-6`'s manual sweep being satisfied by the user's own out-of-band testing rather than a dedicated AKILI task is a deliberate, user-directed acceptance for this archive pass, not a process gap.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | AKILI methodology repository (upstream) — `.agents/leader.md` Concurrency Protocol |
| Edit | Explicitly cover temporary/reverted mutations to a shared dependency (revert-to-prove-falsifiability) as a collision case, not only permanent edits. |
| Severity | Medium |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `docs/ux-ui/design.md` §12 (Design Decisions) |
| Edit | Promote `TIP-DD-2` (toggletip pattern over `role="tooltip"`) as the canonical pattern for any future tooltip-with-interactive-content. |
| Severity | Low |
| Status | pending |
