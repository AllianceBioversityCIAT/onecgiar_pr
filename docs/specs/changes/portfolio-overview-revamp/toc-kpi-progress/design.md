# Design — Portfolio Overview: Progress against ToC KPIs, by Program / Accelerator

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/portfolio-overview-revamp/toc-kpi-progress/` |
| Requirements | [`requirements.md`](./requirements.md) (approved 2026-10-15) |
| Depth | Full |
| Approval Mode | gated |
| Status | approved (2026-10-15, Phase 2 gate) |
| Prefix | `TKP-DD-n` decisions · `TKP-P-n` premises |
| Baseline | `docs/prd.md` US-P1 / AC-3 / AC-5 · `docs/ux-ui/design.md` §7, §10, DD-12 · `docs/trd/trd.md` §1B QAS-1/QAS-3, §4, §8 |
| Kaizen | `docs/specs/kaizen-log.md` does not exist; the family's lessons come from the archived siblings (scoped Jest, `CLAUDE.md` re-stamp, browser check at 375/768/1280) |

## 1. Summary

- **Server:** one new endpoint in `api/results-framework-reporting`, `GET toc-results/portfolio-coverage?versionId=`. It is admin-guarded and returns, for every P/A of the open portfolio, total and covered ToC KPIs split by Output / Outcome. It runs **one set-based query** grouped by `official_code × category`, so it never loops per Program (parent R-2).
- **Client:** a new standalone block `components/toc-kpi-block/` with its own fetch and its own states, like the Centers block. A pure formatter holds all display maths. The block takes the matrix's slot. The matrix and everything only it uses is deleted.
- **Trade-off accepted:** the KPI-scope predicates are a re-statement of `program-progress`'s node scope, not a call into it. Parity is a premise (TKP-P-2), proven only by the live check at the HITL pause.

## 1A. Premise Ledger

| # | Premise | Source of truth | How verified | Status | If false |
|---|---|---|---|---|---|
| TKP-P-1 | AoW membership of a node = a `toc_work_packages` row matched by `tr.wp_id = wp.toc_id`, `wp.year = reporting year`, `wp.wp_official_code LIKE '<program>-%'`. `is_aow` is exactly `wp.toc_id IS NOT NULL` | `aow-bilateral.repository.ts:537` (`is_aow`) and `:596-601` (join) | Read both lines; the join carries those three conditions | verified | Re-derive the scope from `findWorkPackagesByProgram` (`:248-298`); TKP-T-1's predicate table changes |
| TKP-P-2 | `program-progress` keeps: OUTPUT nodes with a matched AoW **or** `wp_id IS NULL`; OUTCOME nodes only with a matched AoW (`belongsToTheAreaOfWork`, `results-framework-reporting.service.ts:494-500`; filter `aow-bilateral.repository.ts` `(wp.toc_id IS NOT NULL OR tr.wp_id IS NULL)`) | Service + repository, side by side | Both predicates read: the repository admits `wp_id IS NULL`, and the service drops outcomes with `is_aow === false`, which includes `wp_id IS NULL` outcomes | verified (code). Live parity is pending at the HITL check (TKP-T-6) | Total KPIs disagree with Program Overview. Raise it at the HITL check before commit; do not tune silently |
| TKP-P-3 | A result's link to an indicator (`results_toc_result_indicators` row) is created only for the indicators the user selected, not for every indicator of the mapped node | `results-toc-results.repository.ts:2036-2045` saves one row per `itemIndicator` of the payload | Code read only. Whether the client sends every node indicator is **not** verified | **assumed** | Coverage measures "node mapped", not "KPI chosen". Before execution the user runs the TKP-T-0 query. If more than ~5 % of active links have no target row with a contributing value, re-open TKP-OQ-3 |
| TKP-P-4 | The link to the ToC indicator is `CONVERT(rtri.toc_results_indicator_id USING utf8mb4) = CONVERT(tri.related_node_id USING utf8mb4)` plus `tri.toc_results_id = rtr.toc_result_id` | `aow-bilateral.repository.ts` `getIndicatorContributions` (`:878-1020`) | Read the quoted join | verified | Covered = 0 everywhere. The TKP-T-6 parity check catches it (a SQL-text test in TKP-T-1 cannot) |
| TKP-P-5 | `result.version_id` and `result.source` exist as columns | `result.entity.ts:267, :506` | Read | verified | — |
| TKP-P-6 | `ReportingTocContextService` resolves a `versionId` into `{ reportingYear, phaseUuid }`, defaulting to the active reporting phase | `reporting-toc-context.interface.ts:1-6`; used by `resolveTocContextForRequest` (`service.ts:327, 562`) | Read | verified | — |
| TKP-P-7 | `ValidRoleGuard` can be resolved in this module (`RoleByUserRepository` is a provider) | `results-framework-reporting.module.ts:11, :76` | Read | verified | Add the provider; no other change |
| TKP-P-8 | The P/A seed is the CLARISA initiatives with `portfolio_id = 3`, `active`, `cgiar_entity_type_id IN (22, 23, 24)` | `results.service.ts:2101-2107` | Read | verified | A P/A is missing from the list. Correct the seed, never the client |
| TKP-P-9 | Nothing outside `portfolio-overview/` uses the matrix-only symbols (`programmeRows`, `footer`, `matrixTableChartOption`, `matrixTableChartTable`, `CATEGORY_SHORT_NAMES`) | Grep over `onecgiar-pr-client/src` | Grep: no hit outside the folder. `CATEGORY_SHORT_NAMES` is also used by the category-chart click (`component.ts:683`) and named in a `typology.aggregate.ts` comment | verified | Keep any still-referenced symbol; TKP-T-5 deletes only what has zero remaining references |
| TKP-P-10 | The page rows carry `version_id`, so the page version is known client-side | `RawResult` in `portfolio-overview.service.ts:15-31` | Read (scout + file) | verified | Pass no `versionId`; the server falls back to the active phase, which is wrong only on a closed phase |

## 2. Architecture Overview

### 2.1 Where this lives

- **Server:** `api/results-framework-reporting/` (controller, service, new DTO) plus `api/results/results-toc-results/repositories/aow-bilateral.repository.ts` (new query method beside `getPlannedKpisCountMap`).
- **Client:**
  - `shared/services/api/results-api.service.ts` (new method);
  - `shared/interfaces/` (new interface);
  - `pages/result-framework-reporting/pages/portfolio-overview/` (new block, page integration, removals, copy, `CLAUDE.md`).
- **External:** none. `${DB_TOC}` is a schema on the same `DataSource`.

### 2.2 Primary flow

```
[PortfolioOverviewComponent]  hasFigures() → data.versionId()
  └── <app-portfolio-toc-kpi-block [versionId] [year]>
        └── GET_PortfolioTocCoverage(versionId)
              └── GET /api/results-framework-reporting/toc-results/portfolio-coverage?versionId=
                    ├── JwtMiddleware → ValidRoleGuard (ADMIN, APPLICATION)
                    ├── service: resolve ToC context (versionId → year, phaseUuid)
                    ├── service: load the P/A seed (CLARISA initiatives)
                    ├── repository: ONE grouped query → rows (code, category, total, covered)
                    └── service: merge seed × rows → programs[] + portfolio totals
        ← { response: PortfolioTocCoverage }
        └── toc-kpi.format → sorted view rows + summary → template
