# Kaizen — `bugfix/evidence-storage-link-validation`

| Field | Value |
|---|---|
| Date | 2026-09-08 |
| Branch context | spec branch (`qa-development-2026-ss` ≠ pin `master`) — every shared-file edit recorded as pending, nothing applied |
| Archive | `docs/specs/archive/2026-09-08-bugfix--evidence-storage-link-validation/` |

## Metrics

| Signal | Value |
|---|---|
| Reviewer FAIL rework | 0 — both attempted units (`EVL-T-1`→`EVL-T-2` server-side, `EVL-T-3` client-side) PASSed on first attempt |
| HALT / FATAL_FAIL | 0 |
| Pivot Record | 1 — post-QA discovery that the approved server-side fix (`EVL-T-2`) satisfied the letter of the requirement but not the user's actual intent; added `EVL-T-3` |
| Scope reversion (not a Pivot, a further reduction after the Pivot) | 1 — `EVL-T-1`/`EVL-T-2` (fully implemented, Reviewer-PASSed, 10/10 tests green) explicitly reverted before merge, once a deeper investigation showed the patched code path is architecturally unreachable for the portfolio (P25) the user's actual scope was about |
| PRODUCT_BUG findings | 0 new (the Pivot surfaced a scope gap in the original spec, not a code defect in what was built) |
| Judgment-day severe findings | not run |
| Validation FAIL/WARN | not run (`validation-report.md` not produced); Reviewer ADVISORY notes only, all accepted non-blocking |
| `/akili-quick` escalations | 0 |
| Budget | 1 task (`EVL-T-3`) shipped of an eventual 3 planned — the 2 reverted tasks' effort (implementation + review + test-writing) was real work that produced zero lasting value toward the ticket, discovered only via manual QA + a follow-on architectural trace, not at design time |

## Lessons

- **KZ-EVL-1 — A server-side fix's design never traced which live API route/version actually reaches the code being patched for the scenario the ticket cares about, so a fully-reviewed, fully-green fix shipped no functional value.** (Methodology, High)
  - Root cause: `design.md`/`tasks.md` scoped `EVL-T-1`/`EVL-T-2` to `results-validation-module.repository.ts`'s `evidenceValidation()`/`multiplePerField` method without verifying, at design time, which client code path actually invokes it. `evidenceValidation()` is only reachable via the **v1** green-checks route; `green-checks.service.ts:55`'s `isP25()` branch means the client calls the **v2** route (→ a MySQL stored function, `validation_evidences_P25`, with no denylist logic at all) for exactly the portfolio (P25) the ticket's own reproduction and the user's manual QA used. The fix was correctly implemented against its own stated requirements, Reviewer-confirmed correct against those requirements, and passed 10/10 tests — and had **zero effect** on the actual bug report, discovered only when the user manually re-tested the "done" fix.
  - Evidence: `execution.md` "Investigated and explicitly declined: SQL-side fix for `validation_evidences_P25`" (full trace: `results-api.service.ts:781` → `green-checks.service.ts:55` → `ResultsValidationModuleService.calculateValidationSections` → the stored-procedure path vs. the TS `evidenceValidation()` path); `archive-summary.md` §6.
  - Standardization → P1: when a bug report's reproduction specifies a portfolio/version (P22 vs P25, v1 vs v2 API), `design.md`'s Architecture Overview MUST cite the actual live dispatch chain (client selector → API version → server handler) that the reported scenario travels, not just the function that superficially "does the computation" — the two can diverge, and only one of them is exercised by the bug being fixed.

- **KZ-EVL-2 — `execution.md`'s own status headers/summary sections are not reliably updated when a later attempt, Pivot, or scope reduction supersedes an earlier one — a pattern recurring across multiple specs archived in this same session.** (Methodology, Medium)
  - Root cause: this file's own §5 ("Spec status (post-Pivot, final)") literally states "All three tasks... are `[x]`" immediately below a section that explicitly describes two of those three tasks being reverted via `git checkout`/file deletion — §5 was written after the Pivot but before the later Scope Reduction, and nothing in the Leader's workflow re-visits and corrects an earlier summary section once a later one supersedes it. The same shape of staleness was independently observed in at least 3 other specs archived in this session (`result-sidebar-collapse-mobile`'s `SBAR-T-6` status line frozen at "in progress" beneath its own "HALT lifted" resolution; `evidence-modal-sticky-actions`'s and `innovation-team-diversity-missing-alert`'s `tasks.md` Definition-of-Done checkboxes left unticked despite `execution.md` confirming completion) — four occurrences in one session is enough to treat this as a real, recurring gap rather than a one-off slip.
  - Evidence: this spec's `execution.md` §5 vs. its own "Scope Reduction" section immediately above; cross-referenced against the three sibling archive-summary.md "Historical Notes" sections from this same session (`result-sidebar-collapse-mobile`, `evidence-modal-sticky-actions`, `innovation-team-diversity-missing-alert`) which independently flagged the same shape of contradiction.
  - Standardization → P2: when a later section of `execution.md` (a Pivot Record, a Scope Reduction, a HALT-lift resolution) supersedes the status/summary stated in an earlier section of the SAME file, the Leader must update that earlier section's status line in place (not merely append a new section below it) — a reader (including a future `/akili-resume` or `/akili-archive` pass) should never have to reconcile two contradictory "final status" claims in one document.

## Noted, not a lesson

- The Pivot itself (server fix technically correct per its own requirements, but not what the user actually needed) is exactly what the Pivot Protocol exists to catch, and it was invoked correctly — user asked, user approved, scope amended in the right three files. No process gap in the Pivot mechanism itself.
- The user's repeated, explicit, increasingly specific decisions ("no toques P22 ni P25 en SQL," then later "borra esa mierda") were each followed precisely and reversibly (a clean `git checkout` of uncommitted work, not a history rewrite) — good adherence to git-safety discipline under a genuine scope reversal, not a gap.

## Pending Items

| # | Kind | Target | Edit (verbatim) | Severity | Status |
|---|---|---|---|---|---|
| 1 | standardization (KZ-EVL-1) | `docs/specs/general-setup/design.md` (template) | Add to the Architecture Overview guidance: "If the bug/feature's reproduction specifies a portfolio, API version, or similar branch point (P22/P25, v1/v2), trace and cite the actual live dispatch chain (client selector → API version → server handler) the reported scenario travels — not just the function that appears to perform the relevant computation. The two can diverge; only tracing the real path confirms the fix will have any effect." | High | pending |
| 2 | standardization (KZ-EVL-2) | `.agents/leader.md` | Add: "When a later section of `execution.md` (a Pivot Record, a Scope Reduction, a HALT-lift resolution) supersedes an earlier section's stated status/summary, update that earlier section's status line in place — do not leave two contradictory 'final status' claims in the same file for a future reader to reconcile." | Medium | pending |
| 3 | digest-update | `docs/specs/kaizen-log.md` Active Lessons | KZ-EVL-2's pattern (stale status header superseded by a later section, never corrected) recurred independently in ≥3 other specs archived in this same session (`changes--result-sidebar-collapse-mobile`, `bugfix--evidence-modal-sticky-actions`, `bugfix--innovation-team-diversity-missing-alert`) — raise recurrence count/severity if/when this lesson is applied to the digest. | Medium | pending |
| 4 | factual-sweep | root guides | No falsified root-guide claims found this cycle. | — | n/a |
| 5 | trd-adr | — | No TRD ADR overturned — the reverted server-side change never merged, and the shipped client-side gate is additive, no architecture decision to supersede. | — | n/a |

*(Apply phase runs on `master`; nothing above was written to shared files from this branch.)*
