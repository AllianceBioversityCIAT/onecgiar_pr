# Spec Family — Portfolio Overview feedback round

## 1. Document Control

| Field | Value |
|---|---|
| **Parent spec path** | `docs/specs/changes/portfolio-overview-feedback-round/` |
| **Date created** | 2026-11-04 |
| **Last updated** | 2026-11-04 |
| **Spec-family status** | `open` |
| **Source proposal** | [`proposal.md`](./proposal.md) (stakeholder ticket screenshot, points 1–6; point 7 out of scope) |

## 2. Child specs (closed set)

| # | Spec Path | Points | Depends on | Parallel-safe | Status |
|---|---|---|---|---|---|
| 1 | `changes/portfolio-overview-feedback-round/cleanup-and-approved` | 2, 3, 4, 5 | none | yes | executed (fb4526f9b, 2026-11-04) |
| 2 | `changes/portfolio-overview-feedback-round/funding-filter` | 1 | `changes/portfolio-overview-feedback-round/cleanup-and-approved` | no (same page template + service) | done (archived 2026-11-04, uncommitted) |
| 3 | `changes/portfolio-overview-feedback-round/contribution-requests-by-pa` | 6 | none | yes (new server endpoint + new block; only touches the page template at one mount point) | done (archived 2026-11-04, 1d7323e7e) |

**Closed-set rule:** no child folder exists without a row here; adding one is a HITL-approved edit.

## 4. Change log

| Date | Change | Approved by |
|---|---|---|
| 2026-11-04 | Family created from proposal (Option A, defaults OQ-1..OQ-6 accepted) | Santiago Sanchez |
