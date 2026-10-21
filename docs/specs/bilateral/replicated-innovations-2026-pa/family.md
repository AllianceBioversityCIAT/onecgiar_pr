# Spec Family — Replicated 2026 innovations: P/A change, project pick and Center Overview line

## 1. Document Control

| Field | Value |
|---|---|
| **Parent spec path** | `docs/specs/bilateral/replicated-innovations-2026-pa/` |
| **Slug** | `replicated-innovations-2026-pa` — derived from the free-text argument (INC-164073 follow-up), not passed literally |
| **Date created** | 2026-10-16 |
| **Last updated** | 2026-10-21 |
| **Spec-family status** | `open` |
| **Source proposal** | Freshdesk **INC-164073** "Errors in PRMS - w3/bilat innovation use" (Nicoleta Trifa, replies in red on 15-Oct-2026 to Santiago's 13-Oct email). Data: `Innovations_2026_project_ToC_status_20261013.xlsx` (sheets "Yes-No ToC (34)" and "Without 2026 project") |
| **Approval Mode** | `gated` |

## 2. Child specs (closed set)

| # | Spec Path | Depends on | Parallel-safe | Status |
|---|---|---|---|---|
| 1 | `bilateral/replicated-innovations-2026-pa/project-and-pa-assignment` | none | yes | done — archived 2026-10-21 to `docs/specs/archive/2026-10-21-bilateral--replicated-innovations-2026-pa--project-and-pa-assignment/` |
| 3 | `bilateral/replicated-innovations-2026-pa/center-overview-w3-scope` | none | no (with #2) | done — archived 2026-10-21 to `docs/specs/archive/2026-10-21-bilateral--replicated-innovations-2026-pa--center-overview-w3-scope/` |
| 2 | `bilateral/replicated-innovations-2026-pa/center-overview-no-project-line` | `center-overview-w3-scope` (#3) | no (with #3) | specified 2026-10-21 — ready for `/akili-execute` |

**Build order (MoSCoW):** child 1 is a **Must**. Nicoleta asked for it in both red comments, and it unblocks the default ToC block for the 63 results that have no project. Child 2 is a **Should**. It is a read-only reporting line that reads live data, so it is correct with or without child 1. The two children touch different components (Section 0 of the result editor vs the Center Overview tab) and share no migration or payload, so they can run in parallel.

## 3. Shared definitions (both children use these)

| Term | Definition |
|---|---|
| Replicated innovation | `result.is_replicated = 1`, `source = 'API'` (W3/bilateral), `result_type_id IN (7, 2)`, in the open 2026 Reporting phase. Universe on 13-Oct: 279 results |
| No 2026 project | The result has no active **lead** row in `results_by_projects`. Today: 63 (24 L-CIA023 ILRI + 39 under 15 other projects) |
| P/A | Primary Science Program/Accelerator, the active `results_by_inititiative` row with `initiative_role_id = 1` |

## 4. Change log

| Date | Change |
|---|---|
| 2026-10-16 | Family created by `/akili-propose` with 2 children |
| 2026-10-21 | Child #3 `center-overview-w3-scope` added at the user's request (INC-165171, Nicoleta 21-Oct: the Overview counts only replicated W3, new W3 and W1/W2 tagging a center project). It goes before #2, which now depends on it: #2's no-project row becomes W3-only |
| 2026-10-21 | Child #3 executed: T-1..T-5 PASS, T-6 PRTest link reconciliation PASS on CIP and IITA. CIP prod count (63) is confirmed after release. Child #2 proposal noted: its no-project row is now W3-only |
| 2026-10-21 | Child #1 `project-and-pa-assignment` archived: T-1..T-5 done (T-5 added in execute), PRTest HITL with saves closed 2026-10-19, shipped on `performance-refactor` `572363fe2`. The manifest had said pending while it was executed. Prod real-data check follows the release |
| 2026-10-21 | Child #2 `center-overview-no-project-line` specified (Standard, 5 tasks, ~300 LOC). Rebased on #3: the bucket uses the row `project_id` (no project of any role, `CNP-OQ-3`), and the Results link uses a new `group` contract key with a shared predicate |
