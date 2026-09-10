# Tasks — "My work" board (4th Science Program tab)

## 1. Scope of this task list

- **Module / feature:** `result-framework-reporting/my-work-board` (client) + `results` list flag (server)
- **Linked spec:** `./requirements.md` (`MWB-R-1`…`R-11`, `MWB-AC-1`…`AC-9`) · `./design.md` (`MWB-DD-1`…`DD-13`, §5 maps, §6.3 tokens, §6.6 phase) · `./judgment.md` (round 1 applied)
- **Owner / driver:** session Leader (`/akili-execute`)
- **Status:** `approved` (Phase 3 auto-approved, pre-approved mode, 2026-09-04; rewritten after Judgment Day round 1)
- **Depth:** Standard · **Budget:** 6 tasks / ~1,350 LOC / ≤ 1 Reviewer round per task (`design.md` §1) · **+ `MWB-T-7` (~120), `MWB-T-8` (~180), `MWB-T-9` (~320), `MWB-T-10` (~200), `MWB-T-11` (~260), `MWB-T-12` (~260), `MWB-T-13` (~350), `MWB-T-14` (~220) added 2026-09-05 on explicit user request — budget 14 / ~3,260**
- **YOLO limits (inherited, `feedback-pragmatic-akili-execution`):** pre-approved gates logged as `auto-approved (pre-approved mode)`; one Reviewer round per task, a second FAIL escalates; verification = targeted `npx jest <path>` only, never a full client run; pointer briefs; workers never `git add -A` (shared worktree); close each worker right after its task commits (Reviewers via `TaskStop`); a plain-language progress line at every task boundary.
- **Branch:** `qa-development-2026` (shared — explicit-path diffs and commits; `git log --oneline -3` + `git status --short` before every commit).

## 2. Pre-flight checklist

- [x] `requirements.md` approved (Phase 1, user: Continue; post-judgment rewrite auto-approved)
- [x] `design.md` approved (Phase 2, auto-approved — pre-approved mode)
- [x] Open questions resolved (`MWB-OQ-1` → `MWB-DD-7`)
- [x] No migration, no CLARISA change
- [ ] No conflicting in-flight spec editing `reporting-program-band/**`, `programme-results/services/**`, `routing-data.ts`, `results.service.ts` (re-check `docs/specs/` + `git status` at execute start)
- [ ] Do not touch `package.json` / `package-lock.json`

## 3. Task list

### `MWB-T-1` — Server: `include_completeness` flag on `roles/filter` `[x]`

- **Type:** `server`
- **Description:** Add a pure `foldCompleteness(rows: NewValidationsDto[])` in `results-validation-module/completeness.ts` (`Number(v) === 1` rule, `missing` in input order). In `results.service.ts` filter path: parse `include_completeness` with `parseQueryBool`; when true, pick eligible items (`status_id` ∈ {1, 8}, `result_type_id` not an IPSR package — check `ResultTypeEnum`), newest `created_date` first, take `MWB_COMPLETENESS_CAP = 60`, call `resultValidationRepository.validateResultById(id)` in chunks of 5, attach `completeness` (fold, or `null` on rejection + one `logger.warn` with the id); every other item `null`. When false: untouched. `@ApiQuery` on the controller (`MWB-DD-1`, `DD-2`).
- **Implements:**
  - `MWB-R-8` — *Flag absent keeps the contract*: THEN no `completeness` key and every existing key unchanged; **BUT NOT** call the validation repository on the default path; **AND IT MUST** return `completeness: null` for a Submitted item and for the 61st eligible item when the flag is set. Also: a rejected call → that item `null`, request still 200.
  - `MWB-R-4` (server half): `missing` = section names with validation ≠ 1 in procedure order; P25 fixture → `{ complete: 2, total: 5, missing: [geographic-location, contributor-partners, knowledge-product-info] }`.
  - `MWB-AC-8` · NFR *Backwards compatibility*, *Security*, *Observability* (warn with id only).
- **Design:** `MWB-DD-1`, `MWB-DD-2`, §4.1, §5
- **Files (expected):** `onecgiar-pr-server/src/api/results/results-validation-module/completeness.ts` (+ `.spec.ts`), `results.service.ts` (+ `.spec.ts`), `results.controller.ts`
- **Depends on:** — · **Blocks:** `MWB-T-6` (live data only; T-2…T-5 use fixtures)
- **Estimate:** M (~260 LOC incl. specs)
- **Skills:** `nestjs-expert` · `api-design-principles` · `tdd`
- **Tests:** `completeness.spec.ts`: P22 6-section and P25 5-section fixtures; `'1'`, `1`, `true`-as-string handling per the `Number` rule (`'0'` → missing); order preserved; empty input → `{0,0,[]}`. `results.service.spec.ts` (filter path, repos mocked): without flag → `expect(item).not.toHaveProperty('completeness')` **and** `validateResultById` `not.toHaveBeenCalled`; with flag → called only for status 1/8 non-IPSR items, at most 60 times (fixture of 65 eligible), newest first; one mocked rejection → that item `null`, others populated, promise resolves; Submitted item `null`.
- **Verification:**
  ```bash
  cd onecgiar-pr-server && npx jest src/api/results/results-validation-module/completeness.spec.ts src/api/results/results.service.spec.ts --silent --reporters=summary --forceExit && npx eslint "src/api/results/results.service.ts" "src/api/results/results.controller.ts" "src/api/results/results-validation-module/completeness.ts" --quiet
  ```
  - **Pass:** suites green with the new cases; lint clean.
  - **FAIL input:** attaching `completeness` unconditionally → the no-flag assertion fails; calling the repo on the default path → `not.toHaveBeenCalled` fails; `Promise.all` without catch → the rejection test fails the whole request; no cap → 65 calls.
  - **Disqualifier:** a default-path expectation written by snapshotting the new code is not evidence — write it from the current mapping before adding the fold. A green run whose fixture has no item past the cap says nothing about `MWB-R-8`'s cap clause.
- **Definition of done:**
  - [ ] Scoped Jest green; lint clean; no migration
  - [ ] Swagger shows `include_completeness`
  - [ ] Commit `✨ feat(results) [SPEC:changes/my-work-board]: opt-in completeness on the roles/filter list` with explicit paths

### `MWB-T-2` — Client foundation: SP-id service, row mapper, section map, view-model `[x]`

- **Type:** `client`
- **Description:** New root `ScienceProgramIdService` (memoised `resolve(code)`, `shareReplay`) used by `ProgrammeResultsService` in place of its private resolver (`MWB-DD-3`); `ProgrammeResultRow` gains `resultTypeId` and optional `completeness`, mapper exported (`MWB-DD-4`); `my-work-section-map.ts` (§5 table, P22 + P25, `firstMissingRoute`, `sectionLabel`); `my-work.view-model.ts` (`STATUS_COLUMN_MAP` per `MWB-DD-1b`, `filterByPhase`, `groupByColumn`, `orderEditing`, `orderByCreatedDesc`, `readyCount`, `badgeCount`, `totals`, default-phase rule §6.6 as a pure function of options + current phase name + URL label). No Angular imports in the two pure files.
- **Implements:**
  - `MWB-R-2` — *Merged and unmapped statuses*: Draft (8) → Editing with chip *Draft*; Rejected (7) → Discontinued; unknown → *Other*; **AND IT MUST** count all three in the scope total. *Collapsed closed group* (grouping half): five columns always present in fixed order, *Other* only when non-empty.
  - `MWB-R-5` — *Least complete first*: null, 2/5, 4/5, 5/5; **AND IT MUST** break ties by newest created date; other columns newest first.
  - `MWB-R-3` (pure half): `filterByPhase` by label; default rule (URL label → current reporting phase → newest); totals per phase; `badgeCount` = Editing column size under Mine.
  - `MWB-R-4` (mapper half): `completeness` passthrough incl. `null`; labels via `sectionLabel` in server order.
  - `MWB-R-6` (mapping half): `firstMissingRoute` → first known route; unknown or `null` → `general-information`; both `partners` and `contributor-partners` resolve.
  - `MWB-R-11` `readyCount` · `MWB-AC-4` (map) · `MWB-AC-5`
