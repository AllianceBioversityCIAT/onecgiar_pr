# Tasks — Bilateral Center Overview Tab

## 1. Scope of this task list

| Field | Value |
|---|---|
| **Module / feature** | `bilateral` / `center-overview-tab` |
| **Linked spec** | `requirements.md` + `design.md` (same folder) · `proposal.md` · `mockup/center-overview-tab.html` |
| **Depth** | Standard · **Budget (design §14):** 8 tasks · ~1,700 LOC · ≤1 Reviewer round per task (second FAIL escalates) |
| **Approval Mode** | pre-approved (applied at execute start per project feedback; HALT/Pivot/tripwire still stop) |
| **Status** | in-progress |
| **Owner / driver** | Juan Carlos Cadavid |
| **Ticket** | `COV-OQ-1` — open the Jira id before the first commit; until then commits use `[SPEC:bilateral/center-overview-tab]` as the ticket slot |
| **Execution runtime rules** (from project feedback, inherited by every Implementer/Tester brief) | targeted `npx jest <path> --silent` only, never the full client suite · `npx ng lint --quiet` (no flat ESLint config) · `npx tsc --noEmit -p tsconfig.app.json` on every client task · module CT once per task that touches templates · plain-language progress line at every task boundary · pointer briefs, not anthologies |
| **Skill Map (root `.agents/model-routing.md`)** | server → `nestjs-expert` · client → `angular-developer` **and read `onecgiar-pr-client/CLAUDE.md` §5 Hard UI rules before writing markup** (`KZ-BOR-1`) · logic-heavy → `tdd` · UI-heavy → `ui-ux-pro-max` (fallback `frontend-design`) + `tailwind-design-system` · charts → `dataviz` (available in this harness) · Spartan primitives (if used) → `onecgiar-pr-client:spartan` |

---

## 2. Pre-flight checklist

- [x] `requirements.md` status → `approved` (currently `draft`; flip at execute start).
- [x] `design.md` approved (Phase 2 gate passed 2026-09-14).
- [x] Open questions: `COV-OQ-2`, `COV-OQ-3` resolved in `design.md` §13; `COV-OQ-1` (Jira id) open — **does not block**, affects commit messages only.
- [x] CLARISA dependencies: none (no cache table or endpoint change).
- [x] **Conflicting in-flight specs** — checked 2026-09-14: `bilateral/ai-drafts-redesign` is being executed in this checkout (uncommitted edits to `bilateral-page-header.component.{html,spec.ts}`, `bilateral-projects-panel.*`, `my-draft-results.component.html`, `bilateral-result-creator.*`). **Rule:** `COV-T-6` and `COV-T-7` start by re-reading those files at HEAD; if the other spec's edits are still uncommitted, the Leader pauses those two tasks until they land (or the user says which lands first). `bilateral/manual-create-drawer` touches only the wizard — no overlap. Also check `git log --since=7.days -- onecgiar-pr-client/src/app/pages/bilateral` for fixes landed outside AKILI (`KZ-IDEV-1`).
- [x] Migrations: none. `npm run migration:check` green on the branch before `COV-T-1` commit.
- [ ] Dev server for HITL: confirm `ng serve` age and DB reachability before `COV-T-8` evidence (memory: stale dev servers produced false HITL results).

---

## 3. Task list

### `COV-T-1` — Add `project_id` to the center-results query `[x]`

- **Type:** `server`
- **Description:** Extend `getResultsByBilateralCenter` with a `project_id` column produced by the same correlated subquery as `project_name` (same join, same `ORDER BY is_lead DESC, id DESC LIMIT 1`). No other change to the SELECT, WHERE, params or ordering.
- **Implements:** `COV-R-16` (scenario + BUT "no existing field changed / row count identical"), `COV-AC-20`
- **Design refs:** §3.3, §4.1, `COV-DD-1`
- **Files (expected):** `onecgiar-pr-server/src/api/results/result.repository.ts`, `onecgiar-pr-server/src/api/results/result.repository.spec.ts`
- **Depends on:** — · **Blocks:** `COV-T-2` (interface), `COV-T-8` (live row-count check)
- **Estimate:** S
- **Skills:** `nestjs-expert`
- **Tests:** repository spec asserts (a) the SQL string contains `AS project_id`, (b) every previously selected alias is still present (`project_name`, `result_type_id`, `submitter`, `is_leading_result`, `creation_method`, `is_ai_generated`, `status_name`, `version_id`, `source`), (c) `?` count === params length (`KZ-W12-1`), (d) both subqueries share the `is_lead DESC` ordering.
- **Verification:** `cd onecgiar-pr-server && npx jest src/api/results/result.repository.spec.ts --silent && npx eslint "src/api/results/result.repository.ts" --quiet && npm run migration:check`
- **Input that would make the check fail:** dropping `project_name` while adding `project_id`; adding a fourth `?` without a param; ordering the new subquery by `rbp.id` only.
- **What this cannot prove / disqualifier:** a string assertion proves the SQL *text*, not the *result*. The live proof is `COV-T-8`'s before/after row count and a spot check that `project_id` matches `project_name` on 5 rows in prtest. If the two subqueries ever differ in ORDER BY, the spot check is the only gate that sees it.
- **Definition of done:**
  - [x] Spec green; lint clean; `migration:check` green.
  - [x] Swagger description of the route mentions `project_id` (additive).
  - [x] No change to `/api/bilateral/*` (nothing to log in `bilateral-result-summaries.en.md`).
  - [x] Commit scoped to these two files: `🔧 fix(results) [<ticket>]: expose lead project_id on bilateral-center-results`.

