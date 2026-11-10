# Tasks — Portfolio Overview: Results by typology as a clickable bar chart

## 1. Scope of this task list

- **Module / feature:** `result-framework-reporting/portfolio-overview` → `components/typology-block/`
- **Linked spec:** `requirements.md` + `design.md` (this folder)
- **Status:** done (2026-11-10)
- **Base:** `qa-development-2026-ss` @ `120f0e1b9`
- **Root for paths below:** `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/` (abbrev. `PO/`)

## 2. Pre-flight checklist

- [ ] OQ-1 / OQ-3 confirmed (defaults applied otherwise) · OQ-5 ticket ID for commit subject
- [ ] Test runs: `--maxWorkers=2`, one run at a time, scoped `--testPathPattern` / `--findRelatedTests` only (never the full suite)
- [ ] Browser check is **read-only** (shared prdb + prod mailer): no write buttons

## 3. Task list

### [x] TBC-T-1 — Aggregate rows into P/A × bucket × type

- **Type:** client
- **Description:** Add pure `programTypeMatrix(rows)` and a `statusBucket(row)` helper to `typology.aggregate.ts` per design §6.1 (canonical type key, `''` = Unclassified, bucket via `resolveStatusSlot`, catch-all P/A last, `naturalCodeCompare` order, `types` present-only in level order). Do not remove `breakdownBy*` yet (T-4 does, to keep the build green).
- **Implements:** TBC-R-2 (scenarios *counts per segment*, *zero buckets*, *unclassified type*; clause *Submitted + Editing = row count*), TBC-NFR-1, TBC-DD-2
- **Files:** `PO/components/typology-block/typology.aggregate.ts`, `typology.aggregate.spec.ts`
- **Depends on:** — · **Blocks:** T-2, T-3
- **Estimate:** S · **Review:** checklist — pure logic, no shared consumer yet
- **Skills:** `angular-developer`, `tdd`
- **Verification:** `npx jest --maxWorkers=2 --silent --no-coverage --testPathPattern=typology-block/typology.aggregate`
  - **Falsifier:** fixture SP01 = 6 KP Submitted + 4 KP Editing + 3 Policy Editing, plus one row per status slot (editing, in-qa, submitted, approved, rejected, discontinued) and one `status_name: 'Draft'` row. Mutation "bucket = `Number(status_id) === 1`" → the Draft row moves to Submitted and the Editing count assertion fails; mutation "bucket ignores status" → Submitted 6 vs 13 fails. Also SP2 vs SP10 ordering (mutation `localeCompare` → SP10 before SP2 fails).
  - **Red run:** predicted — greenfield artifact (observed in TBC-T-1)
  - **Disqualifier:** a fixture where every row has the same status or one type per P/A — Submitted/Editing or type mix-ups cannot diverge; not evidence.
  - **Consumers:** none yet (new export)
- **Definition of done:** red observed and quoted in `execution.md` before the code; green after; every P/A's submitted + editing = its rows; existing `levelCards` tests still green.

### [x] TBC-T-2 — Pure click resolver

- **Type:** client
- **Description:** New `typology.click.ts`: series-id encoding (`bucket|typeKey`) + axis payload helpers, `bucketSlots(bucket)`, and `resolveTypologyClick(event, selection)` → `PortfolioFilterSelection | null` per design §6.3.
- **Implements:** TBC-R-4 (all three scenarios, incl. *AND IT MUST keep Project/Center/Funding* and *BUT must NOT clear Project/Center/Funding*), TBC-R-5 (incl. *BUT catch-all must NOT be a target*), TBC-DD-3
- **Files:** `PO/components/typology-block/typology.click.ts`, `typology.click.spec.ts`
- **Depends on:** T-1 (type keys) · **Blocks:** T-3, T-4
- **Estimate:** S · **Review:** full — writes the page's shared selection (P-4)
- **Skills:** `angular-developer`, `tdd`
- **Verification:** `npx jest --maxWorkers=2 --silent --no-coverage --testPathPattern=typology-block/typology.click`
  - **Falsifier:** start selection `{project:{P1}, center:{C1}, funding:{bilateral}}`; click SP02·editing·Knowledge product → expect program `{SP02}`, typology `{knowledge product}`, status `{editing}`, project/center/funding unchanged. Mutation "start from `EMPTY_SELECTION`" → project/center/funding assertion fails; mutation "typology = canonical name un-lowercased" → `'Knowledge product'` ≠ `'knowledge product'` fails; second identical click → program/typology/status empty, others kept (mutation "no toggle" fails). Submitted click → status = the 5 non-editing slot keys. Unclassified → `{unclassified}`. Catch-all label → `null`.
  - **Red run:** predicted — greenfield artifact (observed in TBC-T-2)
  - **Disqualifier:** a test whose start selection is empty can't see the "keep other dimensions" defect — at least one case must start non-empty.
  - **Consumers:** none yet (new file)