- **Design:** `MWB-DD-1b`, `DD-3`, `DD-4`, `DD-11`, §5, §6.2, §6.6
- **Files (expected):** `result-framework-reporting/services/science-program-id.service.ts` (+ `.spec.ts`), `programme-results/services/programme-results.service.ts` (+ `.spec.ts`), `my-work-board/my-work.view-model.ts` (+ `.spec.ts`), `my-work-board/my-work-section-map.ts` (+ `.spec.ts`)
- **Depends on:** — · **Blocks:** `MWB-T-3`, `MWB-T-4`
- **Estimate:** M (~340 LOC incl. specs)
- **Skills:** `angular-developer` · `tdd`
- **Tests:** view-model: fixture of 14 rows (3×1, 1×8, 1×5, 2×3, 3×2, 1×6, 1×4, 1×7, 1×42) → columns Editing 4 / Pending 1 / Submitted 2 / Approved 4 / Discontinued 2 / Other 1, totals 14; Editing order null → 2/5 → 4/5 → 5/5 with a date-broken tie; `badgeCount` 4 under Mine, unchanged under All; `readyCount` 1; phase filter by label; default rule three branches. Section map: every §5 key → route; `contributor-partners` → `contributor-partners`; unknown → `general-information`. SP-id service: two subscribers, one HTTP request (`httpMock.verify()`); unknown code → `null`. `programme-results.service.spec.ts` still green with the service injected (existing resolve cases adapted, not deleted).
- **Verification:**
  ```bash
  cd onecgiar-pr-client && npx jest src/app/pages/result-framework-reporting/pages/my-work-board src/app/pages/result-framework-reporting/pages/programme-results/services src/app/pages/result-framework-reporting/services --silent --reporters=summary --no-coverage
  ```
  - **Pass:** all green incl. the pre-existing `programme-results.service.spec.ts`.
  - **FAIL input:** nulls sorted last → order test fails; `Object.keys` grouping → empty-column-in-place test fails; map missing `contributor-partners` → P25 test fails; resolver without `shareReplay` → two-subscriber test sees two requests.
  - **Disqualifier:** an ordering test with one row per column cannot detect comparator defects; every ordering test needs ≥ 3 rows and one tie.
- **Definition of done:**
  - [ ] Scoped Jest green; `npx ng lint --quiet` clean
  - [ ] No Angular import in the two pure files
  - [ ] Commit `✨ feat(my-work-board) [SPEC:changes/my-work-board]: SP-id service, row mapper, section map and view-model`

### `MWB-T-3` — Client data: `MyWorkBoardService` + `MyWorkCountService` `[x]`

- **Type:** `client`
- **Description:** Page-scoped `MyWorkBoardService` (signals `scope`, `phase`, `rows`, `loading`, `error`; computed `phaseOptions`, `visibleRows`, `columns`, `totals`, `badge` via the view-model; request token; one `GET_AllResultsWithUseRole(userId, { submitter_id, limit: PROGRAMME_RESULTS_PAGE_LIMIT, page: 1, filter_created_by_me: mine, include_completeness: mine })` per scope change; **404 → `rows = []`**, other errors → `error`; `retry()`), root `MyWorkCountService` (`ensure(code, phaseLabel)`: `ScienceProgramIdService.resolve` + one `submitter_id`-scoped `filter_created_by_me=true&status_id=1,8` request (Editing column = ids 1 and 8; the endpoint accepts a comma-separated list) counted by phase label, 404 → 0; `set(code, phaseLabel, n)` from the page) (`MWB-DD-5`, `DD-13`). Add `include_completeness` to `results-api.service.ts` search params.
- **Implements:**
  - `MWB-R-3` — *Switch scope*: one request with/without `filter_created_by_me`; flag only in Mine; **BUT NOT** change the badge; **AND IT MUST** make exactly one list request per scope change and none per card (no per-result method exists). *Switch phase*: THEN re-group without a request.
  - `MWB-R-7` (state half): `loading` during flight; `error` + `retry()`; **BUT NOT** report empty while loading; **AND IT MUST** treat HTTP 404 as an empty list.
  - `MWB-R-1` (badge source, scoped per programme + phase), `MWB-R-8` (client sends the flag), `MWB-AC-3`, `MWB-AC-7` (404), NFR *Performance* (request count).
- **Design:** `MWB-DD-5`, `MWB-DD-13`, §2.2 steps 3 & 6, §6.2
- **Files (expected):** `my-work-board/services/my-work-board.service.ts` (+ `.spec.ts`), `my-work-board/services/my-work-count.service.ts` (+ `.spec.ts`), `shared/services/api/results-api.service.ts` (+ `.spec.ts` case)
- **Depends on:** `MWB-T-2` · **Blocks:** `MWB-T-4`
- **Estimate:** M (~240 LOC incl. specs)
- **Skills:** `angular-developer` · `tdd` · `error-handling-patterns`
- **Tests:** HttpTesting with `ScienceProgramIdService` stubbed: load Mine → exactly one request containing `filter_created_by_me=true` and `include_completeness=true`; switch to All → one more request with neither; switch phase → `httpMock.expectNone`; 404 → `rows = []`, `error` null; 500 → `error` set, `rows` unchanged, `retry()` re-issues; stale token ignored; count service: cold key → one request with `submitter_id` + `filter_created_by_me=true` + `status_id=1,8`, count = rows matching the phase label; warm key → no request; 404 → 0; `httpMock.verify()` in every test.
- **Verification:**
  ```bash
  cd onecgiar-pr-client && npx jest src/app/pages/result-framework-reporting/pages/my-work-board/services src/app/shared/services/api/results-api.service.spec.ts --silent --reporters=summary --no-coverage
  ```
  - **Pass:** green with `verify()` in place.
  - **FAIL input:** per-row `GET_greenChecksByResultId` → `verify()` fails; flag sent in All → URL assertion fails; 404 mapped to error → empty test fails; badge request without `submitter_id` → URL assertion fails.
  - **Disqualifier:** a spec without `httpMock.verify()` cannot prove "one request"; not evidence for `MWB-R-3`.
- **Definition of done:**
  - [ ] Scoped Jest green; lint clean
  - [ ] Commit `✨ feat(my-work-board) [SPEC:changes/my-work-board]: board data service and badge count service`

### `MWB-T-4` — Client UI: route, 4th tab + badge, page, column and card components `[x]`

