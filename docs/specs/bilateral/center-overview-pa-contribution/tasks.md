# Tasks — Center Overview by P/A (CPA)

## 1. Scope

- **Feature:** Center Overview by P/A — INC-166545 points 6 + 7
- **Linked:** `requirements.md`, `design.md` (same folder); `docs/prd.md`, `docs/ux-ui/design.md` §7/§10, `docs/trd/trd.md`
- **Owner:** Santiago Sanchez · **Status:** in-progress (execute started 2026-10-27 on `qa-development-2026-ss` by owner decision)
- **Branch:** from `staging` **after** the INC-166545 quick (points 3–5) is merged there (it edits `bilateral-overview.component.html/.ts` and `bilateral-overview.charts.ts`)
- **Test rules (all tasks):** Jest `--maxWorkers=2`, `--findRelatedTests <changed files>`, never the full suite; eslint on touched files only; one test run at a time on the machine.

## 2. Pre-flight

- [x] requirements.md + design.md approved by owner (2026-10-27)
- [x] A-1..A-5 sent to Nicoleta (or accepted as defaults by owner) — accepted as defaults 2026-10-27
- [x] INC-166545 quick merged into `staging` — waived: quick (6ade6060b, b13830968) is on `qa-development-2026-ss`, where this spec runs (owner decision 2026-10-27)
- [x] CPA-T-1 result reviewed (Disqualifier not hit) — 2026-10-27
- [x] No migration in this spec

## 3. Tasks

### [x] CPA-T-1 — Diagnose IFPRI's invisible tagging row (read-only, HITL)