- **Definition of done:** red quoted; green; the resolver's typology value is accepted by `matchesRow` (one test runs the result through `matchesRow` from `services/portfolio-filters.ts` on a matching and a non-matching row).

### [x] TBC-T-3 — Chart option + accessible table builder

- **Type:** client
- **Description:** New `typology.charts.ts`: `buildTypologyChart(matrix, colours, copy)` → `{ option, table, height }` per design §6.2 (two stacks per P/A, series per bucket×type sharing the type `name`, Editing decal, `yAxis.triggerEvent`, tooltip copy, height formula, table rows with index-aligned `actions` whose payloads equal the series/axis click payloads T-2 parses).
- **Implements:** TBC-R-2 (render shape), TBC-R-3 (incl. *BUT legend must NOT change selection*, *no percentage/ranking*), TBC-R-7, TBC-NFR-2 (height), TBC-NFR-3 (tokens in, no hex), TBC-DD-1, TBC-DD-4
- **Files:** `PO/components/typology-block/typology.charts.ts`, `typology.charts.spec.ts`
- **Depends on:** T-1, T-2 · **Blocks:** T-4
- **Estimate:** M · **Review:** checklist
- **Skills:** `angular-developer`, `impeccable-bridge`, `tdd`
- **Design route:** existing house style, `ENV-1`; colours from result-level tokens (design DD-4). Evidence: HITL screenshot in T-5.
- **Verification:** `npx jest --maxWorkers=2 --silent --no-coverage --testPathPattern=typology-block/typology.charts`
  - **Falsifier:** for every non-null `table.actions[r][c]`, `resolveTypologyClick(action.event, sel)` equals the resolver output for the matching ECharts series/axis payload (mutation: action payload uses `seriesName` only → parity test fails). Zero-count and catch-all cells → `null` (mutation "always an action" fails). Output contains no `#` hex and no `%` in labels/tooltip strings. Two series per type share one `name` (legend toggles both).
  - **Red run:** predicted — greenfield artifact (observed in TBC-T-3)
  - **Disqualifier:** asserting option keys exist proves presence only — it cannot prove readability; that is T-5's human check.
  - **Consumers:** `shared/components/pr-viz-chart` types `EChartsOption`, `VizChartTableModel` — read-only use, no change.
- **Definition of done:** red quoted; green; `legend` has no `selectedMode` hook writing state (selection untouched).

### [x] TBC-T-4 — Rewrite the typology block component

