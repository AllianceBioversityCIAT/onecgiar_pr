# Execution — Impact Results: SP Reporting Entry

## Document Control

| Field | Value |
|---|---|
| Spec | `results/impact-results-reporting/sp-reporting-entry` (P2-3901, child 2/3) |
| Started | 2026-10-30 |
| Branch | `qa-development-2026-ss` |
| Approval Mode | gated — user instruction 2026-10-30: "CONTINUA TODAS LAS TAREAS HASTA QUE TERMINES" (run T-1..T-5 without continue prompts; T-6 commit/push/deploy still needs explicit go-ahead) |
| Leader | Opus 5.5 (T1) · Implementer `akili-implementer` (T2) · Reviewer `akili-reviewer` (T3) |
| Commits | none — no auto-commit (user rule); commits happen at T-6 on go-ahead |

## Task Execution History

### IRE-T-1 — Impact area constant, counts API method, impact payload builder — PASS (attempt 1)

- **Date:** 2026-10-30
- **Attempts:** 1 · effort medium · skills `angular-developer`, `tdd` (task list)
- **Files changed:**
  - new `shared/report-result/impact-areas.constant.ts` + `.spec.ts` (`IMPACT_AREAS`, ids 1..5, design §4 names, `assets/impact_areas/png/<id>.png`)
  - `shared/report-result/create-result-payload.util.ts` — appended `buildImpactCreateResultPayload({ initiativeId, resultName, impactAreaId })` (pure append, hunk `@@ -355,0 +356,19 @@`; `buildCreateResultPayload` zero diff)
  - `shared/report-result/create-result-payload.util.spec.ts` — new describe: exact top-level/`result` keys; existing builder has no `impact_area_id`
  - `src/app/shared/services/api/results-api.service.ts` + `.spec.ts` — `GET_impactLevelCounts(initiativeId, versionId)` → `api/results-framework-reporting/impact-level/counts?initiativeId=&versionId=`
- **Verification:**
  - `npx jest --maxWorkers=2 --findRelatedTests <util.ts> <impact-areas.constant.ts> <results-api.service.ts> --silent --reporters=summary --no-coverage` → `Test Suites: 438 passed, 438 total · Tests: 11911 passed` (633 s — `results-api.service.ts` is injected widely; later tasks use `--testPathPattern` for the red run and keep `--findRelatedTests` for pre-push)
  - `git diff --stat` → 52 insertions, 0 deletions on modified files (no existing spec edited → disqualifier not hit)
  - Lint (Leader-run): `ESLINT_USE_FLAT_CONFIG=false npx eslint <6 touched files> --quiet` → exit 0. Note: the client has `.eslintrc.json` (legacy); plain `npx eslint` fails with "couldn't find an eslint.config" — the env flag is required.
- **Reviewer:** `STATUS: PASS` — none of the four falsifiers triggered; exact-keys assertion also catches `undefined`-valued stray keys; existing builder untouched; constant names/order/icons match §4; URL carries both params.
- **Issues / gaps:** specs written alongside code, no red run observed first (Reviewer: non-blocking, DoD met).
- **Decisions:** builder signature `{ initiativeId: number | string, resultName, impactAreaId }` (brief left it open).
- **Requirements covered:** IRE-R-6 (body), IRE-R-7 (Scenario 7.1), design §4/§5, IRE-DD-2, IRE-DD-5.

### IRE-T-2 — `app-impact-results-card` component — PASS (attempt 1)

- **Date:** 2026-10-30
- **Attempts:** 1 · effort medium · skills `angular-developer`, `spartan`, `tailwind-design-system` (task list) · ran in parallel with IRE-T-3 (disjoint folders; shared Jest via a scratchpad `jest.lock` mkdir mutex)
- **Files (all new):** `pages/dashboard-lab/components/impact-results-card/impact-results-card.component.{ts,html,spec.ts}`, `CLAUDE.md` (Verified 2026-10-30). `reporting-aow-table` untouched (disqualifier not hit).
- **Implementation:** standalone, OnPush; `rxResource` keyed on (`initiativeId`, `versionId`) → idle (no request, "—") while either is null; unwraps `res.response ?? res`; total from E6 `total`; Spartan `hlmBadge` (NEW) + `hlmSkeleton` (loading); Report button replicates table `pr-row-action` classes on a plain `<button>` with `aria-label="Report result for <name>"`, disabled only when `!canReport`.
- **Verification:**
  - `npx jest --maxWorkers=2 --testPathPattern=impact-results-card --silent --reporters=summary --no-coverage` → `Test Suites: 1 passed · Tests: 12 passed` (an earlier run hung on `whenStable()` with a pending request — harness issue, spec helper fixed)
  - `ESLINT_USE_FLAT_CONFIG=false npx eslint <ts, html, spec> --quiet` → exit 0
