# Design — Bilateral Center Overview Tab

## Document Control

| Field | Value |
|---|---|
| **Spec Path** | `docs/specs/bilateral/center-overview-tab/` |
| **Linked requirements** | `requirements.md` (same folder) — `COV-R-1..22`, `COV-R-30/31`, `COV-AC-1..25`, defect classes D1–D11 |
| **Depth** | Standard (re-checked against this design in §14 — holds) |
| **Approval Mode** | gated (inherited) |
| **Design prefix** | `COV-DD-n` |
| **Author** | AKILI specify (session, T1 — Fable 5.1) |
| **Date** | 2026-09-14 |
| **Baseline cited** | `docs/trd/trd.md` §4 routing, §6 frontend state ("phase context is shell-level and propagated via query params"), §10 testing · `docs/ux-ui/design.md` §6, §7, §8, §9, §10 · `onecgiar-pr-client/CLAUDE.md` §5 Hard UI rules 1–25 (**icon set:** `material-icons-round` as the center header already uses / Lucide for new glyphs, never PrimeIcons — rule 21; **colour source:** `var(--pr-*)` only — rule 8; **styling:** Tailwind utilities in templates, SCSS only for `:host` — rule 19) |
| **Kaizen lessons applied** | `KZ-BOR-1/2` (hard-rule citations + DoD grep gates), `KZ-changes--sp-shell-app-viewport-2` (`:host` display rules stay in SCSS), `KZ-EVM-1` (sticky verified at two viewport heights), `KZ-W12-1` (SQL placeholder-count assertion), `KZ-GEO-1` (tests call production code, never a local copy), `KZ-bugfix--lead-center-full-catalog-1` (`tsc --noEmit` per task), memory `project-client-verification-tsc-and-page-ct` (module CT in every verification) |
| **Concurrent work observed** | `bilateral/ai-drafts-redesign` is being executed in this checkout right now (uncommitted: header tab label → "AI Draft Results", `bilateral-projects-panel.*`, `my-draft-results.*`, `bilateral-result-creator.*`). This design assumes those land first; `tasks.md` pre-flight re-reads the header before `COV-T-6`. |

---

## 1. Summary

The Overview is a **new standalone page component** under `pages/bilateral/pages/bilateral-overview/` that composes three data sources the shell already fetches — center results for a phase, center projects with SP mappings, AI drafts — through a **feature service with a per-`center::phase` cache**, turns them into card models with **pure aggregation functions**, and renders them with the existing **`app-pr-viz-chart` (ECharts) wrapper and chart tokens**. A **shared query-param contract** (`bilateral-query-params.ts`) plus **one shared filter function** make every Overview figure a deep link whose count reconciles with the destination tab by construction. The only server change is an additive `project_id` column in the center-results SQL.

