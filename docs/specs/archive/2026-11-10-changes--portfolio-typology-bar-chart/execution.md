# Execution Log — Portfolio Overview: Results by typology as a clickable bar chart

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-typology-bar-chart` |
| Approval Mode | gated |
| Branch | `qa-development-2026-ss` @ `120f0e1b9` (base) |
| Leader | Claude Code session, model `opus` (T1) |
| Implementer / Reviewer | wrappers `akili-implementer` (T2) / `akili-reviewer` (T3) — distinct models by wrapper binding |
| Persona drift (`akili doctor --agents`, 2026-11-10) | implementer, reviewer CURRENT; `leader.md` § primary-instructions OUTDATED (matched 2.36.0); `tester.md` § context-alignment CUSTOM-EDITED — not fixed in this run, reported to user |
| Open questions at start | OQ-1 / OQ-3 running on spec defaults (Submitted = every non-Editing slot; Center tab removed); OQ-5 ticket ID pending (only needed for a commit) |
| Started | 2026-11-10 |

## 2. Task Execution History

### TBC-T-1 — Aggregate rows into P/A × bucket × type

- **Final status:** PASS (attempt 1)
- **Date:** 2026-11-10
- **Attempts:** 1
- **Skills / effort:** `angular-developer`, `tdd` (task default) · effort `medium`
- **Attempt 1**
  - Files changed: `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/components/typology-block/typology.aggregate.ts` (+56), `…/typology-block/typology.aggregate.spec.ts` (+94 / −1)
  - Red run (Implementer, stub exports: `statusBucket` always `'submitted'`, matrix empty): `npx jest --maxWorkers=2 --silent --no-coverage --testPathPattern=typology-block/typology.aggregate` → `Tests: 8 failed, 29 passed, 37 total`; `statusBucket` cases `1 (Editing)` and `8 (Draft)` failed `Expected: "editing" Received: "submitted"`; six `programTypeMatrix` tests failed on assertions (ordering: `- Expected - 5 + Received + 1`; types: `- Expected - 7 + Received + 1`; matcher lines of the other four hidden by `--silent`). The "sum = row count" test passed vacuously on the stub (pinned by the counts test in green).
  - Green: same command → `Tests: 37 passed, 37 total`.
  - Mutations run: `bucket = Number(row.status_id) === 1` → 2 failed (Draft case + SP01 counts); `naturalCodeCompare` → `localeCompare` → 1 failed (SP2/SP10). "Bucket ignores status" not run separately; Reviewer traced it as caught by the counts test and the `statusBucket` cases.
  - Lint: client has no flat eslint config for bare `npx eslint`; `npx ng lint --quiet --lint-file-patterns "…/typology-block/typology.aggregate*.ts"` → all files pass.
  - Evidence re-run (Leader-inline, non-author): same Jest command → `37 passed, 37 total` — **VERIFIED**.
  - Review intensity: override (b) applies (new exported symbols `statusBucket`, `programTypeMatrix`, `StatusBucket`, `ProgramTypeRow`, `ProgramTypeMatrix`) → conformance Reviewer spawned.
  - Reviewer verdict: **PASS** — TBC-R-2 (three scenarios + sum clause), TBC-NFR-1 (pure, single pass) and TBC-DD-2 (bucket via `resolveStatusSlot`) met; output shape matches design §6.1 field for field; falsifier fixture present, disqualifier not triggered; scope = the two declared files.
  - runtime events: none
- **spawns:** implementer 16 calls, 144779 tokens, ended complete; reviewer 7 calls, 98725 tokens, ended complete
- **ADVISORY (4R, not gating):**
  - Readability — `ProgramTypeRow` / `ProgramTypeMatrix` interfaces are written on one line; the file's other interfaces are multi-line with doc comments.
  - Reliability — Unclassified type has `name: ''`; the chart builder must supply a non-empty legend/series name from copy rather than passing `name` through. **Forward pointer → TBC-T-3** (legend + series names, design §6.2).
  - Readability — `(TYPE_ORDER.get(a.key) ?? 0)` fallback is only reachable for `''` (sole member of its level); a one-line comment would help.
- **Implementer assumptions (verbatim gist):** Unclassified type has key `''` and name `''`, so the view turns it into copy, the same as the existing `levelCards`; an unmapped key falls back to rank 0 within the Unclassified level, which has no effect because it is the only key there.
- **Requirements covered:** TBC-R-2 (counts per segment, zero buckets, unclassified type, Submitted + Editing = row count, natural order + catch-all last), TBC-NFR-1, TBC-DD-2
- **Decisions made:** none beyond the spec. Lint command substituted (`ng lint` scoped) because the bare `npx eslint` has no config in the client — same file scope.
- **Issues encountered:** `--silent` hides some matcher output in the red run (four of six assertion diffs not quotable).
- **Running totals vs budget (design §13):** tasks 1/5 · LOC ~150/~650 · review rounds 1/6 — within budget.
- **Final verification:** 37/37 green (Implementer + Leader re-run).

### TBC-T-2 — Pure click resolver

- **Final status:** PASS (attempt 1)
- **Date:** 2026-11-10
- **Attempts:** 1
- **Mode:** user said "continua hasta que termines" after T-1 → routine continue gates auto-pass from here; exceptions (HALT, Pivot, tripwire, FATAL_FAIL, waiver, HITL T-5) still stop
- **Skills / effort:** `angular-developer`, `tdd` (task default) · effort `medium`
- **Attempt 1**
  - Files changed (new, untracked): `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/components/typology-block/typology.click.ts` (85 lines), `…/typology-block/typology.click.spec.ts` (163 lines)
  - Exported API: `TypologyBucket`, `TypologyClickEvent`, `encodeSeriesId`, `decodeSeriesId`, `segmentPayload`, `axisLabelPayload`, `bucketSlots`, `resolveTypologyClick`
  - Red run (Implementer, stub returning null/''/[]): `Tests: 15 failed, 3 passed, 18 total` — e.g. round-trip `Expected: "editing|Knowledge product" Received: ""`; resolver tests `expect(result).not.toBeNull()` Received `null`; `bucketSlots` Expected −3 / Received +1. A first red attempt failed on TypeErrors (null result) — not counted; spec got a `resolve()` non-null helper and was re-run.
  - Green: `npx jest --maxWorkers=2 --no-coverage --silent --testPathPattern=typology-block/typology.click` → 18/18.
  - Mutations (each restored): M1 start from `EMPTY_SELECTION` → 3 failed; M2 typology not lower-cased → 3 failed; M3 toggle-off disabled → 2 failed; M4 catch-all allowed → 1 failed; M5 Submitted includes editing → 4 failed.
  - Lint: `npx ng lint --quiet --lint-file-patterns` (both files) → pass.
  - Evidence re-run (Leader-inline): same Jest → 18/18 — **VERIFIED**.
  - Review intensity: task Review = full; overrides (b) exported symbols, (a)/(b) shared selection → Reviewer spawned.
  - Reviewer verdict: **PASS** — TBC-R-4 (apply, Submitted bucket, toggle-off keeping Project/Center/Funding), TBC-R-5 (label toggle = `toggleValue` semantics, catch-all null), §6.3, TBC-DD-3 met; falsifier, disqualifier (non-empty start) and DoD (`matchesRow` match/miss) satisfied; resolver pure, input not mutated.
  - runtime events: none
- **spawns:** implementer 23 calls, 158626 tokens, ended complete; reviewer 9 calls, 106515 tokens, ended complete
- **ADVISORY (4R, not gating):**
  - Reliability — the replicated type normaliser (`normalizeType` is not exported from `portfolio-filters.ts`) accepts strings only and its whitespace collapse is untested; add a case such as `segmentPayload('editing', ' Knowledge  product ', 'SP02')` through `matchesRow`, or export `normalizeType` later so there is one copy.
  - Risk — **forward pointer → TBC-T-3:** design §6.3's "zero-count → null" cannot live in the resolver (no counts); T-3 must never emit a table action for a zero-count cell (test it), must use the P/A **key** as the `yAxis` category value (display via `axisLabel.formatter`), and `''` for the catch-all row.
  - Readability — redundant `!` after `resolve(event, START)` in the spec.
- **Implementer assumptions (verbatim gist):** (1) axis click `value` must be the P/A key, not formatted label text; catch-all `''`, blank, non-string → null. (2) segment events carry `name` = P/A key and `seriesId = encodeSeriesId(bucket, typeKey)`. (3) resolver cannot see counts; zero cells are T-3's null actions. (4) normaliser replicated locally, verified via `matchesRow`. (5) toggle-off = exact set equality on program/typology/status; extra values → apply. (6) axis click toggles within the program set (multi-select, like `toggleValue`).
- **Requirements covered:** TBC-R-4 (3 scenarios), TBC-R-5, TBC-DD-3; R-2 unclassified value (`unclassified`)
- **Decisions made:** none beyond the spec.
- **Issues encountered:** first red run invalid (TypeError) — corrected by the Implementer before recording.
- **Running totals vs budget:** tasks 2/5 · LOC ~400/~650 · review rounds 2/6 — within budget.
- **Final verification:** 18/18 green (Implementer + Leader re-run).
- **Continue gate:** auto-approved (user instruction "continua hasta que termines", 2026-11-10)

### TBC-T-3 — Chart option + accessible table builder

- **Attempt 1** (2026-11-10, effort `medium`, skills `angular-developer`, `impeccable-bridge`, `tdd`)
  - Files changed (new): `…/typology-block/typology.charts.ts` (156 lines), `…/typology-block/typology.charts.spec.ts` (313 lines)
  - Red: shape-complete empty stub → `16 failed, 6 passed` (assertion failures e.g. `Expected: [6, 0, 5] Received: undefined`, `Expected: 240 Received: 0`, parity `Expected: 5 Received: 0`); some residual TypeErrors (`color`, `itemStyle`, `event`) — covered by mutations per Reviewer. First stub (`option: {}`) all TypeErrors, not counted.
  - Green 22/22; mutations: seriesName-only payload → 3 failed; always emit action → 3; hex fill → 2; per-bucket series name → 1; `(100%)` in tooltip → 1; catch-all axis action → 2. Lint pass.
  - Evidence re-run (Leader-inline): 22/22 — VERIFIED.
  - Reviewer verdict: **FAIL** (verbatim):
    1. **Discovered Issue:** `typology.charts.ts:46` hardcodes a colour literal, `EDITING_DECAL.color: 'rgba(255, 255, 255, 0.55)'`. This is a colour applied to the segment graphic, and it is not a token passed in. The spec's "no hex" test (`/#[0-9a-fA-F]{3,8}/`) cannot catch it, so it only shows that hex is absent, not that colours come from tokens. On the same screen, `projects-block/projects.charts.ts:22` already settled this same case: "colour left to ECharts' default so no literal lives here", and its spec asserts `decal.color` is undefined (`projects.charts.spec.ts:33`).
       - **Violated Rule:** `requirements.md` TBC-NFR-3 ("Colours from tokens only"); `design.md` §6.2 ("Pure: colours come in as resolved strings"); reviewer project context ("FAIL any hard-coded colour … in client diffs"); `onecgiar-pr-client/CLAUDE.md` §5 rule 8 (only `var(--pr-*)` / aliases).
       - **Remediation Suggestion:** Either drop `color` from `EDITING_DECAL` so ECharts uses its default, as the projects block does, or add a decal entry to `TypologyChartColours` that the component resolves from a `--pr-*` token. Then extend the colour test: assert `decal.color` is undefined, or equals the passed-in token. Also add a check that no `rgba(`/`rgb(` appears in the serialised option, so the test covers more than hex.
  - ADVISORY (attempt 1): opacity floor .4 may fall below 3:1 (T-5 check with four output types); P/A axis action duplicated on Submitted and Editing rows (two focus stops per P/A); `VizChartTableActionEvent` lacks `componentType` — future narrowing would break keyboard label path (out of scope); decal-without-AriaComponent source-checked only (T-5).
  - Implementer assumptions: decal renders without `AriaComponent` per `echarts/lib/core/echarts.js:2437` + `visual/style.js:86-89` (not rendered); unrequested `barMaxWidth: 16`, scrolling bottom legend, dashed split line (Reviewer: implementation detail, no clause conflict); copy placeholders `{program}`/`{bucket}`/`{type}`/`{count}`.
  - runtime events: none
  - spawns: implementer 23 calls, 193993 tokens, ended complete; reviewer 11 calls, 116263 tokens, ended fail