```

## 3. Data Model Changes

None. No entity, no migration. The query reads:
- `${DB_TOC}`: `toc_results`, `toc_results_indicators`, `toc_work_packages`.
- `${DB_NAME}`: `result`, `results_toc_result`, `results_toc_result_indicators`.

## 4. API Surface

### 4.1 `GET /api/results-framework-reporting/toc-results/portfolio-coverage`

| Field | Value |
|---|---|
| Version | `api` (sibling of `toc-results/program-progress`) |
| Auth | JWT (`auth` header) via middleware |
| Role | `@Roles(RoleEnum.ADMIN, RoleTypeEnum.APPLICATION)` + `@UseGuards(ValidRoleGuard)` (precedent: `admin-panel.controller.ts:142-143`) |
| Query | `versionId` (optional, integer). It is parsed with the same coercion as `program-progress`. A non-numeric value is treated as absent, which means the active phase |
| Response (`response` in the standard envelope) | `versionId`, `phaseName`, `reportingYear`, `programs[]`, `portfolio { total, covered }` |
| `programs[]` item | `code`, `shortName`, `name`, `total`, `covered`, `outputs { total, covered }`, `outcomes { total, covered }` |
| Ordering | Unordered on the wire. The client sorts (TKP-DD-5) |
| Errors | ToC context not resolvable → the context service's own status (400/404). Anything else → 500 through `returnErrorRes`, with a generic message and no SQL or stack (`HttpExceptionFilter`) |
| Swagger | `@ApiOperation` states the KPI and coverage rules in one paragraph, plus `@ApiQuery versionId` and `@ApiOkResponse` |
| Telemetry | No new logs on success. Failures log through the existing handler, with no query text or parameters |

### 4.2 Bilateral / platform-report impact

None. `/api/bilateral/*` and `/api/platform-report/*` are untouched; no change-log entry.

## 5. Server Workflow / Business Rules

**Controller** (`results-framework-reporting.controller.ts`). One handler beside `program-progress`, with guard + roles decorators. It parses `versionId` and delegates. No body.

**Service** (`getPortfolioTocCoverage(versionId?)`):
1. Resolve the ToC context through the existing `resolveTocContextForRequest(versionId)`.
2. Load the P/A seed (TKP-P-8) through the injected `ClarisaInitiativesRepository`.
3. Call the repository with the context.
4. Index the rows by normalised code (trim + upper case). For each seed P/A, build the entry with zeros as default. `total` / `covered` are the sum of the OUTPUT and OUTCOME rows.
5. Drop rows whose code is not in the seed (a ToC of an inactive or older initiative).
6. Compute `portfolio` as the sum over the seed entries.
7. Return `{ response, message, status: OK }`.

**Repository** (`AoWBilateralRepository.getPortfolioTocCoverage(context)`): one statement, grouped by `tr.official_code, tr.category`, every value bound (`?`).

| Aspect | Rule (implements) |
|---|---|
| Base rows | `toc_results` with `phase = context.phaseUuid`, `is_active = 1`, `category IN ('OUTPUT', 'OUTCOME')` |
| AoW join | LEFT join `toc_work_packages` on `tr.wp_id = wp.toc_id`, `wp.year = context.reportingYear`, `wp.wp_official_code LIKE CONCAT(tr.official_code, '-%')`. Same as TKP-P-1, but the program comes from the row instead of a parameter, so the query can span all programs |
| Node scope | OUTPUT: `wp.toc_id IS NOT NULL OR tr.wp_id IS NULL`. OUTCOME: `wp.toc_id IS NOT NULL` (TKP-R-1, TKP-P-2) |
| Indicators | Inner join `toc_results_indicators` with `is_active = 1` |
| Total | `COUNT(DISTINCT tri.id)`. Distinct removes the duplicates from target rows and from several matched work packages (S-1.1) |
| Covered | `COUNT(DISTINCT tri.id)` restricted to indicators found in a derived set of **covered indicator ids** (TKP-R-2) |
| Covered set | Distinct `tri.id` reached through: `result r` → `results_toc_result rtr` (`is_active = 1`, `rtr.toc_result_id = tri.toc_results_id`) → `results_toc_result_indicators rtri` (`is_active = 1`, `is_not_aplicable = 0`, matched by TKP-P-4). Filtered on `r.is_active = 1`, `r.source = 'Result'`, `r.status_id IN (2, 3)`, `r.version_id = context.versionId`. Built once, filtered by version / source / status first, then LEFT-joined by `tri.id` |
| No year / target filter on indicators | Deliberate: an indicator without a target this year is still a KPI (TKP-R-1; `bugfix/kpi-count-reconciliation` dropped the zero-target exclusion) |

The status set (2, 3) and the source (`'Result'`) are named constants, reusing `W1_W2_RESULT_SOURCE_FILTER` (`shared/constants/w1-w2-result-source-filter.constant.ts`) and `ResultStatusData` values. They are not literals, so a business change to TKP-OQ-2 is a one-line edit.

**Transactions / concurrency:** read-only, no transaction. **Workflows:** none of W1..W8 is touched; reads are phase-scoped (AC-5).

## 6. Frontend Plan

### 6.1 Routes / modules

No route change. `/portfolio-overview` keeps `CheckAdminGuard`.

### 6.2 Components & services

| Unit | Path (under `portfolio-overview/` unless stated) | Responsibility |
|---|---|---|
| API method | `shared/services/api/results-api.service.ts` → `GET_PortfolioTocCoverage(versionId?)` | Same URL base and `versionId` encoding as `GET_ScienceProgramTocProgress` (`:1695`). Typed with the new interface. **No** `toDisplayBasis` (no achieved values) |
| Interface | `shared/interfaces/portfolio-toc-coverage.interface.ts` | `PortfolioTocCoverage`, `PortfolioTocCoverageProgram`, `CoverageCount` |
| Formatter (pure) | `components/toc-kpi-block/toc-kpi.format.ts` | `coveragePercent(covered, total)`: half-up, clamps per TKP-R-4, `null` when total = 0. `naturalCodeCompare` (TKP-R-5). `toViewRows(programs)` → sorted rows with display fields. `toSummary(portfolio)` |
| Block | `components/toc-kpi-block/toc-kpi-block.component.{ts,html}` | Standalone, `OnPush`. Inputs `versionId` (number or null) and `year` (string). Output `programmeOpen` (code). Owns state `status: loading / error / ready`, `data`, and `retry()`. It fetches when `versionId` changes (effect) and on `retry()`. It ignores stale responses (switch-latest), so one request is live at a time (S-7.1) |
| Page service | `services/portfolio-overview.service.ts` | **Add** `versionId()`: a computed from the first open row's `version_id`, or `null`. **Remove** `programmeRows()`, `footer()` and `PortfolioRow`, once they have zero remaining references (TKP-P-9) |
| Page component | `portfolio-overview.component.{ts,html}` | Replace the matrix section (`html:371-733`) with the block, and the matrix skeleton (`html:89-107`) with a block skeleton (testid `portfolio-overview-skeleton-toc-kpi`). Wire `(programmeOpen)` to the existing `openProgramme(code)`. Delete the matrix-only view state and handlers (§6.5) |
| Charts | `portfolio-overview.charts.ts` | Delete `matrixTableChartOption` / `matrixTableChartTable` and their spec cases |
| Copy | `internationalization/portfolio-overview.copy.ts` | New `tocKpi` group: title, subtitle (with a year parameter), summary label, row split template, zero-KPI line, empty line, error line, retry label, aria templates for the bar and the name button |

### 6.3 Layout & design tokens (no mockup; derived from the typology block and the Centers block)

**Section shell.** Same card as the typology block: `--pr-border` hairline, white surface, no shadow, `p-[20px]`. Header: `h2` `text-[16px] font-semibold`, subtitle `text-[13px]` in `--pr-text-secondary`.

**Summary line.** One row above the list.
- Label in `text-[13px]`.
- Figure `covered / total` and % in `font-mono tabular-nums text-[14px] font-semibold`, right-aligned.
- A full-width bar under it.

**Row grid.** At ≥ 640px there are three columns:
- name button (flexible, clamped to 1 line, with a tooltip of the full name; code in `font-mono text-[12px]` before the name);
- figures (fixed width, right-aligned, `font-mono tabular-nums`);
- bar (fixed width ~ 200px).

The split line `Outputs a / b · Outcomes c / d` sits under the name in `text-[12px]` `--pr-text-secondary`. Below 640px the figures sit above a full-width bar (NFR responsive).

**Bar.**
- Track `--pr-color-accents-2`.
- Fill: one neutral-to-brand content colour, chosen at execution from the existing chart token family (`--pr-chart-*`). The constraint is ≥ 3:1 against the track (WCAG 1.4.11). Never a violet surface tint (rule 7).
- Height 8px, radius full, width bound with `[style.width.%]`.
- `role="img"` with an `aria-label` built from the copy template ("40% — 100 of 250 KPIs covered").

**Zero-KPI row.** The muted line "No ToC KPIs in this phase" replaces figures and bar. No bar element is rendered.

**States.**
- Loading: skeleton bars (`pr-skeleton`).
- Error: one line + a ghost **Retry** button (rule 1: no second brand button).
- Empty: one line, ≤ 160px (rule 5).

**A11y.**
- The list is a `<ul>` with `aria-labelledby` pointing at the section title.
- Name buttons are `type="button"` with the copy aria-label and a visible focus ring (`--pr-focus-ring`).
- The error and empty lines use `role="status"`.

**Icons.** `@ng-icons/lucide` only (`lucideChevronRight` on name hover, same as the matrix).

### 6.4 Real-time

None.

### 6.5 Removal inventory (TKP-R-9)

These go only where the reference count reaches zero after the template is replaced. TKP-T-5 greps each one.

- **Component:** `matrixViewMode`, `isExporting`, `sortKey`, `sortAsc`, `searchQuery`, `pageSize`, `currentPage`, program / indicator filter signals, `selectedCategories`, column picker state, `columnWidths`, the seeding `effect`, `maxMatrixCellValue`, `cellIntensity`, `columns`, resize handlers, `rows`, `filteredRows`, pagination, `matrixCategoryColumns`, `matrixChartOption`, `matrixChartTable`, `exportToExcel`, `sortBy`, `onCategoryCellClick`, `onMatrixChartClick`, `findProgrammeRowByChartLabel`, `PortfolioColumn`.
- **Kept:** `openProgramme`, `navigateToResultsCenter`, and any symbol a remaining section still uses (`CATEGORY_SHORT_NAMES` if the category-chart click survives).
- **Out of scope** (may look dead, but this spec does not remove them): `bilateralRows`, `bilateralHasMore`, `categoryOrigin*`, `centerBilateral*`.

## 7. Security & Authorization

- JWT through the middleware; `ValidRoleGuard` + `@Roles(ADMIN, APPLICATION)` enforces AC-3 server-side. The client guard stays UX-only.
- Every query value is bound; `versionId` is coerced to a number before use.
- No secrets, tokens or SQL reach logs or error bodies (`.cursorrules`, AC-9).
- The response contains only portfolio-level counts and P/A names: no PII, no result content.

## 8. Performance & Capacity

- One call per page load (or per Retry), by one admin. QPS is negligible.
- **Hot-path risk:** the indicator join uses `CONVERT(... USING utf8mb4)` on both sides, so it cannot use an index (TKP-P-4). Two mitigations:
  - the covered set is built first from `result`, filtered by `version_id` / `source` / `status_id`, which shrinks the converted side to a few thousand rows;
  - the ToC side is limited by `phase` before the join.
- **Budget:** p95 ≤ 3 s (QAS-3) over 3 timed calls at the HITL check.
- **Fallback, only if the budget fails:** split the statement into two (totals; covered ids) and merge them in the service. Same output; the change stays inside the repository method. This is a pivot recorded at execution, not pre-built.
- No caching (page reads are rare; the data must be fresh after a QA decision). No Lambda bundle impact (no new dependency).
- The payload has ~30 P/As × small objects, under 5 KB.

## 9. Observability

No new logs or metrics. It moves PRD M4.2 (p95 on a hot endpoint) only in that the page now makes 2 calls instead of 1. The section's error state is visible to the reader, so a failure is not silent.

## 10. Testing Plan

| Layer | What | Where |
|---|---|---|
| Server unit (repository) | The generated SQL contains each predicate of the §5 table. The bound parameters are, in order: phase, year, version, the status set, the source. No caller value is interpolated | `aow-bilateral.repository.spec.ts` (existing spec, `getPlannedKpisCountMap` pattern) |
| Server unit (service) | Seed × rows merge: zero-KPI P/A present (S-3.1); unknown code dropped; Output / Outcome split summed; `portfolio` = Σ; covered ≤ total holds | `results-framework-reporting.service.spec.ts` |
| Server unit (controller) | `versionId` parsing; guard + roles metadata present (presence only; behaviour at the HITL check) | `results-framework-reporting.controller.spec.ts` |
| Client unit (formatter) | S-4.1 maths and clamps, `null` for 0/0, natural order S-5.1 | `toc-kpi.format.spec.ts` (new) |
| Client unit (block) | Exactly one request per `versionId` and per Retry; loading / error / empty / ready rendering; zero-KPI row has no bar; name button emits `programmeOpen` | `toc-kpi-block.component.spec.ts` (new) |
| Client unit (page) | `#progress-by-science-program` gone; order typology → toc-kpi → centers; matrix specs removed or retargeted; `versionId()` computed | `portfolio-overview.component.spec.ts`, `portfolio-overview.charts.spec.ts`, `portfolio-overview.service` cases |
| Live (HITL) | Parity SQL for ≥ 2 P/As; 403 for a non-admin; 3 timed calls; browser at 1280 / 768 / 375 + contrast reading | TKP-T-6 |

All Jest runs are scoped (`--testPathPattern`) with `--maxWorkers=2`, one run at a time on the machine.

## 11. Backwards Compatibility & Migration Plan

- The new endpoint is additive; `program-progress` and every other endpoint are unchanged. No migration, no feature flag.
- The client removal is user-visible. Readers lose the type × Program heatmap, its Excel export and the cell → Results center jumps. Replacements: Typology by P/A (#4), the name → Results tab link (TKP-R-6), and the export in #9.
- **Rollback:** revert the client commit (the matrix returns). The server commit can stay: an unused endpoint is harmless.
- **Order:** server first, so the client never ships without its endpoint. Both can land in one push.

## 12. Design Decisions

### TKP-DD-1 — A new portfolio-wide endpoint, not a loop over `program-progress`

- **Context:** `program-progress` is per Program, counts target rows, and averages achievement. That is a different metric.
- **Decision:** a dedicated aggregate with one grouped query.
- **Alternatives:**
  - Loop `program-progress` from the client: ~30 calls, the wrong metric (`indicators_counted` = "has a target"), and it violates parent R-2.
  - Extend `get/science-programs/progress`: it is user-scoped (my / other programs), its `plannedKpis` has no category / AoW scope, and it already loops per program.
- **Consequences:** two places now state the node scope (accepted; parity premise TKP-P-2 plus the live check).

### TKP-DD-2 — KPI = distinct indicator id, not target row

- **Context:** S-1.1. The roll-up counts one row per target and repeats no-WP outputs per AoW.
- **Decision:** `COUNT(DISTINCT tri.id)`.
- **Alternatives:** reuse target-row counting (it inflates the total and doesn't match "Program X has 250 KPIs"); filter to indicators with a target this year (dropped project-wide by `bugfix/kpi-count-reconciliation`).
- **Consequences:** the total can differ from the per-AoW KPI counts readers see in Program Overview. The subtitle states the rule.

### TKP-DD-3 — Covered = link existence (TKP-OQ-3)

- **Decision:** an active, applicable indicator link from a pooled QA / Submitted result of the page version.
- **Alternatives:** contributing value > 0 (that is target attainment, out of scope; it would also hide results that report a qualitative contribution).
- **Consequences:** this depends on TKP-P-3 (assumed). TKP-T-0 checks it before code is written.

### TKP-DD-4 — Admin guard on the server

- **Decision:** `ValidRoleGuard` + ADMIN / APPLICATION.
- **Alternatives:** JWT only, like the sibling endpoints. That is consistent with them, but leaves a portfolio-wide view readable by any user, against AC-3.
- **Consequences:** a 403 path that the sibling endpoints don't have. It is tested at the HITL check.

### TKP-DD-5 — Sorting and display maths live in a pure client formatter

- **Decision:** the server returns unordered counts; `toc-kpi.format.ts` sorts and rounds.
- **Alternatives:** sort and round on the server (then the display rule is split across layers, and the S-4.1 / S-5.1 tests need a server).
- **Consequences:** a future consumer of the endpoint gets raw counts, which is the right contract for a data endpoint.

### TKP-DD-6 — The block owns its data path and states (like the Centers block)

- **Decision:** a self-contained component with inputs `versionId` and `year`.
- **Alternatives:** add the fetch to `PortfolioOverviewService` (its contract is "one call, every aggregation off one signal"; a second call there would couple the page's error state to this section and break S-7.1).
- **Consequences:** family #6 (global filters) can still pass a Program filter as an input later.

### TKP-DD-7 — Remove the matrix (reversion; Step 2.3 challenge)

- **Decision:** delete the section and every symbol only it uses (§6.5).
- **Challenge, "what does removing this break?"** (answered by reading `component.html:371-733`, `component.ts:461-715` and the grep in TKP-P-9):

| What breaks | How the design handles it |
|---|---|
| Name → Program Results tab | **Kept** (TKP-R-6, reuses `openProgramme`) |
| Total and cell → Results center filtered by program / category | **Dropped** (TKP-R-9). The Results center remains reachable from the KPI cards |
| Excel export of the matrix | **Dropped until #9** (`filtered-detail-export`). Stated in TKP-R-9 migration notes |
| Type × Program counts | Partly replaced by Typology by P/A at level granularity (#4). Type granularity per Program is lost on this page |
| `portfolio-overview.component.spec.ts` typology-placement test anchors on `#progress-by-science-program` | TKP-T-5 retargets it to the new block |
| `CATEGORY_SHORT_NAMES` is shared with the category-chart click | Kept while it has a reference (TKP-P-9) |
| `PO/CLAUDE.md` describes the matrix (Contract, Gotchas "column order", "cells is positional") | TKP-T-5 rewrites those lines |

- **Unaddressed breakage:** none beyond what TKP-R-9 accepts. The lost type-per-Program granularity and the export gap are product decisions surfaced at this gate.

## 13. Open Gaps & Follow-ups

- **TKP-P-3 (assumed):** verify with TKP-T-0 before execution.
- **Parity:** the KPI total may differ from Program Overview's per-AoW KPI figures by design (TKP-DD-2). If stakeholders compare the two, a glossary line or the status-guide document (parent OQ-1) should explain it.
- **Family #6** (global filters) will want a Program / Center filter on this block. The inputs are ready; the filter itself is out of scope.
- **Excel export** returns with #9.
- **Fallback query split** (§8) only if the p95 budget fails.

## 14. Budget (Step 2.4 tripwire)

| Measure | Estimate |
|---|---|
| Tasks | 7 (T-0 user premise query, T-1 repository SQL, T-2 service + controller, T-3 client API + formatter, T-4 block, T-5 page integration + removal + docs, T-6 HITL checks) |
| LOC added (prod + tests) | ≈ 950: server ≈ 180 prod + 220 tests; client ≈ 300 prod + 250 tests. Plus ≈ 900 deleted (matrix + specs) |
| Review rounds | ≤ 2 per code task |

The size matches Full depth; no change of level. `/akili-execute` stops and escalates if a task needs a third review round, or if added LOC passes ≈ 1,300.

## Required cross-references

[`requirements.md`](./requirements.md) · `docs/prd.md` · `docs/ux-ui/design.md` · `docs/trd/trd.md` · parent [`../proposal.md`](../proposal.md) · [`../family.md`](../family.md) · `portfolio-overview/CLAUDE.md`
