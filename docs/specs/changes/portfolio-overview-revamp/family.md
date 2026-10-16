# Spec Family — Portfolio Overview Revamp

## 1. Document Control

| Field | Value |
|---|---|
| **Parent spec path** | `docs/specs/changes/portfolio-overview-revamp/` |
| **Date created** | 2026-10-14 |
| **Last updated** | 2026-10-16 (#8 done and archived) |
| **Spec-family status** | open |
| **Source proposal** | [`proposal.md`](./proposal.md), from the stakeholder feedback list, items 1–8 (screenshot attached to the request) |

## 2. Child specs (closed set)

| # | Spec Path | Depends on | Parallel-safe | Status |
|---|---|---|---|---|
| 1 | `changes/portfolio-overview-kpi-breakdown` | none | no | done |
| 2 | `changes/portfolio-overview-revamp/remove-rankings-status-copy` | `changes/portfolio-overview-kpi-breakdown` (must be **committed**, because both edit the same component and service files) | no | done |
| 3 | `changes/portfolio-overview-revamp/centers-new-vs-replicated` | `changes/portfolio-overview-revamp/remove-rankings-status-copy` (centers-block slice); `changes/portfolio-overview-revamp/remove-centers-progress` (same `centers-block/` files — run #7 first) | no | done |
| 4 | `changes/portfolio-overview-revamp/typology-view` | `changes/portfolio-overview-revamp/remove-rankings-status-copy` | no | done |
| 5 | `changes/portfolio-overview-revamp/toc-kpi-progress` | `changes/portfolio-overview-revamp/typology-view` (client half only; the server half has no dependency) | no | done |
| 6 | `changes/portfolio-overview-revamp/global-filters` | #1–#5, #7, #8 | no | done |
| 7 | `changes/portfolio-overview-revamp/remove-centers-progress` | none | no (shares `centers-block/` with #3) | done |
| 8 | `changes/portfolio-overview-revamp/w3-projects-section` | server half: none · client half: `changes/portfolio-overview-revamp/toc-kpi-progress` (template order) | server half yes · client half no | done |
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
| 2026-10-16 | Child #5 `toc-kpi-progress` done: server `154079643`, client `34b9f5ad6`, docs `d56e46103`. The target-only follow-up is #10 `toc-kpi-target-filter` (`e5c2c775b`). PRTest smoke at `38d15a30c` passed: 403 for a non-admin user, and the user accepted the block. Ready to archive | santiago.sanchez@cgiar.org |
| 2026-10-16 | Children #5 `toc-kpi-progress` and #10 `toc-kpi-target-filter` archived to `archive/2026-10-16-changes--portfolio-overview-revamp--toc-kpi-progress/` and `archive/2026-10-16-changes--portfolio-overview-revamp--toc-kpi-target-filter/`. Kaizen entries recorded; pending items await the apply phase on staging | santiago.sanchez@cgiar.org |
| 2026-10-16 | Child #6 `global-filters` proposal written (Option A: client filtering + new admin-only `portfolio/result-dimensions` endpoint; Results Center query untouched; OQ-1..5 with defaults). Approved | santiago.sanchez@cgiar.org |
| 2026-10-16 | Child #6 `global-filters` specified (Full; 8 tasks, ≈1,500 LOC added / ≈120 removed; GLF-OQ-1..6 at defaults; GLF-R-5 and R-8 amended in Phase 2; no Judgment Day). Recommended 2 PRs (server, then client). Not yet executed | santiago.sanchez@cgiar.org |
| 2026-10-16 | Child #8 `w3-projects-section` done and archived to `archive/2026-10-16-changes--portfolio-overview-revamp--w3-projects-section/`. 6/6 tasks PASS; live parity on version 36 / 2026 identical to an independent SQL (911 / 95 / 8, every P/A and Center); p95 0.98 s; non-admin hidden (user-tested). One pivot: chart series remapped + stripe decal (no non-violet chart token exists). Kaizen entry recorded; pending items await the apply phase on staging | santiago.sanchez@cgiar.org |
| 2026-10-16 | PRTest smoke for children #3 `centers-new-vs-replicated` and #4 `typology-view` passed (read-only, admin session): #3 725 = 561 + 164, Replicated filter donut 164; #4 999 / 999 / 567, Unclassified 0. Figures drifted up from the 10-15 references; every invariant holds. #5 KPI spot check: SP01 10 / 360, SP02 3 / 137 | santiago.sanchez@cgiar.org |
| 2026-10-16 | Child #9 `filtered-detail-export` specified (Standard; 4 tasks, ≈520 LOC, single PR). requirements, design and tasks approved; Status stays pending. Execution waits for #6 `global-filters` to be committed (pre-flight box in its tasks.md) | santiago.sanchez@cgiar.org |
| 2026-10-16 | Child #6 `global-filters` executed: 8/8 tasks PASS (14 review rounds, against a budget of 12 that the user raised to about 15; LOC overran about 2x, mostly in specs, and the user accepted it). The admin-only `portfolio/result-dimensions` endpoint and the global filter bar are wired across the page. Live parity on version 36 matches an independent SQL: CENTER-03 141, CENTER-02 235, CENTER-11 160, project 1368 58. Endpoint 0.66 s and 78 KB. One defect was found live and fixed (`*brnCommandEmpty`). The design §6.4 `aria-checked` deviation was accepted. The non-admin 403 was accepted by the user without a live call (module hidden for guests; metadata asserted in specs). Not yet archived | santiago.sanchez@cgiar.org |
| 2026-10-16 | Child #6 `global-filters` archived to `archive/2026-10-16-changes--portfolio-overview-revamp--global-filters/`. 2 lessons and 1 recurrence were recorded as pending items in `docs/specs/kaizen/changes--portfolio-overview-revamp--global-filters.md`, for the apply phase on staging. Open follow-ups: PRTest smoke including a real non-admin 403, and `codegraph sync` | santiago.sanchez@cgiar.org |
