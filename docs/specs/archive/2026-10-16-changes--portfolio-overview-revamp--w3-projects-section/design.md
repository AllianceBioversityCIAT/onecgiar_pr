# Design — Portfolio Overview: W3/Bilateral projects, by P/A and by Center

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/changes/portfolio-overview-revamp/w3-projects-section/` |
| Requirements | [`requirements.md`](./requirements.md) (approved 2026-10-16) |
| Depth | Full |
| Approval Mode | gated |
| Status | approved (2026-10-16, Phase 2 gate: Judgment Day round 1, both PASS, 0 severe; user chose "Fix only" — JD-1..JD-8 applied) |
| Prefix | `WPS-DD-n` decisions · `WPS-P-n` premises |
| Baseline | `docs/prd.md` US-P1 / AC-3 / AC-5 · `docs/ux-ui/design.md` §7, §10 · `docs/trd/trd.md` §1B QAS-3 |
| Kaizen | `docs/specs/kaizen-log.md` does not exist. Family lessons from the archived siblings: scoped Jest with `--maxWorkers=2`, `CLAUDE.md` re-stamp in the same commit, a browser check at 375 / 768 / 1280, and a parity SQL run by the user |
| Sibling template | #5 `toc-kpi-progress`: same endpoint home, guard, envelope, block pattern and HITL task |

## 1. Summary

- **Server:** one new admin-only endpoint in `api/results-framework-reporting`: `GET portfolio/bilateral-projects?versionId=`.
  - **One SQL statement** returns one row per active project of the phase year, with four facts: approved P/A codes, has-W3, has-W1/W2, and the Center inputs.
  - The service resolves each project's Center with the **existing pure resolver** `resolveProjectOwnerCenter` and aggregates totals, by-P/A and by-Center **in memory**. There are ≈ 1,200 rows.
- **Client:** a new standalone block `components/projects-block/` with its own fetch and its own states. A pure formatter holds the maths and the order. The block is mounted **after the CGIAR Centers block**.
- **Trade-off accepted:** the P2-3313 approved-mapping rule is restated in SQL, because today it exists only as private in-memory methods. Parity (WPS-P-3) is proven only by the live check.

## 1A. Premise Ledger

| # | Premise | Source of truth | How verified | Status | If false |
|---|---|---|---|---|---|
| WPS-P-1 | A route under `api/bilateral/<one segment>` skips JWT: `app.module.ts:145-152` excludes `api/bilateral/:id` | `app.module.ts:145-152` (scout) | Read | verified | — (the decision WPS-DD-1 avoids it either way) |
| WPS-P-2 | `results-framework-reporting.module.ts` registers the **entities** `ClarisaProject`, `ClarisaCenter` and `ClarisaInitiative` (`forFeature`) and `RoleByUserRepository` for `ValidRoleGuard`. It does **not** provide `ClarisaProjectsRepository` (`clarisa-projects.repository.ts:6-13`; it needs `DataSource` + `HandlersError`), and the service has no `ClarisaCenter` repository injected | `results-framework-reporting.module.ts:47-92`; service constructor `:53-65` (JD-2) | Read | verified | WPS-T-2 adds `ClarisaProjectsRepository` to the module `providers`, injects `@InjectRepository(ClarisaCenter)`, and adds both mocks to the service spec providers |
| WPS-P-3 | Approved mapping = `TRIM(program_code) <> ''`, `allocation > 0`, `BINARY TRIM(status) IN (approved set)`. This is the SQL form of `reportableMappings` (`bilateral-projects.service.ts:396-414`, `APPROVED_MAPPING_STATUSES = {'Confirmed'}`). `BINARY` keeps it case-sensitive like `Set.has`; the column collation is case-insensitive (JD-6) | Service code (scout, both judges) | Read | verified (code). Live parity is pending at WPS-T-6 | Mapped total disagrees with the Center Overview for the same Center. Stop at HITL; never tune silently |
| WPS-P-4 | Active project = `is_active IS NULL OR is_active <> 0`, which is what the Center Overview's `p.isActive !== false` (`:252`) intends. The column is `tinyint(1)`, so it may hydrate as the number `0`, and `0 !== false` would then let the Center Overview count inactive projects (JD-9) | Service code + `clarisa-projects.entity.ts:111-112` | Read | **assumed** (the hydration behaviour is not verified) | The SQL stays per WPS-R-1 (S-1.1 P5). If WPS-T-6 parity differs by exactly the inactive projects, record it as a Center Overview defect (follow-up), not a reason to change this SQL |
| WPS-P-5 | `resolveProjectOwnerCenter(project, centerIndex)` (`api/bilateral/utils/project-owner-center.util.ts`) is pure. It tries the org → institution Center, then the alias map → Center code (trusted even with no Center row), and returns `null` otherwise. `buildCenterIndex` takes all `clarisa_center` rows (≈ 15–17; codes go up to `CENTER-17`). The alias map has **10** entries (JD-4) | The util file; `w3-center-alias.constants.ts:77-92` | Read | verified | — |
| WPS-P-11 | The resolver applies the alias also when `organization_code` is set but matches no Center. `getProjectsByCenter` applies it only when the org is NULL (`:223-231`), so a project in that state counts under its alias Center here and under no Center there (JD-12) | Util `:64-76` vs service `:223-231` | Read | verified | Accepted: this block follows the shared resolver (the same rule as contributor tagging). Recorded in §13. WPS-T-6 reports the count of such projects |
| WPS-P-12 | `results_by_projects(project_id)` is indexed, at least by the FK index (JD-13) | Entity has no explicit `@Index` (`results_by_projects.entity.ts:20-34`) | Not verified | **assumed** | WPS-T-6 runs `SHOW INDEX FROM results_by_projects` before the timing check; if there is no index, the §8 fallback applies |
| WPS-P-6 | (c) rule = `getW1w2ContributorCounts` (`:443-479`): active link, active result, `source = 'Result'`, page version, **no status filter** | Service code (scout) | Read | verified | The (c) figures disagree with the Center Overview. Raise it at HITL |
| WPS-P-7 | The page version's `phase_year` equals the `clarisa_projects.phase` year the Center Overview uses for the open phase (it reads `year.active`) | `getProjectsByCenter` `:172-193` vs `version.phase_year` | Code read only | **assumed** for the open phase; they can differ on a closed phase | On a closed phase this block reads that phase's year (intended, AC-5); the Center Overview reads the active year. Documented in §13 |
| WPS-P-8 | `ReportingTocContextService` throws 404 when the version has no `toc_pahse_id`, which is irrelevant for projects | `reporting-toc-context.service.ts:116-120` (scout) | Read | verified | — (WPS-DD-3 does not use it) |
| WPS-P-9 | The P/A seed = CLARISA initiatives with `portfolio_id = 3`, active, `cgiar_entity_type_id IN (22, 23, 24)` | `results-framework-reporting.service.ts:880-886` (#5) | Read | verified | — |
| WPS-P-10 | `PortfolioOverviewService.versionId()` (`:199`) and `loading()` (`:165`) exist. `load()` runs in the page constructor and `apply()` sets the rows (hence `versionId()`) **before** `loading` turns false (`:442-459`), so a block rendered under `!data.loading()` sees its final `versionId` on first render | `portfolio-overview.service.ts`, `portfolio-overview.component.ts:125-126` (both judges) | Read | verified | — |
| WPS-P-13 | Version lookup helpers do not fit as-is: `$_findPhase(id)` filters `is_active` only (no `app_module_id`, `versioning.service.ts:228-238`); `$_findActivePhase` requires `status = true`, so a closed phase 404s (`:151-158`); the ToC resolver requires `toc_pahse_id` (JD-1) | Code read by both judges | Read | verified | WPS-DD-3 specifies its own lookup |

## 2. Architecture Overview

### 2.1 Where this lives

| Layer | Path | Change |
|---|---|---|
| Server controller | `api/results-framework-reporting/results-framework-reporting.controller.ts` | New handler beside `toc-results/portfolio-coverage` |
| Server service | `…/results-framework-reporting.service.ts` | New `getPortfolioBilateralProjects(versionId?)` |
| Server DTO | `…/dto/portfolio-bilateral-projects.dto.ts` (new) | Swagger response |
| Server repository | `clarisa/clarisa-projects/clarisa-projects.repository.ts` | New query method `getPortfolioProjectFacts(year, resolvedVersionId)` |
| Server module | `…/results-framework-reporting.module.ts` | Add `ClarisaProjectsRepository` to `providers` (WPS-P-2) |
| Server constant | `api/bilateral/…` | Export the approved-status set (now private) so the SQL binds it instead of a literal |
| Client API | `shared/services/api/results-api.service.ts` | `GET_PortfolioBilateralProjects(versionId?)` |
| Client interface | `shared/interfaces/portfolio-bilateral-projects.interface.ts` (new) | Wire types |
| Client block | `portfolio-overview/components/projects-block/` (new) | Component + `projects.format.ts` + `projects.charts.ts` |
| Client page | `portfolio-overview.component.html` | Mount after `<app-portfolio-centers-block />` under `@if (!data.loading())`. **No** page-skeleton slot: the page skeleton sits above the Centers block, so a slot there would jump below it on load (JD-10); the block shows its own skeleton |
| Copy / docs | `internationalization/portfolio-overview.copy.ts`, `portfolio-overview/CLAUDE.md` | New `projects` group; new `CLAUDE.md` section |

### 2.2 Primary flow

```
[PortfolioOverviewComponent]  data.loading() false → data.versionId() (number | null)
  └── <app-portfolio-projects-block [versionId]>           (after the Centers block)
        └── GET_PortfolioBilateralProjects(versionId)
              └── GET /api/results-framework-reporting/portfolio/bilateral-projects?versionId=
                    ├── JwtMiddleware → ValidRoleGuard (ADMIN, APPLICATION)
                    ├── service: resolve version → { versionId, phaseYear, phaseName }
                    ├── service: load P/A seed + clarisa_center rows (buildCenterIndex)
                    ├── repository: ONE statement (year, resolvedVersionId) → project facts (≈1,200 rows)
                    └── service: aggregate → totals, byProgram[], byCenter[], unmappedWithBilateralResults
        ← { response: PortfolioBilateralProjects }
        └── projects.format → ordered rows, % strings → template (KPIs, tabs, chart | table)
