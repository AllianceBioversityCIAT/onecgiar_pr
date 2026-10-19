# Spec Family — Replicated 2026 innovations: P/A change, project pick and Center Overview line

## 1. Document Control

| Field | Value |
|---|---|
| **Parent spec path** | `docs/specs/bilateral/replicated-innovations-2026-pa/` |
| **Slug** | `replicated-innovations-2026-pa` — derived from the free-text argument (INC-164073 follow-up), not passed literally |
| **Date created** | 2026-10-16 |
| **Last updated** | 2026-10-16 |
| **Spec-family status** | `open` |
| **Source proposal** | Freshdesk **INC-164073** "Errors in PRMS - w3/bilat innovation use" (Nicoleta Trifa, replies in red on 15-Oct-2026 to Santiago's 13-Oct email). Data: `Innovations_2026_project_ToC_status_20261013.xlsx` (sheets "Yes-No ToC (34)" and "Without 2026 project") |
| **Approval Mode** | `gated` |

## 2. Child specs (closed set)

| # | Spec Path | Depends on | Parallel-safe | Status |
|---|---|---|---|---|
| 1 | `bilateral/replicated-innovations-2026-pa/project-and-pa-assignment` | none | yes | pending |
| 2 | `bilateral/replicated-innovations-2026-pa/center-overview-no-project-line` | none | yes | pending |

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