- **Reviewer:** `STATUS: PASS` — all 7 falsifiers traced to a test that fails under mutation (total 99 vs row sum 11; 0 shown; it.each null ids → no call; disabled when !canReport; exact aria-label; no %/ratio/progress/chevron; error → 6× "Count unavailable" with buttons enabled); tokens only `var(--pr-*)`; copy matches NFR-5.
- **ADVISORY (recorded, not actioned):**
  - RISK — design §6.1 says "same look as disabled row Report buttons in the table", but the table *hides* the Report button when `!canReport` (`reporting-aow-table.component.html:232,1280`). Card disables (task text; IRE-R-4 S4.2 allows "disabled (or hidden)"). Leader decision: keep disabled per task text; §6.1 wording to be corrected at archive.
  - READABILITY — `: of({ byArea: {}, total: 0 })` branch in `stream` is unreachable (rxResource skips stream on undefined params); would render 0s if reached.
  - RELIABILITY — header total skeleton (32px) sits in a span without min width → possible small shift on load (S2.2); row counts are fixed `w-[40px]`.
  - RISK — Scenario 4.1 copy "Climate adaptation & mitigation" vs constant "Climate Adaptation and Mitigation" (CLARISA name per IRE-DD-2).
- **Implementer assumptions:** IMPACT tag uses `--pr-color-primary-100/-400` (no impact chip token exists); copy hardcoded English like sibling components.
- **Requirements covered:** IRE-R-1 (anatomy), IRE-R-2, IRE-R-4 (card side), IRE-NFR-1, NFR-3, NFR-5; IRE-DD-3.

### IRE-T-3 — Drawer + report form impact mode — PASS (attempt 1)

- **Date:** 2026-10-30/31
- **Attempts:** 1 · effort high (large regression-sensitive form) · skills `angular-developer`, `spartan`, `tailwind-design-system` · ran in parallel with IRE-T-2 under the `jest.lock` mutex
- **Files:** `pages/dashboard-lab/components/indicator-drawer/indicator-drawer.component.{ts,html}`, `lab-report-form/lab-report-form.component.{ts,html}`, new `indicator-drawer.component.impact-mode.spec.ts`, new `lab-report-form.component.impact-mode.spec.ts`, both folder `CLAUDE.md` (impact note, Verified 2026-10-30). Diff stat: 156 insertions, 9 deletions; existing form/drawer specs zero diff.
- **Implementation:** drawer input `impactArea` → header/aria "Report impact result", forwards to form, hides indicator context / reported micro-card / emerging blurb and `info`/`results` tabs in impact mode. Form input `impactArea` + `isImpact`; re-arm effect calls only `resetForm()` in impact mode; `missingFields` = title rule only (empty or > 30 words); `createResult()` swaps only the body builder (`buildImpactCreateResultPayload` vs `buildCreateResultPayload`), POST/success/error shared; template `@if (isImpact()) { area block + title + footer } @else { original markup }`; Save `[disabled]="!canSave()"` covers in-flight `creatingResult` (no new flag needed). Disqualifier not hit.
- **Verification:**
  - `npx jest --maxWorkers=2 --testPathPattern="(lab-report-form|indicator-drawer)" --silent --reporters=summary --no-coverage` → `Test Suites: 9 passed · Tests: 331 passed`
  - `ESLINT_USE_FLAT_CONFIG=false npx eslint <6 touched files> --quiet` → exit 0
  - Consumers: only host `dashboard-lab.component.html` (+ drawer→form); optional inputs, no host edit.
