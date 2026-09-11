# Kaizen Entry — changes/unsaved-changes-alert

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/unsaved-changes-alert` |
| Date | 2026-09-11 |
| Branch | qa-development-2026-ss (spec branch — default is `master`) |
| Archive Run | 1 |
| Approval Mode | gated |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 11 (`UCA-T-1`..`UCA-T-11`); `UCA-T-12` accepted via user manual testing, not run as a task | tasks.md, execution.md |
| Reviewer FAIL rework attempts | ≥6 across the spec (`UCA-T-8` ×2, `UCA-T-9` ×3 before HALT, `UCA-T-6`/`UCA-T-7`/`UCA-T-10`/`UCA-T-4` each 1 extra attempt) | execution.md |
| HALTs / FATAL_FAILs | 1 HALT (`UCA-T-9`, after 3 consecutive FAILs) | execution.md — `## HALT: UCA-T-9` |
| Pivots | 0 | execution.md |
| `/akili-quick` escalations into this spec | 0 | — |
| PRODUCT_BUGs | 0 (all findings were spec-scoped implementation bugs, fixed in-spec) | execution.md |
| Validation FAIL / WARN | 0 (no `validation-report.md`; Reviewer PASS embedded per task) | execution.md |
| Deliberate protocol deviations | 1 (HALT rollback not run literally — see lesson 2) | execution.md — Rollback decision section |

## Lessons

- **KZ-changes--unsaved-changes-alert-1 — The same defect class ("an async/child writer mutates tracked state after the dirty snapshot is taken") recurred across four different tasks before being fully closed, because each fix addressed only the specific writer the current review found, not the writer *pattern* itself.** (Product, High)
  - Root cause: `UCA-T-7`, `UCA-T-9` (three separate times), and `UCA-T-10` each independently discovered a child component or catalogue-driven effect writing into the tracked model after the baseline snapshot, producing false-dirty state (and, in `UCA-T-9`'s case, a spurious contribution email). Each rework attempt fixed exactly the writer named in that review round rather than auditing the section's full writer set for the same shape, so a sibling writer with an identical unguarded pattern kept surfacing as a "new" bug one attempt later (e.g. `UCA-T-9` attempt 2 fixed 2 known child writers; the Reviewer found a 3rd, structurally identical one in the same pass).
  - Evidence: `execution.md` — "Issues encountered: Two new real bugs, both variants of the same '...' class that has now recurred across `UCA-T-7`, `UCA-T-9` (twice), and `UCA-T-10` in this spec" (attempt-3 entry, `UCA-T-9`); the HALT block's attempt-by-attempt table shows the same shape recurring attempts 1→2→3.
  - Standardization: → P1

- **KZ-changes--unsaved-changes-alert-2 — The AKILI HALT rollback step ("git restore . && git clean -fd") assumes per-task commits; it has no defined behavior for a multi-task spec executed entirely in one uncommitted working tree, forcing the Leader to deviate from the literal protocol under time pressure.** (Methodology, Medium)
  - Root cause: this spec's execution never committed between tasks (per the user's standing no-auto-commit preference — [[feedback_no_autocommit]]). When `UCA-T-9` HALTed at 3 attempts, the literal rollback instruction would have destroyed 9 other already-PASSed, uncommitted tasks' work along with `UCA-T-9`'s broken state. The Leader recognized this and deliberately deviated (left `UCA-T-9`'s files as-is, escalated to the user instead), which was the right call, but the protocol itself gave no guidance for this now-clearly-foreseeable interaction between "no-auto-commit" and "HALT rollback."
  - Evidence: `execution.md` — "Rollback decision (deviation from the literal protocol, with rationale)" section, HALT block.
  - This is a methodology (AKILI HALT protocol) root cause, not project-specific — no local edit proposed. Recommend upstreaming: the HALT rollback step should branch on whether the working tree holds other already-PASSed, uncommitted task work, and scope the revert to only the HALTed task's files in that case, rather than a blanket `git restore .`.

## Noted, not a lesson

- `UCA-T-9`'s 4th attempt closing a documentation-only Reviewer finding directly (Leader fix, no 5th review round) matches established precedent from earlier in the same spec (`UCA-T-8` attempt 3, the cross-cutting routing correction) — process working as designed, not a defect.
- The Implementer self-catching a live-reference bug (`lastDirtySnapshot` needing a JSON round-trip copy) before reporting completion on `UCA-T-9` attempt 3 is the harness working as intended.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/design.md` (or the nearest durable review-checklist home for dirty-tracking specs) |
| Edit | When a Reviewer finds an async/child-writer-mutates-after-snapshot bug in one component, the remediation MUST include a sanity sweep of every other writer into the same tracked object for the identical unguarded pattern — not just a fix scoped to the one writer named in that review round. |
| Severity | High |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | standardization |
| Target | AKILI methodology repository (upstream) — `/akili-execute` Step 4 HALT protocol |
| Edit | Branch the rollback step on whether the working tree holds other already-PASSed, uncommitted task work; scope the revert to only the HALTed task's files in that case instead of a blanket `git restore . && git clean -fd`. |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/app/pages/results/pages/result-detail/CLAUDE.md` |
| Edit | Document the new guard/dialog mechanism (`SectionDirtyTrackerService`, `UnsavedChangesGuard`, Save/Discard dialog, `beforeunload` directive) and which sections it covers. |
| Severity | Low |
| Status | pending |
