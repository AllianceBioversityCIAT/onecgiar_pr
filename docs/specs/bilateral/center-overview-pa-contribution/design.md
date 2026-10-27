# Design — Center Overview by P/A (CPA)

## 0. Document Control

| Field | Value |
|---|---|
| Spec | `docs/specs/bilateral/center-overview-pa-contribution/` · prefix `CPA` · depth Standard |
| Status | approved 2026-10-27 (owner, at `/akili-execute` start) |
| Date | 2026-10-27 |
| Requirements | `requirements.md` (CPA-R-1..7) |
| Baseline | after the INC-166545 quick (points 3–5) lands: "No new results yet" and "Reporting pace" gone, project titles on Results by project |
| Delegation | exploration done by two Explore scouts in the propose session (findings in `proposal.md` §3); no fallback needed |

## 1. Summary

Keep the Overview's invariant — **one row set, every figure filtered by one shared predicate, every figure drills to the same rows** (`COV-R-13`, `CWS-R-2`). Add one additive server field (`tagged_center_project_ids` on tagging rows), then do everything else client-side: two aggregate builders, two chart builders, two visible filters, one new contract key. The accepted trade-off: P/A = primary initiative only (one per row).

## 1A. Premise Ledger

| # | Premise | Source of truth | How verified | Status | If false |
|---|---|---|---|---|---|
| CPA-P-1 | Overview fetches `bilateral-center-results` with `scope=bilateral` | `bilateral-overview.service.ts:177` | Scout read, quoted call `{scope:'bilateral'}` | verified | R-4's Results-tab fetch path must add the scope itself |
| CPA-P-2 | `overview_category` CASE: replicated_w3 > replicated_w1w2 > new_w3 > w1w2_tagging > w1w2_center_only | `result.repository.ts:4330-4336` | Read in this session | verified | Category predicates in CPA-DD-4 change |
| CPA-P-3 | `tagged` CTE = active `results_by_projects` joined to `center_projects` | `result.repository.ts:4249-4254` | Read in this session | verified | CPA-DD-1 subquery must mirror the new rule |
| CPA-P-4 | `project_id` is a single `LIMIT 1` pick preferring center projects | `result.repository.ts:4277-4286` | Read in this session | verified | — (this is why CPA-R-6 exists) |
| CPA-P-5 | `submitter` = primary initiative `official_code` | `result.repository.ts:4315-4324` | Read in this session | verified | A-2 must be revisited |
| CPA-P-6 | Tagging rows have `is_leading_result = NULL` and only exist when the tagging flag is on | SQL: `rc` LEFT JOIN + WHERE branch `(? = 1 AND source='Result' AND tg IS NOT NULL)` | Read in this session | verified | CPA-DD-5 scope widens |
| CPA-P-7 | Unscoped Results tab never receives NULL-lead `Result` rows | Same WHERE: without flag, a row needs `rc.result_id` → lead flag 0/1 | Read in this session | verified | CPA-R-5 would change unscoped Results tab counts → re-specify |
| CPA-P-8 | Project → P/A mapping = `project.sciencePrograms[].programCode` (approved only) | `bilateral-projects.service.ts:351,401-405` | Scout read | verified | Series 1/2 source changes |
| CPA-P-9 | IFPRI's tagging row is invisible because its project falls outside the client project list / top-N | prod SQL, CPA-T-1 (`execution.md`) | Result 28915 tags only center project 252 (org 89 = IFPRI) → "outside the list" refuted; top-N / unlabelled +1 not distinguishable in SQL | refuted (T-1) — partly | CPA-T-1 decides; Disqualifier in CPA-R-7 |
| CPA-P-10 | `programLabels` resolves P/A names from projects' `sciencePrograms` | `bilateral-overview.component.ts:331-342` | Read in this session | verified | A W1/W2 P/A no center project maps to shows its code — need a catalog fallback (CPA-DD-6) |

## 2. Architecture Overview

- **Server touched:** `api/results/result.repository.ts` (`getResultsByBilateralCenter`) only. No controller/DTO change (field rides on existing rows). No migration. Not under `/api/bilateral/*` → no change-log row in `bilateral-result-summaries.en.md`.
- **Client touched:** `pages/bilateral/bilateral-query-params.ts`, `bilateral-result-filter.ts`, `services/bilateral-center-result.interface.ts`, `pages/bilateral-overview/` (aggregate, charts, component, `components/overview-controls/`), `pages/bilateral-results-list/` (category chip + scoped fetch).

```
SQL (scope=bilateral) ──► rows[+tagged_center_project_ids] ──► filterCenterResults(params incl. category, role fix)
                                                                 ├─► buildByPaModel      → byPaOption / byPaTable        (CPA-R-1)
                                                                 ├─► buildProjectsByPaModel(rows, scopedProjects) → projectsByPaOption / table (CPA-R-2)
                                                                 └─► existing cards (KPIs, by project, by type)
Results tab ◄── deep link (program, category, scope, phase, explicitDefaults) ── same predicate
```

## 3. Extended Directory Structure

No new folders. New symbols only inside existing files (aggregate, charts, query-params, filter, interface). Overview-controls gains two visible controls in its template.

## 4. Data Model

No schema change. Row interface `BilateralCenterResult` gains optional `tagged_center_project_ids: number[] | null`.

## 5. API Design

`GET api/results/bilateral-center-results` — unchanged signature. With `scope=bilateral`, each row adds `tagged_center_project_ids` (array of distinct center project ids for `w1w2_tagging` rows; `null` otherwise). Without scope: column is still selected but always `NULL` (keeps one SQL shape; consumers ignore unknown fields) — see CPA-DD-1.

