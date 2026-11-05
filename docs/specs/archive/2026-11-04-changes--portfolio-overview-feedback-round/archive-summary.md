# Archive Summary — Spec Family: Portfolio Overview feedback round

**Outcome:** All 6 in-scope stakeholder points on `/portfolio-overview` were delivered by 3 child specs, each archived on 2026-11-04. Point 7 (deleting test notifications in prod) was out of scope from the start, as a data task handled outside AKILI.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-overview-feedback-round` (family parent) |
| Archive Date | 2026-11-04 |
| Branch | `qa-development-2026-ss` (spec branch; `Default Branch: master`, `Integration Branch: staging`) |
| Final Status | **Closed**. 3/3 children `done` |

## 2. Original Spec Path

`docs/specs/changes/portfolio-overview-feedback-round/` (`family.md` + `proposal.md`)

## 3. Requirements Delivered (by child)

| # | Child | Points | Code commit | Archive |
|---|---|---|---|---|
| 1 | `cleanup-and-approved` (PCA) | 2, 3, 4, 5: no %, W3 Approved split, Centers count each result once, Centers reporting card removed | `fb4526f9b` | `archive/2026-11-04-changes--portfolio-overview-feedback-round--cleanup-and-approved/` |
| 2 | `funding-filter` (PFF) | 1: "Funding source" global filter | in `e6e9b6814` | `archive/2026-11-04-changes--portfolio-overview-feedback-round--funding-filter/` |
| 3 | `contribution-requests-by-pa` | 6: contribution requests by Program/Accelerator block + admin endpoint | `1d7323e7e` | `archive/2026-11-04-changes--portfolio-overview-feedback-round--contribution-requests-by-pa/` |

## 4. Files Changed Summary

See each child's `archive-summary.md` §4. The family as a whole changed the client `portfolio-overview` page (service, filter bar, Centers block, copy, component guide), and child 3 also added one admin read endpoint on the server.

## 5. Test Evidence Summary

Each child's evidence is in its own `archive-summary.md` §5. Latest related runs: PCA 31 suites / 1077 tests; PFF 32 suites / 1115 tests.

## 6. Validation Summary

No family-level validation report. Each child was closed on a Reviewer PASS per task plus live HITL checks. PCA's prod pre-check reconciles (288 = 287 + 1).

## 7. Accepted Warnings Or Follow-Ups

- [ ] PRTest/prod smoke of the whole page after deploy.
- [ ] Child follow-ups stay in each child's archive-summary §7 (not duplicated here).
- [ ] Kaizen pending items: PCA P1–P3, PFF P1–P2, plus contribution-requests-by-pa's own items, all for the `staging` apply phase.
- [ ] Point 7 (test notifications in prod): data cleanup outside AKILI, if still owed.
- [ ] CodeGraph sync.

## 8. Historical Notes

- Option A (3 children) was approved with defaults OQ-1..OQ-6 accepted.
- Ordering: `funding-filter` depended on `cleanup-and-approved` (same template + service); child 3 was parallel-safe.
- The funding-filter manifest row said "uncommitted" until this archive and was corrected to `e6e9b6814`.
