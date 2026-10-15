# Spec Family — Portfolio Overview Revamp

## 1. Document Control

| Field | Value |
|---|---|
| **Parent spec path** | `docs/specs/changes/portfolio-overview-revamp/` |
| **Date created** | 2026-10-14 |
| **Last updated** | 2026-10-14 |
| **Spec-family status** | open |
| **Source proposal** | [`proposal.md`](./proposal.md), from the stakeholder feedback list, items 1–8 (screenshot attached to the request) |

## 2. Child specs (closed set)

| # | Spec Path | Depends on | Parallel-safe | Status |
|---|---|---|---|---|
| 1 | `changes/portfolio-overview-kpi-breakdown` | none | no | done |
| 2 | `changes/portfolio-overview-revamp/remove-rankings-status-copy` | `changes/portfolio-overview-kpi-breakdown` (must be **committed**, because both edit the same component and service files) | no | active |
| 3 | `changes/portfolio-overview-revamp/centers-new-vs-replicated` | `changes/portfolio-overview-revamp/remove-rankings-status-copy` (centers-block slice) | yes | pending |
| 4 | `changes/portfolio-overview-revamp/typology-view` | `changes/portfolio-overview-revamp/remove-rankings-status-copy` | no | pending |
| 5 | `changes/portfolio-overview-revamp/toc-kpi-progress` | `changes/portfolio-overview-revamp/typology-view` (client half only; the server half has no dependency) | no | pending |
| 6 | `changes/portfolio-overview-revamp/global-filters` | #1–#5 | no | pending |

Notes:
- #1 keeps its pre-existing path (proposed before the family existed). Its proposal carries `Parent Spec` pointing here.
- Every child except #3 edits `portfolio-overview.component.html`. Run them serially.

## 3. Change log

| Date | Change | Approved by |
|---|---|---|
| 2026-10-14 | Family created from `proposal.md` (6 chunks). The split was approved when the user ran `/akili-specify` on the rankings child | santiago.sanchez@cgiar.org |
| 2026-10-14 | Child #1 `kpi-breakdown` done: committed `3c1f412c3`, archived to `archive/2026-10-14-changes--portfolio-overview-kpi-breakdown/` | santiago.sanchez@cgiar.org |
| 2026-10-14 | Reordered: `kpi-breakdown` moves to #1 because it is already being implemented in the working tree. The rankings child moves to #2 and depends on it (Judgment Day JD-10) | santiago.sanchez@cgiar.org |