- **Attempt 2** (2026-11-10, effort `high` — rework bump; skills `angular-developer`, `tdd`; `impeccable-bridge` dropped: colour-literal fix only, no visual decision)
  - Leader direction (narrowing): Reviewer remediation option 1 — drop `color` from `EDITING_DECAL` (precedent `projects-block/projects.charts.ts:22`); no new `TypologyChartColours` field; nothing else changed.
  - Files changed: `…/typology-block/typology.charts.ts` (line 46: `color` removed), `…/typology-block/typology.charts.spec.ts` (+ test "leaves the Editing decal colour to ECharts…", serialised check adds `/rgba?\(|hsla?\(/i`)
  - Red (mutation: literal restored): `2 failed, 21 passed` — decal test `Received: "rgba(255, 255, 255, 0.55)"`; serialised test `Expected pattern: not /rgba?\(|hsla?\(/i`.
  - Green: 23/23. Lint pass.
  - Evidence re-run (Leader-inline): 23/23 — **VERIFIED**; `grep "rgba|rgb("` on `typology.charts.ts` → no hit.
  - Reviewer verdict: **PASS** — issue fixed; only colour source is `colours[type.level]` (resolved argument); no hex/rgb/hsl literal; everything else unchanged from attempt-1 reading; new test cannot pass vacuously (asserts ≥1 Editing series).
  - runtime events: none
  - spawns: implementer 11 calls, 136421 tokens, ended complete; reviewer 4 calls, 97496 tokens, ended complete