### `COV-T-2` — Shared contracts: query params, result filter, row interface, shared phase `[x]`

- **Type:** `client`
- **Description:** Create the pure contract modules and the shared state hook every later task imports: `bilateral-query-params.ts` (constants, `parseBilateralQueryParams`, `serializeBilateralQueryParams`, per-key validators, "stripped keys" report), `bilateral-result-filter.ts` (`filterCenterResults(rows, params)` covering status/project/program/type/role/source/method/search with `Number()` normalization), `bilateral-center-result.interface.ts` (moved `BilateralCenterResult` +`project_id`, re-exported from the Results component), and `selectedVersionId` on `BilateralContextService` (reset on center change).
- **Implements:** `COV-R-13` (table of keys + "unknown → default" + BUT "not satisfied by hiding rows" is a design property proven by the shared function), `COV-R-5` B (BUT no persistence beyond URL), `COV-R-7` AND-IT-MUST (`Number()` normalization), `COV-R-3` A AND-IT-MUST (program matches result by `submitter`, project by `sciencePrograms[].programCode`), `COV-AC-4` (parse side), `COV-AC-18`/`19` (parse/serialize side)
- **Design refs:** §3.4, §6.2, `COV-DD-2`, `COV-DD-3`, `COV-DD-11`
- **Files (expected):** `onecgiar-pr-client/src/app/pages/bilateral/bilateral-query-params.ts` (+`.spec.ts`), `pages/bilateral/bilateral-result-filter.ts` (+`.spec.ts`), `pages/bilateral/services/bilateral-center-result.interface.ts`, `pages/bilateral/services/bilateral-context.service.ts`, `pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.ts` (re-export only)
- **Depends on:** `COV-T-1` (field name) · **Blocks:** `COV-T-3`, `COV-T-5`, `COV-T-6`, `COV-T-7`
- **Estimate:** M
- **Skills:** `angular-developer`, `tdd`
- **Tests:** parsers — each key with valid / invalid / duplicate / empty / mixed (`status=foo,pending` → `['pending']`, `foo` reported as stripped); serializer round-trips; filter — one fixture set (≥ 12 rows: string ids, null `project_id`, W1/W2 rows, discontinued, AI/manual) with one assertion per dimension and one for the **no-params default equals today's Results default** (W3 + Lead only) — that assertion is what protects `COV-R-14` BUT; context service resets `selectedVersionId` when the acronym changes and keeps it when `setCenter` is called with the same acronym.
- **Verification:** `cd onecgiar-pr-client && npx tsc --noEmit -p tsconfig.app.json && npx jest src/app/pages/bilateral/bilateral-query-params.spec.ts src/app/pages/bilateral/bilateral-result-filter.spec.ts src/app/pages/bilateral/pages/bilateral-results-list --silent && npx ng lint --quiet`
- **Input that would make the check fail:** a filter that compares `status_id === 5` (string ids pass through untouched → the string-id fixture fails); a serializer emitting `status=` for the default; a Results import path broken by the interface move (`tsc`).
- **What this cannot prove / disqualifier:** the filter's equivalence with today's Results chips is asserted against a fixture, not against the live table — `COV-T-7` re-runs the Results spec unchanged to prove behavior preservation. Tests MUST call the exported functions (`KZ-GEO-1`), never a local copy of the predicate.
- **Definition of done:**
  - [x] `tsc`, Jest, lint green; Results spec still green untouched (proves the re-export).
  - [x] No component, template or style change in this task.
  - [x] Commit: `✨ feat(bilateral) [<ticket>]: shared query-param contract, result filter and shell phase signal`.

### `COV-T-3` — Overview data service and aggregation module `[x]`