- **Type:** client
- **Description:** Keep `rows` input + cards; remove tabs, `dimension`, table, Center note, `breakdownByProgram` / `breakdownByCenter` / `Breakdown*` and their copy keys; inject `PortfolioOverviewService`; resolve the 4 level tokens once; render `app-pr-viz-chart` with option/table/height; `chartClick` → `resolveTypologyClick` → `data.setSelection` (skip on `null`). Add copy keys (bucket labels, tooltip, caption, catch-all). Rewrite `typology-block.component.spec.ts`.
- **Implements:** TBC-R-1 (incl. *BUT cards must NOT be clickable*), TBC-R-4/R-5 wiring, TBC-R-6, TBC-R-7 (keyboard path through the same output), TBC-R-8, TBC-R-9, TBC-DD-5, TBC-DD-6
- **Files:** `PO/components/typology-block/typology-block.component.{ts,html,spec.ts}`, `typology.aggregate.ts` (removals), `typology.aggregate.spec.ts` (drop breakdown cases), `onecgiar-pr-client/src/app/internationalization/portfolio-overview.copy.ts`
- **Depends on:** T-1, T-2, T-3 · **Blocks:** T-5
- **Estimate:** M · **Review:** full — removes shipped behaviour and touches a shared copy file + exported symbols
- **Skills:** `angular-developer`, `tailwind-design-system`, `spartan`, `impeccable-bridge`
- **Design route:** existing block shell, tokens only; cards markup untouched.
- **Verification:**
  1. `npx jest --maxWorkers=2 --silent --no-coverage --testPathPattern="portfolio-overview/(components/typology-block|portfolio-overview.component)"`
  2. `npx jest --maxWorkers=2 --silent --no-coverage --findRelatedTests <changed files>` (memory: folder scope missed cross-folder consumers once)
  3. `npx ng build` (template + typed contract; Jest does not type-check templates)
  4. `npx eslint <changed files> --quiet`
  - **Falsifier:** component spec stubs the service with `selection` signal + `setSelection: jest.fn()`; triggers `chartClick` with a segment payload → `setSelection` called once with the resolver result; triggers `chartClick` with the catch-all payload → not called (mutation "call toggleValue three times" or "always call" fails). Cards test ids/texts unchanged vs a fixture snapshot of counts. Compile gate: assign the resolver's `null` straight into `setSelection` → `ng build` red, Jest green.
  - **Red run:** predicted — greenfield artifact (observed in TBC-T-4) — the new `chartClick` tests fail on the current component (no chart host).
  - **Disqualifier:** a Jest green without `ng build` is not evidence for this task (template/type errors).
  - **Consumers:** `portfolio-overview.component.spec.ts:451, 656, 908, 1054` (selector + `rows()`), `portfolio-overview.component.ts` (import), `portfolio-overview.copy.ts` users — re-run `grep -rn "dimensionProgram\|dimensionCenter\|centerNote\|centerEmpty\|noLeadCenter\|typologyTableCaption\|colCenter\|colProgram" onecgiar-pr-client/src` before deleting each copy key; any hit outside typology-block keeps the key.
- **Definition of done:** red quoted; all 4 commands green; removed test ids absent from `src` and `cypress`; no local highlight signal added.

### [x] TBC-T-6 — Distinct type colours + row tooltip (pivot P-1)

- **Type:** client · **Depends on:** T-4 · **Blocks:** T-7, T-5
- **Description:** Per design §15 DD-7/DD-8: builder `colours` keyed by type key, no opacity steps; tooltip `trigger: 'axis'` + shadow pointer listing per bucket each non-zero type + count; component resolves the 10 tokens once; card dots keep `var()` strings.
- **Implements:** TBC-R-3 (amended), TBC-NFR-3, TBC-DD-7, TBC-DD-8
- **Files:** `PO/components/typology-block/typology.charts.{ts,spec.ts}`, `typology-block.component.{ts,html,spec.ts}`
- **Review:** full (rework of delivered behaviour)
- **Skills:** `angular-developer`, `tdd`
- **Verification:** `npx jest --maxWorkers=2 --silent --no-coverage --testPathPattern="portfolio-overview/(components/typology-block|portfolio-overview.component)"` + `npx ng build`
  - **Falsifier:** every type maps to a different colour (mutation "colour by level" fails); tooltip formatter for a row with 2 types in both buckets lists 4 lines with counts (mutation `trigger: 'item'` fails the trigger assertion); no hex/rgb literal in option.
  - **Consumers:** T-7 reuses the builder.

### [x] TBC-T-7 — "By Center" tab, view-only (pivot P-1)

- **Type:** client · **Depends on:** T-6 · **Blocks:** T-5
- **Description:** Per design §15 DD-9 + TBC-R-10: generalise the matrix to a key function (P/A vs lead Center W3-only via `fundingOf`), builder `interactive` flag, Spartan Tabs (P/A default), lead-Center note, copy keys, Center `chartClick` never writes.
- **Implements:** TBC-R-10, TBC-DD-9
- **Files:** `typology.aggregate.{ts,spec.ts}`, `typology.charts.{ts,spec.ts}`, `typology-block.component.{ts,html,spec.ts}`, `internationalization/portfolio-overview.copy.ts`
- **Review:** full
- **Skills:** `angular-developer`, `spartan`, `tdd`
- **Verification:** same as T-6 + `--findRelatedTests` on changed files
  - **Falsifier:** fixture with a W1/W2 row and two W3 rows of different lead Centers → Center matrix has only the 2 W3 rows; `chartClick` on Center tab → `setSelection` not called (mutation "same handler as P/A" fails); P/A tab still calls once.
  - **Consumers:** page spec (chart count may change with tabs).

