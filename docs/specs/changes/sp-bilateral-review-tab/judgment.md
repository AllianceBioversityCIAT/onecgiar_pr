# Judgment Day — `changes/sp-bilateral-review-tab`

| Attribute | Value |
|---|---|
| **Target** | `requirements.md` + `design.md` (immutable snapshot after Phase 1/2 drafting, 2026-09-07) |
| **Mode** | judgment_day · pre-approved → one pass, fix-only, no re-judgment (owner mandate) |
| **Judges** | `judge-a`, `judge-b` — `akili-reviewer` wrappers (T3, model ≠ author), blind, read-only, identical prompts |
| **Author** | Fable 5.1 (T1) |
| **Round** | 1 (terminal) |
| **Raw totals** | judge-a: SEVERE 8 · WARNING 9 · INFO 3 — judge-b: SEVERE 10 · WARNING 6 · INFO 4 |
| **Merged** | 7 severe confirmed by both · 2 severe single-judge (verified by the parent in code) · 0 contradictions · 11 warnings · 6 info |
| **Correction work units** | 1 fix pass by the parent (T1) over `requirements.md`, `design.md`, `tasks.md` |
| **Scoped re-judgment** | skipped (owner mandate: one pass, fix-only) |
| **Terminal state** | **JUDGMENT: APPROVED ✅** (all severe findings corrected; warnings corrected where factual; info recorded) |

## Frozen ledger

### Severe — confirmed by both judges (fixed)

| L | Judges | Finding | Verified at | Fix applied |
|---|---|---|---|---|
| L-1 | JA-1, JA-2, JB-3 | Badge (`pending-review`) counts primary-role rows only; the list has no role filter (contributor rows included, hence the Contributor tag). Premise "same population" was false; AC-9 could fail. | `result.repository.ts:3228-3235, 3266-3269` vs `:3936-3939` | Badge now derived from the review list via `BilateralReviewCountService` (`ensure` / `setFromRows`); `pending-review` endpoint unused; premises rewritten (primary **or** contributor); AC-19 added (badge == KPI before/after a decision) |
| L-2 | JA-4, JB-1, JB-2 | Wiring audit incomplete: fifth producer `programme-results.component.ts:1433`; cross-folder importers also `programme-results.component.ts:43-45` and `dashboard-lab.component.ts:73` + two specs; four spec files hard-code the old string, not three | `programme-results.component.ts:43-45, 1433`; `dashboard-lab.component.ts:73`; specs listed in R-17 | R-17/R-18, design §2.1, T-2/T-6 restated with five producers, four importers, four spec files |
| L-3 | JA-7, JB-4 | Drawer rule is membership **and** `status_id == 5`; replacing it with membership alone would let members edit Approved/Rejected results and loosen `canEditDataStandards` | `result-review-drawer.component.ts:178-186, 204` | Shared service = `isProgramMember(code)`; drawer keeps `statusId == 5` guard; R-14 rewritten; T-2 test added (member + Approved row → no edit) |
| L-4 | JA-5, JB-5, JB-6 | `PrGroupTableComponent`: `dataKey='id'` keys every group to `undefined` (`GroupedResult` has no `id`); rows belong in `prTableExpandedRow`, not `prTableBody` | `pr-group-table.component.ts:102-114, 163-169`; `pr-table.directives.ts:46-54`; legacy `results-review-table.component.html:6` | Design §6.2 / DD-3 / T-4 rewritten: `dataKey='project_name'`, `prTableExpandedRow`; flat view = plain table sharing the row template; real-table sizing (no CSS grid) |
| L-5 | JA-6, JB-10 | Injecting a root service into the band breaks both band specs (router-only providers); "specs untouched" clause unsatisfiable | `reporting-program-band.component.spec.ts:17-20`, `reporting-program-band.favorites.spec.ts:18-21` | R-5 and scenario allow one provider stub + new `it` blocks in both band specs; DD-2 and T-1 updated |
| L-6 | JA-8, JB-8 | Removing `centers` while keeping `pendingCountByAcronym` is self-defeating (its writer early-returns on empty `centers`; `selectCenter` depends on it) | `bilateral-results.service.ts:24, 75-86, 109-115, 129-138` | Page derives center options/counts from `tableResults`; service members removed only after a grep proves no importer (T-2 lists candidates) |
| L-7 | JB-9 (severe), JA-10 (warning) | Widening the band `activeTab` union breaks compilation unless `SpTabId` / `SP_TAB_LABELS` in `reporting-guide.service.ts` are widened; file absent from scope | `reporting-guide.service.ts:6-13`; band `.ts:266-283` | Guide service added to scope (R-5, design §2.1, T-1); tab not added to tour steps |