- **Type:** `client`
- **Description:** Route (`rfrView: 'my-work'`); band: `activeTab` union, `myWorkPath()`, `myWorkCount` input, 4th tab markup with badge, Drafts-slot comment extended (`MWB-DD-12`); `MyWorkBoardComponent` (host `pr-viewport-page` + mixin, band, `<app-pr-tab-intro>` §6.5, toolbar: scope segmented control + **phase `app-pr-filter-select`** with URL bridge `replaceUrl`+merge, skeleton / error / whole-board empty / groups; writes `MyWorkCountService` after Mine loads); `MyWorkColumnComponent` (header, count, ready hint, scrollable list, per-column empty, rail mode `aria-expanded`); `MyWorkCardComponent` (variants editing / ready / unknown / waiting-closed; status chip = `statusName`; native `<button>`/`<a>`; Continue → `['/result','result-detail', code, route]` + `{ phase: versionId }`). Tokens per §6.3. Check every `rfrView` switch treats `'my-work'` like `'results'`. Band on the other tabs calls `MyWorkCountService.ensure(code, phaseLabel)`.
- **Implements:**
  - `MWB-R-1` — *Open the tab with phase context*: URL keeps `phase`, band stays, tab underlined; **BUT NOT** drop `phase`; **AND IT MUST** hide the badge at 0; badge on the other three tabs from the count service.
  - `MWB-R-2` — *Collapsed closed group* (render): rails with counts, click expands; **BUT NOT** persist; **AND IT MUST** keep the five columns in place; *Other* rail only when non-empty; chip shows `statusName`.
  - `MWB-R-3` — *Switch phase* (UI): select default + URL mirror; **AND IT MUST** default to the current reporting phase when the URL has no `phase`.
  - `MWB-R-4` (render): `n of m sections`, bar, missing labels, `null` → *Open to check completeness*, ready variant; **BUT it must NOT compute completeness client-side from any per-result `green-checks/:id` call** (card receives `completeness` as data only; no service injected into the card); *Waiting and closed cards*: **BUT NOT** a primary gradient button outside Editing.
  - `MWB-R-6` — *Continue lands on the first gap*: navigate args with string code; **BUT NOT** any `draggable`/drop target (`MWB-DD-6`); **AND IT MUST** keep actions keyboard reachable with a visible focus ring.
  - `MWB-R-7` — *Whole-board empty*: only when `!loading && visibleRows.length === 0`; **Go to Reporting** preserves `phase`; **AND IT MUST** show columns as soon as All returns rows in the phase.
  - `MWB-R-9` (structure half): `#workArea` single scroller, board `overflow-x-auto`, lists `overflow-y-auto` (`MWB-DD-9`) — measured in T-5.
  - `MWB-R-10`, `MWB-R-11`, `MWB-AC-1`, `MWB-AC-2`, `MWB-AC-6` (args), `MWB-AC-7` (render), NFR *Accessibility*, *Styling*, *Copy*.
- **Does not implement:** rendered-layout measurements (`MWB-AC-9`) — T-5; real-browser visual fidelity and real deep link — T-6.
- **Design:** `MWB-DD-6`…`DD-12`, §6.1–6.6, mockup artboards
- **Files (expected):** `shared/routing/routing-data.ts`, `reporting-program-band.component.{ts,html}` (+ `.spec.ts`), `my-work-board/my-work-board.component.{ts,html,scss}` (+ `.spec.ts`), `my-work-board/components/my-work-column/*`, `my-work-board/components/my-work-card/*` (+ specs), any `rfrView` switch files, band host pages that pass `myWorkCount`
- **Depends on:** `MWB-T-2`, `MWB-T-3` · **Blocks:** `MWB-T-5`, `MWB-T-6`
- **Estimate:** L (~400 LOC incl. specs)
- **Skills:** `angular-developer` · `spartan` (Spartan MCP for any Helm control) · `ui-ux-pro-max` · `frontend-design`
- **Tests:** band spec: 4 tabs, `myWorkPath()`, badge text / hidden at 0, `queryParamsHandling` preserve. Page spec (services mocked): skeleton while loading; error + Retry; empty only when `!loading && rows.length === 0`; five columns in order; *Other* rail absent/present; rails collapsed by default, expand on click; phase select default and `router.navigate` with `replaceUrl: true`, merge; `Continue` → `router.navigate(['/result','result-detail','4712','geographic-location'], { queryParams: { phase: 36 } })`; `querySelectorAll('[draggable]').length === 0`; no primary-class button inside non-Editing columns; card has no injected API service.
- **Verification:**
  ```bash
  cd onecgiar-pr-client && npx jest src/app/pages/result-framework-reporting/pages/my-work-board src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-program-band --silent --reporters=summary --no-coverage && npx tsc --noEmit -p tsconfig.app.json && npx ng lint --quiet
  ```
  - **Pass:** green; existing band + dashboard-lab scope specs updated for the new union member, not deleted.
  - **FAIL input:** `routerLink` without `queryParamsHandling` → preserve test fails; empty-state condition missing `!loading` → in-flight test fails; card as `<div (click)>` → keyboard/role assertion fails; numeric code in navigate → args test fails.
  - **Disqualifier:** asserting a Tailwind class is present proves nothing about scrolling or clipping — those claims belong to T-5/T-6.
- **Definition of done:**
  - [ ] Scoped Jest, `tsc` and lint green
  - [ ] Commit `✨ feat(my-work-board) [SPEC:changes/my-work-board]: My work tab, board page, column and card components`

### `MWB-T-5` — Cypress CT: viewport lock, overflow, no-DnD, axe `[x]`

- **Type:** `tests`
- **Description:** Component test mounting `MyWorkBoardComponent` with mocked services (12 Editing rows + others) at 1280×720 and 1440×900 (`CT_DEV_SERVER_PORT=8090 npx cypress run --component --spec …`; `project-cypress-ct-harness-quirks`).
- **Implements:**
  - `MWB-R-9` — *1280px laptop*: Editing column `scrollHeight > clientHeight`, last card reachable by scrolling it; **BUT NOT** `documentElement.scrollWidth > innerWidth`; **AND IT MUST** keep band and toolbar in view after scrolling a column.
  - `MWB-R-6` (negative): zero `[draggable]` elements.
  - NFR *Accessibility*: `axe` no serious/critical violations; columns are named regions.
  - `MWB-AC-9`
- **Design:** `MWB-DD-6`, `MWB-DD-9`, §10 `MWB-TEST-6`
- **Files (expected):** `my-work-board/my-work-board.cy.ts`
- **Depends on:** `MWB-T-4` · **Blocks:** —
- **Estimate:** S (~80 LOC)
- **Skills:** `angular-developer` (Cypress CT patterns from `cypress/support/ct-utils.ts`)
- **Verification:**
  ```bash
  cd onecgiar-pr-client && CT_DEV_SERVER_PORT=8090 npx cypress run --component --spec src/app/pages/result-framework-reporting/pages/my-work-board/my-work-board.cy.ts
  ```
  - **Pass:** green at both viewports; the two known harness errors are noise.
  - **FAIL input:** remove `overflow-y-auto` from the list → scroll assertion fails; remove `min-h-0` → host grows and the width/height assertions fail; add `draggable="true"` → count fails.
  - **Disqualifier:** measurements outside a retrying assertion are not evidence; a fixture that does not overflow the column proves nothing about scrolling.
- **Definition of done:**
  - [ ] CT green at 1280×720 and 1440×900
  - [ ] Commit `✅ test(my-work-board) [SPEC:changes/my-work-board]: viewport, overflow and no-drag component tests`

### `MWB-T-6` — Real-browser evidence, timing, docs sync `[x]`