- **Type:** `client`
- **Description:** `BilateralOverviewService` (root; `Map<'center::version', {results, projects}>`, per-key `loading`/`error`, `load`, `invalidate`; projects cached per center; late responses stored under their own key) and `bilateral-overview.aggregate.ts` (`buildOverviewModel(rows, projects, drafts, phase, today)` producing KPI, status, attention, byProject, bySp, byType, pace models; `PENDING_AGE_DAYS = 14`; `RESULT_TYPE_GROUPS`).
- **Implements:** `COV-R-6` (all 5 card formulas, AI-drafts scope scenario incl. BUT other centers), `COV-R-7` (tile families, discontinued in table only), `COV-R-8` (4 rules), `COV-R-9` (ranking, lead/contributing, not-started set, scenario C "no project" row + BUT not counted toward coverage), `COV-R-10` (two bars per SP, sort, BUT dedupe), `COV-R-11` (groups by id, unknown → Other, zero types omitted from bars but present in table), `COV-R-12` (weekly cumulative, outside-window bucketing BUT, fallback AND-IT-MUST), `COV-R-20`, `COV-R-21`, `COV-R-22`, NFR performance, `COV-AC-3` (late-response part), `COV-AC-11` (model part), `COV-AC-14`–`17` (model part), `COV-AC-24`
- **Design refs:** §2.2, §6.2, §8, `COV-DD-1`, `COV-DD-6`, `COV-DD-8`
- **Files (expected):** `pages/bilateral/services/bilateral-overview.service.ts` (+`.spec.ts`), `pages/bilateral/pages/bilateral-overview/bilateral-overview.aggregate.ts` (+`.spec.ts`), `pages/bilateral/pages/bilateral-overview/bilateral-overview.fixtures.ts` (shared test fixtures, incl. a 5,000-row generator)
- **Depends on:** `COV-T-2` · **Blocks:** `COV-T-4`, `COV-T-5`
- **Estimate:** M
- **Skills:** `angular-developer`, `tdd`
- **Tests:** one `describe` per card with the defect-class fixtures from `requirements.md` §9 D1 (string ids, null project, duplicate SP mapping, discontinued, dates outside window, approval-rate denominator 0 → `null`, aging exactly 14 days → not counted, 15 → counted); coverage set = projects with ≥1 result **only** (no-project rows excluded); pace last value === KPI total; service: cache hit avoids HTTP (mock called once), out-of-order responses (B resolves before A) leave key A's data intact and key B rendered; `invalidate` refetches one key; **performance:** 5,000 rows aggregated in < 100 ms median of 3 runs — the test records the three timings.
- **Verification:** `cd onecgiar-pr-client && npx tsc --noEmit -p tsconfig.app.json && npx jest src/app/pages/bilateral/services/bilateral-overview.service.spec.ts src/app/pages/bilateral/pages/bilateral-overview/bilateral-overview.aggregate.spec.ts --silent && npx ng lint --quiet`
- **Input that would make the check fail:** counting a `project_id: null` W1/W2 row toward "Projects covered"; a project mapped to the same SP twice counting 2; a `created_date` after `end_date` silently dropped from the pace total.
- **What this cannot prove / disqualifier:** the performance number is **not evidence** if the three runs vary by more than 50 % of the median (CI noise) — report the spread and mark inconclusive instead of committing a pass; a single run is never accepted.
- **Definition of done:**
  - [x] All specs green; aggregate module ~100 % line coverage; no `inject()`/HTTP in the aggregate module.
  - [x] Commit: `✨ feat(bilateral-overview) [<ticket>]: overview data service and card aggregation`.

### `COV-T-4` — Chart option and a11y table builders

- **Type:** `client`
- **Description:** `bilateral-overview.charts.ts`: pure builders `statusMeterOption/Table`, `byProjectOption/Table`, `bySpOption/Table`, `byTypeOption/Table`, `paceOption/Table`, and `resolveChartClick(event, model) → Partial<BilateralQueryParams>`; all colors from a passed `ResolvedChartTokens`; label abbreviations reuse the SP `AXIS_LABEL_ABBREVIATIONS` vocabulary where a label matches.
- **Implements:** `COV-R-7` BUT (ramp not status tokens), `COV-R-9` A / `COV-R-10` / `COV-R-11` / `COV-R-12` click → params, `COV-R-18` (table per chart, number also in text — table part), `COV-AC-10` (meter colors), `COV-AC-15` (table includes zero types), `COV-AC-16`/`17` (axis span, shading/marker presence)
- **Design refs:** §6.2, §6.3, `COV-DD-5`, `COV-DD-6`
- **Files (expected):** `pages/bilateral/pages/bilateral-overview/bilateral-overview.charts.ts` (+`.spec.ts`)
- **Depends on:** `COV-T-3` (model types) · **Blocks:** `COV-T-5`
- **Estimate:** M
- **Skills:** `angular-developer`, `tdd`, `dataviz`
- **Tests:** per builder — series count and `stack` keys; every `itemStyle.color` ∈ the token object passed (a status hex or any literal not in the object fails); table rows === model rows (zero rows included for status/type tables); pace option has `markArea` only when the phase has dates and `markLine` only when today ∈ window; `resolveChartClick` maps a status segment → `{status:['pending']}`, a project bar → `{project:[id]}`, an SP bar → `{program:[code]}`, a type bar → `{type:[id]}`; builders never call `resolveChartTokens()` (jsdom returns `''`).
- **Verification:** `cd onecgiar-pr-client && npx tsc --noEmit -p tsconfig.app.json && npx jest src/app/pages/bilateral/pages/bilateral-overview/bilateral-overview.charts.spec.ts --silent && npx ng lint --quiet && ! grep -nE "#[0-9a-fA-F]{3,8}\b" src/app/pages/bilateral/pages/bilateral-overview/bilateral-overview.charts.ts`
- **Input that would make the check fail:** a builder coloring "Approved" with `--pr-status-approved-fg`; a table omitting zero-count statuses; a `'#6b46e5'` literal.
- **What this cannot prove / disqualifier:** option-shape tests prove structure, **not the rendered picture** (D6 accepted blind spot) — the visual check is `COV-T-8`'s HITL; a green here is never cited as "charts look right".
- **Definition of done:**
  - [ ] Spec green; grep gate 0 hex; lint clean.
  - [ ] Commit: `✨ feat(bilateral-overview) [<ticket>]: ECharts builders and a11y tables for the six cards`.

