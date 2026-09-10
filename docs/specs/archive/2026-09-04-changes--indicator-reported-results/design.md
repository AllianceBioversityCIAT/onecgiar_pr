# Design — Indicator "Reported results" table (`changes/indicator-reported-results`)

**Answer first:** extend the existing `IndicatorDrawerComponent` with a third tab (`results`) that renders the already-fetched `existing()` list through `app-pr-table`, add one optional query param (`scope=all`) and one additive field (`result_type_name`) to the existing `existing-result-contributors` query, and change one argument in the host handler. No new component file, no new endpoint, no persistence. The width floor and the narrow fallback are two signals on the drawer.

## Document Control

| Field | Value |
|---|---|
| Linked requirements | `requirements.md` (same folder) — IRR-R-1..R-12, IRR-AC-1..8 |
| Depth | Standard — re-sized in §14 |
| Approval Mode | `pre-approved` (inherited) — Phase 2 gate: *auto-approved (pre-approved mode)*; reversion challenge §12 run inline; judgment-day one pass (§15) |
| Skills | `angular-developer` (signals, pr-table, DOM tests), `nestjs-expert` (query handler/DTO), `tdd` (mapper/loader, view-model), `ui-ux-pro-max` (table density, pills, empty state) |
| Budget | 5 tasks · ≈ 320 LOC source (≈ 40 server / ≈ 280 client) + ≈ 450 tests · ≤ 1 Reviewer round per task — see §14 |
| Judgment-day | one pass — **inline fallback**: both blind-judge spawns (and one retry each) failed on the harness (Orca pane creation timed out), so the Leader ran the review inline per `/akili-specify` *Delegation During an Interactive Phase* rule 2; ledger `judgment.md` (§15) |

## 1. Summary

The drawer already loads the contributing results (`loadExisting` → `GET_ExistingResultsContributors`) and already has a tab switch, a resizable width and an empty state. This design (a) widens the endpoint's population behind an opt-in param and adds the type name, (b) turns the *Info*-tab card list into a table on its own tab, (c) makes the menu action land there, and (d) gives the table room. The biggest accepted trade-off: the drawer now shows drafts and submitted results (with their status pills), so its Σ contribution can differ from the row's reviewed-only ACHIEVED — disclosed, not hidden (KCR-style `title` disclosure precedent).

## 2. Architecture Overview

### 2.1 Where this lives
- **Server:** `api/results-framework-reporting/application/queries/get-existing-result-contributors/` — `query.ts` (+ `scope`), `handler.ts` (pass-through), `existing-result-contributors-loader.service.ts` (status set by scope; select `obj_result_type.name`), `existing-result-contributors.mapper.ts` (+ `result_type_id`, `result_type_name`), `existing-result-contributors.types.ts`; `results-framework-reporting.controller.ts` (+ `@Query('scope')` with an enum DTO) and `.service.ts` (pass-through).
- **Client:** `pages/dashboard-lab/components/indicator-drawer/*` (tab, table, strip, states, width floor, card fallback), `shared/services/api/results-api.service.ts` (`GET_ExistingResultsContributors(…, scope?)`), `pages/dashboard-lab/dashboard-lab.component.ts` (`manageIndicator` tab union + `onReportingOpenAchieved` → `'results'`).
- **External:** none.

### 2.2 Data flow (after)

```
row menu "View reported results"
  └─ host.onReportingOpenAchieved(row) → manageIndicator(row, hlo, 'results')
        └─ <app-indicator-drawer [initialTab]="'results'">
              ├─ loadExisting(ind) → GET existing-result-contributors?…&scope=all   (one request)
              │     └─ existing() : ContributorDto[]  ──► reportedRows() : ReportedResultRow[] (view model)
              │            ├─ tab 'report'  → compact preview (unchanged markup)
              │            └─ tab 'results' → strip + app-pr-table (≥ 640 px) | cards (< 640 px)
              └─ tab effect: entering 'results' → width = max(width, floor); leaving → restore
```

## 3. Data Model Changes

None. No entity, no migration.

## 4. API Surface

### 4.1 Changed endpoint (additive)