- **Type:** `docs` (+ HITL evidence)
- **Description:** Local client against the local server with T-1 (if the local stack is not available, use the QA API and state that completeness is `null` everywhere → *Open to check*). Orca embedded browser (`orca-cli`; viewport set **after** `goto`; root zoom ×1.2 → request 1067 for an effective 1280 and 1200 for 1440): open `entity-details/SP01/my-work?phase=…`, screenshots at both widths, compare with `mockup/Main.dc.html` (T6 visual review naming the tab/badge, status pills and card chip/bar), click Continue on one Editing card and confirm the detail opens on the first missing section. If the local server runs: time the flagged vs default request 3× each and report the spread. Write `execution.md` evidence and `pending-archive.md` (TRD `W1` ids, `design.md` §5 rule 2 clarification, §4/§5 inventory, TRD §4 flag row) — never edit those baseline docs on the spec branch.
- **Implements:** the *Visual drift*, *Deep-link target* and *Added server latency* blind spots (`requirements.md` §9); `MWB-AC-1`, `MWB-AC-6` (real navigation), `MWB-AC-9` (real page); `MWB-R-10` copy.
- **Design:** §8, §13
- **Files (expected):** `docs/specs/changes/my-work-board/execution.md`, `docs/specs/changes/my-work-board/pending-archive.md`
- **Depends on:** `MWB-T-4` (+ `MWB-T-1` for live completeness) · **Blocks:** —
- **Estimate:** S (~30 LOC docs)
- **Skills:** `orca-cli`
- **Verification:** screenshots by path; `orca eval` double-read of `documentElement.scrollWidth <= innerWidth` and the Editing column `scrollHeight > clientHeight`; URL after Continue matches `/result/result-detail/<code>/<section>?phase=`; timing table or "not measured (no local server)" stated explicitly.
  - **FAIL input:** Orca tab left on another URL → restore first; wrong effective width → record both numbers.
  - **Disqualifier:** a visual pass that does not name the three token groups is a look, not a review; a timing with spread wider than the difference is inconclusive and must be reported as such.
- **Definition of done:**
  - [ ] Evidence in `execution.md`; Orca tab restored
  - [ ] Pending doc syncs listed
  - [ ] Commit `📝 docs(specs) [SPEC:changes/my-work-board]: real-browser evidence and pending doc syncs`

## 4. Dependency graph

```
MWB-T-1 (server flag) ──────────────────────────────┐
                                                    ├── MWB-T-6 (real-browser + docs)
MWB-T-2 (SP-id service, mapper, section map, VM)    │
   └── MWB-T-3 (board service + count service)      │
         └── MWB-T-4 (route, band tab, page, column, card) ──┤
               └── MWB-T-5 (Cypress CT) ────────────┘
```

Parallel-safe: `MWB-T-1` ∥ `MWB-T-2`. T-5 ∥ T-6 after T-4.

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `MWB-TEST-1` | unit (server) | `MWB-R-8`, `MWB-AC-8`, `MWB-R-4` (fold) | `completeness.spec.ts`, `results.service.spec.ts` |
| `MWB-TEST-2` | unit (client) | `MWB-R-2`, `R-5`, `R-3` pure, `R-1` badge, `R-11`, `MWB-AC-5` | `my-work.view-model.spec.ts` |
| `MWB-TEST-3` | unit (client) | `MWB-R-4` map, `R-6` route, `DD-3`, `MWB-AC-4`, `AC-6` | `my-work-section-map.spec.ts`, `programme-results.service.spec.ts`, `science-program-id.service.spec.ts` |
| `MWB-TEST-4` | unit (client) | `MWB-R-3`, `R-7` state, `R-1` source, `MWB-AC-3`, `AC-7` | `my-work-board/services/*.spec.ts`, `results-api.service.spec.ts` |
| `MWB-TEST-5` | unit (client) | `MWB-R-1`, `R-2` render, `R-3` UI, `R-4` render, `R-6` nav, `R-7`, `R-10`, `MWB-AC-1`, `AC-2`, `AC-7` | band + page + column + card specs |
| `MWB-TEST-6` | Cypress CT | `MWB-R-9`, `R-6` negative, a11y, `MWB-AC-9` | `my-work-board.cy.ts` |
| HITL | real browser | visual fidelity, real deep link, timing | `execution.md` (T-6) |

Coverage stays above server 5/20/35/40 and client 50/60/60/60; targeted suites only.

## 6. Rollout & verification

- **PR strategy (~1,350 LOC):** two PRs against `staging`. **PR 1 — server** (`MWB-T-1`): review the default-path contract test first; out of scope: client. **PR 2 — client** (`MWB-T-2`…`T-6`): review the view-model spec first, then the band diff, then the page; links PR 1 as the data prerequisite (client degrades to *Open to check* without it).
- [ ] CI green (lint, tests, build, `migration:check:ci`, SonarCloud)
- [ ] Manual QA on staging: `MWB-AC-1`, `AC-3`, `AC-6` with a user who has Editing results
- [ ] No bilateral / platform-report change → no downstream notice

## 7. Cleanup & follow-ups

- [ ] Spec status → `shipped` at archive; kaizen entry (judgment `L-1`…`L-8` are the signal rows)
- [ ] Apply `pending-archive.md` on the default branch
- [ ] Follow-ups from `design.md` §13

## 8. Roll-back plan

1. Revert PR 2 (client): route, tab and page disappear; no data impact.
2. Revert PR 1 (server) independently: the flag is ignored; client shows *Open to check completeness* on every Editing card.
3. No migration, no feature flag.

## Required cross-references

`./requirements.md` · `./design.md` · `./proposal.md` · `./judgment.md` · `docs/prd.md` · `docs/ux-ui/design.md` · `docs/trd/trd.md` · archived `changes/sp-shell-app-viewport` (viewport contract) · `changes/sp-tab-explainer-panels` (`<app-pr-tab-intro>`).

---

### `MWB-T-7` — Motion polish: card hover / press feedback, rail collapse, state transitions `[x]`

- **Type:** `client` · **Added 2026-09-05 by user request** ("revisa también las animaciones que se vea cuando estoy en una card, cuando presiono click … que se vean fluidas las transiciones") — approved scope addition, not an advisory.
- **Description:** Add fluid, token-aligned motion to the board without changing layout, copy or behaviour: (1) card hover elevation + border tint and a subtle lift (`transition-[transform,box-shadow,border-color] duration-150 ease-out`), press feedback on **Continue** / **Review and submit** / **Open** (`active:` scale/translate, `hover:` brightness or shadow), visible `focus-visible` ring on every action; (2) completeness bar width animates (`transition-[width] duration-300 ease-out`); (3) Closed-group rails expand/collapse with a width + opacity transition and the expanded column's content fades in (reuse the app's `prmsFade` keyframe / `collapse.scss` pattern where it fits); (4) scope / phase re-group and skeleton → content use one short fade (~160 ms) so cards do not pop; (5) every transition honours `prefers-reduced-motion` (global rule in `styles.scss` ~:779; add `motion-reduce:` variants where the global rule does not cover a property). Tailwind-first; SCSS only for keyframes not already global.
- **Implements:** user request (above); NFR *Accessibility* (reduced motion, focus visibility); `MWB-R-6` unchanged (no new controls, no DnD); `MWB-R-9` unchanged (no layout change).
- **Design:** `design.md` §6.3 tokens (colours only from `--pr-*`), `MWB-DD-6`, `MWB-DD-9`; `docs/ux-ui/design.md` §7 (`DD-12` Tailwind-first).
- **Files (expected):** `my-work-board/components/my-work-card/my-work-card.component.{html,scss}`, `my-work-board/components/my-work-column/my-work-column.component.{html,scss}`, `my-work-board/my-work-board.component.{html,scss}`; specs only if a class assertion needs updating.
- **Depends on:** `MWB-T-4` · **Blocks:** —
- **Estimate:** S (~120 LOC)
- **Skills:** `angular-developer` · `frontend-design`
- **Tests:** existing Jest suites stay green; CT spec stays green (layout invariants unchanged); one Jest case per component asserting the `motion-reduce:` / reduced-motion handling is present is acceptable as presence-only **only** alongside the CT layout gate.
- **Verification:**
  ```bash
  cd onecgiar-pr-client && npx jest src/app/pages/result-framework-reporting/pages/my-work-board --silent --reporters=summary --no-coverage && npx ng lint --quiet && CT_DEV_SERVER_PORT=8090 npx cypress run --component --spec src/app/pages/result-framework-reporting/pages/my-work-board/my-work-board.cy.ts
  ```
  - **Pass:** all green; no change to scroll/overflow/no-DnD assertions.
  - **FAIL input:** a `transform` on the column list wrapper or a `will-change`/`contain` on an ancestor that breaks the viewport lock → CT `position: absolute` / overflow assertions fail; a transition on `height` of the list → scroll assertion may flake.
  - **Disqualifier:** "it looks smooth" is not evidence; the real-browser look (HITL by the user) is the only gate for fluidity, and this task only guarantees the mechanics (durations, easing, reduced-motion) plus unchanged layout invariants.
