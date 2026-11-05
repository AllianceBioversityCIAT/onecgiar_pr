# Kaizen Entry — changes/portfolio-overview-feedback-round/cleanup-and-approved

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-overview-feedback-round/cleanup-and-approved` |
| Date | 2026-11-04 |
| Branch | qa-development-2026-ss (spec branch → items pending) |
| Archive Run | 1 |
| Approval Mode | gated (user: run to the end) |

## Metrics

| Signal | Value | Source |
|---|---|---|
| Tasks PASS | 4 / 4 | execution.md § Summary |
| Reviewer FAIL (rework attempts) | 2 (T-4 guide ×1, T-3 no-Center note ×1) | execution.md § PCA-T-4, § PCA-T-3 follow-up |
| HALT / FATAL_FAIL | 0 / 0 (1 Implementer equivalence stop, resolved by user SQL) | execution.md § Pivot Record |
| Pivots | 1 (PCA-T-3, deck vs Centers membership rule → PCA-DD-6) | execution.md § Pivot Record: PCA-T-3 |
| Review rounds vs budget | 8 vs ~5 | execution.md § Summary |
| Test / validation reports | none (absence accepted) | spec folder |
| Final related Jest | 31 suites, 1077/1077 | execution.md § Final verification |

## Lessons

- **KZ-changes--portfolio-overview-feedback-round--cleanup-and-approved-1 — A requirement saying two figures must agree has to list each source's membership predicates before approval.** (Product + Methodology, High)
  - Root cause: PCA-R-4's scenario ("deck and Centers agree") was approved with one guessed cause for any gap: results with no Center, tested by V-1. Nobody compared the two server queries first. The deck (`result.repository.ts` ~L764) requires an active lead initiative and excludes types 10/11; the Centers query (`getResultsByBilateralCenter` ~L4243) does neither. The gap therefore had a second cause that V-1 could not see.
  - Evidence: execution.md § Gap analysis (615 − 10 + 41 = 646) and § Pivot Record: PCA-T-3 (alternatives 1–4, user chose 1); requirements.md § 8 row "second cause → V-1".
  - Standardization: → P1 (local) · upstream: the same rule for the AKILI requirements template, which has no stack- or domain-specific content.

## Noted, not a lesson

- The no-Center note first ignored active global filters (T-3 follow-up, Reviewer FAIL 1): under a Center or Program filter, a deck-minus-Centers difference does not mean "no Center". This is a one-off spec gap; the fix is in the code and the guide.
- T-1 has no captured red run because the spec was edited before the code. The Reviewer traced a falsifier instead. Watch for this pattern.
- `npm run test:local` exited 1 with no output, now in 2 specs (funding-filter, this one). Look at `scripts/run-jest-local.js` next time it appears.
- The component guide grew over its cap (127+ vs 120), the opposite of PFF-L-1's trimming failure. Below the bar for now.
- Data residue: result 11528 was linked only to CENTER-16 (SMO). Same root as the SO/SMO data fix of 2026-10-15; data, not process.

## Pending Items

### P1

| Field | Value |
|---|---|
| Kind | standardization |
| Target | `docs/specs/general-setup/requirements.md` (Defect classes and gates guidance) |
| Edit | "When a requirement says two figures must agree (deck vs block, page vs Results Center), name both source queries (file:line) and list every membership predicate of each (source, status, role/lead, type, active flags) before approval. A verification SQL may only test the differences that list does not explain." |
| Severity | High (caused the PCA-T-3 pivot) |
| Status | pending |

### P2

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `KZ-changes--portfolio-overview-revamp--toc-kpi-progress-2` |
| Edit | Add source `changes/portfolio-overview-feedback-round/cleanup-and-approved`. Recurrence: V-1 ran on prod (324 / 287) while the live numbers came from the local stack on PRTest v36 (615 / 645), so the two could not be compared (execution.md § V-1 result, § Gap analysis). Keep severity Medium. |
| Severity | Medium |
| Status | pending |

### P3

| Field | Value |
|---|---|
| Kind | digest-update |
| Target | `PFF-L-1` (`changes--portfolio-overview-feedback-round--funding-filter`) |
| Edit | Add source `changes/portfolio-overview-feedback-round/cleanup-and-approved`. Recurrence: the PCA-T-4 guide sync dropped live W1/W2 rules (`w1w2NewSubmitted`/`w1w2NewEditing`) and wrote an unscoped "no % figures" rule (Reviewer FAIL, execution.md § PCA-T-4 attempt 1). Same root: a guide edit removes or widens a rule without accounting for it. Raise to Medium (3 specs: ABD, PFF, PCA). |
| Severity | Medium |
| Status | pending |