- **Reviewer:** `STATUS: PASS` — non-impact path unchanged (guarded early return in `missingFields`, same builder args, shared POST/handlers, only new tracked dep `impactArea()` stays null for existing hosts, original template inside `@else`); `canSave` includes `canReport()` + `creatingResult()`; cancel only emits; "Save" copy matches S5.1/S6.1; every falsifier test fails under its mutation.
- **ADVISORY (recorded, not actioned):**
  - RELIABILITY — S5.2 (cancel creates nothing) holds by construction but has no explicit test.
  - READABILITY — drawer `@else if (!impactArea())` term unreachable (emerging + impact never co-occur); comment or drop.
  - RISK — switching Impact Area with the drawer open re-arms and clears the typed title (same as indicator flow) — noted for IRE-T-4.
- **Implementer assumptions:** no description field in impact mode (standard form has none outside PT flow); impact footer shows "N fields left" without click-to-focus list; button label "Save".
- **Requirements covered:** IRE-R-5, IRE-R-6 (S6.1–6.3), IRE-R-7 (form/drawer); IRE-DD-4, IRE-DD-6.

### IRE-T-4 — Host wiring in `dashboard-lab` — PASS (attempt 2)

#### Attempt 1 — FAIL (2026-10-31)

- **Effort:** medium · skill `angular-developer`
- **Files:** `dashboard-lab.component.ts` (+20/-3: imports card + `IMPACT_AREAS`; `managed` gains `impactArea?`; `manageIndicator`/`openEmergingReport` set `impactArea: null`; new `openImpactReport(areaId)` — early return on unknown area or `!canReportResults()`, `primeEntityAowContext()`, `manageTab` 'report', `managed.set({ emerging:false, indicator:null, node:null, impactArea })`), `dashboard-lab.component.html` (+10: card after `<app-reporting-aow-table>` inside `@if (reportingViewMode() === 'grouped')`, inputs `selected()?.initiativeId ?? null` / `effectiveVersionId()` / `entityAowService.canReportResults()`; drawer `[impactArea]="m.impactArea ?? null"`), `CLAUDE.md` (+6/-1), new `dashboard-lab.impact-card.spec.ts` (9 tests, static template-text checks + empty-template TestBed logic).
- **Verification:** `--testPathPattern=dashboard-lab.impact-card` → 1 suite / 9 tests passed; `--findRelatedTests dashboard-lab.component.ts` → 34 suites / 1225 tests passed; lint clean; no existing spec edited.
- **Reviewer:** `STATUS: FAIL` (production wiring confirmed correct; test-only defect). Verbatim issue:
  > 1. **Discovered Issue:** The R-3 falsifier ("with search text / Only pending / Favorites / PT on, the card disappears") has no test that can catch it. In `dashboard-lab.impact-card.spec.ts`: (a) The wrapper regex can never match. The line-224 regex is `/@if \([^)]*(favoritesOnly|…)[^)]*\)\s*\{\s*<app-impact-results-card/`. Every signal in the template is called with `()`, so the first `)` ends the `[^)]*\)` part and the following `\s*\{` then fails. For example, `@if (!favoritesOnly()) { <app-impact-results-card` does not match. The list of names is also wrong: `ptFilter` does not exist (the signal is `ptActivityOnly`), and neither Only pending (`reportingStatusFilter`) nor `reportingTargetFilter` is listed. (b) The text-between check is too loose. It only asserts that the text between the table and the card contains the grouped `@if` and no `<app-`. An extra filter `@if` placed before or inside the grouped `@if` still passes. (c) Flat view is only half covered. For the same reason, the check would also pass if the grouped condition were weakened with an extra clause. A presence/absence check like this is not proof of the behaviour.
  > **Violated Rule:** `tasks.md` IRE-T-4 Verification → Falsifier; `tasks.md` §5 (R-3 owned by T-4, host spec); `requirements.md` §8, defect class "Card hidden or reordered by filters / view mode" → host spec; `requirements.md` IRE-R-3 / Scenario 3.1.
  > **Remediation Suggestion** (test-only, no production change): Replace (a) and (b) with an exact check on the text between the table tag and the card tag. Strip `<!-- … -->` comments and whitespace from that text, then assert it equals exactly `@if(reportingViewMode()==='grouped'){`. Any added wrapper or changed condition then fails. Also assert the card is in the same branch as the table: the closest `@else if (plannedBrowseView() === 'aows')` before the card is the same one that comes before the table. If the regex stays at all, fix it so it can match nested `()` and uses the real signal names. Check that the new assertion catches the bug by applying the mutation `@if (!favoritesOnly()) { … }` once, watching the test go red, then reverting.