- **Definition of done:**
  - [ ] Jest + lint + CT green
  - [ ] No hardcoded hex; durations ≤ 300 ms; `prefers-reduced-motion` respected
  - [ ] Commit `🎨 style(my-work-board) [SPEC:changes/my-work-board]: fluid hover, press and collapse transitions`

### `MWB-T-8` — Layout corrections from the user's real-page review `[x]`

- **Type:** `client` · **Added 2026-09-05 by user request** (screenshots): (a) "esto no debería ir aquí, aquí deberían ir los filtros" — the explainer panel occupies the row under the tabs where the Results tab shows its filter row; (b) "acá falta el botón de Where to report" — the band on My work hides the CTA; (c) the phase dropdown renders with the wrong look and its open panel lands far below the trigger (screenshot: violet chevron block, menu drawn under the Closed rails).
- **Description:** (1) Make the first row inside `#workArea` a **filter row identical in chrome to the Results tab's** (`flex flex-wrap items-center justify-between gap-[12px] border-b border-[var(--pr-border-divider)] bg-[var(--pr-surface-card)] px-[16px] sm:px-[32px] py-[10px]`, `role="search"`, `aria-label="My work filters"`) holding the scope segmented control (left) and the **Phase** select with the Results tab's `pgr-filter` label treatment (right); move `<app-pr-tab-intro>` **below** that row (collapsed by default) — the read-only hint line moves into the explainer description. (2) Band: `[canReport]="true"` and `(whereToReport)` → `router.navigate(['/result-framework-reporting','entity-details', code], { queryParams: { whereToReport: 'true', returnTab: 'my-work' } })`; verify `dashboard-lab.component.ts` handles `returnTab` for the new value (if it only knows `results`/`overview`, extend the mapping so the back-link returns to My work). (3) Phase select: reproduce the Results tab's rendering of `app-pr-filter-select` (wrapper classes, label, trigger height 34px) and fix the panel placement — the component's panel is inline-absolute (no CDK overlay), so the trigger's wrapper must be the positioning context (`relative`) and no ancestor between the row and `#workArea` may clip it; verify in the real browser (Orca) that the open panel sits directly under the trigger at 1280 and 1440. (4) **Section skeleton (user request 2026-09-05: "recuerda adicionar el skeleton para el cargue de la sección")**: replace the three flat pulsing blocks with a skeleton that mirrors the board — the filter row renders immediately (segments show `–`), then the three group labels, five column headers (dot + label + count pill placeholders), 2–3 card placeholders in Editing / 1–2 in Pending and Submitted (code line, two title lines, a 4px bar), and the two Closed rails as 44px placeholders; `animate-pulse`, `motion-reduce:animate-none`, `aria-busy="true"` + the existing `sr-only` "Loading your board" text; same widths as the real columns so the swap to content does not shift layout (measured on the live page: skeleton visible ~2–3 s from first paint).
- **Implements:** user review items (a)–(c) + skeleton request (4); `MWB-R-1` (band parity with Results incl. CTA), `MWB-R-3` (phase select usable), `MWB-R-10` (explainer still present); `MWB-R-9` unchanged.
- **Design:** `design.md` §6.2 page row, §6.5; Results tab as the exemplar (`programme-results.component.html` lines 20–60, `.scss` `.pgr-filter`).
- **Files (expected):** `my-work-board/my-work-board.component.{ts,html,scss,spec.ts}`; possibly `dashboard-lab.component.ts` (`returnTab`).
- **Depends on:** `MWB-T-7` (same templates — serialize) · **Blocks:** —
- **Estimate:** S/M (~180 LOC)
- **Skills:** `angular-developer` · `onecgiar-pr-client:spartan` · `frontend-design`
- **Tests:** page spec: filter row is the first child of `#workArea` and contains the segmented control + phase select; explainer rendered after it; skeleton renders five column-shaped placeholders with card placeholders while `loading()` is true and none once rows land; `whereToReport` output → `router.navigate` with `{ whereToReport: 'true', returnTab: 'my-work' }`; band receives `canReport=true`. Real-browser check (Leader, Orca): open the phase dropdown at 1280/1440 and read the panel's bounding rect relative to the trigger (`top` within trigger.bottom ± 8px).
- **Verification:**
  ```bash
  cd onecgiar-pr-client && npx jest src/app/pages/result-framework-reporting/pages/my-work-board src/app/pages/result-framework-reporting/pages/dashboard-lab/dashboard-lab.component.spec.ts --silent --reporters=summary --no-coverage && npx tsc --noEmit -p tsconfig.app.json && npx ng lint --quiet
  ```
  - **FAIL input:** explainer left above the filter row → first-child assertion fails; `canReport` left false → band spec/page spec fails; panel still mispositioned → the Leader's rect read fails (not a Jest gate — jsdom cannot position).
  - **Disqualifier:** a green Jest run says nothing about the dropdown placement; only the real-browser rect read does.
- **Definition of done:**
  - [ ] Jest + tsc + lint green; CT (`MWB-T-5`) re-run green (layout row changed)
  - [ ] Real-browser rect read recorded in `execution.md`
  - [ ] Commit `🔧 fix(my-work-board) [SPEC:changes/my-work-board]: filter row, where-to-report CTA and phase select placement`

### `MWB-T-9` — Filter row parity with Results: search, Filter popover, chips `[x]`

