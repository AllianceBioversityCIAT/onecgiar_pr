# Archive Summary — Portfolio export rejection reason (PER) — SUPERSEDED

> **Outcome:** not shipped. Superseded by `changes/portfolio-rejection-reason-export` (PRE, SR-168253), which already delivers the same request (rejection reason, who rejected and date in the Results detail Excel) and is in `master` / PROD.

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `changes/portfolio-export-rejection-reason` (PER) |
| Source | Nicoleta email of 2026-11-17 (same request as PRE) |
| Decision | Owner, 2026-11-23: drop the code, archive the docs as superseded |

## 2. Original Spec Path

`docs/specs/changes/portfolio-export-rejection-reason/`

## 3. Archive Date

2026-11-23

## 4. Final Status

**Superseded.** PER-T-1 (server) and PER-T-2 (client rows) were implemented but never committed; PER-T-3 (export call) and PER-T-4 (HITL) never ran. The work rewrote PRE's shipped `rejections` payload from `PortfolioRejectionDto` objects into `[resultId, paCode, comment]` triples, with no user-visible gain.

## 5. Requirements Delivered

None by this spec. The user need is met by PRE (in PROD).

## 6. Files Changed Summary

No commit. The uncommitted code (9 files) was parked in `git stash` and dropped by the owner on 2026-11-23; a patch copy was written to the session scratchpad (`per-rejection-export-stash-2026-11-23.patch`, temporary).

## 7-8. Test / Validation

Not applicable (not shipped). PRE carries its own PRTest verification.

## 9. Accepted Warnings Or Follow-Ups

None.

## 10. Historical Notes

- Two specs were opened for the same email on the same day under near-identical slugs (`portfolio-rejection-reason-export` vs `portfolio-export-rejection-reason`). The second one did not see the first, which was already moving toward PROD.

## 11. Diagrams

None.
