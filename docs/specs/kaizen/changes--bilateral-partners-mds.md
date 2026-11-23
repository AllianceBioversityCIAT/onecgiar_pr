# Kaizen Entry — changes/bilateral-partners-mds

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/bilateral-partners-mds` |
| Date | 2026-11-23 |
| Branch | qa-development-2026-ss (Branch Context = spec; apply-capable = `staging`) |
| Archive Run | 1 |
| Approval Mode | gated, pre-approved from 2026-11-18 (exceptions still stop) |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks executed | 4 (+ 1 folder-guide follow-up) | tasks.md, execution.md |
| Reviewer FAIL rework attempts | 2 (T-4 attempt 1 Leader-read mismatch x1; folder guide Reviewer FAIL x1) | execution.md — BPX-T-4, BPX-T-2 follow-up |
| HALTs / FATAL_FAILs | 0 | execution.md |
| Pivots | 0 | execution.md |
| PRODUCT_BUGs | n/a (no test-report.md) | — |
| Validation FAIL / WARN | n/a (PRTest HITL passed) | execution.md — HITL BPX-TEST-6 |
| Tasks closed under `REVIEW_WAIVED` | 0 | execution.md |
| Tasks closed under `REVIEW_SKIPPED` | 0 (T-4 `skip-eligible` claim not earned, Reviewer ran) | execution.md — BPX-T-4 |
| Escaped defects (§3) | 0 | execution.md |
| Budget tripwire | 1 (LOC about 690 vs about 380, accepted) | execution.md — BPX-T-4 |

## Lessons

None. Every rework was caught by the Reviewer or the Leader read inside the same task, and the root causes (wrong requirement IDs cited in notes; two stale "current rule" sentences in a guide) are first occurrences below the lesson bar.

## Noted, not a lesson

- T-4 attempt 1 cited the wrong BPX requirement IDs in supersession notes; fixed on attempt 2. Recurrence feed: doc-only tasks with a "cite the requirement" duty.
- Folder-guide rewrite: the Reviewer found two sentences that were false current rules (L47-50, L260-263). Guide statements need a check against the working tree.
- Full-suite runs stalled and were killed for low memory; orphaned Jest processes needed a manual kill. Already covered by the global test-throttling rules (`--maxWorkers=2`, one run at a time).
- LOC overrun about 1.8x, driven by moved HTML counted as add and remove plus about 300 spec-rewrite lines.
- Client full run: 92 failures in 6 suites unrelated to this spec, no baseline taken.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-server/src/api/bilateral/CLAUDE.md` section 4 |
| Edit | Partners gate (`changes/bilateral-partners-mds`, 2026-11-18, mandatory per Angel Jarrin): a non-KP result cannot be submitted without at least one active partner row or the "no external partners" tick; the check sits in `assertSubmittable` (`bilateral-center.service.ts`); KP stays optional (BPX-R-4); `POST /api/bilateral/create` still accepts payloads without `contributing_partners` (BPX-R-10). |
| Severity | Low |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `onecgiar-pr-client/src/app/pages/bilateral/components/section-contributors/CLAUDE.md` |
| Edit | Nothing to write: the folder guide was rewritten in session (approved, Reviewer PASS). Open only: it is 357 lines vs the 120-line cap; decide on `staging` whether to trim. |
| Severity | Low |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | factual-sweep |
| Target | root and module guides, `docs/prd.md` |
| Edit | Sweep for statements that External partners is optional for bilateral results (P2-3821 rule). Code comments, spec notes and the folder guide are swept; guides outside the spec's file list are not. |
| Severity | Low |
| Status | pending |

### P4

| Field | Value |
|---|---|
| Kind | trd-adr |
| Target | `docs/trd/trd.md` |
| Edit | Decision: bilateral External partners is mandatory for non-KP results, enforced in the form tracker and in `assertSubmittable`; supersedes the P2-3821 optional-partners decision (2026-09-28). No ADR number. |
| Severity | Low |
| Status | pending |

### P5

| Field | Value |
|---|---|
| Kind | guide-sync |
| Target | `.agents/leader.md` |
| Edit | Follow-up: run `akili doctor --agents --fix` on `staging` (primary-instructions OUTDATED 2.36.0). |
| Severity | Low |
| Status | pending |