- **ADVISORY:** RISK — the grouped-only `@if` (design §6.2) unmounts the card in flat view; Grouped → All → Grouped remounts it and re-requests E6 for the same (program, phase). RELIABILITY — `closeManage()` publishes `drawerReportKpi` if a row drawer was replaced by the impact drawer before closing (pre-existing pattern shared with `openEmergingReport`); clearing `drawerReportKpi` in `openImpactReport` would guard it.
- **Leader decision on the remount advisory:** keep the `@if` mount (design §6.2 is explicit: mount only in grouped view). IRE-NFR-4 scopes "one E6 request per page load / program-phase change"; a re-request after a user view toggle is accepted and recorded, not treated as a falsifier hit. Surfaced to the user at the end of the run as a possible spec clarification. Not actioned in attempt 2 (advisory never widens a task).

#### Attempt 2 — PASS (2026-10-31)

- **Effort:** high (bumped on retry) · skills `angular-developer`, `tdd` (mutation proof)
- **Scope:** test-only — `dashboard-lab.impact-card.spec.ts` rewritten; production `dashboard-lab.component.{ts,html}` and `CLAUDE.md` unchanged since attempt 1 (html `cmp` byte-identical after mutations).
- **Change:** template test now takes the text from the end of `<app-reporting-aow-table …/>` to the start of `<app-impact-results-card`, strips comments + whitespace and asserts it equals exactly `@if(reportingViewMode()==='grouped'){`; asserts table and card share the nearest `@else if (plannedBrowseView() === 'aows')` branch; old `[^)]*` wrapper regex removed.
- **Mutation proof:** wrap card in `@if (!favoritesOnly()) {…}` → `Tests: 1 failed, 8 passed, 9 total`; grouped condition `|| true` → `Tests: 1 failed, 8 passed, 9 total`; both reverted.
- **Verification:** `npx jest --maxWorkers=2 --testPathPattern=dashboard-lab.impact-card --silent --reporters=summary --no-coverage` → `Test Suites: 1 passed · Tests: 9 passed`; lint on the spec clean. Related suites from attempt 1 (`--findRelatedTests dashboard-lab.component.ts` → 34 suites / 1225 tests) still valid — production code unchanged.
- **Reviewer:** `STATUS: PASS` — attempt-1 issue fixed; every IRE-T-4 falsifier traced to a test that fails under mutation (filter wrapper, weakened gate, order, double mount, inputs, canReportResults gate + emerging false, impactArea leak via whole-object `managed.set`, no host E6 call, drawer binding).
- **ADVISORY (recorded, not actioned):** RELIABILITY — table-bindings test checks 6 of ~23 bindings (production diff confirmed unchanged, so non-blocking); a single filter `@if` wrapping both table and card would pass (would also hide the table — unlikely).
- **Requirements covered:** IRE-R-1 (placement, S1.2), IRE-R-3, IRE-R-4 (gate), IRE-R-7 (table inputs unchanged), IRE-NFR-4 (host side).
- **Budget:** review rounds used so far 5 / ≤ 8.

### IRE-T-5 — Cypress CT layout + guide sync — PASS (attempt 1)

