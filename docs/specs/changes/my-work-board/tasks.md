# Tasks — "My work" board (4th Science Program tab)

## 1. Scope of this task list

- **Module / feature:** `result-framework-reporting/my-work-board` (client) + `results` list flag (server)
- **Linked spec:** `./requirements.md` (`MWB-R-1`…`R-11`, `MWB-AC-1`…`AC-9`) · `./design.md` (`MWB-DD-1`…`DD-13`, §5 maps, §6.3 tokens, §6.6 phase) · `./judgment.md` (round 1 applied)
- **Owner / driver:** session Leader (`/akili-execute`)
- **Status:** `approved` (Phase 3 auto-approved, pre-approved mode, 2026-09-04; rewritten after Judgment Day round 1)
- **Depth:** Standard · **Budget:** 6 tasks / ~1,350 LOC / ≤ 1 Reviewer round per task (`design.md` §1)
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

### `MWB-T-4` — Client UI: route, 4th tab + badge, page, column and card components `[ ]`

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

### `MWB-T-5` — Cypress CT: viewport lock, overflow, no-DnD, axe `[ ]`

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

### `MWB-T-6` — Real-browser evidence, timing, docs sync `[ ]`

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
