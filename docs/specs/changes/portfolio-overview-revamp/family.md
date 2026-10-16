# Spec Family — Portfolio Overview Revamp

## 1. Document Control

| Field | Value |
|---|---|
| **Parent spec path** | `docs/specs/changes/portfolio-overview-revamp/` |
| **Date created** | 2026-10-14 |
| **Last updated** | 2026-10-16 (#8 specified) |
| **Spec-family status** | open |
| **Source proposal** | [`proposal.md`](./proposal.md), from the stakeholder feedback list, items 1–8 (screenshot attached to the request) |

## 2. Child specs (closed set)

| # | Spec Path | Depends on | Parallel-safe | Status |
|---|---|---|---|---|
| 1 | `changes/portfolio-overview-kpi-breakdown` | none | no | done |
| 2 | `changes/portfolio-overview-revamp/remove-rankings-status-copy` | `changes/portfolio-overview-kpi-breakdown` (must be **committed**, because both edit the same component and service files) | no | done |
| 3 | `changes/portfolio-overview-revamp/centers-new-vs-replicated` | `changes/portfolio-overview-revamp/remove-rankings-status-copy` (centers-block slice); `changes/portfolio-overview-revamp/remove-centers-progress` (same `centers-block/` files — run #7 first) | no | done |
| 4 | `changes/portfolio-overview-revamp/typology-view` | `changes/portfolio-overview-revamp/remove-rankings-status-copy` | no | done |
| 5 | `changes/portfolio-overview-revamp/toc-kpi-progress` | `changes/portfolio-overview-revamp/typology-view` (client half only; the server half has no dependency) | no | pending |
| 6 | `changes/portfolio-overview-revamp/global-filters` | #1–#5, #7, #8 | no | pending |
| 7 | `changes/portfolio-overview-revamp/remove-centers-progress` | none | no (shares `centers-block/` with #3) | done |
| 8 | `changes/portfolio-overview-revamp/w3-projects-section` | server half: none · client half: `changes/portfolio-overview-revamp/toc-kpi-progress` (template order) | server half yes · client half no | pending |
| 9 | `changes/portfolio-overview-revamp/filtered-detail-export` | `changes/portfolio-overview-revamp/global-filters` | no | pending |
| 10 | `changes/portfolio-overview-revamp/toc-kpi-target-filter` | `changes/portfolio-overview-revamp/toc-kpi-progress` (bugfix of its shipped query, P2-3974) | yes (server repository only) | done |

Notes:
- #7–#9 come from stakeholder email items 9–11 (the #1–#6 proposal covered items 1–8). The table is in build order by dependency, not by row number: #7 runs before #3, #8 runs before #6, and #9 runs last.
- #1 keeps its pre-existing path (proposed before the family existed). Its proposal carries `Parent Spec` pointing here.
- Every child except #3 edits `portfolio-overview.component.html`. Run them serially.

## 3. Change log

| Date | Change | Approved by |
|---|---|---|
| 2026-10-14 | Family created from `proposal.md` (6 chunks). The split was approved when the user ran `/akili-specify` on the rankings child | santiago.sanchez@cgiar.org |
| 2026-10-14 | Child #1 `kpi-breakdown` done: committed `3c1f412c3`, archived to `archive/2026-10-14-changes--portfolio-overview-kpi-breakdown/` | santiago.sanchez@cgiar.org |
| 2026-10-15 | Child #2 `remove-rankings-status-copy` done: committed `6504812b8`, T-H browser check passed on PRTest, archived to `archive/2026-10-15-changes--portfolio-overview-revamp--remove-rankings-status-copy/` | santiago.sanchez@cgiar.org |
| 2026-10-15 | Added children #7 `remove-centers-progress`, #8 `w3-projects-section` and #9 `filtered-detail-export`, from stakeholder email items 9–11. The user asked for the proposals ("puedes hacer el propose del 9, 10 y 11?"). #3 is now `Parallel-safe: no`, and #6 now also depends on #7 and #8. All 3 proposals approved; the open questions take the recommended defaults (user: "haz lo que mejor recomiendes y procedamos con el specify") | santiago.sanchez@cgiar.org |
| 2026-10-15 | Child #7 `remove-centers-progress` done: committed `92bd0aa5b`, browser check at 1280 and 768 accepted by the user, archived to `archive/2026-10-15-changes--portfolio-overview-revamp--remove-centers-progress/`. #3 is unblocked on `centers-block/` | santiago.sanchez@cgiar.org |
| 2026-10-15 | Child #3 `centers-new-vs-replicated` done: committed `a91e9ad39`, browser check at 1280 / 768 / 375 passed locally (712 = 548 + 164), archived to `archive/2026-10-15-changes--portfolio-overview-revamp--centers-new-vs-replicated/`. PRTest smoke pending | santiago.sanchez@cgiar.org |
| 2026-10-14 | Reordered: `kpi-breakdown` moves to #1 because it is already being implemented in the working tree. The rankings child moves to #2 and depends on it (Judgment Day JD-10) | santiago.sanchez@cgiar.org |
| 2026-10-15 | Child #4 `typology-view` specified (Standard; 4 tasks, ≈450 LOC; TYV-OQ-1..4 at recommended defaults). Not yet executed | santiago.sanchez@cgiar.org |
| 2026-10-15 | Child #4 `typology-view` done: committed `e68016663`, T-4 browser check passed locally (971 / 971 / 555, Unclassified 0, 375 / 768 / 1280) after a T-2 reopen for the tab-list fit at 375, archived to `archive/2026-10-15-changes--portfolio-overview-revamp--typology-view/`. PRTest smoke pending. #5 `toc-kpi-progress` is unblocked | santiago.sanchez@cgiar.org |
| 2026-10-15 | Child #5 `toc-kpi-progress` specified (Full; 7 tasks, ≈950 LOC added / ≈900 deleted; TKP-OQ-1..6 at recommended defaults). TKP-T-0 (user-run premise query) blocks execution. Not yet executed | santiago.sanchez@cgiar.org |
| 2026-10-16 | Child #8 `w3-projects-section` specified (Full; 6 tasks, ≈1,100 LOC added; WPS-OQ-1..6 at recommended defaults; Judgment Day round 1 PASS / PASS, 0 severe, JD-1..JD-8 fixed). The endpoint moved from `api/bilateral/*` to `results-framework-reporting` (WPS-DD-1). Not yet executed | santiago.sanchez@cgiar.org |
| 2026-10-16 | Child #5 `toc-kpi-progress` amended after execution (additive notes in its `requirements.md` and `design.md`): the KPI total follows the P2-3974 target-only rule (spec `changes/kpi-progress-target-only`, KTO-R-9), superseding "No year / target filter on indicators". The shipped query does not filter by target yet; a follow-up code change is owed. Status fields unchanged | santiago.sanchez@cgiar.org |
| 2026-10-16 | Child #10 `toc-kpi-target-filter` added: a bugfix of #5 that makes `getPortfolioTocCoverage` count only KPIs with a target for the reporting year (P2-3974, the follow-up the #5 amendment records). Requested by the user through orchestrator onecgiar-pr-92 | santiago.sanchez@cgiar.org |