- **Type:** `client` · **Added 2026-09-05 by user request** ("adicionemos un buscador y más filtros aquí" + screenshot of the Results tab row: search box · **Filter** button with count badge · active-filter chips with ×).
- **Description:** Make the My work filter row the same surface as the Results tab, minus Columns / Export CSV (a board has neither): `[scope segmented control] · [search input "Search results…"] · [Filter button + badge] · [active chips + Clear all]`. The **Filter** popover holds **Phase** (moved out of the bare select — same as Results), **Category**, **Origin**, **Center**, **Created by** (Created by only meaningful under *All program results*; hide or disable it under *Mine*). **No Status dimension** — the columns already are the status. Search matches title and code (same rule as Results). All filtering is client-side over the loaded rows (`MWB-DD-11` model). Reuse `ProgrammeResultsFilterService` (page-provided; same `ProgrammeResultRow` type; `filterRows(rows, { ignoreStatus: true })`) and the Results tab's popover/chip markup rather than re-implementing; keep **one source of truth for phase** (the filter service's `selectedPhase` drives `MyWorkBoardService.setPhase` so badge, totals and default rule stay correct). URL bridge exactly like Results: same param names from `programme-results-query-params.ts` (`phase`, `category`, `origin`, `center`, `createdBy`; search stays in memory as on Results), `replaceUrl: true` + `queryParamsHandling: 'merge'`, hydrate on load.
- **Implements:** user request; `MWB-R-3` (phase select now inside the popover; scope unchanged); `MWB-R-9` unchanged (row height stays a single 34px control line — no stacked label); `MWB-R-1` parity with Results.
- **Design:** exemplar `programme-results.component.html` lines 40–130 (row, search input, Filter button, popover grid, chips) + `.ts` (`toggleFilterPopover`, `activeFilterCount`, `onPhaseChange`, hydrate/mirror effects ~965–1010) + `programme-results-filter.service.ts` + `programme-results-query-params.ts`; `design.md` §6.2.
- **Files (expected):** `my-work-board/my-work-board.component.{ts,html,scss,spec.ts}`; possibly `my-work-board/services/my-work-board.service.{ts,spec.ts}` (phase driven from the filter); no change to `programme-results/**` or shared components.
- **Depends on:** `MWB-T-8` · **Blocks:** —
- **Estimate:** M (~320 LOC incl. specs)
- **Skills:** `angular-developer` · `onecgiar-pr-client:spartan` · `tdd`
- **Tests:** page spec — search narrows cards by title and by code; Filter badge = number of active chips (phase counts when set explicitly, as on Results); selecting Category/Origin/Center/Created by narrows the columns and adds a chip; chip × and Clear all restore; phase change via the popover re-groups without a request (`httpMock.expectNone`) and keeps the badge/totals phase-aware; URL mirrors `?category=…` etc. with `replaceUrl`; landing on `?origin=W3/Bilateral` hydrates the chip; Created by hidden under Mine. CT re-run (row still one line high; lock intact).
- **Verification:**
  ```bash
  cd onecgiar-pr-client && npx jest src/app/pages/result-framework-reporting/pages/my-work-board --silent --reporters=summary --no-coverage && npx tsc --noEmit -p tsconfig.app.json && npx ng lint --quiet && CT_DEV_SERVER_PORT=8090 npx cypress run --component --spec src/app/pages/result-framework-reporting/pages/my-work-board/my-work-board.cy.ts
  ```
  - **FAIL input:** two phase sources (filter + board) → badge and columns disagree after a phase change (test: badge equals Editing count of the visible phase); popover positioned inside a clipping ancestor → real-browser check fails; Status offered → the columns and the filter fight.
  - **Disqualifier:** a filter test whose fixture has one row per dimension value cannot detect an AND-vs-OR defect — use ≥ 3 rows sharing values across dimensions.
- **Definition of done:**
  - [ ] Jest + tsc + lint + CT green
  - [ ] Real-browser check (Leader, Orca): popover opens under the button, chips render, search narrows live
  - [ ] Commit `✨ feat(my-work-board) [SPEC:changes/my-work-board]: search, Filter popover and chips on the board filter row`

### `MWB-T-10` — "Quality assessed" as a visible Done column `[x]`

- **Type:** `client` · **Added 2026-09-05 by user request** ("hay un estado que es importante y es cuando el resultado fue sometido y ya pasó por QA" — Quality Assessed, `status_id` 2; user confirmed the plan: "a ok ok entendí").
- **Description:** Rename the merged `approved` column to **Quality assessed** and move it out of the collapsed *Closed* group into an expanded **Done** group with the approved (green) status tokens; ids 2 (Quality Assessed) and 6 (Approved, bilateral API) still land there, each card showing its real `status_name` chip. *Closed* keeps **Discontinued** (4, 7 Rejected) and the conditional **Other** rail, collapsed by default. Final order: Editing · Pending review · Submitted · **Quality assessed** · [Discontinued] · [Other]. Badge unchanged (Editing count). Skeleton mirrors the new layout (four expanded column shells + one rail). Update the `MWB-R-2` table, `MWB-DD-1b`/`DD-7` wording and the mockup note in `execution.md`. **Plus two defects from the user's screenshot (2026-09-05, "cuando uno abre todo no tiene cómo comprimirlo nuevamente"):** (a) an expanded *Closed* column has no way back — add a collapse control in the expanded column header (icon button `chevron_left`, `aria-expanded="true"`, `aria-label="Collapse <label>"`) that returns the column to its rail; the rail keeps its expand button; (b) width distribution — when a rail expands, the expanded column must take **the same width as the other non-Editing columns**, never twice as much, and Pending review / Submitted must never shrink below a readable minimum: give every expanded non-Editing column `flex-1 min-w-[260px] basis-0` inside a board that scrolls horizontally when the sum exceeds the viewport (`MWB-R-9` already allows horizontal scroll inside the board container); the card's category chip and title must not break mid-word at that minimum.
- **Implements:** user request; amends `MWB-R-2` (column label + grouping) — `requirements.md` table updated by the Leader; `MWB-R-9` unchanged (four expanded columns must still fit: Editing `w-[360px]`, the other three share the flex space as a 3-column grid; horizontal scroll inside the board below its natural width).
- **Files (expected):** `my-work-board/my-work.view-model.ts` (+ spec: column defs/labels/groups), `my-work-board/my-work-board.component.{html,spec.ts}` (groups, skeleton), `components/my-work-column/*` only if a token depends on the column key; `my-work-board.cy.ts` (fixed-order assertion: 5 columns, 1 rail collapsed).
- **Depends on:** `MWB-T-9` · **Blocks:** —
- **Estimate:** M (~200 LOC)
- **Skills:** `angular-developer` · `tdd`
- **Tests:** view-model: column defs in the new order/groups; page spec: expanding Discontinued shows a collapse control that returns it to a rail (`aria-expanded` true → false), and all expanded non-Editing columns share the same computed flex basis; CT: with Discontinued expanded at 1280 no column is narrower than 260 px and the body has no horizontal overflow (the board container may); ids 2 and 6 → `qaed` (key rename or label only — keep the key stable if the CT/tests reference it) with labels; page spec: Quality assessed rendered expanded with cards, Discontinued rail collapsed, Other conditional; CT: 4 expanded + 1 rail, still no body horizontal overflow at 1280.
- **Verification:**
  ```bash
  cd onecgiar-pr-client && npx jest src/app/pages/result-framework-reporting/pages/my-work-board --silent --reporters=summary --no-coverage && npx tsc --noEmit -p tsconfig.app.json && npx ng lint --quiet && CT_DEV_SERVER_PORT=8090 npx cypress run --component --spec src/app/pages/result-framework-reporting/pages/my-work-board/my-work-board.cy.ts
  ```
  - **FAIL input:** four expanded columns overflow the body at 1280 → CT `scrollWidth` assertion fails; id 6 left in Closed → view-model test fails.
  - **Disqualifier:** a label-only rename that keeps the column in the collapsed group does not satisfy the request.
- **Definition of done:**
  - [ ] Jest + tsc + lint + CT green; real-browser look (Leader) at 1280 shows four columns + one rail without body scroll
  - [ ] Commit `✨ feat(my-work-board) [SPEC:changes/my-work-board]: Quality assessed as a visible Done column`