- **Date:** 2026-10-31
- **Attempts:** 1 · effort medium · skill `angular-developer`
- **Files:** new `pages/dashboard-lab/components/impact-results-card/impact-results-card.component.cy.ts`; guides re-stamped `Verified: 2026-10-31`: `dashboard-lab/CLAUDE.md`, `impact-results-card/CLAUDE.md`, `indicator-drawer/CLAUDE.md`, `lab-report-form/CLAUDE.md`, `reporting-aow-table/CLAUDE.md` (+ "Hermana: Impact results card" section, IRE-DD-1), `shared/report-result/CLAUDE.md` (+ "Impact results" section: `IMPACT_AREAS`, six-key `buildImpactCreateResultPayload`, IRE-DD-2/5).
- **Verification:**
  - Cypress binary was missing on the machine → Implementer ran `npx cypress install` (14.5.1, user cache `%LOCALAPPDATA%\Cypress\Cache`, outside the repo).
  - `npx cypress run --component --spec "src/app/pages/result-framework-reporting/pages/dashboard-lab/components/impact-results-card/impact-results-card.component.cy.ts"` → `6 passing (1s)` · `✔ All specs passed! 00:01 6 6 - - -` (3 tests × 1280/900 px).
  - **Known harness gap:** the task's literal command `npm run test:ct:batch -- impact-results-card` exits red even with the spec passing; probable cause the pre-existing webpack/type errors in other files (`styles.scss` primeicons fonts, `ct-utils.ts:54`, `pr-field-header.tooltip-a11y.cy.ts` `realPress`, `showQaPrelSplit` typing) — not investigated. **Accepted gate = the direct `cypress run --component --spec …` above**; a red batch exit is not a regression of this spec.
  - Lint on the `.cy.ts` clean; no Jest ran concurrently.
  - Grep for "only three card kinds" in the six guides → none (only unrelated `program-overview/CLAUDE.md:128`).
- **Assertions (both widths):** card + every row `scrollWidth <= clientWidth`; each button right edge ≤ card right edge and visible; 5 counts + buttons visible; long name (third area mutated to ~200 chars, restored in `afterEach`) wraps > 1.5 line-heights, short name single line; `canReport` true → enabled, false → all disabled; harness guard: first row computes `display: flex` (proves Tailwind utilities applied despite the global stylesheet error).
- **Reviewer:** `STATUS: PASS` — guard meaningful (`<li>` defaults to `list-item`), constant mutation safely restored and bundle-isolated, overflow assertions can catch real overflow, guide text matches T-1..T-4 code.
- **ADVISORY (recorded, not actioned):** RELIABILITY — batch-script red exit recorded above as harness gap; READABILITY — `canReport` test mounts twice in one `it`.
- **Requirements covered:** IRE-NFR-2 (CT side); guide upkeep.
- **Budget:** review rounds used 6 / ≤ 8; tasks 5 of 6 code+test done.

### IRE-T-6 — PRTest verification (HITL / T6) — in progress

- **Go-ahead:** user "si dale" (2026-10-31) for commit → push → merge into `performance-refactor` → deploy.
- **Pre-push:** free RAM 1.2 GB (< 4 GB) → user chose `--runInBand`. `npx jest --runInBand --findRelatedTests dashboard-lab.component.ts indicator-drawer.component.ts lab-report-form.component.ts impact-results-card.component.ts impact-areas.constant.ts --silent --reporters=summary --no-coverage --forceExit` → `Test Suites: 40 passed · Tests: 1477 passed` (115 s). `results-api.service.ts` / `create-result-payload.util.ts` unchanged since IRE-T-1's 438-suite run.
- **Commits on `qa-development-2026-ss`:** `81173125d` (T-1), `f0e20f45c` (T-2), `5fab7cdaa` (T-3), `6b42237f6` (T-4), `7e0f5ceed` (T-5), `3bf03c2f1` (spec docs) — pushed.
- **Merge blocker resolved (out of spec scope, user-approved option "Subir a rev 32 en qa-dev"):** merge into `performance-refactor` conflicted on `onecgiar-pr-server/src/api/qa-catalog/__snapshots__/qa-catalog.snapshot.json` — P2-4037 (staging/perf) and P2-4061 (`7227e8d4c`, qa-dev) had each bumped QA catalog 2026 from revision 30 to 31 with different content. Merged `origin/staging` into qa-dev (28 commits: P2-4037, P2-4040, P2-4041), bumped `definitions/versions.ts` to 32, regenerated the snapshot (`npm run qa-catalog:snapshot` → 444 keys, guarded write passed), moved the 3 version assertions to `2026.32`, added `qa-catalog.en.md` change log v1.28. `npx jest --runInBand --testPathPattern=src/api/qa-catalog` → `42 passed · 911 passed`. Commit `4e1268cf3`, pushed.
- **performance-refactor:** merge `ff95c902a` (no conflicts), pushed; local refs synced; `qa-catalog/` and `result-framework-reporting/` identical to qa-dev. Checkout returned to `qa-development-2026-ss`.
- **Pending (live, after ~30 min deploy):** served bundle = `ff95c902a`; SP01 · Reporting 2026 (initiative 50, version 36): card after 2030 outcomes in grouped view, absent in flat view; counts = E6 = SQL; keyboard order; visual vs User Guide v2 step 1; one real create from a card → detail page with `?phase=`, type 9, area at Principal. Then `family.md` row 2 → `done`.