### `COV-T-5` — Overview page and controls components

- **Type:** `client`
- **Description:** `BilateralOverviewComponent` (page; URL ↔ state sync; effective phase = URL ?? shared signal ?? Open; calls the service; `scopedRows` via `filterCenterResults`; card models via `aggregate`; options via `charts`; KPI deck + 6 cards; per-card skeleton / error+Retry / ≤160px empty; center-switch reset; deep-link `routerLink`s carrying serialized params) and `OverviewControlsComponent` (phase `app-pr-select` with Open badge; Filter button with count badge; popover with the six dimensions; chips; Clear; Escape/outside-click closes without applying; keyboard operable). Layout per `design.md` §6.3 and the mockup; controls row sticky inside `#workArea`.
- **Implements:** `COV-R-2` A/B/C (all clauses incl. late-phase resolution and stale-card BUT), `COV-R-3` A/B/C/D (all clauses), `COV-R-4` (sticky, BUT single vertical scroll), `COV-R-5` A (Overview side), `COV-R-6` deck rendering + links, `COV-R-7` tiles + links, `COV-R-8` list + empty state + BUT zero rows stay visible, `COV-R-9` A/B/C rendering (bars, expander, not-started chips, no-project row), `COV-R-10` row/bar links + hint, `COV-R-11` bars, `COV-R-12` card, `COV-R-17` (all states), `COV-R-18` (buttons/links named with counts, `aria-current` via header, focus ring, `motion-reduce`), `COV-R-19` (grid classes), `COV-AC-2`–`8`, `COV-AC-11`–`17` (render part), `COV-AC-21`, `COV-AC-22`, `COV-AC-25`
- **Design refs:** §2.2, §2.3, §6.2, §6.3, §8, `COV-DD-7`, `COV-DD-8`, `COV-DD-9`, `COV-DD-10`
- **Files (expected):** `pages/bilateral/pages/bilateral-overview/bilateral-overview.component.{ts,html,scss,spec.ts}`, `pages/bilateral/pages/bilateral-overview/components/overview-controls/overview-controls.component.{ts,html,spec.ts}`
- **Depends on:** `COV-T-3`, `COV-T-4` · **Blocks:** `COV-T-6`, `COV-T-8`
- **Estimate:** L (the only L; split into `T-5.1` page shell + KPI deck + states and `T-5.2` six cards + controls if the Implementer's first attempt exceeds ~600 LOC production code)
- **Skills:** `angular-developer` (+ `onecgiar-pr-client/CLAUDE.md` §5 first), `ui-ux-pro-max` (fallback `frontend-design`), `tailwind-design-system`
- **Tests (Jest, zoneless — assert the rendered DOM, not class fields):** skeleton → data → empty → error transitions per card; `?phase=abc` → Open selected and param stripped; phase pick writes `?phase=` and shows skeletons before new data; late response for the previous key not rendered; filters → badge count, chips, URL, recomputed KPI text; Clear keeps phase; center switch clears filters/popover/params; Needs-attention all-zero → one-line empty; non-zero → zero rows rendered muted; every KPI/tile/bar/chip is an `<a>`/`<button>` whose accessible name contains its count; each chart host receives a `tableModel`; `routerLink` + `queryParams` of each deep link equal `serialize({...current, ...dimension})`.
- **Verification:** `cd onecgiar-pr-client && npx tsc --noEmit -p tsconfig.app.json && npx jest src/app/pages/bilateral/pages/bilateral-overview --silent && npx ng lint --quiet && ! grep -rnE "#[0-9a-fA-F]{3,8}\b|pi pi-" src/app/pages/bilateral/pages/bilateral-overview/ && CT_DEV_SERVER_PORT=<free port> npx cypress run --component --spec "src/app/pages/bilateral/**/*.cy.ts"` (CT specs may not exist yet at this point — if none, the CT command is skipped **and said so**; `COV-T-8` adds the spec)
- **Input that would make the check fail:** a tile as `<div (click)>` (name assertion fails); a KPI rendered from a component-local count instead of the aggregate model (the "hero equals `model.kpis.total`" DOM assertion fails when the fixture is changed); a `#` hex or `pi pi-` in the template.
- **What this cannot prove / disqualifier:** presence of `sticky top-0` classes proves nothing about behavior — the sticky proof is the CT measurement in `COV-T-8` at two heights (`KZ-EVM-1`); jsdom cannot measure layout or contrast (D4/D10) — those are `COV-T-8`. Any DOM assertion on a class name alone is recorded as presence-only in the spec's comments.
- **Definition of done:**
  - [ ] `tsc`, Jest, lint, grep gates green.
  - [ ] Every number visible on screen is also in text (no chart-only figure).
  - [ ] SCSS limited to `:host` box setup; all layout/color/typography as Tailwind utilities (rule 19).
  - [ ] Commit: `✨ feat(bilateral-overview) [<ticket>]: Overview page — controls row, KPI deck and six cards`.

### `COV-T-6` — Route and header: Overview as first tab, alias retired, tab links carry the phase

- **Type:** `client`
- **Description:** Add the `overview` route before `home` in `BilateralRouting` (`prHide: true`); add the Overview tab first in `bilateral-page-header` (`space_dashboard`, same classes as the other tabs); make `'overview'` activate only Overview (retire the Reporting alias); bind `queryParams` `{ phase }` on the four tab `routerLink`s when `ctx.selectedVersionId()` is set; rewrite the 4 alias spec cases and add the Overview-active case. **Pre-step:** re-read the header files at HEAD (concurrent `ai-drafts-redesign` edits — keep its "AI Draft Results" label).
- **Implements:** `COV-R-1` A (route, active state, `aria-current`, BUT `**` → `home` unchanged, AND-IT-MUST other routes unchanged) and B (alias BUT), `COV-R-5` A (tab links carry `?phase=`), `COV-AC-1`
- **Design refs:** §6.1, §6.2, `COV-DD-2`, `COV-DD-4` (challenge outcome)
- **Files (expected):** `shared/routing/routing-data.ts`, `pages/bilateral/components/bilateral-page-header/bilateral-page-header.component.{ts,html,spec.ts}`
- **Depends on:** `COV-T-2` (signal), `COV-T-5` (component to route) · **Blocks:** `COV-T-8`
- **Estimate:** S
- **Skills:** `angular-developer`
- **Tests:** header spec — tab order (Overview first, four tabs), `'overview'` → Overview active and Reporting **not** active, `'reporting'` → Reporting active, badge still on the drafts tab, `queryParams.phase` present iff the signal is set; routing spec (or a small new one) — `BilateralRouting[0].path === 'overview'`, the wildcard still redirects to `home`, all previous paths still present.
- **Verification:** `cd onecgiar-pr-client && npx tsc --noEmit -p tsconfig.app.json && npx jest src/app/pages/bilateral/components/bilateral-page-header src/app/shared/routing --silent && npx ng lint --quiet`
- **Input that would make the check fail:** leaving `|| activeTab() === 'overview'` in `isReportingActive` (the "Reporting not active" assertion fails); changing the wildcard to `overview`.
- **What this cannot prove / disqualifier:** `routerLink` bindings are asserted as attributes — the real navigation (`/bilateral/AfricaRice` → Reporting; tab click keeps phase) is confirmed live in `COV-T-8`.
- **Definition of done:**
  - [ ] Specs green (including the other spec's label expectation, untouched); `tsc`; lint.
  - [ ] Sidebar and Home center-card links **not** modified (OQ-1).
  - [ ] Commit: `✨ feat(bilateral-page-header) [<ticket>]: Overview as first center tab; tab links carry the shared phase`.

### `COV-T-7` — Results, Reporting and Draft Results tabs read (and Results writes) the contract `[x]`

- **Type:** `client`
- **Description:** Results tab: derive `selectedPhase` from `ctx.selectedVersionId ?? Open`, parse all contract keys on init and on `queryParamMap` changes, re-express chip logic + search through `filterCenterResults`, write params on chip/phase/search change (`replaceUrl`, merge), render a **Status** chip group and a **Project** chip only when those params are present, keep `?result=` focus. Reporting tab: after projects load, apply `program` (first value → SP quick filter), `multi=1`, `project` (scroll + 2 s highlight ring, `motion-reduce` static, catalog **not** filtered). Draft Results: `project` → `filter.selectProject`. **Pre-step:** re-read `bilateral-projects-panel.*` and `my-draft-results.*` at HEAD (concurrent edits).
- **Implements:** `COV-R-14` (scenario + BUT default unchanged + AND-IT-MUST strip invalid, column picker local), `COV-R-15` (both tabs, BUT highlight-not-filter), `COV-R-5` A (Results side: reads/writes the shared phase), `COV-R-13` reconciliation prerequisite (destination applies the same function), `COV-AC-18`, `COV-AC-19`, `COV-AC-13` (Reporting side)
- **Design refs:** §2.3, §6.2, `COV-DD-2`, `COV-DD-3`, `COV-DD-9`
- **Files (expected):** `pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.{ts,html,spec.ts}`, `pages/bilateral/pages/bilateral-home/components/bilateral-projects-panel/bilateral-projects-panel.component.{ts,html,spec.ts}`, `pages/bilateral/pages/my-draft-results/my-draft-results.component.{ts,spec.ts}`
- **Depends on:** `COV-T-2` · **Blocks:** `COV-T-8`
- **Estimate:** M
- **Skills:** `angular-developer`
- **Tests:** Results — **all existing spec cases pass unchanged** (behavior preservation) plus: `?status=pending&project=118` → only matching rows and both chips rendered; toggling W1/W2 writes `source`; invalid `status` stripped from the URL; phase from the shared signal overrides the Open default; `?result=` still focuses the row. Reporting — `program` pre-selects the quick filter, `multi=1` toggles Multi-Program, `project` adds the highlight class to exactly one card and calls `scrollIntoView` (spy), catalog count unchanged; `motion-reduce` path renders the static ring. Drafts — `project` param → `filter.selectedProjectId()` set (spec asserts the rendered chip, not the field, per that folder's own rule).
- **Verification:** `cd onecgiar-pr-client && npx tsc --noEmit -p tsconfig.app.json && npx jest src/app/pages/bilateral/pages/bilateral-results-list src/app/pages/bilateral/pages/bilateral-home src/app/pages/bilateral/pages/my-draft-results --silent && npx ng lint --quiet`
- **Input that would make the check fail:** rewriting Results' default so W1/W2 rows show without params (existing spec fails); filtering the Reporting catalog to the `project` card (catalog-count assertion fails); reading `project` before projects load (highlight never applied → assertion fails).
- **What this cannot prove / disqualifier:** URL writes are asserted through a Router spy — the real address bar, and the highlight's scroll position, are checked live in `COV-T-8`. If the concurrent spec's uncommitted edits are still present in these files, **stop and report** rather than merging by hand (shared-worktree rule).
- **Definition of done:**
  - [x] Existing Results / panel / drafts specs green **untouched** + new cases green; `tsc`; lint.
  - [x] Column-picker preference still `localStorage`-only.
  - [x] Commit: `♻️ refactor(bilateral) [<ticket>]: center tabs read the shared query-param contract; Results tab URL-driven`.

### `COV-T-8` — CT layout gate, build, live reconciliation (HITL) and guide docs

- **Type:** `tests` + `docs`
- **Description:** Add `bilateral-overview.cy.ts` (CT) and run the module CT set; run `npm run build:dev`; perform the live HITL on AfricaRice in the Orca browser and record evidence; create the component guide; record archive-time items.
- **Implements:** `COV-R-4` (sticky proof), `COV-R-13` reconciliation scenario (live), `COV-R-6` reconcile scenario, `COV-R-9` A/B live, `COV-R-10` live, `COV-R-18` contrast/focus (human), `COV-R-19` (measured), `COV-R-16` live row count, `COV-AC-8`, `COV-AC-9`, `COV-AC-12`, `COV-AC-13`, `COV-AC-14`, `COV-AC-20` (live), `COV-AC-23`; defect classes D2, D4, D6, D9, D10, D11
- **Design refs:** §6.3, §8, §10, `COV-DD-7`, `COV-DD-10`
- **Files (expected):** `pages/bilateral/pages/bilateral-overview/bilateral-overview.cy.ts`, `pages/bilateral/pages/bilateral-overview/CLAUDE.md` (new folder guide per `onecgiar-pr-client/docs/COMPONENT-DOCS.md`), `docs/specs/bilateral/center-overview-tab/execution.md` (evidence section)
- **Depends on:** `COV-T-5`, `COV-T-6`, `COV-T-7` (and `COV-T-1` deployed on the local server) · **Blocks:** —
- **Estimate:** M (≈ 40 min of which CT runs are ~2 × 2 min; say so in the progress line)
- **Skills:** `angular-developer`, `playwright-cli` only if installed (otherwise the Orca embedded browser per project memory: set viewport **after** `goto`, root zoom ×1.2)
- **Tests (CT):** mount the page with a 47-row / 21-project fixture at 1280×720, 1280×1000, 900×800, 375×800 — assert KPI column count (5 / 5 / 3 / 1 via `getBoundingClientRect` left edges), `document.documentElement.scrollWidth <= clientWidth`, and controls-row `top` identical before and after scrolling `#workArea` by 600px **at both 1280 heights** (`KZ-EVM-1`); measure on the real `#workArea` scroller, never on an `overflow-hidden` ancestor.
- **Verification:** `cd onecgiar-pr-client && CT_DEV_SERVER_PORT=<free port> npx cypress run --component --spec "src/app/pages/bilateral/**/*.cy.ts" && npm run build:dev` · then the **HITL reconciliation table** in `execution.md`: for each of hero, Pending review, Approved, Projects covered, 5 tiles, one project bar, one zero-project chip, one SP row → Overview figure vs destination visible count (Results row counter / Reporting card count / Drafts card count), screenshot per row; plus: `/bilateral/AfricaRice` still lands on Reporting; phase picked on Overview shown on Results and back; charts visually correct at 1280 / 900 / 375 (six screenshots); pill/hero contrast spot-check; server row count for (AfricaRice, Open phase) before vs after `COV-T-1` and `project_id` ↔ `project_name` on 5 rows.
- **Input that would make the check fail:** a KPI card with `min-w-[240px]` (column count at 900 drops); a controls row sticky to the wrong ancestor (top changes at 1000px height but not at 720); one destination count differing from the Overview figure by ±1 (e.g. Results' "Lead only" default not carried by the link).
- **What this cannot prove / disqualifier:** the CT fixture proves layout, **not data**; the reconciliation table is the only proof of D2 and it is **inconclusive** if the dev server is stale or the DB unreachable (check before measuring, per project memory) or if any row is compared against a tab whose own chips were changed by hand. A mismatch is reported as a finding, never explained away; a screenshot without the counter visible does not count as evidence.
- **Definition of done:**
  - [ ] CT green at all four viewports; `build:dev` green.
  - [ ] Reconciliation table complete with zero mismatches (or mismatches raised as findings before close-out).
  - [ ] `bilateral-overview/CLAUDE.md` written (invariants: computes nothing itself; contract file is the single filter; cache key; alias retired) and linked from the bilateral parent guide index.
  - [ ] Archive-time items recorded in `execution.md` (not applied on the spec branch): `docs/ux-ui/design.md` §4 screen inventory row; `docs/trd/trd.md` §6 note (Charts: ECharts via `pr-viz-chart` for new dashboards); `bilateral-results-list/CLAUDE.md` stale "default landing" line; `.agents/model-routing.md` T1 registry refresh.
  - [ ] Commit: `✅ test(bilateral-overview) [<ticket>]: CT layout gate, component guide and HITL evidence`.

---

## 4. Dependency graph

```
COV-T-1 (server: project_id)
   └── COV-T-2 (contracts: params · filter · interface · shared phase)
         ├── COV-T-3 (service + aggregate) ──► COV-T-4 (charts) ──► COV-T-5 (page + controls)
         │                                                                 └── COV-T-6 (route + header)
         └── COV-T-7 (Results / Reporting / Drafts read the contract)   ┐
                                                                         ├──► COV-T-8 (CT · build · HITL · docs)
                                              COV-T-5, COV-T-6 ─────────┘
```

**Parallel-safe branches:** after `COV-T-2` lands, `COV-T-3→T-4→T-5` and `COV-T-7` run concurrently (disjoint files). `COV-T-6` waits for `T-5` (needs the component to route). `COV-T-8` waits for everything. `COV-T-6` and `COV-T-7` additionally wait for the concurrent `ai-drafts-redesign` edits to be committed (pre-flight rule).

---

## 5. Coverage matrix (scenario / clause → owning task)

| Requirement · clause | Task(s) |
|---|---|
| R-1 A route/active/`aria-current` · BUT `**`→home · AND other routes | T-6 · live T-8 |
| R-1 B alias BUT | T-6 |
| R-2 A default + late phases · B switch/skeleton/URL · B BUT stale card · C deep link · C BUT invalid | T-5 (UI) · T-2 (parse) · T-3 (late-key guard) |
| R-3 A apply/badge/chips/URL · A AND program/project matching · B clear BUT phase kept · C escape/keyboard · D center switch | T-5 · T-2 (matching predicate) |
| R-4 sticky · BUT one scroll | T-5 (classes, presence-only) · **T-8 (measured)** |
| R-5 A Overview→Results and back · B no persistence BUT | T-6 (links) · T-7 (Results side) · T-2 (signal) · live T-8 |
| R-6 five formulas · reconcile scenario · AI-drafts scope BUT | T-3 (formulas) · T-5 (render/links) · **T-8 (reconcile live)** |
| R-7 tiles/meter/table · BUT ramp not status · AND `Number()` | T-3 · T-4 (colors/table) · T-5 (tiles) · T-2 (normalization) |
| R-8 four rules · empty ≤160 · BUT zero rows visible | T-3 (rules) · T-5 (render) |
| R-9 A bar click · B not-started → Reporting highlight · B AND join by id · C no-project row BUT | T-3 (model) · T-4 (click map) · T-5 (render) · T-7 (highlight) · T-1 (id) |
| R-10 two bars/sort · hint · links · BUT dedupe | T-3 · T-4 · T-5 |
| R-11 groups by id · zero omitted/table kept · BUT unknown→Other | T-3 · T-4 |
| R-12 cumulative/last=total · BUT outside-window bucketing · AND fallback | T-3 · T-4 (markArea/markLine) |
| R-13 key table · unknown→default · reconcile · AND same function · BUT no hiding | T-2 (contract+filter) · T-7 (destinations) · **T-8 (live)** |
| R-14 read/write · BUT default unchanged · AND strip/column picker local | T-7 (+ T-2 default test) |
| R-15 Reporting program/project/multi · Drafts project · BUT highlight-not-filter | T-7 |
| R-16 field · BUT unchanged fields/row count | T-1 · live T-8 |
| R-17 skeleton/error+Retry/empty · partial failure · BUT no full-height/toast | T-5 (+ T-3 error signals) |
| R-18 tables · named controls · `aria-current` · focus · reduced motion · contrast | T-4 (tables) · T-5 (names/motion) · T-6 (`aria-current`) · **T-8 (contrast/focus human)** |
| R-19 grid per viewport · no horizontal scroll · fixed chart heights | T-5 (classes) · **T-8 (measured)** |
| R-20 constant · R-21 cache/race · R-22 drafts reuse | T-3 |
| R-30 / R-31 (MAY) | not scheduled — recorded in design §13 |
| NFR performance / requests / bundle / grep gates | T-3 (perf) · T-3/T-5 (no new HTTP) · T-4/T-5 (grep) |

Every `COV-AC-n` is named in at least one task's **Implements** line above; AC-9, 12, 13, 14, 20, 23 close only in `COV-T-8` (live/measured).

---

## 6. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `COV-TEST-1` | unit (server) | R-16, AC-20 (shape) | `onecgiar-pr-server/src/api/results/result.repository.spec.ts` |
| `COV-TEST-2` | unit (client, pure) | R-13 parse/serialize, AC-4/18/19 (parse) | `pages/bilateral/bilateral-query-params.spec.ts` |
| `COV-TEST-3` | unit (client, pure) | R-13 filter, R-14 BUT default, R-3 A matching, R-7 `Number()` | `pages/bilateral/bilateral-result-filter.spec.ts` |
| `COV-TEST-4` | unit (client) | R-6..R-12 models, R-20..22, AC-24 perf | `bilateral-overview.aggregate.spec.ts`, `bilateral-overview.service.spec.ts` |
| `COV-TEST-5` | unit (client, pure) | R-7 BUT, R-18 tables, click→params, AC-10/15/16/17 | `bilateral-overview.charts.spec.ts` |
| `COV-TEST-6` | component (Jest, zoneless DOM) | R-2, R-3, R-5 A, R-6..R-12 render, R-17, R-18 names | `bilateral-overview.component.spec.ts`, `overview-controls.component.spec.ts` |
| `COV-TEST-7` | component (Jest) | R-1, R-5 A links | `bilateral-page-header.component.spec.ts`, routing spec |
| `COV-TEST-8` | component (Jest) | R-14, R-15, R-5 A (Results) | `bilateral-results-list.component.spec.ts`, `bilateral-projects-panel.component.spec.ts`, `my-draft-results.component.spec.ts` |
| `COV-TEST-9` | Cypress CT | R-4, R-19, AC-8, AC-23 | `bilateral-overview.cy.ts` |
| `COV-TEST-10` | live HITL (human) | R-13 reconcile, AC-9/12/13/14/20, D6, D10 | `execution.md` evidence table + screenshots |

Client coverage stays ≥ 50/60/60/60; server thresholds unaffected.

---

## 7. Rollout & verification

- [ ] **PR strategy (≈1,700 LOC > 400):** two chained PRs against `staging`.
  - **PR 1 — server + contracts** (`COV-T-1`, `COV-T-2`): small, reviewable in minutes; description says "review the SQL diff first; the client modules are pure and fully unit-tested; no UI change ships here".
  - **PR 2 — Overview feature** (`COV-T-3`…`COV-T-8`): description links PR 1, lists "what to review first" (the shared filter equivalence test, then the page component), "out of scope" (default landing, Results table redesign, drafts cards), and the HITL reconciliation table.
- [ ] CI green (lint, Jest, build, `migration:check:ci`, SonarCloud) on both.
- [ ] Manual QA on the test environment: reconciliation table repeated on one center other than AfricaRice.
- [ ] No downstream consumer notification needed (`/api/bilateral/*` untouched).

---

## 8. Cleanup & follow-ups

- [ ] Spec status → `shipped`; `/akili-archive` runs the guide syncs recorded in `COV-T-8` on the default branch.
- [ ] Promote `COV-DD-3` (one query-param contract per shell) to `docs/trd/trd.md` §11 as a pattern note.
- [ ] Follow-ups: `COV-R-31` pace overlay; submission timestamp for the pace card; server aggregate if a center exceeds thousands of rows.
- [ ] Resolve `COV-OQ-1` retroactively in commit history if the ticket is created after the first commit (amend before PR).

---

## 9. Roll-back plan

1. Revert PR 2 (feature) — routes, header and tabs return to the three-tab shell; no data impact.
2. Revert PR 1 if needed — removes `project_id` from the response and the contract modules; no migration to revert.
3. No feature flag or global parameter involved.
4. Verify `/bilateral/<acronym>/results` renders with its pre-change defaults and `bilateral-center-results` returns the prior shape (compare against a captured fixture from before PR 1).

---

## Required cross-references

- `docs/specs/bilateral/center-overview-tab/requirements.md` · `design.md` · `proposal.md` · `mockup/center-overview-tab.html`
- `docs/prd.md` · `docs/ux-ui/design.md` · `docs/trd/trd.md`
- `onecgiar-pr-client/CLAUDE.md` §5 Hard UI rules · `onecgiar-pr-client/docs/COMPONENT-DOCS.md`
- `.agents/model-routing.md` (Skill Map) · `.agents/leader.md` (delegation thresholds)