### [x] TBC-T-5 — Readability check + module guide note

- **Type:** tests / docs
- **Description:** Local stack (`npm start` client + server), `/portfolio-overview` as admin, **read-only**. Check at 1280 px and 1920 px, plus 390 px for no horizontal page scroll: labels readable, two bars per P/A distinguishable (colour + stripes), tooltip text, legend toggle, one segment click → filter bar chips + results detail count equal the segment count, second click clears, "Clear all" restores. Record findings + screenshot paths in `execution.md`. Note the TYV-R-8 supersession as a pending item for `portfolio-overview/CLAUDE.md` (applied at archive).
- **Implements:** TBC-R-3 (readability), TBC-R-4 end-to-end (*THEN the filter bar … reflect it*), TBC-R-6, TBC-NFR-2, TBC-NFR-3 (human), defect class "chart unreadable"
- **Depends on:** T-4, T-6, T-7 (pivot P-1)
- **Estimate:** S · **Review:** checklist
- **Skills:** `claude-in-chrome` (or manual by user)
- **Verification:** HITL — user confirms at the pause.
  - **Falsifier:** pick SP with both buckets non-zero; segment count ≠ results-detail count after click → FAIL.
  - **Red run:** n/a — manual check
  - **Disqualifier:** a check against a stale bundle — confirm the served bundle contains `typology.charts` (memory: verify served bundle) before judging.
  - **Consumers:** none
- **Definition of done:** user approves readability or lists changes (→ Adjust).

## 4. Dependency graph

```
T-1 ─► T-2 ─► T-3 ─► T-4 ─► T-5
  └──────────► T-3
```
No parallel tasks (each consumes the previous seam).

## 5. Coverage (scenario / clause → task)

| Requirement clause | Task |
|---|---|
| R-1 cards unchanged · BUT not clickable | T-4 |
| R-2 counts per segment · AND MUST sum = rows | T-1 |
| R-2 zero buckets · BUT must NOT drop P/A | T-1 (data), T-3 (axis keeps category) |
| R-2 unclassified segment | T-1, T-2 (`unclassified` value) |
| R-2 natural order, catch-all last | T-1 |
| R-3 level colours / tooltip / legend · BUT legend must NOT change selection · no %/ranking | T-3; readability T-5 |
| R-4 apply · AND MUST keep Project/Center/Funding | T-2 (logic), T-4 (wiring), T-5 (end-to-end) |
| R-4 Submitted bucket = 5 slots | T-2 |
| R-4 toggle off · BUT must NOT clear Project/Center/Funding | T-2 |
| R-5 label click · BUT catch-all not a target | T-2, T-3 (`triggerEvent`, null action), T-4 |
| R-6 no local highlight, strip is the way back | T-4, T-5 |
| R-7 keyboard parity | T-3 (payload parity), T-4 (same output) |
| R-8 states | T-4 (no new state; page spec unchanged) |
| R-9 removals | T-4 |
| NFR-1 single pass | T-1 |
| NFR-2 height / widths | T-3 (formula), T-5 (measured by eye) |
| NFR-3 tokens, 3:1 | T-3 (no hex), T-5 (contrast by eye) |
| NFR-4 no HTTP | T-4 (spec: no HttpTestingController request from the block) |

## 6. Rollout & roll-back

Single PR to `qa-development-2026-ss` → `performance-refactor` for PRTest. Roll-back = revert the commit(s); no data or URL state.

## 7. Follow-ups

- `portfolio-overview/CLAUDE.md` § Results by typology + TYV-R-8 line — at `/akili-archive`.
- Lead-Center × level view lost with the Center tab (DD-5) — only if requested.