The design accepts one trade-off: aggregation happens on the client, so cost grows with results per center per phase (hundreds today; the proposal's Option 2 — a server aggregate — is the fallback if a center reaches thousands).

---

## 2. Architecture Overview

### 2.1 Where this lives in the system

| Layer | Touched |
|---|---|
| **Server** | `api/results/result.repository.ts` → `getResultsByBilateralCenter` (+`project_id`); `result.repository.spec.ts`. No controller, DTO, module or migration change. |
| **Client — new** | `pages/bilateral/pages/bilateral-overview/**` (page, controls sub-component, pure `aggregate` + `charts` modules, Jest + CT specs); `pages/bilateral/services/bilateral-overview.service.ts`; `pages/bilateral/bilateral-query-params.ts`; `pages/bilateral/bilateral-result-filter.ts` (shared filter). |
| **Client — modified** | `shared/routing/routing-data.ts` (`BilateralRouting` + `overview` row); `bilateral-page-header.component.{ts,html,spec.ts}` (first tab, alias retired); `services/bilateral-context.service.ts` (`selectedVersionId`); `pages/bilateral-results-list/**` (URL-driven filters, shared phase, status/project chips); `bilateral-projects-panel.component.{ts,html}` (reads `program`/`project`/`multi`, highlight); `my-draft-results.component.ts` (reads `project`); `shared/services/api/bilateral-api.service.ts` unchanged (same URLs). |
| **Client — reused, untouched** | `shared/components/pr-viz-chart`, `shared/utils/chart-tokens.util.ts`, `custom-fields/pr-select`, `styles/_viewport-page.scss`, `PhasesService`, `BilateralAiService` (drafts signal). |
| **External** | None. No CLARISA, ToC, RMQ or S3 interaction. |

### 2.2 Sequence — primary flow (Overview load, phase switch, deep link)

```
[Route /bilateral/:acronym/overview]
  └── BilateralComponent (shell) resolves center → BilateralContextService.setCenter(...)
        └── BilateralOverviewComponent (host class pr-viewport-page)
              ├── reads URL params → BilateralQueryParams.parse(queryParamMap)
              ├── ctx.selectedVersionId ← params.phase ?? (keep) ; effectiveVersionId = selection ?? Open phase
              ├── OverviewControlsComponent (phase select · Filter popover · chips · Clear)
              │     └── emits filter/phase changes → component writes URL (replaceUrl) + ctx signal
              ├── BilateralOverviewService.load(centerId, versionId)
              │     ├── cache hit  → returns stored {results, projects}
              │     └── cache miss → GET api/results/bilateral-center-results?centerId&versionId
              │                      GET api/bilateral/center/projects?centerId  (projects cached per center)
              │                      store under key `center::version` (late response never rendered under another key)
              ├── drafts ← BilateralAiService.drafts() (already loaded by the shell; filtered by project param)
              ├── scopedRows = filterCenterResults(results, params)      ← the SAME function the Results tab uses
              ├── card models = aggregate.*(scopedRows, scopedProjects, drafts, phase)   (pure)
              ├── chart options = charts.*(model, resolveChartTokens())                  (pure)
              └── render: KPI deck · 6 cards · per-card skeleton/error/empty
                    └── click on a figure → routerLink to /home | /results | /drafts with
                        BilateralQueryParams.serialize({ ...currentParams, ...clickedDimension })
                              └── destination tab parses the same contract and applies filterCenterResults(...)
```

### 2.3 Secondary flows

- **Phase switch on Results tab** → writes `ctx.selectedVersionId` and `?phase=`; Overview, on return, reads the signal (URL wins over signal when both present and differ; the signal is then updated to the URL value).
- **Center switch** → shell calls `setCenter`; the Overview effect on `centerId` clears its filter state, closes the popover and drops the URL params; the service keeps other centers' cache (bounded by the session).
- **Reporting tab with `?project=`** → `bilateral-projects-panel` finds the card by `project.id`, scrolls it into view and applies a transient highlight class for 2 s (`prefers-reduced-motion` → static ring, no animation). `?program=` pre-selects the SP quick filter; `?multi=1` the Multi-Program filter.

---

## 3. Data Model Changes

### 3.1 Entities

| Entity | Path | Change |
|---|---|---|
| — | — | **No entity or schema change.** |

### 3.2 Migrations

None. `npm run migration:check` stays green by construction.

### 3.3 Query change (read-only SQL)

`getResultsByBilateralCenter` adds one selected column, `project_id`, produced by the **same correlated subquery** as `project_name` (same `results_by_projects` join, same `ORDER BY rbp.is_lead DESC, rbp.id DESC LIMIT 1`), so both fields always describe the same project row. Placeholder count and parameter array are unchanged (`KZ-W12-1` assertion in the spec).

### 3.4 Client models

| Model | Where | Notes |
|---|---|---|
| `BilateralCenterResult` (+`project_id?: number \| null`) | `bilateral-results-list.component.ts` (exported today) → **moved** to `pages/bilateral/services/bilateral-center-result.interface.ts` and re-exported from the list component for existing imports | Single home; both tabs import it |
| `BilateralQueryParams` | `pages/bilateral/bilateral-query-params.ts` | Parsed, normalized state: `phase: number \| null`, `status: StatusKey[]`, `project: number[]`, `program: string[]`, `type: number[]`, `role`, `source`, `method`, `search`, `multi` |
| `OverviewModel` | `bilateral-overview.aggregate.ts` | `{ kpis, status, attention, byProject, bySp, byType, pace }` — plain data, no signals |
| `ResultTypeGroup` constant | `bilateral-overview.aggregate.ts` | Outputs: ids 5, 6, 7, 8 · Outcomes: 1, 2, 3, 4, 9, 10 · unknown → "Other" (ids from `ResultTypeEnum` on the server; 11 Complementary innovation → Other) |

---

## 4. API Surface

### 4.1 New / changed endpoints

| Field | Value |
|---|---|
| **Method + path** | `GET /api/results/bilateral-center-results?centerId&versionId` (**existing**, additive change) |
| **Version** | `api` |
| **Auth** | JWT (unchanged — `api/results/*` is inside the middleware perimeter) |
| **Role** | unchanged (any authenticated user; the client gates the center shell by role as today) |
| **Request** | unchanged |
| **Response** | each row gains `project_id: number \| null`; all existing fields, order and row count unchanged |
| **Errors** | unchanged |
| **Telemetry** | unchanged |

No new endpoints.

### 4.2 Bilateral / platform-report impact

None. The changed route is `api/results/*`, outside the `/api/bilateral/*` contract; `bilateral-result-summaries.en.md` is not touched (`AC-4` not engaged).

---

## 5. Server Workflow / Business Rules

- **Repository:** one added SELECT expression. No service or controller logic change (`results.service.getBilateralCenterResults` passes rows through).
- **Business rules:** none added server-side. All Overview semantics (status families, aging threshold, type groups) live in the client aggregation module — deliberately, so they cannot drift from what the Results tab shows (`COV-DD-1`).
- **Workflows touched:** W1 statuses are read, not changed. W6 untouched.

---

## 6. Frontend Plan

### 6.1 Routes / modules

- `BilateralRouting` gains `{ prName: 'Bilateral Overview', path: 'overview', prHide: true, loadComponent: BilateralOverviewComponent }` inserted **before** `home`. The `**` redirect stays `home` (`COV-R-1`).
- Guards: none new — the shell route already gates access.

### 6.2 Components & services

| Unit | Kind | Responsibility |
|---|---|---|
| `BilateralOverviewComponent` | standalone page, OnPush, `host: { class: 'pr-viewport-page' }` | Owns URL ↔ state sync, calls the service, derives `scopedRows`, builds card models via the pure modules, renders KPI deck + 6 cards + states. **Computes no figure itself** — every number comes from `aggregate.*` (program-overview discipline). |
| `OverviewControlsComponent` | standalone, presentational | Phase `app-pr-select` (options from `PhasesService.phases.reporting` filtered to P25, sorted `phase_year` desc, "Open" badge), Filter button + popover (dimensions per `COV-R-3`, option lists passed as inputs), chips, Clear. Emits `phaseChange`, `filtersChange`, `clear`. Escape/outside-click close without applying. |
| `BilateralOverviewService` | `providedIn: 'root'` | Two independent streams: results cached per `centerId::versionId`, projects cached per center, each with its own data/loading/error signals (amended at `COV-T-3` so `COV-R-17`'s partial-failure state is buildable: a results failure never nulls loaded projects). `load(centerId, versionId)`; `entry(centerId, versionId)` computed `{ results, projects, resultsError, projectsError, loading }`; `invalidate(centerId, versionId)` retries results and only a failed projects stream. Late responses land under their own key only. Drafts are **not** fetched here — read from `BilateralAiService`. |
| `bilateral-overview.aggregate.ts` | pure module | `buildOverviewModel(rows, projects, drafts, phase, today)`; helpers per card; `PENDING_AGE_DAYS = 14`; `Number()` normalization of `status_id`, `result_type_id`, `project_id`. |
| `bilateral-overview.charts.ts` | pure module | Option + table builders: `statusMeterOption/Table`, `byProjectOption/Table`, `bySpOption/Table`, `byTypeOption/Table`, `paceOption/Table`, plus `resolveClick(event) → deep-link params`. Colors only from `ResolvedChartTokens` (never calls `resolveChartTokens()` itself — jsdom). |
| `bilateral-query-params.ts` | pure module | Constants, `parseBilateralQueryParams(map)`, `serializeBilateralQueryParams(state)`, per-key validators; unknown → default and flagged for stripping. |
| `bilateral-result-filter.ts` | pure module | `filterCenterResults(rows, params)` — the single predicate both tabs use (`COV-R-13`). Results tab's existing chip logic (`showW3/showW1W2/showLead/showContributing` + token search) is re-expressed through it. |
| `BilateralContextService` (+`selectedVersionId`) | existing root service | `signal<number \| null>(null)`; reset to `null` in `setCenter` when the center changes. |
| `BilateralResultsListComponent` (modified) | existing page | Reads params on init and on `queryParamMap` changes; writes on chip/phase/search change (`replaceUrl: true`, `queryParamsHandling: 'merge'`); `selectedPhase` derives from `ctx.selectedVersionId ?? Open`; new chip group **Status** (multi) and a **Project** chip (label from projects cache) render only when the params are present. `?result=` untouched. |
| `BilateralProjectsPanelComponent` (modified) | existing | Reads `program`, `project`, `multi` once after projects load; highlight + scroll for `project`. |
| `MyDraftResultsComponent` (modified) | existing | Reads `project` → `filter.selectProject(value)`. |

**State boundary:** phase and center in `BilateralContextService` (shell scope); filters in the URL (source of truth) mirrored to a component signal; data in `BilateralOverviewService` cache; drafts in `BilateralAiService`. No new global store.

### 6.3 Design system usage

- **Layout:** `pr-viewport-page` host; band + tabs (header component) → `#workArea` scroller. The controls row is the first child of `#workArea` and is `sticky top-0` **inside the scroller** (`COV-R-4`, `COV-DD-7`), with `bg-[var(--pr-surface-card)]` and `border-b border-[var(--pr-border-divider)]`, `z-30` like the SP controls row.
- **Tokens:** surfaces `--pr-surface-card`, hero gradient `--pr-color-primary-300 → -400` (allowed: the one brand hero card, as the SP Total card), borders `--pr-border` / `--pr-border-divider`, text `--pr-text-heading/secondary/subtle`, status pills `--pr-status-*-fg/bg` (pills only), chart series `--pr-chart-1..4` + `--pr-chart-2-muted` via `resolveChartTokens()`. Rejected uses the existing red pill pair the Results tab already renders for status 7 (no new status colour — hard rule 9).
- **Typography:** card `h2` `text-[20px] font-bold tracking-[-0.01em]` (SP card heading), KPI value `text-[28px] font-bold tabular-nums`, numbers `font-mono tabular-nums` right-aligned in lists (hard rule 13).
- **Icons:** tab icon `space_dashboard` (`material-icons-round`, same set the header uses); no PrimeIcons.
- **Responsive:** grid `grid-cols-1 sm:grid-cols-2 min-[900px]:grid-cols-3 min-[1280px]:grid-cols-5` for the KPI deck; rows A/C `min-[1280px]:grid-cols-[3fr_2fr]` / `min-[1280px]:grid-cols-2`; chart heights fixed per card (`height` input) — 180–220px; chips row `overflow-x-auto no-scrollbar` under 900px.
- **A11y:** every chart passes a `tableModel` (`requireTable` default true); tiles/bars/rows are `<a routerLink>` or `<button>` with names like "Pending review, 9 results — open in Results"; `aria-current="page"` on the tab; `:focus-visible` ring `--pr-focus-ring`; `motion-reduce:` variants on the highlight; `role="group" aria-label="Overview controls"` on the controls row.
- **Empty/error:** one-line `≤160px` blocks with a ghost action (hard rule 5); error shows `Retry` calling `service.invalidate + load`.
- **i18n:** English literals like the sibling tabs (no new keys).

### 6.4 Real-time / notification UX

None. Drafts count already updates through `BilateralAiService`'s existing polling/refresh; the Overview reads the signal.

---

## 7. Security & Authorization

- No new route; JWT perimeter unchanged (`AC-3`). The center shell's role logic (`RolesService.getMyCenters` / admin) already gates all tabs; the Overview inherits it by being a child route.
- `project_id` is a CLARISA project id (already exposed as a filter option elsewhere), not a PRMS join PK (`AC-1`).
- URL params are parsed through validators; unknown values are dropped, never interpolated into requests beyond the already-typed `centerId`/`versionId`.
- No logging added; nothing sensitive in URLs (`AC-9`).

---

## 8. Performance & Capacity

- **Requests:** 0 new on default path (results + projects already fetched by sibling tabs; the service cache means at most one results call per phase per center per session). Drafts reused.
- **Compute:** aggregation is O(rows + projects); Jest asserts < 100 ms median for 5,000 rows (median of 3 runs; spread > 50 % of median ⇒ inconclusive, reported not committed — `COV-AC-24`).
- **Rendering:** 6 ECharts instances (SVG renderer, ResizeObserver already in the wrapper). Eager render in v1 (`COV-DD-10`); if HITL shows scroll jank at 1280×720, wrap rows C/D in an intersection-gated `@defer (on viewport)` — the change is local to the template.
- **Bundle:** no new dependency; the chart modules used are already registered.

---

## 9. Observability

- Client: no new logging. Errors surface as per-card states; the existing HTTP interceptor behavior is unchanged.
- Server: no change.
- Metrics moved (`docs/prd.md`): `M1.1` / `M2.1` become *visible* to centers (the Overview is a viewer of them, not a producer).

---

## 10. Testing Plan (forward-looking)

| Layer | Strategy |
|---|---|
| **Server** | `result.repository.spec.ts`: SELECT includes `project_id` and still includes every previously selected field; placeholder count === params length; existing tests unchanged (D9). |
| **Client — pure modules** | `bilateral-query-params.spec.ts` (parse/serialize, invalid/duplicate/empty — D7); `bilateral-result-filter.spec.ts` (each param; string ids; defaults equal today's Results behavior — D1/D2a); `bilateral-overview.aggregate.spec.ts` (every card model with the fixture classes in requirements §9 D1; performance assertion); `bilateral-overview.charts.spec.ts` (series/stack/table/color ∈ token set; `resolveClick` mapping — D6). |
| **Client — components** | `bilateral-overview.component.spec.ts`: skeleton → data → empty → error; URL ↔ state (phase, filters, strip invalid); center switch reset; late-response guard (D8); tables present, buttons named (D10). `overview-controls.component.spec.ts`: popover open/close/escape, chips, clear. Header spec: Overview tab first + active; alias tests rewritten. Results-list spec: params → chips/rows; no-params default unchanged; URL written on chip toggle. Projects-panel spec: `program/project/multi` handling + highlight class. Drafts spec: `project` param → filter. **Every spec calls production code, never a local re-declaration (`KZ-GEO-1`).** |
| **Client — CT** | `bilateral-overview.cy.ts`: at 1280 / 900 / 375 — KPI column count, `document.scrollWidth <= clientWidth`, controls `top` constant after scrolling `#workArea` (measured on the real scroller), also at viewport height 720 and 1000 (`KZ-EVM-1`). |
| **Compile gates** | `npx tsc --noEmit -p tsconfig.app.json` every client task; `npm run build:dev` once at the end. |
| **Live HITL** | Reconciliation table on AfricaRice (each KPI, each tile, one project bar, one zero-project chip, one SP row); visual check of the six charts at three widths; contrast spot-check on pills and hero; before/after row count on the server query (prtest). Screenshots recorded in `execution.md`. |
| **Coverage** | Client stays above 50/60/60/60; the new pure modules aim for ~100 % lines. |

---

## 11. Backwards Compatibility & Migration Plan

- **Server:** additive column; no migration; rollback = revert commit.
- **Routes:** additive route; `**` redirect unchanged; every existing URL keeps working.
- **Results tab:** no-params behavior byte-identical; params are additive.
- **Header:** the retired `'overview'` alias has no runtime caller (only `bilateral-home` uses the header with `'reporting'`); spec cases updated (`COV-DD-4`).
- **Rollout:** no flag. Ship in one PR (see `tasks.md` PR strategy) or two chained PRs (server first).

---

## 12. Design Decisions (ADRs)

### `COV-DD-1` — Client-side aggregation over the existing center-results rows

- **Context:** the Overview needs counts by status, type, project, SP and week; the Results tab already loads the exact rows for a (center, phase).
- **Decision:** aggregate on the client from those rows; add only `project_id` on the server.
- **Alternatives:** (a) server aggregate endpoint — second predicate set that can drift from the Results SQL (the SP Overview's "81 vs 79" residual), more Lambda surface; (b) reuse the SP `results-framework-reporting/dashboard` shape — keyed by program, not center.
- **Consequences:** reconciliation by construction; cost scales with rows (fine at hundreds); the fallback is (a) if a center exceeds a few thousand rows.

### `COV-DD-2` — Shared phase lives in `BilateralContextService`, mirrored to `?phase=`

- **Context:** the Results tab keeps its own `selectedPhase`; Reporting/Drafts have none; TRD §6 says phase context is shell-level and propagated via query params.
- **Decision:** `selectedVersionId` on the context service (`null` = Open); URL wins when present; Results tab's selector becomes a writer/reader of the same signal.
- **Alternatives:** URL only (loses phase on plain tab clicks unless every tab link is rebuilt); `sessionStorage` (survives reload against `COV-R-5` B).
- **Consequences:** one source of truth per session; tab links from the header carry `?phase=` when set (header reads the signal — a one-line `queryParams` binding on the three `routerLink`s).

### `COV-DD-3` — One query-param contract and one filter function for all center tabs

- **Context:** `COV-R-13` requires counts to reconcile; two predicates cannot be proven equal by tests forever.
- **Decision:** `bilateral-query-params.ts` (contract, parsers, serializer) + `bilateral-result-filter.ts` (`filterCenterResults`) imported by Overview and Results; Reporting/Drafts import only the parser.
- **Alternatives:** per-tab parsing (the drift this spec exists to prevent); extending `bilateral-review.query-params.ts` (different value space for `center`, SP-side file).
- **Consequences:** Results tab's chip logic is re-expressed through the shared function (behavior-preserving, covered by its existing spec); new dimensions cost one validator + one chip.
- **Clarification (execute, `COV-T-2`, 2026-09-14):** `COV-R-13` ("missing `role`/`source` → both") and `COV-R-14` BUT ("no params → today's Results default, W3 + Lead") are reconciled as follows. `filterCenterResults(rows, params)` applies exactly what `params` says — `null` role/source means both. The contract file also exports `RESULTS_TAB_DEFAULT_PARAMS = { source: 'w3', role: 'lead' }` and `applyResultsTabDefaults(parsed)`, which merges those defaults **only when the URL carries no contract key at all**; the Results tab (`COV-T-7`) filters through `applyResultsTabDefaults(...)`, the Overview never does. **Amended after the `COV-T-2` review (same day):** `phase` is shell context (`COV-DD-2`), not a filter, so it is **excluded** from the "no contract key" test — a header tab click carrying only `?phase=` still gets today's W3 + Lead default on Results. To express "both" explicitly, `role`, `source` and `method` accept the additive value `all` (parsed to `null` = both, but counted as a present key); `serializeBilateralQueryParams(params, { explicitDefaults: true })` emits `role=all` / `source=all` for those keys when they are `null`, and the Overview uses that option on every deep link (`COV-T-5`); the Results tab uses it too whenever it **writes** the URL after a user change (`COV-T-7`), so a user who turns all four chips on keeps both/both across a reload (`?source=all&role=all`), while a plain navigation with no keys still gets today's default. Result: `/results?phase=36` → Results default (W3 + Lead); `/results?phase=36&role=all&source=all` (hero link) → both/both, matching the Overview figure — reconciliation by construction, Results' plain-navigation behaviour unchanged.

### `COV-DD-4` — Retire the header's legacy `'overview'` alias (**reversion — challenged**)

- **Context:** `isReportingActive` treats `'overview'` as Reporting (pre-`shell-sp-alignment` naming). The new tab needs the literal.
- **Decision:** `'overview'` activates the Overview tab only.
- **Challenge ("what does removing this break?"):** runtime — nothing: the only header host passing a tab is `bilateral-home` with `'reporting'`; results-list passes `'results'`, drafts `'drafts'`. Tests — **4 cases** in `bilateral-page-header.component.spec.ts` (lines ~134, 333, 343, 359) set `'overview'` expecting Reporting active; they must be rewritten to `'reporting'` (and one new case asserts `'overview'` → Overview active). No other `'overview'` literal in `pages/bilateral`. **Outcome:** proceed; the test rewrite is part of `COV-T-6`.
- **Alternatives:** keep the alias and add `'center-overview'` (two names for one tab; confusing forever).

### `COV-DD-5` — Chart palette fence: ramp for series, status tokens for pills only

- **Context:** hard rule 9 and `chart-tokens.util.ts` fence; `KZ-BOR-1` shipped hexes past review.
- **Decision:** builders receive `ResolvedChartTokens` and color from `ramp`, `primary`, `bilateralMuted` only; status meaning is carried by the tile pill next to the segment and by the a11y table.
- **Alternatives:** color meter segments with status fg tokens (breaks the fence; the SP donut moved off status colors in `quick/donut-violet-scale`).
- **Consequences:** the meter reads as one violet family; legend + pills carry semantics. DoD grep gate `#[0-9a-fA-F]{3,8}` = 0 in new files (`KZ-BOR-2`).

### `COV-DD-6` — Type grouping by `result_type_id`, one constant

- **Context:** the legacy entity-details grouped by name strings (fragile — its own guide flags it).
- **Decision:** `RESULT_TYPE_GROUPS` keyed by id (Outputs 5/6/7/8, Outcomes 1/2/3/4/9/10, else Other), labels from the row's `result_type` name.
- **Alternatives:** by name; by a server-provided category (not in the payload).
- **Consequences:** a new type id lands in "Other" visibly rather than vanishing (`COV-R-11`).

### `COV-DD-7` — Controls row sticky inside `#workArea`

- **Context:** user rule "filters at the top"; SP's row scrolls with content, bilateral shell docked its toolbars sticky.
- **Decision:** first child of the scroller with `sticky top-0 z-30`; `:host` display rules in the component SCSS (`KZ-changes--sp-shell-app-viewport-2`).
- **Alternatives:** inside the sticky band (band is shared with the wizard and the other tabs; the phase selector must render only here — same reason the SP kept it out of the band).
- **Consequences:** CT measures `top` before/after scroll at two heights (`KZ-EVM-1`: a different height can change which ancestor scrolls).

### `COV-DD-8` — Service cache keyed `center::version`, late responses isolated

- **Context:** `overview-phase-filter` DD-4 race pattern; `COV-R-21`.
- **Decision:** `Map` keyed by `centerId::versionId`; render reads the current key only; a late response writes its own key. Projects cached per center.
- **Alternatives:** cancel in-flight (`switchMap`) — works but loses the "return to tab, no refetch" benefit.
- **Consequences:** memory bounded by phases visited in a session; `Retry` invalidates one key.

### `COV-DD-9` — "Not started" projects link to Reporting with highlight, not to `/create`

- **Context:** `/create` needs a project selected through `BilateralCreationService.selectProject` (in-memory), not a URL.
- **Decision:** `?project=<id>` on the Reporting tab → scroll + 2 s ring on the card, whose `Create result` button already exists; the catalog is not filtered (`COV-R-15`).
- **Alternatives:** deep-link into the wizard with a new `?project=` reader in `bilateral-result-creator` — touches the wizard that `manual-create-drawer` is reshaping right now.
- **Consequences:** one extra click for the user; zero coupling with the in-flight wizard spec.

### `COV-DD-10` — Eager render of all charts in v1

- **Context:** 6 SVG ECharts instances; `pr-viz-chart` already has ResizeObserver.
- **Decision:** render eagerly; revisit with `@defer (on viewport)` only if HITL shows jank.
- **Alternatives:** defer from day one (adds intersection edge cases to CT for no measured need).
- **Consequences:** simplest DOM; measured at HITL.

### `COV-DD-11` — `BilateralCenterResult` moves to a shared interface file

- **Context:** both tabs and the pure modules import the row type; today it lives in the Results page component.
- **Decision:** `pages/bilateral/services/bilateral-center-result.interface.ts`; the list component re-exports it so existing imports compile.
- **Alternatives:** import the type from the Results component into the Overview (page-to-page coupling).
- **Consequences:** one home, `tsc` verifies the re-export.

---

## 13. Open Gaps & Follow-ups

- `COV-OQ-2` resolved here: **one** "Submitted / QA" tile (ids 2 + 3), split in the a11y table.
- `COV-OQ-3` resolved here: highlight ring 2 s, `motion-reduce` static.
- `COV-OQ-1` (Jira id) still open — needed for commit messages only.
- Pace uses `created_date`; a submission timestamp per row would improve Q7 (follow-up when review history is exposed in the list payload).
- `COV-R-31` (previous-phase pace overlay) deferred; the cache design makes it a small later addition.
- Stale guide `bilateral-results-list/CLAUDE.md` ("default landing page") — archive-time guide sync item.
- If a center exceeds a few thousand results per phase, promote the aggregation to the server (proposal Option 2) — the pure `aggregate` module is the spec for that endpoint.

---

## 14. Budget (Step 2.4 — sized against this design)

| Signal | Estimate |
|---|---|
| **Tasks** | 8 (1 server, 1 shared contracts, 1 service+aggregate, 1 charts, 1 page component, 1 header/route/other tabs, 1 CT + HITL, 1 docs/close-out) |
| **LOC** | ~1,700 total — server ~40 · client production ~950 (page + controls ~450, pure modules ~300, edits to 5 existing files ~200) · client tests ~650 · CT ~60 |
| **Review rounds** | ≤ 1 Reviewer round per task (8 max); a second FAIL on any task escalates to the user instead of looping |
| **Depth check** | Standard holds: multi-file client feature with a cross-tab contract and one additive server field; not Full (no migration, no new API, no auth change), clearly not Lite. |

`/akili-execute` treats these as a tripwire: exceeding tasks or LOC by > 50 % stops and escalates. Runtime constraints for execution, per the project's pragmatic-execution feedback: targeted `npx jest <path>` only, `npx ng lint --quiet`, `tsc --noEmit` per client task, module CT run once per task that touches templates, plain-language progress line at each task boundary.

---

## Required cross-references

- `docs/specs/bilateral/center-overview-tab/requirements.md` · `proposal.md` · `mockup/center-overview-tab.html`
- `docs/prd.md` (US-P1, G1, G2, AC-1, AC-3, AC-5, AC-9) · `docs/ux-ui/design.md` (§6, §7, §8, §9, §10) · `docs/trd/trd.md` (§4, §6, §10)
- `onecgiar-pr-client/CLAUDE.md` §5 Hard UI rules (8, 9, 13, 19, 21, 22, 23, 25)
- Patterns reused: `docs/specs/archive/2026-08-28-changes--overview-phase-filter/design.md` (DD-1, DD-4), `docs/specs/archive/2026-08-28-changes--portfolio-overview-echarts/`, `pages/result-framework-reporting/pages/bilateral-review/bilateral-review.query-params.ts`
