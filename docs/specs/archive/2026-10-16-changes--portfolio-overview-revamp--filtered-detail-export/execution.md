# Execution — Portfolio Overview: filtered results detail + Excel export

## Document Control

| Field | Value |
|---|---|
| Spec | `changes/portfolio-overview-revamp/filtered-detail-export` (family #9) |
| Started | 2026-10-16 |
| Approval Mode | gated. On 2026-10-16, after FDE-T-1, the user said "continua hasta que termines": routine PASS gates proceed; HALT, pivot, FATAL_FAIL and FDE-T-4 HITL still stop. Budget: the user had been told the LOC total would pass 520 from test volume; a production-code or review-round overrun still stops |
| Baseline commit | `93a494e06` (#6 `global-filters` committed: 9946d37d7, 6cfde7ed8, 93a494e06) |
| Budget | 4 tasks · ≈ 520 LOC · ≤ 5 review rounds (design §8) |
| Roles | Leader: session model · Implementer: `akili-implementer` wrapper · Reviewer: `akili-reviewer` wrapper |

## Leader decisions

- **FDE-P-2 re-checked at T-1 start (2026-10-16):** `filteredRows()`, `filtersPending()`, `filteredTotal()`, `dimensions()`, `dimensionIndex()`, `isPartial()`, `fetchedCount()`, `phaseName()` exist on `PortfolioOverviewService` with the design's names. No rename. Peer notes from onecgiar-pr-5e: `dimensionsNotice()` is a boolean; while Project/Center is pending, `filteredRows()` returns only definite matches, so the detail list gates on `filtersPending()` (design §5.3 already does).
- **FDE-T-3 mount point (2026-10-16):** design §5.3 says "inside `hasFigures()`, after `<app-portfolio-projects-block>`", but the projects block (WPS-DD-7) and the centers block sit **outside** `hasFigures()` under `!data.loading()`. To keep both R-1 clauses (last section **and** the figures gate), the detail section mounts in its own `@if (hasFigures() && (data.filteredTotal() > 0 || data.filtersPending()))` placed after the projects block. Same behaviour as §5.3; only the nesting differs. Design-sync item for archive.

## Task Execution History

### FDE-T-1 — Pure logic: detail rows, search, sort, page, export rows — PASS (2026-10-16)

- **Attempts:** 1. Skills: `angular-developer`, `tdd`. Effort: medium.
- **Files** (under `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/`):
  - `components/results-detail/results-detail.rows.ts` (new, 203 LOC).
  - `components/results-detail/results-detail.rows.spec.ts` (new, 223 LOC, 18 tests).
  - `services/portfolio-overview.service.ts`: `RawResult.result_code` (+2).
- **Verification (Implementer):**
  - `npx jest --testPathPattern="results-detail.rows" --maxWorkers=2 --silent --no-coverage` → `Tests: 18 passed, 18 total`.
  - `npx jest --testPathPattern="portfolio-overview.service" …` → `Test Suites: 2 passed, Tests: 89 passed`.
  - Free RAM 5.6 GB, then `npx ng build --configuration development` → completed; only the existing Sass `@import` deprecation warning.
  - Lint: `npx eslint` finds no flat config in the client, so `npx ng lint --quiet --lint-file-patterns <3 files>` → `All files pass linting.`
  - Red: spec written first (module missing). Falsifier 1 (sort only the first 25, then append) → `1 failed, 17 passed`; restored → 18/18. Falsifier 2 covered by explicit `toBe('Unavailable')` over loading/error/idle.
- **Declared deviations (accepted by the Reviewer):** `toDetailRows(rows, mapStatus, labels)` takes the status plus a `DetailLabels` built once by the new `buildDetailLabels(map)`; `toExportRows(rows, origin)` takes `origin` for the absolute URL; Source reads "W3/Bilateral" / "W1/W2" (same `'W3/Bilaterals'` test as the service); contributing subtracts the lead by trimmed, case-insensitive acronym (A-2); Link "—" when no code; missing code sorts as -1; `TYPOLOGY_LEVEL_LABELS` imported from `services/portfolio-filters.ts`, where it lives.
- **Reviewer (attempt 1): PASS.** Every required case has a hard-coded assertion; falsifier 1 is real (`Title a26` lands at position 1 of the sorted set); the declared deviations change no required behaviour. `idle` → "Unavailable" is harmless (idle only with 0 rows / no version, when the section is not mounted).
- **ADVISORY (recorded, no rework):**
  - The code-sort case uses 3 rows; the ≤ 25-row disqualifier targets whole-set sorting, covered by the 30-row case. Optional hardening: assert code asc/desc on `thirty()`.
  - Design §3 lists a `url` field; the row stores `versionId` and the URL is built by `resultUrl`. **Forward pointer → FDE-T-2:** the code-cell link must use the same `resultUrl(code, versionId, origin)` so screen and file cannot drift. Design-sync item for archive (§3 `url` → `versionId`).
  - Rows with no code show "—", so searching "—" matches them all. Harmless edge.
  - `exportFileName` uses the local date; correct for a user file name.
- **Leader note:** the Reviewer received the diff as a frozen scratchpad file (`fde-t1.diff`, 451 lines) instead of inline, because it cannot regenerate the diff; the file was written once and not changed.
- **Requirements covered:** FDE-R-2 (S-2.3), R-3 (S-3.1), R-4 (S-4.1 order), R-5 (S-5.1), R-6 (URL), R-7 (`pageOf`), R-8 (S-8.1, S-8.2, file name), R-10 (`_partial`).
- **Budget so far:** 1 of 4 tasks · ≈ 428 LOC (≈ 205 production, 223 tests) of ≈ 520 · 1 of ≤ 5 review rounds. Within budget for production code; tests will push the LOC total past 520 by T-2 (same pattern as #6).
- **Commit:** none (user's go-ahead).

### FDE-T-2 — `results-detail` component, template and copy — attempt 1 FAIL, stopped for user (2026-10-16)

- **Attempt 1:** Skills `angular-developer`, `spartan`, `tailwind-design-system`. Effort: medium.
  - **Files:** `components/results-detail/results-detail.component.ts` (new, 146), `.html` (new, 155), `.spec.ts` (new, 215, 16 tests); `internationalization/portfolio-overview.copy.ts` (+35, `detail` group). `spartanBrainMock.ts` untouched (no NG0311).
  - **Verification:** `npx jest --testPathPattern="results-detail" --maxWorkers=2 --silent --no-coverage` → `Test Suites: 2 passed, Tests: 34 passed`. `npx ng build --configuration development` clean (component not yet mounted; template type-checked through a temporary `ngc` tsconfig, then deleted). `npx ng lint --quiet --lint-file-patterns <4 files>` → `All files pass linting.` Falsifiers: export bound to `slice().rows` → `1 failed, 15 passed`; `finally` removed → `1 failed, 15 passed`; both restored.
  - **Final inputs (for T-3):** `rows` ← `filteredRows()`, `pending` ← `filtersPending()`, `dimensionsStatus` ← `dimensions().status`, `dimensionsMap` ← `dimensions().map`, `partial` ← `isPartial()`, `fetchedCount` ← `fetchedCount()`, `phaseName`. Replaces design §5.2's `dimensionIndex`/`dimensionLabels` (T-1 builds labels from the raw map). Design-sync item for archive.
  - **Declared deviations:** `[disabled]` + `[attr.disabled]` on Helm buttons (Brain mock swallows `disabled`); skeleton via `hlmSkeleton` divs; pager uses `‹`/`›` with `aria-label`; `@for` tracks `$index`; injects only `ExportTablesService`.
  - **Not Done / Assumptions (Implementer, verbatim summary):** layout / clamp / 375 scroll / focus ring → T-4; mount → T-3; folder `CLAUDE.md` → T-3. All three are owned by later tasks per `tasks.md`; no T-2 scope owed.
  - **Reviewer: FAIL.**
    1. **Discovered Issue:** `exportExcel` always calls `saveAsExcelFile(buffer, fileName)`, which saves `${fileName}_${epoch*10}.xlsx` (`shared/services/export-tables.service.ts:520-558`). With T-1's `exportFileName(...)` the real file becomes `PRMS_portfolio_results_<phase>_<date>[_partial].xlsx_<ts>.xlsx`: double extension, `_partial` not before the extension. The spec mocks `exportExcel` and asserts only the argument, so it cannot see it. FDE-P-5 read lines 29-70 and stopped before `saveAsExcelFile`.
       **Violated Rule:** `requirements.md` FDE-R-8 (file name `PRMS_portfolio_results_<phase>_<YYYY-MM-DD>.xlsx`, `_partial` before the extension), FDE-R-10; `tasks.md` FDE-T-2 "file name from T-1".
       **Remediation Suggestion:** Leader decision. (a) additive optional flag on `exportExcel`/`saveAsExcelFile` to save the name as-is, passed from `exportToExcel()`; or (b) change R-8 to accept the service's naming. Either way, assert the name actually saved, not just the argument. Record the FDE-P-5 correction.
  - **ADVISORY:** design §5.2 "busy spinner + text" → only text + `aria-busy` (undeclared; no Helm spinner); sort arrows `▲▼` and pager `‹›` are glyphs, client rule says icons from `@ng-icons/lucide` only; the polite live region updates on every keystroke (check at T-4).
- **Leader verification of the FAIL:** confirmed by reading `export-tables.service.ts:29-70` and `:520-558`. `exportExcel` exposes no flag; the only routes are a shared-service change or a requirements change.
- **Premise correction — FDE-P-5:** `exportExcel` does not save the file under the given name; `saveAsExcelFile` appends `_<epoch×10>.xlsx` (or a date suffix on its other callers' flags). FDE-P-5 is **false as written** for the file name.
- **Why the loop stopped (no attempt 2 yet):**
  1. **Spec gap.** Both fixes leave T-2's approved file list (shared service) or change an approved requirement. Pivot Protocol → user decision.
  2. **Budget tripwire (production code).** Design §8: ≈ 230 production LOC. Actual after T-1 + T-2: ≈ 541 (T-1 205; T-2 146 ts + 155 html + 35 copy), before T-3. Tests: ≈ 438. Review rounds: 2 of ≤ 5. Cause: the template (155) and component (146) were sized as one ≈ 120-line item; the a11y markup (labelled search, `aria-sort` buttons, named pager, sr-only hints, skeleton, no-hit and partial states) is most of it. No scope was added beyond R-1..R-10.

## Pivot Record: FDE-T-2 (2026-10-16)

- **Blocker:** FDE-P-5 was incomplete. `ExportTablesService.saveAsExcelFile` appends `_<epoch×10>.xlsx`, so R-8's file name cannot be produced through `exportExcel` as is.
- **Alternatives offered:** (a) additive optional `{ exactFileName: true }` on `exportExcel` → `saveAsExcelFile`; (b) change R-8 to accept the service's timestamp naming.
- **User decision (2026-10-16):** (a) "Flag opcional". Budget: production overrun (≈ 541 vs ≈ 230 LOC) **accepted**, "Aceptar y seguir" through the T-2 retry and T-3; only HALT or a new spec gap stops.
- **Spec amended:** `design.md` FDE-P-5 corrected; §5.2 export call passes `{ exactFileName: true }`; new **FDE-DD-9**. `tasks.md` FDE-T-2 files add `shared/services/export-tables.service.ts` + spec, and the export case requires the flag plus a service spec proving the saved name. No ADR affected (feature-level decision). `requirements.md` R-8 unchanged.
- **Correction closure:** forward sweep for `P-5`, `exportExcel`, `export-tables`, `Not provided` across the spec folder → design lines 22, 54, 107, 110 still true (reuse of `exportExcel`, swallow-errors and "Not provided" facts unchanged); `requirements.md:198` (Jest spy on `exportExcel`) still valid; `proposal.md:52` historical, unchanged. Backward: DD-6 cites P-5 for error swallowing, which still holds.

### FDE-T-2 — attempt 2 — PASS (2026-10-16)

- **Attempt 2** (after the pivot; same Implementer resumed with the Reviewer FAIL verbatim; effort bumped to high).
  - **Files:** `shared/services/export-tables.service.ts` (+10/−3: `exportExcel(…, options?: { exactFileName?: boolean })`; `saveAsExcelFile(…, hourEnd = false, exactFileName = false)`, with the flag it calls `FileSaver.saveAs(data, fileName)` and returns), `export-tables.service.spec.ts` (+16: exact name with the flag; `/^plain_\d+\.xlsx$/` without), `results-detail.component.ts` (passes `{ exactFileName: true }`), `results-detail.component.spec.ts` (asserts the 5th arg).
  - **Verification:** `npx jest --testPathPattern="results-detail|export-tables.service" --maxWorkers=2 --silent --no-coverage` → `Test Suites: 3 passed, Tests: 92 passed`. `npx ng lint --quiet --lint-file-patterns <4 files>` → `All files pass linting.` Free RAM ≈ 4.5 GB, `npx ng build --configuration development` clean.
  - **Falsifier:** `options?.exactFileName` → `false` → `1 failed, 57 passed` ("saves the exact file name (no suffix, no extra extension) with exactFileName"); restored.
  - **Reviewer (attempt 2): PASS.** Fix matches FDE-DD-9 and the amended export case; proven at the `FileSaver.saveAs` boundary. Without options the default `false` keeps the timestamp path; the other 5 internal call sites and 7 external `exportExcel` callers pass ≤ 5 / ≤ 4 args, unaffected. Error path unchanged (DD-6 holds).
- **ADVISORY (final verdict, recorded, no rework):**
  - The pre-existing first `exportExcel` test (`export-tables.service.spec.ts:57-69`) is not awaited; adding `await` would make the new tests order-proof.
  - Carried from attempt 1: no spinner (design §5.2 "busy spinner + text"; only text + `aria-busy`); `▲▼‹›` glyphs instead of `@ng-icons/lucide`; polite live region updates per keystroke → check at T-4.
- **Requirements covered:** FDE-R-1 (header), R-4 (`aria-sort`, page reset), R-5, R-6, R-7, R-8 (whole list, busy, disabled at 0, failure re-enables, exact file name), R-9 (pending), R-10 (partial line).
- **Design-sync items for archive:** §5.2 inputs (`dimensionsMap` replaces `dimensionIndex`/`dimensionLabels`); §3 `url` → `versionId`.
- **Budget:** 2 of 4 tasks · production ≈ 551 (user-accepted overrun) · tests ≈ 454 · review rounds 3 of ≤ 5.
- **Gate:** auto-continue (user: "continua hasta que termines"; pivot and budget decided 2026-10-16).

### FDE-T-3 — Mount on the page + reconciliation + folder doc — PASS (2026-10-16)

- **Attempts:** 1. Skill `angular-developer`. Effort: medium.
- **Files** (under `portfolio-overview/`): `portfolio-overview.component.ts` (+2: import + `imports`), `.html` (+12: own `@if (hasFigures() && (data.filteredTotal() > 0 || data.filtersPending()))` block after the projects block, 7 inputs per the T-2 contract), `.spec.ts` (+86: `ExportTablesService` stub in `build()`; 4 cases), `CLAUDE.md` (+10/−2: new "Results detail + export (#9)" section, re-stamped FDE-T-3).
- **Verification:** `npx jest --testPathPattern="portfolio-overview.component" --maxWorkers=2 --silent --no-coverage` → `Test Suites: 15 passed, Tests: 325 passed` (pattern also matches the sibling block specs; same for the wider sibling pattern). Free RAM 5.1 GB; `npx ng build --configuration development` exit 0 (the detail template is now type-checked by the app build). `npx ng lint --quiet --lint-file-patterns <3 files>` → `All files pass linting.`
- **Falsifier:** `[rows]="data.rows()"` → `1 failed, 59 passed` (S-2.1/S-2.2, Expected 1, Received 5); restored.
- **Note:** `tasks.md` says `kpiTotals().total`; the real field is `totalResults` and the case uses it.
- **Reviewer (attempt 1): PASS.** S-2.1/S-2.2 count = `kpiTotals().totalResults` unfiltered, filtered (SP06 + editing) and after `clearAll`; R-9 absent with `portfolio-no-match` present; R-1 absent on loading/error/phase-empty; last child, after the projects block. `CLAUDE.md` accurate against the code.
- **ADVISORY (recorded):**
  - The "W3/Bilateral projects" line of the folder `CLAUDE.md` still called Projects "the **last** section". **Leader applied** an in-place reword ("after Centers; followed only by Results detail (#9)"), because it is this task's own deliverable and the guide would otherwise contradict the code; line count unchanged.
  - The R-1 test repeats ~12 lines of TestBed setup (error / loading); a `buildWith` helper if more cases come.
  - `listed()` parses `countText()` with a regex; a `data-count` attribute would be sturdier if the copy changes.
- **Requirements covered:** FDE-R-1 (last section, figures gate), R-2 (S-2.1, S-2.2; S-2.3 via the filtered binding), R-9 (no match → not rendered), docs NFR.
- **Budget:** 3 of 4 tasks · production ≈ 565 (accepted overrun) · tests ≈ 540 · review rounds 4 of ≤ 5.
- **Gate:** auto-continue to FDE-T-4, which is HITL and stops for the user.

### FDE-T-4 — HITL browser + file check (in progress, 2026-10-16)

Run by the Leader through Claude in Chrome on `localhost:4200/portfolio-overview`, at the user's request ("hazlo ahora prueba tu usando claude in chrome"). Read-only: filters set by URL, sort/search/pager used; Export run with `saveAsExcelFile` intercepted in the page (no file written, no download). No write button clicked.

| Check | Result |
|---|---|
| Served bundle has the change | ✅ `app-portfolio-results-detail` is in the DOM, the last child of the sections container, after `app-portfolio-projects-block` |
| Open version | 36, "Reporting 2026 - P25"; `isPartial()` false, `fetchedCount` 6839, map `ready` |
| Unfiltered parity | ✅ "1000 results" = `kpiTotals().totalResults` 1000; 25 rows; range "1–25 of 1000" |
| Parity, Program only (`?program=SP02`) | ✅ 181 = KPI 181; P/A column only SP02 |
| Parity, Center + Status (`?center=CENTER-03&status=editing`) | ✅ 87 = KPI 87; Status column only "Editing" |
| Default sort / `aria-sort` | ✅ Code `descending`; Title click → `ascending`; Contributing Centers / Projects have no `aria-sort` |
| Code link | ✅ `…/result/result-detail/9864/general-information?phase=36`, `target=_blank`, `rel="noopener noreferrer"`, sr-only "(opens in new tab)" |
| Search | ✅ "drought" → "9 of 1000 results", range "1–9 of 9"; no-hit → "No results match this search"; Clear search → "1000 results", input empty |
| Sort timing, Title, unfiltered 1000 rows, 5 runs (click → next frame) | ✅ median 27 ms (19.7–35.6), budget 100 ms |
| Search timing, 5 terms | ✅ median 21.8 ms (17.5–41.6), budget 100 ms |
| No page-level horizontal scroll, 375 / 768 / 1280 (same-origin iframe; window resize has no effect on this machine) | ✅ `scrollWidth` 362 / 755 / 1267 ≤ width; section right edge 348 / 734 / 1230; table (1223 px) scrolls inside its `overflow-x:auto` container at all three. A first measurement during load read 1413 / 2315; re-measured after layout settled |
| Title clamp | ✅ `line-clamp-2` computed `-webkit-line-clamp: 2` |
| **Title tooltip (design §5.2, T-4 check)** | ❌ **DEFECT.** The title cell is `<span class="line-clamp-2">…</span>` with no tooltip and no `title`; a clamped title cannot be read in full. **FDE-T-2 reopened (attempt 3)** |
| Keyboard order | ✅ search → Export → 10 sort buttons → code links → Previous / Next |
| Focus ring | ✅ by markup: every control carries `focus-visible:` ring utilities (`--pr-focus-ring` / `ring-3`); a focused code link renders the 3 px ring. ⚠️ A real Tab-key walk could not be driven: the extension's synthetic Tab moved focus to `body`. Visual ring left for the user |
| Search label | ✅ sr-only `<label for>` "Search results by code or title" |
| Export, largest selection (unfiltered 1000), intercepted | ✅ `exportExcel` got 1000 rows (all pages, not 25); keys = R-3 order + `Link`; 13 `wscols`; `cellsToLink [{13,'Link'}]`; `{ exactFileName: true }`; 0 null cells; no creator/email/user key; saved name **`PRMS_portfolio_results_Reporting_2026_-_P25_2026-10-16.xlsx`** exactly (`saveAsExcelFile(…, exactFileName = true)`); 113,821 bytes; busy seen during export, button re-enabled after |
| Export duration, 3 runs | 472 / 173 / 166 ms. ⚠️ Spread > 2× median (173): the first run includes the lazy `exceljs` chunk import. Reported as the spread, not as a pass |
| `_partial` | ✅ absent (no partial banner in this phase) |
| Console | ✅ no errors |
| Opening the real file in Excel | ⏳ user (download needs the user) |

- **Observation (no defect, recorded):** Title ascending puts rows with no title ("—") first, because "—" collates before letters. R-4 does not fix the place of empty values.
- **User checks (2026-10-16):** the user walked the section with Tab and opened the downloaded Excel: "ya probé todo y funciona perfecto en todos". Focus ring ✅ (visual, user). Excel opens with links ✅ (user). Pending only the FDE-T-2 attempt-3 tooltip fix and its browser re-check.

#### FDE-T-2 attempt 3 (reopened from T-4) — PASS (2026-10-16)

- **Leader correction:** the T-4 "no tooltip" defect was a **false positive**. The Leader inspected DOM attributes, but Angular property bindings (`[hlmTooltip]`) leave no attribute. Attempt 1 already had `[hlmTooltip]="row.title"`. Browser re-check: hovering a title opens the `.cdk-overlay-container` overlay with the full title.
- **Change kept:** `[tooltipDisabled]="row.title === none"` (no tooltip on "—") + 1 spec case (`BrnTooltip.brnTooltip` = full 400-char title, `tooltipDisabled` false; "—" → true).
- **Verification:** `npx jest --testPathPattern="results-detail|portfolio-overview.component" --maxWorkers=2 --silent --no-coverage` → `Test Suites: 15 passed, Tests: 326 passed`. Falsifier (bindings removed) → `1 failed, 16 passed`; restored. Lint clean; `ng build` clean. **Rule deviation (Implementer):** built with 676 MB free RAM (< 4 GB rule), single build, nothing else running.
- **Reviewer runtime failure:** the Opus Reviewer hit the session rate limit twice (HTTP 429). Per the Reviewer fallback, a different model was used: **`haiku`** (differs from the Implementer, so author ≠ auditor holds). Recorded as a fallback for a 2-line delta.
- **Reviewer (haiku): PASS.** Matches FDE-R-3 ("full text on hover and in the file") and §5.2; the test cannot pass vacuously; "—" exclusion correct.
- **ADVISORY:** the span is not keyboard-focusable (hover-only tooltip); not a spec violation (R-3 names hover + file). Option for a later pass: `tabindex="0"`. Clamp at 375/768/1280 already verified at T-4 (computed `-webkit-line-clamp: 2`).

### FDE-T-4 — HITL — PASS (2026-10-16)

- Evidence: the table above, plus the user's own checks (focus ring walk, Excel opened, links work: "ya probé todo y funciona perfecto en todos").
- Tooltip "defect" withdrawn (false positive, see attempt 3).
- Outstanding spreads reported, not passed: export 472 / 173 / 166 ms (first run includes the lazy `exceljs` import).
- Non-admin 403: not applicable (no endpoint in this spec).

## Summary (2026-10-16)

- **Tasks:** 4 / 4 `[x]`. T-1 PASS (1 attempt), T-2 PASS (3 attempts: file-name pivot FDE-DD-9; tooltip reopen), T-3 PASS (1), T-4 PASS (HITL with the user).
- **Review rounds:** 6 (budget ≤ 5; the 6th was the tooltip false-positive reopen).
- **LOC:** production ≈ 566 (design ≈ 230; overrun accepted by the user), tests ≈ 556.
- **Files:** `components/results-detail/` (rows, component ts/html/specs), `services/portfolio-overview.service.ts` (`RawResult.result_code`), `portfolio-overview.component.{ts,html,spec.ts}`, `portfolio-overview/CLAUDE.md`, `internationalization/portfolio-overview.copy.ts`, `shared/services/export-tables.service{,.spec}.ts`.
- **Design-sync items for archive:** §3 `url` → `versionId`; §5.2 inputs `dimensionsMap`; §5.3 mount point; FDE-P-5 corrected / FDE-DD-9 already amended.
- **Advisories open:** busy spinner missing; glyphs instead of lucide icons; tooltip not keyboard-reachable; polite live region per keystroke; empty titles sort first ascending; `export-tables.service.spec.ts:57-69` not awaited.
- **Commit:** none — waiting for the user's go-ahead.

## Post-archive validation — stakeholder email (2026-10-16)

Nicoleta's 11 items re-checked live on `localhost:4200`, version 36. The table below is the filter sweep: every combination agrees across the blocks that take that filter (KPI, status donut, typology, detail).

| Filter | Filtered | KPI total (W1/W2 / W3) | Donut | Typology | Detail | Notes |
|---|---|---|---|---|---|---|
| none | 1000 | 1000 (432 / 568) | 1000 | 643 + 357 | 1000 | — |
| program SP01 | 330 | 330 (169 / 161) | 330 | 217 + 113 | 330 | raw SP01 rows 330; ToC SP01 only; Projects SP01 row |
| status submitted | 154 | 154 (31 / 123) | 154 (Submitted only) | 88 + 66 | 154 | ToC / Projects "Not affected by: Status" (by design) |
| center CENTER-03 | 141 | 141 (70 / 71) | 141 | 141 | 141 (all list CIAT as lead or contributor) | Centers block 75 (per-Center counting) |
| project 1368 | 58 | 58 (0 / 58) | 58 | 58 | 58 | Projects "Not affected by: Project" (by design) |
| typology outcome | 357 | 357 | 357 | outcome 357 only | 357 (level Outcome) | raw outcome-type rows 357 |
| SP02 + CENTER-03 + editing | 16 | 16 (15 / 1) | 16 | 16 | 16 | — |

Findings (no code change made):
- The W3 card label reads "Innovations replicated from 2025: 119", but 2 of the 119 are not innovations (1 Capacity sharing, 1 Policy change). Innovation use 112 + Innovation development 5 = 117.
- The Centers block total (727 unfiltered, 75 for CIAT, 76 for project 1368) is above the W3 KPI (568 / 71 / 58) because a shared result counts once per Center. The page says so in a note.
- The status donut's sr-only text includes "Warning: Chart rendered without required accessibility tableModel" (`app-pr-viz-chart`). Screen readers will read it. The donut's input is missing a `tableModel`. This is outside #9.

**DB confirmation (user, DBeaver, 2026-10-16):** independent SQL on version 36 matches the page exactly.
- Q1, the cards: 1000 / 432 / 568 / 412 / 20 / 449 / 119.
- Q2, the donut: Editing 790, Submitted 154, Approved 36, Rejected 12, In QA 5, Discontinued 3.
- Q3, the filters: SP01 330, submitted 154, CIAT 141, project 1368 58, outcome 357, SP02 + CIAT + editing 16.
- Q4, W3 replicated by type: Innovation use 112, Innovation development 5, Capacity sharing 1, Policy change 1. This confirms finding 1.