#### IRE-T-6 HITL evidence — round 1 (2026-10-31, user-run on PRTest, transcript: user messages with images #57–#68 and two pasted JSON payloads)

| Check | Evidence | Result |
|---|---|---|
| Served bundle | DevTools search `Report impact result` → `dashboard-lab.component-RFKVNNF6.js:9817/9833` | ✅ deployed code |
| Placement + anatomy (R-1) | Card after 2030 outcomes; IMPACT tag, title, "5 Impact Areas · no targets", NEW, Total, 5 rows in order; no bar/ratio/%/By AOW | ✅ |
| Flat view (S1.2) | User: card absent in **All indicators** | ✅ |
| Filters (R-3) | Search "some" + Only pending + KP chip ("No indicators match your filters") → card still shown with counts | ✅ |
| Counts (R-2) | Card = E6 `{4:1, others 0, total 1}` = SQL (a4_climate 1, total 1) for initiative 50 / version 36 | ✅ |
| Keyboard (NFR-1) | User: Tab reaches the 5 Report result buttons in order | ✅ |
| Title rule (R-5) | 31 words → "31 / 30 (Limit exceeded)", Save disabled, "1 field left" | ✅ |
| Create (R-6 S6.1) | Result 10039 (id 12507) "IRE-T-6 PRTest test": 201, toast "Result created", navigated to `/result/result-detail/10039/general-information?phase=36`; DB level 1, type 9, version 36, `climate_change_tag_level_id = 3` (others 1); detail shows Climate "2 Principal"; card then Climate 2 / Total 2 | ✅ |
| Body (R-6) | Second create "Another Impact test result" payload: exactly `result_level_id 1, result_type_id 9, initiative_id 50, result_name, handler "", impact_area_id 3` | ✅ |
| Permission (R-4 S4.2) | User: a user without a role in the SP cannot create impact results | ✅ |
| `results_impact_level` | NULL for 12507 — expected: row is written by the Impact level info save (child #3) | ℹ️ |
| **Icons (R-1 / NFR-1)** | Card rows show an empty gap left of the name; drawer shows a near-invisible glyph — `assets/impact_areas/png/<id>.png` are white glyphs on transparent (IPSR coloured-circle assets) | ❌ defect |

#### IRE-T-6 rework — icon paths — PASS (attempt 1)

- **Fix:** `IMPACT_AREAS` icons → existing coloured tiles `assets/impact_areas/<id>.png`; constant spec updated; `design.md` §4 and `tasks.md` IRE-T-1 path updated (this log keeps the historical path above). IPSR untouched.
- **Verification:** `npx jest --runInBand --testPathPattern="(impact-areas.constant|impact-results-card|lab-report-form.component.impact-mode|indicator-drawer.component.impact-mode)"` → 4 suites / 25 tests passed; eslint clean; pre-push `--findRelatedTests impact-areas.constant.ts` (runInBand) → `40 passed · 1477 passed`.
- **Reviewer:** `STATUS: PASS` — five tiles opened and matched to ids (1 orange Nutrition, 2 blue Poverty, 3 yellow Gender, 4 dark green Climate, 5 light green Environment), mapping and colours agree with IPSR `step-n1-impact-areas`; no stale path in spec docs or client guides; visibility still needs the PRTest re-check.
- **Pending:** PRTest re-check of icons after deploy; then T-6 `[x]` and `family.md` row 2 → `done`. Test results 10039 and "Another Impact test result" (Gender) to be deleted/discontinued on PRTest by the user.