### Severe — single judge, verified by the parent (fixed)

| L | Judge | Finding | Verified at | Fix applied |
|---|---|---|---|---|
| L-8 | JA-3 | Premise "no caller sends `versionId`/`statusIds`" false: `dashboard-lab` calls with both; default branch excludes only Discontinued (`status_id != 4`) | `dashboard-lab.component.ts:2529`; `result.repository.ts:3287-3303` | Premise rewritten; `dashboard-lab` listed as a consumer; population stated (all statuses except Discontinued) |
| L-9 | JB-7 | Legacy `?center=` carries the CLARISA center **code**, not an acronym; design deleted the only code → acronym lookup | `indicators-sidebar.component.ts:28-30` | `center` param keeps code values; page rebuilds the map from `CentersService`; R-16, AC-11, design §6.2, DD-6, T-3 updated |

### Warnings (info; corrected where factual)

| ID | Finding | Action |
|---|---|---|
| JA-9, JB-11 | AC-12 "zero hits" fails on the unrouted banner and `.md` docs | AC-12 scoped to `*.ts`/`*.html`, excluding `pages/entity-details/`; banner carved out of R-17 |
| JB-12 | DD-5 claimed `isReportingTab` would flip to true without the exclusion; its closing regex already rejects sub-paths | DD-5 and design §6.1 corrected (rename is defensive/readability) |
| JA-13, JB-13 | Icon rule collision: band toolbar uses Lucide `ng-icon` for search / expand-all | R-20 relaxed: copied controls keep the band's icons; new controls `material-icons-round` |
| JA-14 | Band popover logic lives in the band class, not in copied markup | Page owns popover state/handlers after `my-work-board` `toggleFilterPopover` |
| JA-15, JA-16, JB-17 | Group table renders a real table; no header-hide option; `sortField` sorts groups | Folded into L-4 fix (plain table for flat view, `<col>`/`min-w` sizing, page-sorted) |
| JB-14 | "Project code + name" not in payload (`project_id` numeric, `project_name` already prefixed) | R-10, design, T-4: header shows `project_name` as delivered |
| JB-15, JA-20 | AC-4 fixture (6 rows) vs design fixture (7 rows incl. Editing) | Single fixture: 7 rows incl. one Contributor-role pending row and one Editing row |
| JB-16 | Emerging-result `returnTab` whitelist honors only `results`/`my-work` | R-22 + AC-20 added; T-6 edits `dashboard-lab.component.ts:755, 866` |
| JA-11, JA-12 | R-14 listed the badge as a consumer; R-5 said "badge input" while DD-2 injects | R-14 consumers = row action + drawer; R-5 = "badge mechanism per design" |
| JA-17, JB-18 | LOC budget ambiguous (gross vs net) | Budget restated: ~1,200 added / ≈ 600 net; tripwire on added LOC |

### Info (recorded)

| ID | Note |
|---|---|
| JA-18 | Citation drift (drawer `178-186`, `activeTabInfo` `503-532`, tour ternary `266-283`) — corrected in place |
| JA-19 | R-9 search scope is an extension over legacy — now stated in R-9 |
| JB-19 | R-21 ordering and missing §11 rows for R-14/R-21 — reordered; rows added |
| JB-20 | British spellings vs American-English mandate — swept in all three docs |
| — | `pending-review` endpoint remains unused server code; no server change requested |

## Parent verification notes

Every severe finding was re-opened in code by the parent before the fix (`dashboard-lab.component.ts:2529`, `programme-results.component.ts:43-45, 1430-1435`, `dashboard-lab.component.ts:73` + specs, `result-review-drawer.component.ts:176-190`, `pr-group-table.component.ts:108-116` + directive docs, `result.repository.ts:3285-3305`, `indicators-sidebar.component.ts:26-46`, `bilateral-results.service.ts:76-88`, `reporting-guide.service.ts:1-22`, band spec `12-30`, band html `268-272, 748-753`, `dashboard-lab.component.ts:753-758, 864-870`). No contradiction between judges was found; the one severity disagreement (L-7) was resolved toward the stricter reading.

## Kaizen signal

Nine severe findings on a spec whose premises were "verified in code" during Phase 1: the Phase 1 check verified SQL populations but not **role** predicates, and the wiring audit trusted the first scout's list instead of a fresh repo-wide grep. Candidate lesson for `/akili-archive`: a wiring audit must be a grep the Leader runs, not a scout summary; a data-population premise must state the role/status predicate of every writer.