```

## 3. Data Model Changes

None: no entity and no migration. The statement reads `clarisa_projects`, `clarisa_project_mappings`, `results_by_projects` and `result`.

## 4. API Surface

### 4.1 `GET /api/results-framework-reporting/portfolio/bilateral-projects`

| Field | Value |
|---|---|
| Auth | JWT (`auth` header) via middleware. The path is not JWT-exempt (WPS-P-1) |
| Role | `@Roles(RoleEnum.ADMIN, RoleTypeEnum.APPLICATION)` + `@UseGuards(ValidRoleGuard)` (sibling #5) |
| Query | `versionId` (optional integer), with the same coercion as `portfolio-coverage`: empty, non-numeric or ≤ 0 means absent, i.e. the open phase |
| `response` | `versionId`, `phaseName`, `phaseYear`, `totals`, `byProgram[]`, `byCenter[]`, `unmappedWithBilateralResults` |
| Counts object | `{ mapped, withBilateralResults, w1w2Contributors }`, used by `totals`, by each `byProgram` item and by each `byCenter` item |
| `byProgram[]` item | `code`, `shortName`, `name`, + counts. Every seed P/A is present, including zeros |
| `byCenter[]` item | `code` (`CENTER-xx`, or `null` for Unassigned), `acronym` and `name` from the Center's `clarisa_institution` (or `null` when the alias code has no Center row), + counts. Only Centers with mapped > 0. The client labels rows by `code` (WPS-DD-8); the institution fields are a fallback |
| Ordering | Unordered on the wire; the client orders (WPS-DD-6) |
| Errors | No Reporting version at all → 404 via `throwServiceError`; an id that is not an active **Reporting** version (e.g. an IPSR id) → 404. Anything else → a generic 500 through `returnErrorRes` (no SQL or stack; same catch as #5). A resolvable phase with no projects is **200 with zeros**, never 404 |
| Swagger | `@ApiOperation` with the three rules in one paragraph, `@ApiQuery versionId`, `@ApiOkResponse` with the DTO |

### 4.2 Bilateral / platform-report impact

None. The route is not under `/api/bilateral/*`, so `bilateral-result-summaries.en.md` gets no change-log row (WPS-DD-1). `api/bilateral/center/projects` is unchanged.

## 5. Server Workflow / Business Rules

**Controller.** One handler with the guard and roles decorators. It parses `versionId` and delegates.

**Service** (`getPortfolioBilateralProjects(versionId?)`):
1. Resolve the version (WPS-DD-3, WPS-P-13):
   - `versionId` given → `version` with `id = versionId`, `is_active = 1`, `app_module_id = REPORTING`, **no `status` filter** (the page sends a closed phase's id on purpose);
   - otherwise the open Reporting version (`status = 1`); if there is none, the newest active Reporting version by `phase_year` (the page's own closed-phase rule), so a closed phase never 404s;
   - nothing found → 404.
   - `resolvedVersionId = Number(version.id)` (BIGINT arrives as a string), validated `> 0` as in #5 (`service.ts:871`); `phaseYear = Number(version.phase_year)`.
2. Load the P/A seed (WPS-P-9) and all `clarisa_center` rows with `relations: { clarisa_institution }` (through the newly injected repository), then `buildCenterIndex`.
3. `rows = repository.getPortfolioProjectFacts(phaseYear, resolvedVersionId)`.
4. For each row:
   - **Mapped** = its approved-code list is non-empty. Unmapped rows only feed `unmappedWithBilateralResults` (when has-W3).
   - For a mapped row, add 1 to `totals` (mapped; with-W3 if has-W3; W1/W2 if has-W1/W2).
   - Add the same to each **distinct normalised** approved P/A code that is in the seed (codes outside the seed are dropped, as in #5).
   - Add the same to its Center: `resolveProjectOwnerCenter(row, index)?.code ?? UNASSIGNED`.
5. Build `byProgram` from the seed (zeros by default) and `byCenter` from the Center buckets with mapped > 0. Institution acronym and name come from the index; an alias code with no Center row carries `null` for both (the client labels by code, WPS-DD-8).
6. Return `{ response, message, status: OK }`.

**Repository** (`ClarisaProjectsRepository.getPortfolioProjectFacts(year, resolvedVersionId)`): one raw `this.dataSource.query(sql, params)` statement with **positional `?`** placeholders (the `getW1w2ContributorCounts` precedent; `IN (?)` takes an array). Every value is bound, including the sources (JD-3).

| Aspect | Rule (implements) |
|---|---|
| Base rows | `clarisa_projects cp` with `cp.phase = ?` and `(cp.is_active IS NULL OR cp.is_active <> 0)` (WPS-R-1, WPS-P-4) |
| Approved codes | Correlated `GROUP_CONCAT(DISTINCT TRIM(cpm.program_code))` over `clarisa_project_mappings` with `TRIM(program_code) <> ''`, `allocation > 0`, `BINARY TRIM(status) IN (?)` (WPS-P-3) |
| has-W3 | `EXISTS` active `results_by_projects` → active `result` with `source = ?` (API), `version_id = ?`, `(status_id IS NULL OR status_id <> ?)` (Discontinued; NULL status counts, JD-11) (WPS-R-2) |
| has-W1/W2 | `EXISTS` active `results_by_projects` → active `result` with `source = ?` (Result), `version_id = ?`, no status filter (WPS-R-3, WPS-P-6) |
| Parameter order | The SELECT-list subqueries come before the `WHERE` in the text, so the bind array is: **approved statuses, `'API'`, version, Discontinued, `'Result'`, version, year** |
| Center inputs | `organization_code`, `source_center_acronym` |
| Output | `{ id, organizationCode, sourceCenterAcronym, approvedProgramCodes, hasBilateral, hasW1w2 }` (0/1 coerced in the service) |

Sources come from `SourceEnum` and Discontinued from `ResultStatusData`; there are no literals. Read-only, with no transaction. No workflow (W1..W8) is touched; reads are phase-scoped (AC-5).

## 6. Frontend Plan

### 6.1 Routes / modules

No route change. `/portfolio-overview` keeps `CheckAdminGuard`.

### 6.2 Components & services

| Unit | Responsibility |
|---|---|
| `GET_PortfolioBilateralProjects(versionId?)` | Same base and `versionId` encoding as `GET_PortfolioTocCoverage` |
| Interface | `PortfolioBilateralProjects`, `ProjectCounts`, `ProjectsByProgram`, `ProjectsByCenter` |
| `projects.format.ts` (pure) | `shareOfMapped(count, mapped)`: one decimal, half-up, clamps per WPS-R-8, `null` when mapped = 0. `naturalCodeCompare` (reuse from `toc-kpi.format.ts`, do not copy). `toProgramRows` (natural order). `toCenterRows(rows, labelFor)`: label = the catalogue acronym for the code (the same code → acronym mapping the Centers block uses), else the institution acronym, else the code; sorted by that label A→Z, Unassigned last (WPS-DD-8) |
| `projects.charts.ts` (pure) | Grouped-bar ECharts option (3 series, **no `stack`**) + `pr-viz-chart` table model, from ordered rows. Uses the page's existing palette path (`portfolio-overview.charts.ts`) |
| `projects-block.component` | Standalone, `OnPush`. Input `versionId`. State `status: loading / error / ready`, `dimension: program / center`, `view: chart / table`. Fetches through a switch-latest `load$` Subject (one live request, S-9.1); `retry()` acts only in error. Same shape as `toc-kpi-block` |
| Page | Mount `<app-portfolio-projects-block [versionId]="data.versionId()" />` **after** the Centers block, inside `@if (!data.loading())` (WPS-P-10: the block's first render already has the final `versionId`, so it fetches once; a `null` id → the server's version fallback). No page-skeleton slot (JD-10). The page's own error state does not hide the block: it has an independent data path |
| Copy | `projects` group: title, subtitle(year), three KPI labels, "% of mapped", tabs, view switch, multi-P/A caption, `footnote(n)` with **singular / plural** ("1 project has…" / "N projects have…", JD-15), Unassigned, empty(year), error, retry, table caption, total-row label |

### 6.3 Layout & design tokens (no mockup; derived from the typology and toc-kpi blocks)

- **Shell:** same card as the typology block (`--pr-border` hairline, white, no shadow, `p-[20px]`). `h2` `text-[16px] font-semibold`; subtitle `text-[13px]` `--pr-text-secondary`.
- **KPI row:** three neutral tiles in a `grid` (3 columns ≥ 640px, 1 column below).
  - Figure in `font-mono tabular-nums text-[22px] font-bold`.
  - Label in `text-[12px]`.
  - The % line in `text-[12px]` `--pr-text-secondary`.
  - No violet tint (rule 7).
- **Switches:**
  - Dimension: Helm tabs, exactly as the typology block (`hlmTabsTrigger`, testids `projects-tab-program` / `projects-tab-center`).
  - View: a two-button ghost segmented control with `aria-pressed`. Only one brand button exists on the page (rule 1).
- **Chart:** `pr-viz-chart`, grouped bars, three series with legend labels from copy, using colours `--pr-chart-1`, `--pr-chart-2`, `--pr-chart-3`. **`--pr-chart-4` is excluded**: it is too light for 3:1 on white. The chart's sr-only table comes from the same model.
  - The three are adjacent violets (JD-7), so each bar also carries a **value label on top**. Series identity does not rest on colour alone (WCAG 1.4.1).
  - WPS-T-6 checks that the series are distinguishable in the browser. ~~If they are not, swap the W1/W2 series to a non-violet chart token already defined in `colors.scss` (no new hex).~~ **Amended 2026-10-16 (Pivot Record WPS-T-6, user-approved option A1):** `colors.scss` defines no non-violet chart token (charts are violet-only; status colours are banned from charts), so that remedy was unviable. Series mapping is now Mapped → `--pr-chart-1`, With W3 → `--pr-chart-3`, W1/W2 → `--pr-chart-2` **with a diagonal-stripe decal**, so the three series differ by lightness and pattern, not hue alone. No new token, no hex.
- **Table:** canonical table styles. Numbers are right-aligned `font-mono tabular-nums`. The total row comes from `totals` (never a column sum, so the P/A view's total stays the project total). It sits in an `overflow-x-auto` wrapper (NFR 375px).
- **Caption and footnote:** `text-[12px]` `--pr-text-secondary`. The multi-P/A caption shows only in the P/A dimension.
- **States:** skeleton (`pr-skeleton`); error line + ghost Retry; empty line ≤ 160px (rule 5); `role="status"` on the error and empty lines.

### 6.4 Real-time

None.

## 7. Security & Authorization

- JWT middleware + `ValidRoleGuard` ADMIN / APPLICATION enforce AC-3 server-side. The route has two segments under a non-exempt prefix (WPS-P-1).
- Every value is bound; `versionId` is coerced to a number.
- No SQL, stack or token reaches error bodies or logs (`.cursorrules`).
- The payload holds counts and P/A / Center names only. No project names and no PII.

## 8. Performance & Capacity

- One call per page load or Retry, by admins only.
- The statement scans ≈ 1,200 projects of one phase. Each row has two `EXISTS` probes on `results_by_projects` (indexed by `project_id`) joined to `result` by primary key, plus one small correlated `GROUP_CONCAT`. The expected time is well under the budget.
- **Budget:** p95 ≤ 3 s, from 3 timed calls at HITL.
- **Fallback, only if the budget fails:** replace the `EXISTS` probes with two pre-aggregated derived tables (`project_id` sets per source, filtered by version first), joined once. Same output; the change stays in the repository. It is a pivot at execution, not pre-built.
- Payload ≈ 30 P/As + ≤ 18 Center rows (incl. Unassigned), under 5 KB. No caching.
- The `EXISTS` probes rely on an index on `results_by_projects(project_id)` (WPS-P-12, assumed; checked at WPS-T-6).

## 9. Observability

No new logs or metrics. A failure shows as the block's error state.

## 10. Testing Plan

| Layer | What | Where |
|---|---|---|
| Server repository | The SQL text carries each §5 predicate (including `BINARY` and the NULL-status clause). The bind array is exactly: approved statuses, `'API'`, version, Discontinued, `'Result'`, version, year. No interpolation | `clarisa-projects.repository.spec.ts` |
| Server service | Aggregation from fixture rows, covering S-1.1 (multi-P/A counted once in totals), S-2.1 / S-3.1 (flags), S-4.1 (unmapped footnote), S-5.1 (zero P/A present; P/A sum > total), S-6.1 (NULL org + CIAT alias → `CENTER-03`; unknown → Unassigned; SO ≠ SMO), and the invariants with-W3 ≤ mapped, W1/W2 ≤ mapped, Σ Centers = total. **Version resolution:** an IPSR id → 404; a closed Reporting id resolves (no `status` filter); no id and no open phase → the newest Reporting version; the repository receives the coerced numeric id, never `undefined` | `results-framework-reporting.service.spec.ts` |
| Server controller | `versionId` parsing; guard + roles metadata present (presence only) | `results-framework-reporting.controller.spec.ts` |
| Client formatter / charts | S-8.1 maths and clamps, `null` at 0; P/A natural order; Center A→Z with Unassigned last; grouped option has 3 series and no `stack` | `projects.format.spec.ts`, `projects.charts.spec.ts` |
| Client block | One request per `versionId` and per Retry; loading / error / empty / ready; tab and view switches; caption only in P/A; footnote only when > 0; total row from `totals` | `projects-block.component.spec.ts` |
| Client page | Mount order: centers then projects; the block is absent while `data.loading()` and present after; no page-skeleton slot for it | `portfolio-overview.component.spec.ts` |
| Live (HITL) | Parity SQL: totals, ≥ 2 P/As, ≥ 2 Centers incl. CIAT, plus the counts of inactive projects (WPS-P-4) and of org-set-but-unmatched projects (WPS-P-11). `SHOW INDEX` (WPS-P-12). 403 for a non-admin. 3 timed calls. Browser at 1280 / 768 / 375: series contrast and distinguishability, Center labels as in the Centers block | WPS-T-6 |

All Jest runs are scoped (`--testPathPattern`) with `--maxWorkers=2`, one run at a time.

## 11. Backwards Compatibility & Migration Plan

- Additive endpoint and additive block. No migration, no flag.
- **Rollback:** revert the client commit; the unused endpoint is harmless.
- **Order:** server commit first, then client. They can share a push.

## 12. Design Decisions

### WPS-DD-1 — Endpoint in `results-framework-reporting`, not under `/api/bilateral/*`

- **Context:** the proposal suggested `api/bilateral/portfolio/...`. The bilateral module's controllers are either API-key routes or JWT routes with in-service admin checks. A single-segment path there skips JWT (WPS-P-1). Any `/api/bilateral/*` change also owes a payload-contract change-log row.
- **Decision:** `GET /api/results-framework-reporting/portfolio/bilateral-projects`, beside the sibling `portfolio-coverage`, with the same guard.
- **Alternatives:** `api/bilateral/center/portfolio-projects` (works, but it mixes the per-Center controller with a portfolio view and keeps the in-service admin pattern instead of a guard).
- **Consequences:** both portfolio aggregates live in one controller; the bilateral contract doc is untouched.
- **Divergences from the proposal** (JD-8), all following this decision:
  - the client method lives on `results-api.service.ts` (beside `GET_PortfolioTocCoverage`), not `bilateral-api.service.ts`;
  - the path is `portfolio/bilateral-projects`, not `projects-summary`. It sits beside the existing `bilateral-projects` routes of this controller but does not collide; the `portfolio/` prefix keeps it apart;
  - the depth is **Full**, not the proposal's Standard: a new admin endpoint and SQL aggregate are Full-depth work under the spec rules, as in sibling #5.

### WPS-DD-2 — SQL returns per-project facts; the service aggregates

- **Context:** the Center rule (org → alias → none) already exists as the pure `resolveProjectOwnerCenter`. Restating it in SQL would mean a second copy of the alias map.
- **Decision:** one statement returns ≈ 1,200 rows; the service aggregates them using the resolver.
- **Alternatives:** grouped SQL per breakdown (three statements, and the alias map in SQL); calling `getProjectsByCenter` per Center (15 calls, no metric (b), no P/A breakdown).
- **Consequences:** the approved-mapping rule is restated in SQL (WPS-P-3), with its status set bound from an exported constant. The alias logic stays single-sourced.

### WPS-DD-3 — Version resolution without the ToC context

- **Decision:** its own lookup (§5 step 1):
  - by id: active + Reporting module, any `status`;
  - with no id: the open Reporting version, else the newest active Reporting version;
  - then `resolvedVersionId` (coerced) and `phaseYear`.
- **Alternatives:**
  - `resolveTocContextForRequest`: 404s on a version with no ToC phase (WPS-P-8);
  - `$_findPhase`: no module filter, so an IPSR id would pass and give the wrong year;
  - `$_findActivePhase` alone: a closed phase 404s (WPS-P-13).
- **Consequences:** this block and the ToC block can disagree on availability, which is correct: they depend on different data. A closed phase with zero projects reads as the empty state (200 with zeros), not an error.

### WPS-DD-4 — Unassigned bucket

- **Decision:** a project that resolves to no Center counts under Unassigned (last, only when > 0), so Σ Centers = total (WPS-R-6).
- **Alternatives:** drop it (the Center bars no longer add up, and the reader cannot tell why).

### WPS-DD-5 — Different status rules for (b) and (c)

- **Decision:** (b) excludes Discontinued (proposal OQ-2); (c) counts every status (WPS-OQ-3), for parity with the Center Overview's W1/W2 contributor count.
- **Consequences:** two named constants and two scenarios, so the asymmetry is visible and tested, not accidental.

### WPS-DD-6 — Order and maths in a pure client formatter

The same split as #5 (TKP-DD-5): the server returns raw counts, and the client orders rows and rounds percentages. `naturalCodeCompare` is imported from the toc-kpi formatter, not duplicated.

### WPS-DD-7 — The block owns its data path; mounted after the Centers block

- **Decision:** a self-contained component (like `toc-kpi-block`), placed last on the page, rendered once the page rows have loaded. A `null` `versionId` means the server uses the open phase.
- **Alternatives:** inside `@if (hasFigures())`. That would hide project figures on a phase with no result rows, which is exactly when "0 reporting projects" is the useful answer.

### WPS-DD-8 — Center labels follow the Centers block

- **Context:** CLARISA institution acronyms differ from the catalogue acronyms the page shows (e.g. "Bioversity", "CIAT (Alliance)"). The client already maps `CENTER-xx` → catalogue acronym. WPS-R-7 sorts by acronym, so the label source decides the order (JD-5).
- **Decision:** the server returns the `code` plus the institution acronym and name. The client labels each row by the catalogue acronym for that code (the same mapping as the Centers block), falling back to the institution acronym, then to the code. It sorts A→Z by that label, Unassigned last.
- **Consequences:** this block's Center rows read exactly like the CGIAR Centers block above it.

**Step 2.3 reversion challenge:** not triggered. Nothing delivered is removed, disabled or inverted.

## 13. Open Gaps & Follow-ups

- **WPS-P-7:** on a closed phase, this block reads that phase's year while the Center Overview reads `year.active`. Their numbers can differ by design (AC-5).
- **WPS-P-11:** a project whose `organization_code` matches no Center counts under its alias Center here, and under none in the Center Overview. Per-Center parity can differ by that count; WPS-T-6 reports it.
- **WPS-P-4:** if the Center Overview counts inactive projects (tinyint hydration), raise it as a separate Center Overview defect.
- **Judgment Day** round 1 (2026-10-16): both judges PASS, 0 severe; corroborated warnings JD-1..JD-8 fixed in this document ([`judgment.md`](./judgment.md)).
- **Family #6** decides which global filters apply here (proposal OQ-4).
- **Family #9** owns any project-level list or export.
- **Fallback query** (§8) only if the p95 budget fails.

## 14. Budget (Step 2.4 tripwire)

| Measure | Estimate |
|---|---|
| Tasks | 6: T-1 repository SQL, T-2 service + controller + DTO, T-3 client API + interface + formatter + charts, T-4 block, T-5 page mount + copy + `CLAUDE.md`, T-6 HITL checks |
| LOC added (prod + tests) | ≈ 1,100: server ≈ 200 prod + 250 tests; client ≈ 350 prod + 300 tests. No deletions |
| Review rounds | ≤ 2 per code task |

The size matches Full depth; no change of level. `/akili-execute` stops and escalates if a task needs a third review round or if added LOC passes ≈ 1,500 (#5's tests ran 2× their estimate, so the escalation line sits at about 1.4× the estimate).

## Required cross-references

[`requirements.md`](./requirements.md) · [`proposal.md`](./proposal.md) · [`../family.md`](../family.md) · sibling [`../toc-kpi-progress/design.md`](../toc-kpi-progress/design.md) · `api/bilateral/utils/project-owner-center.util.ts` · `portfolio-overview/CLAUDE.md`