- **Final status:** PASS (attempt 2)
- **Requirements covered:** TBC-R-2 (render shape, zero bucket keeps category), TBC-R-3 (level hue + shades, shared legend name, escaped tooltip, no %/ranking, legend has no selection hook), TBC-R-5 (axis keys + `triggerEvent`, catch-all no action), TBC-R-7 (table actions = segment/axis payloads, parity test over 8 actions), TBC-NFR-2 (height `max(240, n×44+80)`), TBC-NFR-3 (tokens in, no colour literal), TBC-DD-1, TBC-DD-4
- **Exported API (for T-4):** `TypologyChartColours` (= `Record<TypologyLevel, string>`), `TypologyChartCopy` (`bucketLabels`, `unclassifiedLabel`, `noProgramLabel`, `tooltipCountLabel`, `tableCaption`, `tableProgramHeader`, `tableStatusHeader`, `tableTotalHeader`, `segmentActionLabel` with `{program}`/`{bucket}`/`{type}`/`{count}`, `programActionLabel` with `{program}`), `TypologyChart` (`{ option, table, height }`), `buildTypologyChart(matrix, colours, copy)`
- **Forward pointers → TBC-T-4:** copy keys for every `TypologyChartCopy` field; resolve the 4 level tokens and pass them as `TypologyChartColours`. **→ TBC-T-5:** confirm decal renders without `AriaComponent` (source-checked only); 3:1 contrast with four Output types at opacity steps 1/.8/.6/.4; whether two identical P/A focus stops per P/A (Submitted + Editing rows) are acceptable.
- **Decisions made:** rework narrowed to remediation option 1 (keeps T-4's colour contract unchanged). Implementer extras `barMaxWidth: 16`, scrolling bottom legend, dashed split line accepted as implementation detail (Reviewer: no clause conflict).
- **Issues encountered:** attempt 1 colour test grepped hex only — let an `rgba()` literal through.
- **Running totals vs budget (design §13):** tasks 3/5 · LOC **~875** (prod ~297 / tests ~578) vs **~650** (prod ~300 / tests ~350) · review rounds 4/6 → **BUDGET TRIPWIRE: LOC exceeded (+~35%, all in tests); review rounds will reach ≥6 with T-4 (full) + T-5 remaining.** Run stopped for the user.
- **Final verification:** 23/23 green.
- **Continue gate:** NOT auto-approved — budget tripwire stop.

## Budget tripwire — after TBC-T-3 (2026-11-10)

- **Delta:** LOC ~875 vs ~650 expected (+~225). Production code ~297 vs ~300 (on budget); tests ~578 vs ~350 (+~228). Review rounds 4 of 6 used with T-4 (full review, largest task) and T-5 still open — likely 6–7 at close.
- **Cause:** test-heavy falsifiers (mutation-backed parity tests across 3 seams, one-row-per-status fixtures) and one rework round on T-3 (colour literal). Not scope growth — no task or requirement added.
- **Status:** waiting for the user to continue, re-budget, or stop.
- **User decision (2026-11-10):** "continua" — option 1, continue T-4 and T-5 accepting the overrun; budget not re-baselined. Tripwire will re-fire only on a new, materially different overrun (e.g. production LOC well past ~300, or review rounds past ~8).

### TBC-T-4 — Rewrite the typology block component

- **Final status:** PASS (attempt 1)
- **Date:** 2026-11-10
- **Attempts:** 1
- **Skills / effort:** `angular-developer`, `tailwind-design-system`, `spartan`, `impeccable-bridge` (task default) · effort `medium`
- **Attempt 1**
  - Files changed: `…/typology-block/typology-block.component.ts` (+42/−34), `.html` (+11/−64, cards markup unchanged), `.spec.ts` (rewritten +216/−155), `…/typology-block/typology.aggregate.ts` (removals; diff vs base +43/−59 incl. T-1), `typology.aggregate.spec.ts` (breakdown cases dropped), `onecgiar-pr-client/src/app/internationalization/portfolio-overview.copy.ts` (+13/−11), `…/portfolio-overview/portfolio-overview.component.spec.ts` (+2/−2 — outside the task's file list; named in its Consumers; accepted by Leader, see decisions)
  - Removed symbols: `breakdownByProgram`, `breakdownByCenter`, `Breakdown`, `BreakdownRow`, `group`, `Grouped`, `W3_SOURCE`, `TypologyDimension`, `dimension`, `activeBreakdown`, `programBreakdown`, `centerBreakdown`, `levels`, `rowLabel`, `setDimension` — no hit outside typology-block.
  - Removed copy keys (top level): `typologyTableCaption`, `dimensionProgram`, `dimensionCenter`, `dimensionAriaLabel`, `colProgram`, `colCenter`, `colTotal`, `noProgram`, `noLeadCenter`, `centerNote`, `centerEmpty` — remaining same-named hits read the nested `.projects` / `.contributions` groups (Reviewer-confirmed). Added `typologyChart` group (all 10 `TypologyChartCopy` fields; catch-all "No Program / Accelerator").
  - Red (new spec vs old component): 15 of 21 failed on behavioural assertions (chart host, segment click → one `setSelection`, catch-all no call, keyboard parity, no tabs/table/Center note); 6 passing were card tests valid on both.
  - Verification: (1) scoped Jest → 5 suites, 165/165; (2) `--findRelatedTests` 7 files → 36 suites, 1225/1225; (3) `npx ng build` → success, warnings only; (4) `ng lint --lint-file-patterns` → pass. Removed test ids absent from `src` and `cypress` (except the spec's negative assertions and an unrelated CSS class `typology-row` in other components).
  - Evidence re-run (Leader-inline): (1) 165/165 — VERIFIED; (3) `ng build` exit 0, "Application bundle generation complete", only unrelated NG8112/NG8113 warnings — VERIFIED. (2) not re-run by the Leader (1225 tests; Implementer-only evidence).
  - Reviewer verdict: **PASS** — ISSUES 0; `rows` input + cards unchanged; one `setSelection` per click, none on `null`; no local highlight state; page-spec edit conforms to the amended design §10 row; removed copy keys truly unused; tokens resolved once, fallback `var(--pr-…)`.
  - runtime events: none
- **spawns:** implementer 36 calls, 239811 tokens, ended partial (Not Done / Assumptions: page-spec edit, compile-gate falsifier n/a — no owed items); reviewer 17 calls, 136307 tokens, ended complete
- **ADVISORY (4R, not gating):**
  - Risk/readability — `fill(level)` now returns the `getComputedStyle`-resolved colour (frozen rgb/hex in a real browser) for the card marker dots (`typology-block.component.html:21`), not `var(--pr-…)`; jsdom cannot see it. Suggest a `var()` map for the dots, resolved values only for ECharts.
  - Reliability — colours resolved at construction; runtime token changes won't reach the chart (acceptable: light only).
  - Test — keyboard-parity test emits `action.event` via `triggerEventHandler('chartClick')`, not the wrapper's `activateTableAction`; wrapper forwarding covered by P-5.
  - Docs — `PO/CLAUDE.md` still describes the Center dimension and the `BrnTabs` mock; the client folder-docs convention requires updating it **in the same commit** as these files → carried to T-5 / commit.
- **Implementer Not Done / Assumptions (verbatim gist):** (a) page spec asserted exactly 2 `app-pr-viz-chart` and failed with 3 — changed to 3 charts with titles `[statusTitle, 'Status Pipeline', COPY.typologyChart.tableCaption]`; design §10 said the file would be unchanged, which was wrong. (b) compile-gate falsifier not applicable: `tsconfig.json` `"strict": false`, so `null` into `setSelection` compiles; null guard covered by the runtime catch-all test. (c) `chartTitle` reuses `typologyChart.tableCaption`, as the projects block does.
- **Requirements covered:** TBC-R-1, R-4/R-5 wiring, R-6, R-7, R-8, R-9, NFR-4, TBC-DD-5, DD-6
- **Decisions made:**
  - Execute-time spec edit: `design.md` §10 row `portfolio-overview.component.spec.ts` amended from "Unchanged; must still pass (selector + `rows()`)" to "Must still pass …; its ECharts-host count assertion goes 2 → 3 with the typology chart title added (amended 2026-11-10 at execute)". Reason: P-9 consumer premise missed that the page spec counts chart hosts. No requirement meaning changed. Carried to the T-4 Reviewer as a named check (conforms).
  - Compile-gate falsifier replaced by an equivalent runtime falsifier ("the catch-all payloads … never call setSelection" — goes red if the `if (next)` guard is removed), Reviewer-confirmed. Cause: client `strict: false`.
  - Page-spec edit outside the listed files accepted: the file is named in the task's Consumers and verification command 1 cannot pass without it.
- **Issues encountered:** design premise P-9 incomplete (page spec chart count); `strict: false` disables the planned compile gate.
- **Running totals vs budget:** tasks 4/5 · LOC added ~1137 / removed ~389 (net ~750) vs ~650 — overrun already escalated and accepted (user "continua"); no new material overrun · review rounds 5/6.
- **Final verification:** 165/165 scoped Jest + 1225/1225 related Jest + `ng build` green + lint pass.
- **Continue gate:** auto-approved (user "continua" after the tripwire, 2026-11-10)

### TBC-T-5 — Readability check + module guide note (in progress — HITL)

- **Status:** `[~]` — waiting on the user (HITL) and on a reachable database.
- **Local stack (2026-11-10):** pre-check `node -v` → v24.13.0 (contract asks 20.x — noted, not blocking). Client `npm start` → up at `http://localhost:4200`. Server `npm run start:dev` → mysql2 `ETIMEDOUT` on `connect` (12×) — the shared dev DB is not reachable from this machine right now.
- **Deferral probe (leader.md → Deferring a check):** assumption "the readability check needs live rows from the shared DB" — probed by starting the server: confirmed blocked by the DB connection, not by code. A fixture harness could render the block without DB, but T-5's falsifier (segment count = results-detail count after a click) needs real page rows, so the probe stands.
- **Pending item for `/akili-archive` (and the commit — client folder-docs convention requires the same commit):** `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/CLAUDE.md` § Results by typology — TYV-R-8 "typology block is read-only" superseded by TBC-R-4/R-5 (chart writes the global selection); remove the Center-dimension / lead-Center note and the `BrnTabs` mock line; re-stamp `Verified:`.
- **Checklist for the human check (from tasks.md + carried pointers):** 1280 / 1920 px readable, no horizontal page scroll at 390 px; two bars per P/A distinguishable (colour + stripes — confirms decal renders without `AriaComponent`); lighter type shades (opacity .6/.4 with four Output types) still ≥ 3:1 against the card; tooltip text (code + name, status, type, count, no %); legend toggle hides the type only, filter bar unchanged; one segment click → filter chips + results-detail count = segment count; second click clears; "Clear all" restores; P/A label click toggles program; keyboard: table actions reachable (two focus stops per P/A acceptable?); card marker dots still the right colours. Confirm served bundle contains `typology.charts` before judging. Read-only: no write buttons (shared prdb + prod mailer).
- **Stack unblocked (2026-11-10, user connected VPN):** server restarted → `GET http://localhost:3400/api` 200, RMQ/sockets connected. Served-bundle check: the `ng serve` on :4200 was started by the Leader after the last T-4 edit and no source file changed since → bundle reflects the working tree (chunk grep for the lazy chunk inconclusive). Handed to the user for the read-only visual check.

## Pivot Record: TBC-T-5 (P-1, 2026-11-10)

- **Trigger:** user HITL at T-5: "anteriormente también teníamos por centro. ¿En dónde quedó…?"; "los colores siento que son muy difícil de entender" ("hay muchos tipos de tonos oscuros… un gris, luego un gris más oscuro"); "si le hago hover a algunas líneas … no me da información".
- **Findings:** Center tab removal was spec default OQ-3, never confirmed. Old Center view = W3/Bilateral rows by lead Center; the global Center filter matches lead + contributing Centers (`portfolio-overview/CLAUDE.md:36`) → a Center click cannot reproduce segment counts. Colour encoding DD-4 (3 hues × opacity steps) gave grey-looking near-duplicates. Hover = `trigger: 'item'` → thin segments unhoverable.
- **User decisions (AskUserQuestion, 2026-11-10):** Center back as a tab, **view-only** (no click); colours: clearly distinct, no greys (free-text answer → one distinct token per type, recommended option). Taken as pivot approval; user asked "arregla esto ya".
- **Revised direction:** TBC-R-3 amended (distinct colour per type, row tooltip); TBC-R-9 Center part reversed; new TBC-R-10; design §15 DD-7/DD-8/DD-9 (DD-4 colour rule superseded, DD-5 reversed); tasks + T-6, T-7; T-5 `[~]` until both close. No TRD ADR affected.
- **Sweep:** forward grep (level family / opacity / Center tab / DD-5) and backward refs fixed in requirements §4, design §6.2 note via DD-7, §11, DD-4/DD-5 headers. T-4 entry keeps its historical DD-5 citation (history, not a live claim).
- **Budget re-baseline:** +2 tasks, +~350 LOC, +3 review rounds (user: "intenta ahorrar mucho los tokens" → lean briefs, one Reviewer per task).

### TBC-T-6 — Distinct type colours + row tooltip (pivot P-1)

- **Final status:** PASS (attempt 1) · 2026-11-10 · effort medium · skills `angular-developer`, `tdd`
- Files: `…/typology-block/typology.charts.{ts,spec.ts}`, `typology-block.component.{ts,spec.ts}` (html net unchanged; copy untouched)
- Red: `Expected: "var(--pr-color-blue-600)" Received: undefined`; `Expected: "axis" Received: "item"`; row tooltip substring `Received string: ""`; component distinct colours `Expected: 7 Received: 4`. Green 169/169, `ng build` OK, lint pass. Mutations: trigger `'item'` → 1 failed; colour by level → 2 failed.
- Evidence re-run (Leader): 169/169 + `ng build` Output location — VERIFIED.
- Reviewer: **PASS** — token map = DD-7 exactly; resolved once, `var()` fallback, no literal; `axis` + shadow tooltip escaped, no `%`; marker dots keep `var()` strings.
- ADVISORY: `tooltipCountLabel` now a dead copy key (`typology.charts.ts:21`, `portfolio-overview.copy.ts:36`, spec fixture) → forward pointer T-7 [advisory-grade]; `EDITING_DECAL` comment cites superseded DD-4 → should cite DD-7; colours frozen at construction (light theme only — fine).
- Assumptions: marker-dot test asserts `fill()` values (jsdom drops inline `var()`); tooltip lines `Type: n`.
- spawns: implementer 22 calls, 163933 tokens, ended complete; reviewer ended complete
- Running totals: tasks 6/7 incl. pivot; review rounds 6 / 9 (re-baselined).
- Continue gate: auto-approved (user "arregla esto ya" / "continua")

### TBC-T-7 — "By Center" tab, view-only (pivot P-1)

- **Final status:** PASS (attempt 1) · 2026-11-10 · effort medium · skills `angular-developer`, `spartan`, `tdd`
- Files: `…/typology-block/typology.aggregate.{ts,spec.ts}` (`typeMatrix` keyed, `centerTypeMatrix` W3 via `fundingOf`), `typology.charts.{ts,spec.ts}` (`interactive` flag; `tooltipCountLabel` removed; decal comment → DD-7), `typology-block.component.{ts,html,spec.ts}` (Spartan tabs, pre-spec test ids, Center early return, lead-Center note, R-6 guard), `internationalization/portfolio-overview.copy.ts` (restored `dimensionProgram`, `dimensionCenter`, `centerNote`; reworded `dimensionAriaLabel`; added `typologyCenterChart`). Page spec unchanged.
- runtime events: provider-limit death ×1 (5-hour usage limit, mid-task) → rung 1 tree probe (partial edits in 7 files, 14:42) → rung 3 resume-by-message (context survived) — recovered.
- continuations: 1 (mutations not run; TBC-R-6 "no local state" test deleted without replacement)
- Red: 8 failed — charts `triggerEvent` `Received: true` (behavioural); aggregate "is not a function" and component null-tab reds were setup failures (not counted). Covered by mutations: early return removed → Center "never calls setSelection" test fails; funding filter removed → 3 tests fail (incl. W1/W2 "ZZZ-W1" row). Sources restored (`cmp` identical).
- Verification: scoped Jest 177/177; `--findRelatedTests` 36 suites 1236/1236; `ng build` OK; lint pass. Leader re-run: 177/177 + `ng build` — VERIFIED.
- Reviewer: **PASS** — Center tab writes nothing (segment, axis, table); P/A unchanged; R-10 items present; R-6 guard non-vacuous (exact allow-list); copy keys used; no colour literals; advisory-grade items done.
- ADVISORY: class docstring still says "a click only writes the global selection" (add Center view-only); Center copy reuses P/A-named keys `noProgramLabel`/`tableProgramHeader`; pointer cursor on non-interactive segments (`cursor: 'default'` suggested); `PO/CLAUDE.md` "own W3 string test" note now stale → add to the guide update.
- spawns: implementer (3 turns: initial died, resume, continuation) 2+4+… calls, 123448 → 125606 tokens reported, ended complete; reviewer ended complete
- Running totals: tasks 7/7 code tasks done (T-5 HITL open); review rounds 7 / 9 re-baselined.

### TBC-T-5 — Readability check + module guide note — closed

- **Final status:** PASS · 2026-11-10
- HITL round 1 → pivot P-1 (see Pivot Record). HITL round 2 (after T-6/T-7, served bundle rebuilt 14:52:02 after last source edit 14:51:51): user accepted the chart — "dejémosla así" (after considering a Stitch redesign; not pursued).
- Module guide: `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/CLAUDE.md` § Results by typology rewritten (P/A tab writes the selection, Center tab view-only), Funding-rule line fixed (typology no longer carries its own W3 test), `Verified:` re-stamped 2026-11-10; 118–119 lines (≤120 cap). Applied in the same commit per client folder-docs convention (not deferred to archive).
- Reviewer (doc half): **PASS** — every claim matches code (`typology-block.component.ts:98,102`, `typology.charts.ts:55,116,132`, `typology.aggregate.ts:153-154`).
- Not checked by a human item by item: 390 px horizontal scroll and the 3:1 contrast were accepted as a whole, not measured.

## Summary

- **Tasks:** 7/7 `[x]` (T-1..T-5 + pivot T-6, T-7). Attempts: T-3 needed 2 (colour literal); all others 1. Review rounds: 8 (incl. T-3 re-review and T-5 doc review).
- **Pivot P-1:** Center tab restored view-only; distinct per-type colours; row tooltip.
- **Runtime events:** 1 provider-limit death (T-7) recovered by resume-by-message.
- **Budget:** original ~650 LOC / 5 tasks / 6 rounds → actual ~1,400 added (tests-heavy) / 7 tasks / 8 rounds; tripwire escalated after T-3 (user: continue) and re-baselined at P-1.
- **Open:** OQ-5 ticket ID; kaizen + archive (`/akili-archive`); advisories: Center copy reuses P/A-named keys, pointer cursor on view-only segments, class docstring wording, keyboard two focus stops per P/A; `VizChartTableActionEvent` lacks `componentType`.