## 6. Backend Module Design

- **CPA-DD-1 — correlated `JSON_ARRAYAGG` subquery**, not a JOIN (would multiply rows, same reason `project_id` uses a correlated subquery). Guarded by `CASE WHEN overview_category = 'w1w2_tagging' AND <scope flag> = 1`. Distinct ids from active `results_by_projects` ∩ `center_projects`. MySQL returns JSON text → the service/repository maps it to `number[]` (parse once; tolerate string or array). Rejected: a GROUP_CONCAT string (needs client parsing everywhere, length cap 1024 by default).
- Param order changes (one more `?` for the flag) → repository spec asserts the exact param array for scoped and unscoped calls.

## 7. Backend → Frontend contract

Interface field optional; aggregate treats `null/undefined` as "fall back to `[project_id]` if `project_id` is a center project" **only when the field is absent** (old server during deploy skew). R-2 Scenario A forbids the fallback when the field is present.

## 8. Frontend / UX Component Architecture

| Unit | Responsibility | Req |
|---|---|---|
| `buildByPaModel(rows)` (aggregate) | groups by `submitter ?? NO_PA`; counts `w3` / `tagging`; sort rule | R-1 |
| `buildProjectsByPaModel(rows, projects)` | per P/A: mapped set, with-W3 set (mapped ∩ W3 row project ids), tagged set (from `tagged_center_project_ids` of tagging rows by `submitter`); returns counts | R-2 |
| `byPaOption/byPaTable` (charts) | horizontal grouped bars, 2 series, ids `overview-by-pa:w3`, `:tagging` | R-1 |
| `projectsByPaOption/projectsByPaTable` | vertical grouped bars, 3 series, value labels, pattern from `portfolio-overview/.../projects.charts.ts` `buildProjectsOption` (copied shape, not imported — different module) | R-2 |
| `overview-controls` | adds visible P/A multi-select (`app-pr-multi-select` or Spartan, per spartan MCP) + category select; emits existing `(paramsChange)` | R-3 |
| `bilateral-query-params` | `category` parse/serialise/clear; unknown → absent | R-4 |
| `filterCenterResults` | `category` predicate; role fix | R-4, R-5 |
| `bilateral-results-list` | when `category` present: fetch scoped row set (same as `scope` key path from CWS) + removable chip | R-4 |
| `bilateral-overview.component` | wires models/options, click handlers (`onPaChartClick`, `onProjectsByPaClick`), layout: Projects by P/A full-width row after "Results by project" | R-1..3 |

Tokens: series colours `tokens.ramp[0..2]` (same as existing charts); headings `text-[20px] font-bold`; card shell identical to existing cards; empty ≤ 160px; skeleton `h-[200px]`.

## 9. Shared Contracts

`COV-R-13` contract gains `category`. Overview `deepLinkParams()` adds it when the clicked series is category-specific.

## 10. Design Decisions

| ID | Decision | Req | Rejected alternative |
|---|---|---|---|
| CPA-DD-1 | Additive JSON array subquery under scope flag | R-6 | Per-P/A endpoint (breaks one-row-set invariant); GROUP_CONCAT |
| CPA-DD-2 | P/A = primary only | R-1, A-2 | All initiatives (multiplies counts, breaks Total = Σ) |
| CPA-DD-3 | Series 3 by reporting P/A of the W1/W2 result | R-2, A-1 | By project mapping (would equal mapped∩tagged; less informative for point 6) |
| CPA-DD-4 | `category` filter on `overview_category`, not `source` | R-4 | Reuse `source=w1w2` (would include w1w2 rows of other categories in unscoped Results tab) |
| CPA-DD-5 | `contributing` includes NULL-lead `Result` rows | R-5 | New role value "tagging" (more UI, same effect) |
| CPA-DD-6 | P/A label fallback: `programLabels` → initiatives catalog (`InitiativesService`) → raw code | R-1 | Code only |
| CPA-DD-7 | **Reversion**: remove "Projects mapped" from SP card; move to Projects by P/A | R-1, R-2 | Keep 3 series in one chart (mixes units) |
| CPA-DD-8 | **Reversion**: role filter semantics for NULL lead | R-5 | — |

### Reversion challenges (Step 2.3) — "what does removing this break?"

- **CPA-DD-7:** breaks (a) `onSpChartClick` `:projects` → Reporting deep link; (b) specs asserting `overview-by-sp:projects` ids / `bySpTable` headers; (c) COV-R-10 text. Addressed: the Reporting drill-down moves to Projects by P/A "Mapped" series (R-2 D); specs updated in CPA-T-5/T-7; COV-R-10 superseded by CPA-R-1 in the archive sync.
- **CPA-DD-8:** could change Results tab counts for `role=contributing`. Checked CPA-P-7: NULL-lead `Result` rows exist only when the tagging flag/scope is on, so the unscoped Results tab is unaffected; only scoped views gain rows — which is the fix. Test asserts W3 NULL-lead rows still excluded.

## 11. Risks & Open Gaps

- CPA-P-9 assumed → CPA-T-1 first.
- Chart legibility: no automated gate (T6 screenshot at HITL).
- Deploy skew: client fallback (§7).

## 12. Budget (Step 2.4 tripwire)

| Measure | Expected |
|---|---|
| Tasks | 8 (incl. diagnosis + live verification) |
| LOC | ~650 (≈ 250 prod + 400 tests/fixtures), server ≈ 60 |
| Review rounds | ≤ 2 per code task |

Depth check: matches Standard. If execution exceeds 10 tasks or ~900 LOC → stop and escalate.