- **Type:** rollout (diagnosis)
- **Description:** Owner runs the read-only SQL from the specify report (inline, never saved to a file) on prod for IFPRI, Reporting 2026. Record: tagging rows (id, code, submitter), every tagged project id, whether each is in `center_projects` and in the client project list (`getProjectsByCenter`), and the row's single `project_id`.
- **Implements:** CPA-R-7 (precondition), CPA-P-9
- **Files:** none (result recorded in `execution.md`)
- **Depends on:** — · **Blocks:** CPA-T-8 · **Estimate:** S · **Review:** skip-eligible
- **Verification:**
  - **Falsifier:** the query returns 0 tagging rows for IFPRI while the prod Overview shows 1 → the KPI and the SQL disagree; stop.
  - **Red run:** n/a (no test gate)
  - **Disqualifier:** the tagged project is NOT in `center_projects` (then it can't be a tagging row; the KPI comes from elsewhere) → re-open the spec.
  - **Consumers:** none (no shared symbol changed)
- **DoD:** findings pasted into `execution.md`; hypothesis (a)/(b)/(c) of proposal §3 confirmed or refuted.

### [x] CPA-T-2 — Server: `tagged_center_project_ids` on tagging rows

- **Type:** server
- **Description:** In `getResultsByBilateralCenter`, add a correlated `JSON_ARRAYAGG(DISTINCT …)` subquery (CPA-DD-1) returning center-project ids for `w1w2_tagging` rows only when the bilateral-scope flag is 1; `NULL` otherwise. Normalise to `number[] | null` after the query. Add the flag param in the right position.
- **Implements:** CPA-R-6, CPA-AC-6
- **Files:** `onecgiar-pr-server/src/api/results/result.repository.ts`, `result.repository.spec.ts`
- **Depends on:** — · **Blocks:** CPA-T-8 · **Estimate:** S · **Review:** full (shared query, 3 consumers)
- **Skills:** `nestjs-expert`, `tdd`
- **Verification:**
  - **Falsifier:** a spec that calls with `bilateralScope=false` and asserts the param array equals today's plus the new `0` flag and that mapped rows have `tagged_center_project_ids === null`; a scoped mock row `'[11,12]'` must map to `[11,12]`, a tagging row with `NULL` to `null` → if either fails, task is wrong.
  - **Red run:** `cd onecgiar-pr-server && npx jest src/api/results/result.repository.spec.ts --maxWorkers=2`
  - **Disqualifier:** the subquery changes row count or order in a PRTest spot check for CIP (count before vs after) → redesign, don't patch.
  - **Consumers:** `results.service.ts` (`getResultsByBilateralCenter` caller), Overview, Results tab, Portfolio `centers-block` — the latter two unscoped (must see `null` only).
- **DoD:** spec green; lint clean; `project_id`/`project_name`/`overview_category` untouched (diff review).

### [x] CPA-T-3 — Client contract: `category` key, category predicate, role fix

- **Type:** client
- **Description:** Interface field (`tagged_center_project_ids?: number[] | null`); `bilateral-query-params.ts` parses/serialises/clears `category ∈ {w3, w1w2-tagging}` (unknown → absent); `filterCenterResults` applies category by `overview_category` and widens `role=contributing` to `source='Result'` rows with null lead.
- **Implements:** CPA-R-4 (incl. BUT unknown value), CPA-R-5 (incl. BUT W3 null-lead excluded), CPA-AC-5
- **Files:** `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-center-result.interface.ts`, `bilateral-query-params.ts(+spec)`, `bilateral-result-filter.ts(+spec)`
- **Depends on:** — · **Blocks:** CPA-T-4, CPA-T-6, CPA-T-7 · **Estimate:** S · **Review:** full (shared predicate, Results tab consumer)
- **Skills:** `angular-developer`, `tdd`
- **Verification:**
  - **Falsifier:** rows {W3 null-lead, Result null-lead, Result lead=0, Result lead=1} with role=contributing must return exactly the 2nd and 3rd; `?category=foo` must parse to absent; `category=w3` must keep replicated_w3+new_w3 only.
  - **Red run:** `npx jest --findRelatedTests src/app/pages/bilateral/bilateral-result-filter.ts src/app/pages/bilateral/bilateral-query-params.ts --maxWorkers=2 --no-coverage`
  - **Disqualifier:** any existing Results-tab spec changes count for unscoped fixtures (would contradict CPA-P-7).
  - **Consumers:** `bilateral-overview.component.ts`, `bilateral-results-list.component.ts`, `bilateral-overview.aggregate.ts`, overview-controls, home projects panel (query params) — all their specs via `--findRelatedTests`.
- **DoD:** specs green; lint clean.

### [x] CPA-T-4 — Aggregate: `buildByPaModel` + `buildProjectsByPaModel`

- **Type:** client
- **Description:** Two pure builders per design §8; NO_PA group; sort rule; distinct-project sets; deploy-skew fallback only when the field is absent; remove "projects mapped" from the by-SP model (moved).
- **Implements:** CPA-R-1 A/B (incl. BUT no cross-series counting, AND sort), CPA-R-2 A/B (incl. BUT dedupe, AND no fallback when present), CPA-AC-1, CPA-AC-2
- **Files:** `bilateral-overview.aggregate.ts(+spec)`, `bilateral-overview.fixtures.ts`
- **Depends on:** CPA-T-3 · **Blocks:** CPA-T-5 · **Estimate:** M · **Review:** checklist
- **Skills:** `angular-developer`, `tdd`
- **Verification:**
  - **Falsifier:** fixture: SP05 3 W3 + 1 tagging; SP07 tagging rows tagging {P1,P2} and {P2}; P3 tagged by SP07 but mapped to SP02 → expected SP05 {w3:3,tag:1}, SP07 tagged=2, SP02 mapped includes P3, SP07 mapped excludes P3. Any other number fails.
  - **Red run:** `npx jest src/app/pages/bilateral/pages/bilateral-overview/bilateral-overview.aggregate.spec.ts --maxWorkers=2 --no-coverage`
  - **Disqualifier:** Total card ≠ Σ of by-P/A series for an unfiltered fixture → model wrong.
  - **Consumers:** `bilateral-overview.charts.ts`, `bilateral-overview.component.ts`
- **DoD:** specs green; existing aggregate specs updated, not deleted.

### [x] CPA-T-5 — Charts: by-P/A and Projects-by-P/A options + tables

- **Type:** client
- **Description:** Replace `bySpOption/bySpTable` with `byPaOption/byPaTable` (2 series) and add `projectsByPaOption/projectsByPaTable` (3 grouped vertical series, value labels), series namespaces for click routing.
- **Implements:** CPA-R-1, CPA-R-2 (accessible table = Scenario C success state)
- **Files:** `bilateral-overview.charts.ts(+spec)`
- **Depends on:** CPA-T-4 · **Blocks:** CPA-T-6 · **Estimate:** S · **Review:** checklist
- **Skills:** `angular-developer`, `tdd`
- **Verification:**
  - **Falsifier:** table rows must equal option series data for the CPA-T-4 fixture; series ids exactly `overview-by-pa:w3|tagging`, `overview-projects-by-pa:mapped|w3|tagged`.
  - **Red run:** `npx jest src/app/pages/bilateral/pages/bilateral-overview/bilateral-overview.charts.spec.ts --maxWorkers=2 --no-coverage`
  - **Disqualifier:** none beyond falsifier.
  - **Consumers:** `bilateral-overview.component.ts`
  - **Cannot prove:** rendered legibility/contrast (jsdom) → CPA-T-8 T6 check.

### [x] CPA-T-6 — Overview page: wiring, visible filters, drill-downs, states

- **Type:** client
- **Description:** Wire both charts (loading/error/empty/success), click handlers + deep links (`program`, `category`), Projects by P/A full-width card; overview-controls shows P/A multi-select + category select outside the popover (Spartan MCP for the control contract); "Clear filters" clears both; update `bilateral-overview/CLAUDE.md` + Verified stamp.
- **Implements:** CPA-R-1 C, CPA-R-2 C/D, CPA-R-3 (incl. BUT popover filters unchanged, AND clear), CPA-AC-3
- **Files:** `bilateral-overview.component.{ts,html,spec.ts}`, `components/overview-controls/*`, `bilateral-overview/CLAUDE.md`, `bilateral-overview.cy.ts` if it asserts SP chart ids
- **Depends on:** CPA-T-3, CPA-T-5 · **Blocks:** CPA-T-8 · **Estimate:** M · **Review:** full (UI + contract)
- **Skills:** `angular-developer`, `spartan`, `tailwind-design-system`
- **Verification:**
  - **Falsifier:** component spec: setting category=w1w2-tagging makes Total equal the fixture's tagging count and the by-P/A W3 series all 0; clicking `overview-by-pa:tagging` for SP05 navigates with `program=['SP05']`, `category='w1w2-tagging'`, `scope`, `phase`.
  - **Red run:** `npx jest --findRelatedTests <changed files> --maxWorkers=2 --no-coverage`
  - **Disqualifier:** the filters only fit by hiding other controls on 1280px → back to design.
  - **Consumers:** Results tab via deep links (CPA-T-7).
  - **Cannot prove:** layout at 900/1280px, focus ring visibility → CPA-T-8.

### [x] CPA-T-7 — Results tab: honour `category`

- **Type:** client
- **Description:** When `category` is present, fetch the `scope=bilateral` row set (same path the CWS `scope` key uses) and show a removable chip; removing it drops the key.
- **Implements:** CPA-R-4 (Results tab clause), CPA-AC-4
- **Files:** `pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.{ts,html,spec.ts}`
- **Depends on:** CPA-T-3 · **Blocks:** CPA-T-8 · **Estimate:** S · **Review:** checklist
- **Skills:** `angular-developer`, `tdd`
- **Verification:**
  - **Falsifier:** with `?category=w1w2-tagging&program=SP05` and a fixture holding 2 matching rows among 10, the list shows exactly 2 and one chip; removing the chip shows the unfiltered scoped count.
  - **Red run:** `npx jest --findRelatedTests src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.ts --maxWorkers=2 --no-coverage`
  - **Disqualifier:** Results tab without `category`/`scope` changes its request (must stay unscoped).
  - **Consumers:** none beyond the component.

### [ ] CPA-T-8 — Live verification on PRTest (HITL)

- **Type:** rollout
- **Description:** On PRTest (performance-refactor deploy): IFPRI + CIP, Reporting 2026 — (1) each by-P/A bar and Projects-by-P/A bar vs a SQL count per P/A; (2) Overview figure = Results tab count for 3 drill-downs incl. one tagging; (3) IFPRI tagging row visible in R-1, R-2, Results tab; (4) unscoped Results tab and Portfolio Centers block counts unchanged vs before; (5) `bilateral-center-results?scope=bilateral` timing, 3 runs each, before/after; (6) screenshots at 1280 and 900px reviewed (T6). Read-only: no write buttons clicked.
- **Implements:** CPA-R-7, CPA-AC-7, NFR performance/a11y
- **Depends on:** CPA-T-1, T-2, T-6, T-7 · **Estimate:** S · **Review:** skip-eligible
- **Verification:**
  - **Falsifier:** any drill-down count ≠ its figure; IFPRI tagging row absent anywhere listed.
  - **Red run:** n/a (no test gate)
  - **Disqualifier:** timing spread across 3 runs larger than the before/after difference → report the spread as inconclusive, do not claim pass.
  - **Consumers:** none (no shared symbol changed)
- **DoD:** results in `execution.md`; screenshots attached.

## 4. Dependency graph

```
CPA-T-1 (HITL, any time before T-8)
CPA-T-2 ───────────────────────────────┐
CPA-T-3 ──┬── CPA-T-4 ── CPA-T-5 ── CPA-T-6 ──┤
          └── CPA-T-7 ─────────────────────────┴── CPA-T-8
```

Parallel-safe: T-2 ∥ T-3; T-7 ∥ T-4→T-6.

## 5. Clause coverage

| Clause | Task |
|---|---|
| R-1 A (split, BUT no cross-count, AND sort) | T-4 |
| R-1 B (NO_PA, BUT not disappear) | T-4 |
| R-1 C (drill-down AND reconciles) | T-6 (link), T-7 (count), T-8 (live) |
| R-2 A (multi-project, BUT dedupe, AND no fallback) | T-4 |
| R-2 B (outside mapping) | T-4 |
| R-2 C (states, table) | T-5 (table), T-6 (states) |
| R-2 D (drill-down) | T-6 |
| R-3 (all cards, BUT popover intact, AND clear) | T-6 |
| R-4 (key, predicate, Results tab chip, BUT unknown ignored) | T-3, T-7 |
| R-5 (contributing incl. NULL Result, BUT not W3) | T-3 |
| R-6 (field, unscoped unchanged, AND no other field change) | T-2 |
| R-7 (IFPRI, Disqualifier) | T-1, T-8 |
| NFR perf / a11y / styling | T-8, T-6 |

## 6. Test plan

| Test | Type | Covers | Location |
|---|---|---|---|
| CPA-TEST-1 | unit server | R-6, AC-6 | `onecgiar-pr-server/src/api/results/result.repository.spec.ts` |
| CPA-TEST-2 | unit client | R-4, R-5, AC-5 | `pages/bilateral/bilateral-result-filter.spec.ts`, `bilateral-query-params.spec.ts` |
| CPA-TEST-3 | unit client | R-1, R-2, AC-1, AC-2 | `bilateral-overview.aggregate.spec.ts` |
| CPA-TEST-4 | unit client | R-1, R-2 tables | `bilateral-overview.charts.spec.ts` |
| CPA-TEST-5 | unit client | R-3, AC-3 | `bilateral-overview.component.spec.ts`, `overview-controls.component.spec.ts` |
| CPA-TEST-6 | unit client | R-4, AC-4 | `bilateral-results-list.component.spec.ts` |
| CPA-TEST-7 | live HITL | R-7, AC-7, NFR | PRTest (`execution.md`) |

## 7. Rollout

- [ ] qa-development-2026-ss → performance-refactor (user's own checkout) → PRTest ~30 min
- [ ] CPA-T-8 on PRTest
- [ ] INC-166545 reply to Nicoleta with screenshots + A-1..A-5 confirmation
- [ ] Commit subjects: no apostrophes/quotes/`$` (Jenkins)

## 8. Roll-back

1. Revert the client PR (charts/filters return to COV-R-10 layout).
2. Revert the server commit (field disappears; client fallback already tolerates absence).
3. No migration, no data change.