| Field | Value |
|---|---|
| **Method + path** | `GET /api/results-framework-reporting/existing-result-contributors` (unchanged) |
| **Auth / role** | unchanged (JWT `auth`; role resolution via `ContributorsRoleResolverService`) |
| **Request** | existing `resultTocResultId`, `tocResultIndicatorId` **+ optional `scope`**: `reviewed` (default) \| `all`. No validation error for other values: the handler coerces anything that is not `'all'` to `'reviewed'`, so `IRR-R-3.1` holds even for sloppy callers. Swagger documents the two values via `@ApiQuery({ enum })`. |
| **Response** | existing `{ contributors[], resultTocResultId, tocResultIndicatorId }`; each contributor **+ `result_type_id: number \| null`, `result_type_name: string \| null`** |
| **Status sets** | `reviewed` = `[QualityAssessed, Approved]` (today's literal); `all` = the explicit list `[Editing, QualityAssessed, Submitted, PendingReview, Approved]` built from `ResultStatusData` members (never numeric literals) — `Discontinued`, `Rejected` and `Draft` stay out (IRR assumption A-2) |
| **Errors** | unchanged (404 when no contribution record) |
| **Telemetry** | none new |

### 4.2 Bilateral / platform-report impact
None.

## 5. Server Workflow / Business Rules

- Controller adds `@Query('scope') scope?: string` and forwards; service forwards; `GetExistingResultContributorsToIndicatorsQuery` gains `scope: 'reviewed' | 'all'` (normalised in the handler: anything not `'all'` → `'reviewed'`).
- Loader `loadContributions(resultTocResultId, indicatorId, scope)` picks the status array by scope (`all` = the explicit five-member list above; a new enum member such as `Draft` is excluded by default, never included by omission) and adds `obj_result_type: { id, name }` to `relations`/`select` (relation exists on `Result` at `result.entity.ts:96`).
- Mapper emits `result_type_id` and `result_type_name` beside the existing fields. Nothing removed, order preserved.
- Unit tests: handler spec gains the scope normalisation cases; loader spec asserts the status set per scope; mapper spec asserts the two new fields (null-safe).

## 6. Frontend Plan

### 6.1 Routes / modules
No route change. `dashboard-lab.component.ts`: `manageIndicator(indicator, groupTitle, tab: 'report' | 'info' | 'results' = 'report', node?)`; `onReportingOpenAchieved` passes `'results'`. `manageTab` signal type widened.

### 6.2 Components & services

**`results-api.service.ts`** — `GET_ExistingResultsContributors(resultTocResultId, tocResultIndicatorId, scope?: 'reviewed' | 'all')` appends `&scope=` only when given (keeps the existing spec's URL assertion green).

**`IndicatorDrawerComponent`** (no new file — the tab is ~120 lines of template and ~90 of TS; a child component would need the drawer's `indicator`, `existing`, width and router wiring passed back down):

| Piece | Design |
|---|---|
| `DrawerTab` | `'report' \| 'info' \| 'results'`; `initialTab` accepts it; title/icon map gains `results → 'Reported results' / fact_check` |
| `loadExisting` | unchanged seam; calls the API with `'all'`; smart default → `'results'` |
| `ReportedResultRow` (view model, exported for tests) | `{ id, code, title, category, statusId, statusName, contribution, versionId, phaseName, raw }` built by a pure `toReportedResultRow(dto, phases)`; `phaseName` from `PhasesService.phases.reporting.find(p => p.id === version_id)?.phase_name ?? String(version_id)` |
| `reportedRows` computed | map + default sort (contribution desc, then code); `app-pr-table` owns interactive sort (`prSortableColumn`) exactly as `programme-results` does — the component only renders the glyph |
| `searchText` signal + `visibleRows` computed | substring on code/title, case-insensitive; the input renders only when `reportedRows().length > 8` |
| Strip | `contributionSum` computed; `stripTitle()` builds the disclosure when `contributionSum !== Number(indicator().actual_achieved_value_sum ?? 0)`: *"Achieved on the row: {achieved} — it counts reviewed results only; this list sums {sum} across every status."* One method, no template arithmetic (KCR precedent) |
| Status pill | local `STATUS_TOKENS` copy (fg/bg pairs verbatim from `programme-results.component.ts:127`, with the same "do not DRY in passing" comment); `statusFg()/statusBg()` helpers; unknown → not-started pair |
| Row actions | `openResult(row)` → `Router.navigate(['/result/result-detail', code, 'general-information'], { queryParams: { phase: versionId } })` (IRR-DD-4 — the bilateral-review branch of `programme-results.resultRoute()` needs `source_name`, which this payload lacks); `copyLink(row)` → `router.createUrlTree` + `serializeUrl` + `location.origin`, then `PrToastService.add({ key: 'globalUserNotification', severity: 'success', summary: 'Result link copied' })` (`shared/components/pr-toast`, same call as `programme-results.component.ts:1207`) |
| Row menu | mirror the `.pr-row-menu` markup/behaviour from `reporting-aow-table` (open on kebab, `role="menu"`, Escape/outside click close). Its styles are **component-scoped** in `reporting-aow-table.component.scss:204-260`, not global — copy the three rules into `indicator-drawer.component.scss` with a `// copied from reporting-aow-table — promote to shared/ when a third copy appears` note. Menu is `position: absolute` inside the aside (`z-[141]`), so no z-index fight with the page; the open row's cell still gets a higher `z-index` than its siblings (Results-tab gotcha) |
| Width floor | `TABLE_FLOOR = 760`; `private widthBeforeResults: number \| null`; effect on `tab()`: entering `results` → if `width() < floor` store current, set `min(floor, clamp)` and emit; leaving → restore stored width (if the user did not drag meanwhile — a drag on the tab clears the stored value) |
| Narrow fallback | `tableLayout = computed(() => width() >= 640)`; template `@if (tableLayout())` table `@else` cards (the current card markup moved from *Info*, plus a pill and the kebab) |
| States | `loadingExisting()` → 3 skeleton rows; `existing()?.length === 0` → existing empty block (CTA `setTab('report')`); new `loadError` signal set on non-404 errors → message + **Retry** (`loadExisting(indicator())`) |
| Reset effect | the per-indicator reset effect also clears `searchText`, `loadError`, `widthBeforeResults` (folder-guide trap: "resetéalo ahí o se filtra entre indicadores") |

**Info tab:** the *Reported results* block (`.html:145-190`) is removed; *Target* and the split stay. **Report tab:** preview unchanged; its "See them in detail" button → `setTab('results')`.

### 6.3 Design system usage
- `app-pr-table` with `prTableHeader` / `prTableBody` / `prTableEmpty` templates and a CSS-grid row (`grid-template-columns: 84px minmax(180px,1fr) 128px 118px 96px 110px 36px`), header `text-[10.5px] uppercase tracking-[0.06em]` like the drawer's split table; row min-height 44 px; hover `--pr-surface-subtle`.
- Tokens only from `docs/ux-ui/design.md` §7 and existing `--pr-*` variables; pills = the four `--pr-status-*` pairs; accent from the drawer `accent()` input.
- Copy (English, shell convention): tab *Reported results*; strip *N result(s) reported · Σ contribution X of target Y*; menu *Open result*, *Copy link*; error *Could not load reported results* / *Retry*; empty block unchanged.
- A11y: `<table>` with `scope="col"`, rows `tabindex="0"` + `(keydown.enter)`/`(keydown.space)`, `aria-sort` via `prSortableColumn`, menu `role="menu"`/`menuitem`, `aria-label="Open row actions"`, focus ring `--pr-color-primary-300`.
- Responsive: drawer already full-bleed < 768 px; card layout < 640 px drawer width; table scrolls horizontally inside the drawer between 640 and 760 px if the user drags below the floor.

### 6.4 Real-time / notification UX
None.

## 7. Security & Authorization
Unchanged endpoint guard. `scope` is an enum coerced server-side; it changes a TypeORM `In([...])` list, never raw SQL. No secrets, no logging of tokens.

## 8. Performance & Capacity
One request per drawer open (shared). ≤ 200 rows sorted/filtered client-side. No new dependency.

## 9. Observability
None.

## 10. Testing Plan

- **Server unit:** handler (scope normalisation), loader (status set per scope; select includes `obj_result_type`), mapper (new fields, null-safe) — Jest, existing spec files extended.
- **Client unit/DOM (Jest):** view-model mapper (`toReportedResultRow`: category, phase fallback, null contribution); drawer DOM: tab title, exact cell text for the 3-row fixture, pill pair names, strip text + disclosure `title`, search visibility at 8 vs 9 rows, sort call, navigation (Router spy), copy link (clipboard stub + toast key), 404 empty + CTA, 500 error + retry, Info tab has no card list; host: `onReportingOpenAchieved` → `manageTab() === 'results'`.
- **Cypress CT (real layout):** width floor on tab enter / restore on leave / no overflow past clamp / card layout at 600 px (`IRR-AC-7`). Uses `CT_DEV_SERVER_PORT` per the harness notes; two known non-blocking errors are not evidence.
- **Live check:** SP01 in the Orca browser — open the menu on an indicator with contributions; rows render with names, pills and phases; strip present.

## 11. Backwards Compatibility & Migration
Additive API (param + field). Rollback = revert the PR. No flags.

## 12. Design Decisions

### `IRR-DD-1` — Tab inside the drawer, not a new component or modal
- **Context:** the drawer is "the only surface for Target and Reported results" (MRF); the data and the width mechanics already live there.
- **Decision:** add a tab and ~200 lines to `IndicatorDrawerComponent`.
- **Alternatives:** a child `reported-results-table` component (cleaner file, but every input — indicator, list, width, router, phases — would be plumbed down and three outputs back up); a modal (second surface, rejected in proposal §10).
- **Consequences:** the drawer file grows past 400 lines; if a fourth tab ever lands, extract then.

### `IRR-DD-2` — `scope=all` is opt-in; default population untouched
- **Context:** the loader's reviewed-only filter is shared with the create flow's contributor lookup; widening it silently could change what other callers see.
- **Decision:** a query param, default `reviewed`, unknown values coerced to `reviewed`; the drawer passes `all`.
- **Alternatives:** widen the default (breaks `IRR-R-3.1`); a new endpoint (duplicate query for one filter).
- **Consequences:** the drawer's *Report* preview now also lists drafts — desirable (duplicate prevention), disclosed in `IRR-R-3.2`.

### `IRR-DD-3` — Category name from the server, phase name from the client
- **Context:** the payload has `result_type_id` but no name; the client has no result-type enum, only a server-loaded list; phases are already in `PhasesService`.
- **Decision:** server selects `obj_result_type.name`; client maps `version_id` via `PhasesService`.
- **Alternatives:** client `ResultLevelService.resultLevelList` lookup (loaded lazily by the creator, not guaranteed on this page); server phase name (extra relation for data the client already holds).

### `IRR-DD-4` — Row navigation uses Result Detail only; the bilateral-review branch is out of reach
- **Context:** `programme-results.resultRoute()` diverts non-AVISA `W3/Bilaterals` results that are not Approved to the bilateral review drawer, using `source_name`/`initiative` fields this payload does not carry.
- **Decision:** navigate to Result Detail with `?phase=version_id` for every row (the legacy `AowViewResultsDrawerComponent` rule). `IRR-R-5`'s "same route rule" is satisfied for every non-bilateral result; bilateral drafts open Result Detail, where the app's own guards apply.
- **Alternatives:** add `source_name` to the payload and port the branch (more server surface for a case the Reporting table does not distinguish today).
- **Consequences:** recorded as an accepted gap in §13; revisit if bilateral results start contributing to ToC indicators in volume.

### `IRR-DD-5` — Width floor as a tab effect, not a new default
- **Context:** `initialDrawerWidth()` is already 740–1100 on laptops; the floor only matters after the user dragged narrower or on 1000-px windows.
- **Decision:** on entering `results`, raise to `min(760, clamp)` and remember the prior width; restore on leave unless the user dragged on the tab.
- **Reversion challenge (§2.3 — "what does removing the remembered width break?"):** nothing shipped depends on it; it exists so the floor is not a silent, sticky resize. Kept.

### `IRR-DD-6` — Info tab loses the card list (reversion of shipped behaviour)
- **Context:** the list would otherwise exist twice (cards on *Info*, table on *Results*).
- **Decision:** remove the *Info* block; keep Target and split.
- **Reversion challenge — "what does removing it break?":** `indicator-drawer.component.spec.ts` has no assertion on the *Info* card list (its `existing results` describe tests the request/response contract only); the *Report*-tab preview and its "See them in detail" link keep working (retargeted). No visible surface loses information — it moves one tab over. **Outcome: proceed.**

## 13. Open Gaps & Follow-ups
- Bilateral-review routing branch not reproduced (IRR-DD-4) — accepted gap.
- Fourth copy of the status pill pairs (drawer) — extraction PR into `shared/components/` remains its own follow-up (Results-tab guide rule).
- `IRR-R-11` status split in the strip is SHOULD; `IRR-R-12` new-tab open is MAY — both single-line additions if time allows in T-3.

## 14. Budget (Step 2.4 re-size)

| Metric | Estimate | Note |
|---|---|---|
| Tasks | **5** | server param + field; drawer tab shell + data; table UI + actions; width floor + fallback (CT); docs + live check |
| LOC | **≈ 320 source** (40 server / 280 client) **+ ≈ 450 tests** (DOM tests dominate; `KZ-REH-1` recurrence: fixtures grow past the literal estimate) | trip at > 1 000 total |
| Review rounds | **≤ 1 per task** | second FAIL escalates |

Standard confirmed (above Lite's one-task shape; well below Full — no data, auth or migration surface).

## 15. Judgment-day
One pass after `tasks.md`. Two blind judges on `sonnet` were requested twice; every spawn failed with a runtime error (`Failed to create teammate pane: Timed out waiting for the Orca runtime`), so the review ran **inline by the author** — a weaker, single-reader pass recorded as a deviation. Three findings applied (status-set completeness incl. `Draft (8)`; component-scoped row-menu styles; toast service named). No re-judge (standing feedback). Ledger: `judgment.md`.

## Required cross-references
- `requirements.md` (same folder); `docs/prd.md` US-P1, G1; `docs/ux-ui/design.md` §6, §9, §10; `docs/trd/trd.md` §2.
- `pages/programme-results/CLAUDE.md` (pill pairs, copy-link and z-index gotchas); `components/indicator-drawer/CLAUDE.md` (`related_node_id`, object response, reset effect).