### `MWB-T-11` — Responsive board below the viewport-lock breakpoint `[x]`

- **Type:** `client` · **Added 2026-09-05 by user request** ("también debemos trabajar en el responsive").
- **Description:** Below `900px` (where the `pr-viewport-page` mixin is inert and the document scrolls — `SAV-DD-1`) the board becomes a **horizontal snap strip**: each column `w-[min(85vw,360px)] shrink-0 snap-start`, board `overflow-x-auto snap-x snap-mandatory` with `-webkit-overflow-scrolling: touch`, group labels rendered above their first column, rails rendered as normal columns (the collapsed state applies only ≥ 900px), each column's list no longer scrolls internally (page scroll instead, `max-h-none`). A **sticky column jumper** under the filter row (segmented chips `Editing 112 · Pending 22 · Submitted 8 · QAed 3 · Discontinued 2`, `role="tablist"` semantics, `aria-controls` → the column) scrolls the strip to that column (`scrollIntoView({ inline: 'start', behavior: 'smooth' })`, `motion-reduce` → `auto`). Filter row wraps: search full width, then scope control + Filter button + chips on the next line. Cards full width of their column; Continue / Open hit targets ≥ 44px. Between `900px` and `1439px` keep the locked layout with Editing `w-[320px]` and `min-w-[240px]` columns (floors revisited per the `MWB-T-10` pointer; 360/260 at ≥ 1440) and the board's own horizontal scroll. Skeleton follows the same breakpoints. `docs/ux-ui/design.md` `OG-3` (no mobile *editing* strategy) is respected: the board is read-only and Continue hands off to the result detail as today.
- **Implements:** user request; `MWB-R-9` extended below 900px (body scroll allowed there, horizontal scroll only inside the strip — `documentElement.scrollWidth <= innerWidth` still holds); NFR Accessibility (jumper semantics, hit targets).
- **Files (expected):** `my-work-board/my-work-board.component.{html,scss,ts,spec.ts}`, `components/my-work-column/*` (breakpoint classes), `components/my-work-card/*` (hit targets only if needed), `my-work-board.cy.ts` (+ one mobile viewport case).
- **Depends on:** `MWB-T-10` · **Blocks:** —
- **Estimate:** M (~260 LOC)
- **Skills:** `angular-developer` · `frontend-design` · `tdd`
- **Tests:** CT at **390×844** (phone) and **768×1024** (tablet): `documentElement.scrollWidth <= innerWidth`; the strip's `scrollWidth > clientWidth`; each column width ≤ 85vw; jumper click scrolls the strip so the target column's `left` is within 8px of the strip's `left`; Continue button height ≥ 44px; at 1280 nothing changes vs T-10. Page spec: jumper renders one chip per visible column with counts; rails rendered as columns below the breakpoint is a CSS concern → CT only.
- **Verification:**
  ```bash
  cd onecgiar-pr-client && npx jest src/app/pages/result-framework-reporting/pages/my-work-board --silent --reporters=summary --no-coverage && npx tsc --noEmit -p tsconfig.app.json && npx ng lint --quiet && CT_DEV_SERVER_PORT=8090 npx cypress run --component --spec src/app/pages/result-framework-reporting/pages/my-work-board/my-work-board.cy.ts
  ```
  - **FAIL input:** a column without `shrink-0` → columns compress instead of scrolling (width assertion fails); body overflow at 390 → `scrollWidth` assertion fails; hit target < 44px → height assertion fails.
  - **Disqualifier:** jsdom cannot measure any of this — only the CT at the phone/tablet viewports (and the Leader's real-browser look via Orca `set viewport`, effective width = requested × 1.2 → request 325 for 390) is evidence.
- **Definition of done:**
  - [ ] Jest + tsc + lint + CT (1280, 1440, 768, 390) green
  - [ ] Real-browser look at effective 390 and 768 recorded in `execution.md`
  - [ ] Commit `✨ feat(my-work-board) [SPEC:changes/my-work-board]: responsive snap strip and column jumper below 900px`

### `MWB-T-12` — Category, Funding source and Contributing Center filters as multi-selects `[x]`

- **Type:** `client` · **Added 2026-09-05 by user request** ("el filtro de category debería ser un multiselect" + "también el de funding source y el de contributing center").
- **Description:** In the board's Filter popover, **Category**, **Funding source** (origin) and **Contributing Center** become multi-selects using the app's existing `<app-pr-filter-multiselect>` (the control Results uses for Areas of Work), keeping the `Other` bucket (`__other__`) as one selectable value. Values within a dimension combine with **OR**, dimensions combine with **AND**. One chip per selected value (`Category: Knowledge product`, chip × removes only that one), Filter badge counts each chip, Clear all clears them. URL bridge: `category=a,b`, `origin=a,b`, `center=a,b` comma-separated (same shape as `?section=`), hydrate splits on comma, unknown values stay as chips that match nothing. **Do not change the shared `ProgrammeResultsFilterService` or `programme-results/**`** (single-select there, Results tab behaviour unchanged; another session is editing those files): implement the three multi dimensions locally in the board (`selectedCategories` / `selectedOrigins` / `selectedCenters` signals or one reusable multi-dimension helper), reuse the exported `matchesProgrammeResultCategory`/`PROGRAMME_RESULTS_OTHER_CATEGORY` and `buildCategoryFilterOptions` for the option list and the `Other` semantics, and keep the service's `selectedCategory` / `selectedOrigin` / `selectedCenter` at `null`. Badge and segment totals stay phase-only (unaffected).
- **Implements:** user request; `MWB-R-3` (filters client-side, one request), `MWB-R-9` unchanged (popover width/placement as T-9/T-11).
- **Files (expected):** `my-work-board/my-work-board.component.{ts,html,spec.ts}` (+ `my-work-board.cy.ts` only if a selector changed).
- **Depends on:** `MWB-T-9` · **Blocks:** —
- **Estimate:** M (~260 LOC)
- **Skills:** `angular-developer` · `onecgiar-pr-client:spartan` · `tdd`
- **Tests (page spec, fixture ≥ 3 rows sharing values; mirror every case for origin and center):** selecting two categories shows rows of either (OR) and adds two chips; combined with Origin narrows further (AND); chip × removes one category only; Clear all empties both; `__other__` + a real category together work; URL mirrors `category=Knowledge%20product,__other__` with `replaceUrl`; landing on `?category=a,b` hydrates two chips; badge/totals unchanged by category selection (existing case still green).
- **Verification:**
  ```bash
  cd onecgiar-pr-client && npx jest src/app/pages/result-framework-reporting/pages/my-work-board --silent --reporters=summary --no-coverage && npx tsc --noEmit -p tsconfig.app.json && npx ng lint --quiet && CT_DEV_SERVER_PORT=8090 npx cypress run --component --spec src/app/pages/result-framework-reporting/pages/my-work-board/my-work-board.cy.ts
  ```
  - **FAIL input:** AND instead of OR across categories → the two-category test shows only rows matching both (fails); `filter.selectedCategory` also set → double filtering hides rows.
  - **Disqualifier:** a fixture with one row per category cannot tell OR from AND.
- **Definition of done:**
  - [ ] Jest + tsc + lint + CT green; real-browser check (Leader) of the multiselect open in the popover at 1280
  - [ ] Commit `✨ feat(my-work-board) [SPEC:changes/my-work-board]: multi-select Category filter`

### `MWB-T-13` — Multi-select Category / Funding source / Center on the Results tab (shared service) `[~]` — part A done (`9b203829d`); part B phase 1 (shared multiselect fix, docs) landing; **phase 2 (board consumes the shared service, local layer deleted) deferred by the user on 2026-09-05** — functionally equivalent today, a refactor for a later cycle

- **Type:** `client` · **Added 2026-09-05 by user request** ("esto también pasa en los filtros del tab de results, podrías revisarlo de una vez").
- **Description:** Promote the three dimensions to multi-value in the shared `ProgrammeResultsFilterService` (`selectedCategories`, `selectedOrigins`, `selectedCenters: string[]`, OR within / AND across, chips per value, `clearChip` per value, `clearAll`), wire the Results tab popover to `<app-pr-filter-multiselect>` for the three (same as its Areas of Work control), URL bridge `category=a,b` / `origin=a,b` / `center=a,b` (hydrate splits on `,`; legacy single values keep working), keep `Other` (`__other__`) as a selectable value; then **switch the board (`MWB-T-12`) to consume the service's multi dimensions and delete its board-local layer** so both tabs share one implementation. Overview → Results deep links that pass a single `category`/`origin`/`center` must still land correctly (sibling spec `sp-overview-echarts/results-tab-filter-deeplink`, `RFD-*`).
- **Implements:** user request (parity Results ↔ My results); `CBF-R-*`/`RFD-*` behaviours preserved (regression: existing `programme-results*.spec.ts` suites stay green with adapted expectations).
- **Files (expected):** `programme-results/services/programme-results-filter.service.{ts,spec.ts}`, `programme-results/programme-results.component.{ts,html,spec.ts}`, `programme-results/services/programme-results-query-params.ts` (doc comment), `my-work-board/my-work-board.component.{ts,html,spec.ts}` (consume the service, drop the local layer).
- **Depends on:** `MWB-T-12` **and** the other session committing its `programme-results/**` + `pr-filter-select/*` edits (shared-worktree rule) · **Blocks:** —
- **Estimate:** M/L (~350 LOC)
- **Skills:** `angular-developer` · `onecgiar-pr-client:spartan` · `tdd`
- **Tests:** filter-service spec: OR within / AND across for the three; chips per value; `clearChip(value)`; `clearAll`; single legacy URL value hydrates as a one-element array. Results component spec: multiselect mounted for the three; URL join/split; existing Created by / Center / Phase cases adapted. Board spec: same behaviour as T-12 through the service; local layer gone. Cypress e2e not required (no token); CT for the board stays green.
- **Verification:**
  ```bash
  cd onecgiar-pr-client && npx jest src/app/pages/result-framework-reporting/pages/programme-results src/app/pages/result-framework-reporting/pages/my-work-board --silent --reporters=summary --no-coverage && npx tsc --noEmit -p tsconfig.app.json && npx ng lint --quiet && CT_DEV_SERVER_PORT=8090 npx cypress run --component --spec src/app/pages/result-framework-reporting/pages/my-work-board/my-work-board.cy.ts
  ```
  - **FAIL input:** a legacy `?category=Knowledge%20product` deep link from Overview stops filtering → hydrate test fails; AND within a dimension → OR test fails.
  - **Disqualifier:** green Results suites after deleting their Category/Center cases instead of adapting them.
- **Definition of done:**
  - [ ] Jest + tsc + lint + CT green; real-browser check on both tabs (Leader)
  - [ ] Commit `✨ feat(programme-results) [SPEC:changes/my-work-board]: multi-select Category, Funding source and Center filters shared by Results and My results`

### `MWB-T-14` — Filter chips overflow and multiselect closing on every selection `[x]`

- **Type:** `client` · **Added 2026-09-05 by user request** (two screenshots: chips row grown to three lines with 15 active values; the Center multiselect closes after each tick — "si quiero seleccionar varias cosas se cierra, revisa bien el UX UI de esto").
- **Description:** (1) **Chip aggregation**: when a multi dimension has **3 or more** selected values, render ONE summary chip for that dimension (`Center: 8 centers ×`, `Category: 3 categories ×`; × clears the whole dimension; clicking the chip label opens the Filter popover with that control focused); with 1–2 values keep individual chips. The Filter badge keeps counting individual values. Target: the chips row stays on one line in the common case; if it still wraps, allow at most two lines and put the remaining chips behind a `+N more` chip that expands inline (volatile). Keep `Clear filters`. (2) **Multiselect stays open while ticking**: diagnose in the real browser why `app-pr-filter-multiselect` closes on each selection inside the board popover — candidates: the popover's document-click handler treating the option click as outside, the option list `computed` (`withSelectedOptions`) returning a new array on every tick so the control remounts/re-inits, or the control's own close-on-select — compare with the Results tab's Areas of Work multiselect (which stays open). Fix on the board side (stable option arrays via memoisation by value, `@if` structure that does not remount the control, popover outside-click guard that treats the control's panel as inside); do NOT modify the shared `pr-filter-multiselect` (another session is editing shared filter components) unless the defect is provably in the control and you STOP and report it. (3) Popover: keep the popover open while interacting with any control inside it; Escape closes; clicking outside closes.
- **Implements:** user request; `MWB-R-9` unchanged (no body overflow; chips row bounded); NFR Accessibility (summary chip is a `<button>` with `aria-label` naming the dimension and count; × has its own label).
- **Files (expected):** `my-work-board/my-work-board.component.{ts,html,scss,spec.ts}`, `services/my-work-board.service.ts` if the aggregation needs a helper; `my-work-board.cy.ts` (one case: 8 centers + 3 categories selected → chips row height ≤ 2 lines, no body overflow; tick two options in the Center multiselect → panel still open after the first tick).
- **Depends on:** `MWB-T-12` · **Blocks:** —
- **Estimate:** M (~220 LOC)
- **Skills:** `angular-developer` · `onecgiar-pr-client:spartan` · `tdd` · `frontend-design`
- **Tests:** page spec — 3 centers → one `Center: 3 centers` chip whose × empties `selectedCenters`; 2 centers → two chips; badge = individual count (e.g. 3 + 1 phase = 4); `+N more` appears only when the row would exceed two lines (jsdom cannot measure → CT); clicking the summary chip opens the popover; multiselect panel open state survives a selection (CT: tick → `aria-expanded`/panel present → tick again → still present).
- **Verification:**
  ```bash
  cd onecgiar-pr-client && npx jest src/app/pages/result-framework-reporting/pages/my-work-board --silent --reporters=summary --no-coverage && npx tsc --noEmit -p tsconfig.app.json && npx ng lint --quiet && CT_DEV_SERVER_PORT=8090 npx cypress run --component --spec src/app/pages/result-framework-reporting/pages/my-work-board/my-work-board.cy.ts
  ```
  - **FAIL input:** aggregation threshold applied to the badge too (badge drops to per-dimension count) → badge test fails; a `computed` returning a fresh array each tick → CT "panel still open" fails.
  - **Disqualifier:** "it stays open in jsdom" is not evidence — only the CT click sequence and the real-browser check are.
- **Definition of done:**
  - [ ] Jest + tsc + lint + CT green; real-browser check (Leader): 8 centers + 3 categories → one or two lines of chips; ticking three options without the panel closing
  - [ ] Commit `🔧 fix(my-work-board) [SPEC:changes/my-work-board]: aggregate filter chips per dimension and keep the multiselect open while ticking`
