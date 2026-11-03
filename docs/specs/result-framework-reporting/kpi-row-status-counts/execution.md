# KPI row status counts — `execution.md`

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `result-framework-reporting/kpi-row-status-counts` (KRC) · Standard · gated |
| Branch | `qa-development-2026-ss` (base `b11eb8731`) |
| Leader | Claude Code session, model `opus` (T1) |
| Implementer | `akili-implementer` wrapper (`sonnet`, T2) |
| Reviewer | `akili-reviewer` wrapper (`opus`, T3) — differs from Implementer |
| Started | 2026-11-03 |
| Budget | 4 tasks · ~320 net LOC · 1 review round (2 max) |

**Scheduling note:** KRC-T-2 may start in parallel with T-1 per `tasks.md` §4, but the machine rule allows only one Jest run at a time, so T-1 and T-2 run serially.

## 2. Task Execution History

### KRC-T-1: Server read-only endpoint `indicator-result-status-links` — PASS (Done step closed 2026-11-03, see below)

- **Date:** 2026-11-03
- **Skills:** `nestjs-expert`, `api-design-principles` (as listed). Effort `high` (shared repository, regression-critical; one level above T2 default).

#### Attempt 1 — Implementer (`akili-implementer`, sonnet)
- **Files (398 insertions, 0 deletions):** `aow-bilateral.repository.ts` (+97: `ResultStatusData` import, exported `IndicatorResultStatusLink`, public `findIndicatorResultStatusLinks`), `.spec.ts` (+104); `results-framework-reporting.service.ts` (+34: `getIndicatorResultStatusLinks`), `.spec.ts` (+72); `results-framework-reporting.controller.ts` (+39: `GET indicator-result-status-links`), `.spec.ts` (+52).
- **SQL:** joins result → rtr → rtri (`is_not_aplicable = 0`) → INNER rit, all `is_active = 1`, `DB_TOC.toc_results` by `official_code` + `phase` (from `resolveContext`), `status_id IN (1,2,3,5,6)` from `ResultStatusData`; `GROUP_CONCAT(DISTINCT rit.toc_indicator_target_id)` anchors + `MAX(CASE … IS NULL)` `has_unanchored`; grouped by (toc_result_id, toc_results_indicator_id, result_id, status_id).
- **Verification:** eslint 6 files clean. Jest `--maxWorkers=2 --findRelatedTests` run 1: 73/74 suites, 2321 tests passed; service spec TS2339 (new method missing on mock type) fixed with a local `as any` alias in the new describe; re-run service spec 126 passed. `git diff -U0` repository: 0 `-` lines. No `migrations/`. INSERT/UPDATE/DELETE/version-literal grep: 0 hits in production code.
- **Implementer assumptions:** no `tr.is_active` filter (drawer has none); unknown program → 200 `[]`; GROUP_CONCAT 1024-char default accepted; live curl "Done" step is user-run.

#### Attempt 1 — Reviewer (`akili-reviewer`, opus): **FAIL**
- Adjudicated: SQL population matches the drawer loader (`existing-result-contributors-loader.service.ts:37-121`); protected functions and existing test cases untouched; no migration.
- **Issue 1.** Discovered Issue: an unknown `program` returns `{status:200, response:[]}` (`getIndicatorResultStatusLinks`, service.ts:629-656), because the method never resolves the initiative. Violated Rule: `design.md` §6 "Unknown program → same error contract as the sibling `toc-results` GET", and §4 Service row "Resolves initiative → official code + context exactly like the sibling `toc-results` reads". Remediation: after the blank check, call the existing private `resolveInitiative(normalizedProgram)` (throws 404) before `resolveTocContextForRequest`, and pass the official code on. Add a spec: null initiative → 404 and the repository is not called. Update the two new service tests. Do not edit pre-existing cases.
- **ADVISORY (no rework):** GROUP_CONCAT 1024-char cap, which needs about 140 anchors per group to hit (negligible; add a comment). Service spec `as any` alias on the shared mock (cleaner on the mock factory). Repository `debug:false` is good. Population parity is still open until KRC-T-4 Q-8 plus the user-run curl.

#### Budget tripwire (design §11)
- Planned: T-1 ~110 net LOC incl. tests; whole spec ~320. Actual T-1: 398 (170 production + 228 tests), 3.6× the task line and already over the whole-spec budget. Review rounds: 1 used, attempt 2 would be round 2 (= max).
- Cause: test volume (3 spec files with new describe blocks) plus verbose Swagger/DTO-less mapping. Production code is ~1.5× plan.
- Leader action: stopped and escalated to the user before attempt 2.
- **User decision (2026-11-03):** "Fix + re-baseline". Run attempt 2 for the 404 fix; spec budget re-baselined to **~650 net LOC**; test volume accepted.

#### Attempt 2 — Implementer (`akili-implementer`, sonnet, effort xhigh)
- **Changes:** `getIndicatorResultStatusLinks` now calls `resolveInitiative(normalizedProgram)` → `resolveTocContextForRequest` and passes `initiative.official_code` to the repository. An unknown program → 404 envelope, the same as the sibling reads. New service spec: null initiative → 404, repository not called. The two new tests use `mockResolvedValueOnce`. Added a SQL comment on the GROUP_CONCAT 1024-char cap. `as any` alias kept so the shared mock factory is not edited.
- **Cumulative diff:** 6 files, 422 insertions, 0 deletions.
- **Verification:** Jest `--maxWorkers=2 --silent --reporters=summary --forceExit --findRelatedTests <6 files>`: `Test Suites: 74 passed, 74 total`, `Tests: 2448 passed, 2448 total`. eslint `--quiet` clean. Repository `git diff -U0`: 0 `-` lines. No `migrations/`.
- **Not Done / Assumptions:** the user-run curl against a live stack (task "Done") is HITL and still pending. The blank-program 400 check is kept ahead of `resolveInitiative`, which gives the same status.

#### Attempt 2 — Reviewer (`akili-reviewer`, opus): **PASS**
- The attempt-1 issue is fixed and meets design §6 (404 via `resolveInitiative` → `returnErrorRes`, matching service L716/L1817). Re-confirmed: SQL population matches the drawer, SELECT-only and parameterised, `debug:false`, no PII, protected code untouched, no migrations.
- **ADVISORY (no rework):** (1) Reliability: the NaN-`versionId` service spec relies on the mock factory's default `findOne` returning an initiative, so add an explicit `mockResolvedValueOnce`. (2) Readability: move `findIndicatorResultStatusLinks` onto the shared mock factory in a later cleanup. (3) Risk: an inactive initiative now returns 404 even if links exist (matches the sibling contract).

#### Forward pointer → KRC-T-2
- The client must treat **any** error status, **including 404**, as "no counts": store `[]`, console log (`console.error`, see the T-2 delta), no toast (KRC-R-5.3). Include a 404 case in the fail-soft test.

#### Requirements covered
KRC-R-2 (population side), KRC-R-3 (no value filter), KRC-R-4/S-4.1 (server; additions only), KRC-R-5.1, KRC-NFR-2/3. NFR-1 → T-4.

#### User go-ahead (2026-11-03)
The user replied "continua" at the gate. T-2 starts against the T-1 contract (tasks §4 allows that). T-1 stays `[~]` until the user-run curl is recorded.

### KRC-T-2: Client API call, one-shot load, and matcher util — PASS

- **Date:** 2026-11-03. **Skills:** `angular-developer`, `tdd` (as listed). Effort `high` (exact parity with the drawer's anchor rule).

#### Attempt 1 — Implementer (`akili-implementer`, sonnet)
- **Files:**
  - New in `dashboard-lab/`: `kpi-status-counts.util.ts` (75), `kpi-status-counts.util.spec.ts` (72), `dashboard-lab.kpi-status-counts.spec.ts` (142).
  - Modified: `dashboard-lab.component.ts` (+42), `results-api.service.ts` (+9), `results-api.service.spec.ts` (+17).
- **Design:**
  - The util exports `rowAnchor`, `indexLinks` and `countsForRow`.
  - The component has a `kpiStatusLinksByKey` signal Map keyed `program|versionId`, a requested-keys Set guard, and a constructor effect on `selected().initiativeCode` + `effectiveVersionId()`. The effect waits for a non-null version.
  - `statusCountsFor(ind)` is the accessor for the rows. On any error the page stores `[]`, logs to the console and shows no toast.
- **Red run:**
  - The util spec failed first because the module was missing.
  - The dashboard-lab spec failed 4 tests before the wiring.
- **Green run:**
  - `--testPathPattern=kpi-status-counts`: 2 suites, 13 tests passed.
  - `--findRelatedTests` on the 3 source files: 445 suites, 11996 tests passed.
- **Lint:**
  - The Implementer could not run `npx eslint` (the client has no flat config). It ran `ng lint` on the new files only: clean.
  - The Leader then ran `ng lint --quiet` on the 2 modified files: 1 error, `dashboard-lab.component.ts:4162:9 no-console`, triggered by the `console.warn`.
- **Assumptions:**
  - Fixtures come from the T-1 repository mapping spec plus the drawer rule, because the real curl is pending.
  - The once-per-load test counts calls on the mocked ApiService. URL building is covered with `expectOne` in the API spec.

#### Attempt 1 — Reviewer (`akili-reviewer`, opus): **FAIL**
- **Adjudicated as conformant:**
  - The matcher mirrors the drawer: `rowAnchor` matches `parseTocIndicatorTargetId` line for line, and the include rule matches the loader's OR branch and its anchor-less branch.
  - KRC-R-5.2 is met: at most one request per program + version.
  - A null version loses no counts in practice, and the all-null case renders as today.
- **Issue 1:**
  - *Discovered Issue:* `dashboard-lab.component.ts:4162` `console.warn(...)` violates the repo's `no-console` rule, which allows only `error`.
  - *Violated Rule:* `tasks.md` §2 pre-flight lint on touched files, plus the client CI lint gate. KRC-R-5.3 ("logged to the console only") is met by any console method.
  - *Remediation:* use `console.error` with the same message and the status only; the spec spies on `console.error`; no `eslint-disable`. The Leader records the `warn` → `error` wording delta for design §8/§10 and tasks KRC-T-2.
- **ADVISORY (no rework):**
  - The once-per-load test covers AoW switches only, so `toHaveBeenCalledTimes(1)` should also follow the `statusCountsFor` calls. The Leader carries this into attempt 2 because tasks KRC-T-2 names "2 AoWs and 3 KPIs" (it is task text, not widening).
  - Re-check one real payload against the `LINKS` fixture when the T-1 curl lands, before T-4.
  - The util red run was a setup failure; the behavioral negatives were confirmed by mutation trace.
  - Typing: use `IndicatorResultStatusLink` instead of `any`.
  - The Set guard never retries after an error, which fits fail-soft and deserves a comment.

#### Attempt 2 — Implementer (`akili-implementer`, sonnet, effort high)
- `console.warn` → `console.error('KPI status counts unavailable', status)`, without `eslint-disable`. Added a comment: the requested-key guard does not retry after an error.
- `IndicatorResultStatusLink` typing in `store`/`next`. The spec spies on `console.error` (500 + 404). The once-per-load test now calls `statusCountsFor` on 3 KPI rows after the AoW switches, then asserts `toHaveBeenCalledTimes(1)`.
- **Verification:** Jest `--maxWorkers=2 --testPathPattern=kpi-status-counts`: 2 suites, 13 tests passed. `results-api.service.spec`: 1 suite, 346 tests passed. `ng lint --quiet --lint-file-patterns` on all 6 files: "All files pass linting."
- **Not Done / Assumptions:** none outstanding. No build or Cypress run (not required by the task). Fixtures still come from the T-1 mapping and need a re-check against a real payload before T-4.

#### Attempt 2 — Reviewer (`akili-reviewer`, opus): **PASS**
- The attempt-1 issue is fixed. The named conformance check passes: design §8/§10 and tasks KRC-T-2 say `console.error`, and no `console.warn` remains. Fail-soft holds for 500 + 404 (no toast). The "2 AoWs and 3 KPIs → exactly once" requirement is met.
- No regressions in drawer parity, once-per-load or null-version behaviour. The jest API mock in place of `HttpTestingController.expectOne` is equivalent at component level (`expectOne` covers the URL in the API spec).
- Red run / mutation: skipped on the re-check (a lint fix); attempt 1 already confirmed the behavioural negatives.

#### Requirements covered
KRC-R-1 (bucketing S-1.1/1.2/1.4), KRC-R-2 (S-2.1/2.2/2.3 matching; real-data parity → T-4), KRC-R-5.2, KRC-R-5.3/S-5.1.

#### Final status: PASS (2 attempts) — 2026-11-03

#### Execute-time spec wording delta (Leader, 2026-11-03)
`console.warn` → `console.error` in design §8 Load and tasks KRC-T-2 scope/tests. Reason: client lint `no-console` allows only `error`. Requirement KRC-R-5.3 is unchanged. Applied to the spec files below and carried to the attempt-2 Reviewer as a named conformance check.

### KRC-T-3: `app-kpi-status-chip` and placement in every KPI row layout — PASS

- **Date:** 2026-11-03. **Skills:** `angular-developer`, `spartan`, `tailwind-design-system` (as listed). Effort `medium`.

#### Attempt 1 — Implementer (`akili-implementer`, sonnet)
- **Files:** NEW `components/kpi-status-chip/kpi-status-chip.component.ts` (64) + `.spec.ts` (65), NEW `dashboard-lab.kpi-status-chip.spec.ts` (76). MOD `dashboard-lab.component.html` (6 chip sites, `@let counts = statusCountsFor(ind)`), `dashboard-lab.component.ts` (import + `imports` entry), `dashboard-lab.component.spec.ts` (KPC-S-12.1 exact `<td>` pin loosened to a regex on the cell start), `dashboard-lab/CLAUDE.md` (entry for the util + chip).
- **Sites:** full-view card ~288 (wrapper div), AoW table td ~603, AoW cards ~683 (wrapper div), By-AOW Level 3 ~1949, planned flat table ~2077, planned flat cards ~2103.
- **Tokens:** `resultStatusFg/Bg`; Editing = status 1 (`--pr-status-in-progress-*`); Submitted = 3; Pending review = `resultStatusFg(5)` (same pair as Submitted, text differs). Helm `hlmBadge`; host hidden when all counts are 0; `aria-label` on `role="group"`; native `title` tooltip (`prTooltip` would add a tab stop and bubble clicks into `openReportAside`).
- **Verification:** Jest `--testPathPattern=kpi-status`: 4 suites, 27 tests passed. `dashboard-lab.component.spec`: 99 passed. `ng lint` on 6 files clean. `ng build --configuration development` succeeded.
- **Not proven (by design):** layout, wrap and contrast → T-4.

#### Attempt 1 — Reviewer (`akili-reviewer`, opus): **FAIL**
- **Issue 1.** Discovered Issue: the Reporting tab's default `aows` view (dashboard-lab.component.html:1550-1622) renders KPI rows through the child `app-reporting-aow-table` (grouped `#indicatorRow`, reporting-aow-table.component.html:997+, and the "All indicators" flat table, Achieved cell :161-175). Neither has a chip. This is the main page for Karen's case; P-7 missed it. Violated Rule: requirements KRC-R-1 / KRC-S-1.1; design P-7 ("If false: chip missing on a layout"); tasks KRC-T-3 "Would FAIL if … a layout lacks the chip". Remediation: add a new input to the presentation-only reporting-aow-table (e.g. a `statusCountsFor` function, or index + `countsForRow`) bound from the host; render the chip in both layouts next to Achieved, outside the Achieved `<button>`, with no restyle; add per-layout locks in a spec; update its CLAUDE.md; Leader records the P-7 wording change.
- **Adjudicated as conformant:** the wrapper divs (no move or restyle); the KPC-S-12.1 loosening (the regex still pins the per-indicator cell start, and the Target assertion stays exact); Pending review on the Submitted pair (app-wide mapping, text always present); program-overview is not a gap (its Achieved is a program aggregate); the native `title` meets R-6.2 literally.
- **ADVISORY (no rework):** `title` cannot be reached by keyboard or touch; consider `prTooltip` with event isolation, as the PT badge already does in reporting-aow-table. `guided-creation.component.html:311` per-indicator "achieved" pill is out of P-7; confirm at T-4. The placement-spec proximity windows are fragile.

#### Budget tripwire (re-baselined 2026-11-03 to ~650 net LOC)
- Actual so far: T-1 422 + T-2 ~358 (69 modified + 289 new) + T-3 ~205 ≈ **985 net LOC** (≈1.5× the re-baseline). Review rounds: T-1 2, T-2 2, T-3 would need round 2.
- Cause: test volume again (≈60 % of lines are specs) and a P-7 premise gap (one more child component to wire).
- Leader action: stopped and escalated to the user before attempt 2.
- **User decision (2026-11-03):** "Fix + re-baseline". Attempt 2 wires the chip into `reporting-aow-table` (both layouts); the P-7 correction is recorded in design/tasks; the spec budget is re-baselined to **~1,200 net LOC**.
- **Execute-time spec edit (Leader, user-approved 2026-11-03):** design P-7 and tasks KRC-T-3 scope now name the `reporting-aow-table` layouts (grouped rows + "All indicators" flat table). Carried to the attempt-2 Reviewer as a named conformance check.

#### Attempt 2 — Implementer (`akili-implementer`, sonnet, effort high)
- **Files:** `reporting-aow-table.component.html` (+48/−24, mostly re-indent of the Achieved button into a new `flex flex-col items-center gap-1` wrapper), `.component.ts` (+11: input `statusCountsFor = input<((row) => KpiStatusCounts) | null>(null)`, chip import), `reporting-aow-table/CLAUDE.md` (+1), NEW `reporting-aow-table.kpi-status-chip.spec.ts` (3 tests); host `dashboard-lab.component.html` (+1, `[statusCountsFor]="statusCountsForRow"`), `dashboard-lab.component.ts` (+3, stable arrow `statusCountsForRow`), `dashboard-lab.kpi-status-chip.spec.ts` (+4, host-binding test). No existing test case edited.
- **Sites:** "All indicators" flat table Achieved cell (~162) and grouped `#indicatorRow` Achieved cell (~1167), with the chip outside the Achieved `<button>`.
- **Verification:** Jest `--maxWorkers=2`: `kpi-status` 5 suites / 31 tests passed; `reporting-aow-table` 5 suites / 242 tests passed; `dashboard-lab.component.spec` 99 tests passed. `ng lint` on 6 files clean. `ng build --configuration development` OK (only the existing Sass `@import` deprecation).
- **Not Done / Assumptions:** layout, wrap and contrast → T-4 (by spec design). Native `title` kept.

#### Attempt 2 — Reviewer (`akili-reviewer`, opus): **PASS**
- The attempt-1 issue is fixed. The named conformance check passes (P-7 and tasks scope match the code). The re-indent is whitespace-only (type, class, `[prTooltip]`, `(click)` and inner spans identical). Cell alignment is unchanged (centred cells; a hidden chip adds no gap). Per-layout locks fail if a chip is removed. No regression on attempt-1 items.
- **ADVISORY (no rework):** `@let krcCounts` (child) vs `counts` (host) naming. A chip click bubbles to `openRow` (acceptable, the chip is non-interactive). The narrow Achieved column wrap must be covered at the T-4 1280 px check for both child layouts.

#### Requirements covered
KRC-R-1 (S-1.1 no zero segments, S-1.2 order, S-1.3 renders nothing), KRC-R-6.1, KRC-R-6.2. KRC-R-6.3 → T-4.

#### Final status: PASS (2 attempts) — 2026-11-03

### KRC-T-1 — "Done" step closed (user-run curl, 2026-11-03)
- **Source:** the user ran `GET /api/results-framework-reporting/indicator-result-status-links?program=SP03` against the local stack (port 3400, no `versionId`, so the server-default phase) and pasted the response into this session. Token not echoed. A first attempt failed only because PowerShell's `curl` alias is `Invoke-WebRequest`; `curl.exe` / `Invoke-RestMethod` worked.
- **Result:** `statusCode: 200`, `message: "Indicator result status links retrieved successfully."`, 31 links across `toc_result_id` 7101, 7103, 7111, 7126, 7127, 7139, 7148.
  - Statuses seen: 1, 3, 5, 6. None of 4/7/8, as expected.
  - Every link has `anchors: []` and `has_unanchored: true`.
  - Result 11571 appears under two ToC results (7111 and 7126), which is a valid multi-link.
- **Shape check vs KRC-T-2 fixtures (Reviewer advisory):** the types match design §6 and the T-2 `LINKS` fixture: `toc_result_id` number, `related_node_id` UUID string, `result_id` number, `status_id` number, `anchors` number[], `has_unanchored` boolean. No change is needed.
- **Observations for KRC-T-4:**
  - The local DB is evidently not prod: ids ~11–12k, and Karen's prod result 34577 is absent.
  - In this data every link is unanchored, so the anchored branch (S-2.1) is not exercised by real rows here. The T-4 step 2 shared-node check on PRTest/prod remains the only real-data proof of that branch.
- **KRC-T-1 final status: PASS** (Reviewer PASS attempt 2 + Done step recorded).

### KRC-T-4 — local pre-check findings (user, 2026-11-03, before the PRTest deploy)
- **Source:** user screenshots of `localhost:4200/result-framework-reporting/entity-details/SP03?tocView=aows` (AOW01 Productivity+, HLO 1.1) and of the indicator drawer's "Reported results" view.
- **Parity (step 2, partial, local DB):**
  - Row "Tanzania - chicken: … Horasi chicken" shows the chip `1 editing · 2 submitted · 4 pending review` = 7.
  - Its drawer shows "7 results reported", with the split "4 pending review · 1 approved · 1 submitted · 1 editing". The Submitted group (approved + submitted) is 2.
  - **Chip = drawer** on this row. This is a single unanchored row; the shared-node / anchored check is still owed on PRTest.
- **Visual (step 3): FAIL.**
  - The user's words: "Eso se ve terrible ahí … no se ve para nada organizado".
  - In the ~70 px Achieved column the chip wraps one segment per line, and the `·` separators float.
  - This reopens KRC-T-3 placement (design §8 "Placed next to Achieved").
- **User direction (2026-11-03):**
  - The user prefers a "see reported results" button that opens the drawer directly.
  - Optionally it can also be an entry in the row's ⋯ menu.
  - The ⋯ menu already has "View reported results", which opens this drawer tab (spec `changes/indicator-reported-results`, IRR-AC-1).
  - The Leader is clarifying the exact design with the user before any spec edit.
- **Update (2026-11-03):** the user will produce a redesign of the row status indicator in Stitch, from a screenshot of the current local view and a Leader-written prompt. KRC-T-3 placement is paused until that design comes back; then a spec edit (design §8, possibly KRC-R-1 display scope) goes to the user for approval before any rework. No code changed.

### KRC-T-3 — REOPENED for redesign (2026-11-03) → PASS (attempts 3–4, below)
- **Trigger:** the KRC-T-4 local visual check failed (see the local pre-check findings above). The user then produced a redesign in Stitch ("Option A: hybrid chip on the taxonomy line") and approved the Leader's spec delta: "si vamos con estos cambios".
- **Approved spec edits (execute-time, user-approved):**
  - requirements: S-1.2 visible label is `pending` (full words stay in the aria-label and tooltip); KRC-R-6.2 tooltip gains "Click to see all N reported results."; new **KRC-R-7 / S-7.1** (the chip is a button that opens the drawer on Reported results, the same action as the ⋯ "View reported results", with no row click); index row added.
  - design §8 Chip: rewritten. One pill tinted by its top segment, `● N editing` most prominent, `›`, single line, placed after the tag pills. The Achieved column is restored to its pre-KRC markup. Stitch's "(0 valid)" note and the Status/Progress/Actions restyle are excluded.
  - tasks KRC-T-3: scope, tests and Covers updated, plus a coverage-closure row for R-7.
  - Correction sweep: grepped `next to`, `pending review`, `Placed next to` across requirements, design and tasks. No stale assertion remains; `proposal.md` is historical and was left as is.
- **Budget:** re-baselined by the user to **~1,400 net LOC** (≈1,155 used before the rework).
- **Status:** `tasks.md` KRC-T-3 `[x]` → `[~]`. The attempt counter resets for this rework. It is a new approved scope, not a FAIL loop on the old one; attempts are numbered 3+ below for traceability.

#### Attempt 3 (redesign) — Implementer (`akili-implementer`, sonnet, effort high)
- **Chip rewritten** as `<button type="button" hlmBadge>`:
  - Content: dot + bold `N editing` · `N submitted` · `N pending` + `›`, with `whitespace-nowrap`.
  - Tint follows the top segment (pairs 1 / 3 / 5 via `resultStatusFg/Bg`).
  - aria-label in full words; native `title` tooltip with the "Click to see all N reported results." text.
  - Hover and focus-visible states.
  - Click, Enter and Space call `stopPropagation` and emit `open`.
- **8 sites moved to the title/taxonomy block:**
  - Host (6): panel card, AoW table, AoW cards, By-AOW L3, planned flat table, planned flat cards. In the planned flat table (site 5) the title `<td [innerHTML]>` became a `<span [innerHTML]>` followed by the chip.
  - Child `reporting-aow-table` (2): after the PT badge.
  - Every Achieved region is back to HEAD. The KPC-S-12.1 loosening in `dashboard-lab.component.spec.ts` was reverted, and that file is back to HEAD.
- **Routing:**
  - Child: `(open)` → existing `openAchieved.emit(row)`, the ⋯ output → host `onReportingOpenAchieved` → `manageIndicator(row, row.__hlo, 'results')`.
  - Host: new `onKpiChipOpen(ind, groupTitle?)` on the same path.
  - The drawer is untouched.
- **Tests:**
  - Chip spec rewritten (8 tests).
  - Placement specs assert the chip sits in the title block and not in the HEAD Achieved markup.
  - 2 tests appended to `dashboard-lab.irr-wiring.spec.ts`.
- **Verification** (Jest `--maxWorkers=2`, one run at a time):
  - `kpi-status`: 5 suites / 36 tests passed.
  - `reporting-aow-table`: 5 suites / 243 tests passed.
  - `dashboard-lab.component.spec`: 99 tests passed.
  - `irr-wiring`: 4 tests passed.
  - `ng lint` clean; `ng build --configuration development` OK.
- **Not Done / Assumptions:** the 1280/640 visual and real keyboard activation are left for T-4. Native `title` was kept.

#### Attempt 3 — Reviewer (`akili-reviewer`, opus): **FAIL** (doc gate only)
- **Adjudicated as conformant:**
  - Achieved regions match HEAD at all 8 sites (insertion-only hunks).
  - The site-5 `<td>` → `<span>` change keeps the same sanitizer and restyles only the title cell.
  - KRC-R-7 holds at every site, and the row click/keydown is blocked.
  - `openAchieved` keeps its meaning (same output and payload as the ⋯ menu).
  - The KRC-R-6.2 wording matches the spec example verbatim.
- **Issue 1:**
  - *Discovered Issue:* the `Verified:` line of `reporting-aow-table/CLAUDE.md` was not re-stamped.
  - *Violated Rule:* `onecgiar-pr-client/CLAUDE.md` §10 "Folder docs".
  - *Remediation:* prepend the 2026-11-03 KRC-T-3 stamp.
- **ADVISORY (no rework):**
  - Reword KRC-R-6.1 ("Segments use…") to fit the single-tint pill. *Applied below.*
  - A dead `editing` branch remains in `ariaLabel`.
  - Sites 2 and 3 could pass `group` instead of matching on `result_title`.
  - Space is not exercised, and Enter is simulated via `click()`. Real keyboard activation goes to T-4.
  - The site-4 chip `<button>` nests inside a `role="button"` row (pre-existing pattern).
  - The focus ring uses `--pr-color-primary-400`; the guide names `-300` / `--pr-focus-ring`.
  - The dashboard-lab CLAUDE.md says "6 layouts"; it should state 6 host + 2 child.

#### Attempt 4 — Leader doc-only fix (no Implementer spawn)
- **Reason for inline:** a one-line folder-doc stamp, not production code. The rule "the Leader writes no code" is not engaged.
- **Doc fix:** prepended to line 3 of `reporting-aow-table/CLAUDE.md`: `2026-11-03 · qa-development-2026-ss · result-framework-reporting/kpi-row-status-counts KRC-T-3 (…) · prior: 2026-10-31`.
- **Spec coherence:** requirements KRC-R-6.1 reworded to "The chip is tinted with one existing status token pair … chosen by its most important segment (design §8) … text + colour, never colour alone". No behaviour change.

#### Attempt 4 — Reviewer (`akili-reviewer`, opus): **PASS**
- The stamp is fixed per client §10. KRC-R-6.1 matches design §8 L87. The chip `tint()` picks `segments()[0]` (ordered, zero counts dropped), and every segment shows its count and label.

#### Requirements covered
KRC-R-1 (S-1.1/1.2/1.3), KRC-R-4 (Achieved untouched in the UI), KRC-R-6.1, KRC-R-6.2, KRC-R-7 (S-7.1). KRC-R-6.3 and real keyboard activation → T-4.

#### Concurrency note (Leader, 2026-11-03)
- Another session's uncommitted work shares this checkout: spec `changes/innovation-use-farmer-count-nature`, which includes a migration. It overlaps our files `results-framework-reporting.controller.ts`, `results-framework-reporting.service.ts` and their specs.
- KRC commits must stage only KRC hunks (`git add -p`) and explicit paths.

#### Final status: PASS (redesign, attempts 3–4) — 2026-11-03

## Ownership transfer (2026-11-03)
- Session `onecgiar-pr-41` messaged this session (`onecgiar-pr-02`). It said Santiago had asked it to take over this spec, with a new direction: a "N results reported · N editing" button, the breakdown moved to the drawer header, and Approved (6) split from Submitted.
- `onecgiar-pr-02` stopped. No delegation was outstanding. It sent pr-41 a handoff of the full state: task statuses, the approved execute-time deltas, the files shared with P2-4048, and the real-data evidence so far.
- From this point the next entries in this log belong to `onecgiar-pr-41`.

## Pivot Record: KRC-R-1 grouping and row display (amendment #2, 2026-11-03)

- **Leader:** session `onecgiar-pr-41`. It took over this spec at Santiago's request. The previous Leader session (`onecgiar-pr-02`) confirmed it stopped and will not edit KRC files. Its handoff: T-1..T-3 `[x]`, T-4 `[ ]`; local evidence of 31 links, all unanchored; the Tanzania-chicken row chip matched the drawer (7 = 1 editing + 2 submitted + 4 pending).
- **Trigger (user observation, local screenshot):** on SP03 HLO 1.1, the row "Mali - small ruminants: … CBBP governance …" showed `1 submitted`, while the drawer listed #9861 (bilateral) as **Approved**. The chip folded status 6 into "Submitted" per the original KRC-R-1 (OQ-1 default). The count was correct, but the label contradicted the drawer pill, and bilateral results are approved, never submitted.
- **Decision (Santiago, 2026-11-03):**
  1. Split **Approved (6)** into its own group; Submitted = 2+3. Quality Assessed (2) under Submitted stays open with Nicoleta (OQ-1).
  2. The row chip becomes one button, `N result(s) reported`, plus `· N editing` only when Editing > 0 (the option recommended to him over a bare button).
  3. The full breakdown `N editing · N submitted · N approved · N pending` moves to the drawer's Reported results header (new KRC-R-8).
- **Hard-rule change (user-lifted):** "no edit to the indicator drawer" is lifted **only** for the KRC-R-8 header breakdown line. It is additive, presentation only, and computed from the drawer's already-loaded list. The list, the Σ contribution, the fetch and every other drawer element stay unchanged.
- **Budget tripwire:** ~1,400 net LOC was already used against the re-baselined ~1,400. Santiago re-baselined to **5 tasks · ~1,600 net LOC** (new KRC-T-5, ~200 LOC).
- **Spec edits:**
  - requirements: KRC-R-1, S-1.1, S-1.2, S-3.1, R-6.1, R-6.2, S-7.1 GIVEN and the OQ-1 row amended; new S-1.5 (bilateral approved only); new KRC-R-8 / S-8.1.
  - design §8: Matcher step 5, Chip inputs/content/aria, and a drawer header breakdown block.
  - tasks: budget line, pre-flight hard-rule exception, new **KRC-T-5** before T-4, T-4 depending on T-5, graph and coverage rows. The superseded T-2/T-3 lines are marked "superseded by KRC-T-5" rather than rewritten, because those tasks are `[x]` history.
- **Correction-closure sweep:**
  - Forward (`2/3/6`, `2 submitted · 1 pending`, `7 editing · 1 pending`, `shows 1 editing`): the only survivor is design DD-1, which describes `getIndicatorContributions`' own population. That one is correct and left as is.
  - Backward (`KRC-R-1`, `S-1.2`, `KRC-R-6.2` references in design/tasks): updated or marked superseded.
- **No ADR affected.** KRC-R-2 parity (button N = drawer count) is unchanged.

## Pivot Record (narrowing): KRC-R-8 drawer breakdown — 2026-11-03 #3

- **Trigger:** the KRC-T-5 attempt 1 Implementer reported that the drawer already has an IRR-R-11 `statusSplit` line (status names, shown when 2+ statuses, e.g. `1 quality assessed · 1 editing · 1 submitted`). The new KRC-R-8 line duplicated it, so the header showed two similar breakdowns.
- **Decision (Santiago):** "Quitar la nueva". Revert the KRC-T-5 drawer changes. KRC-R-8 is now satisfied by the existing IRR-R-11 line, which already separates Approved and matches the list pills' names. **The "no drawer edit" hard rule is restored** (the #2 exception is withdrawn).
- **Spec edits:** requirements KRC-R-8/S-8.1 rewritten; the R-1 pointer now names the existing split line; R-6.1 no longer mentions drawer segments; design §8 drawer bullet replaced; tasks pre-flight exception withdrawn; KRC-T-5 drawer scope/test/FAIL lines updated.
- **Correction-closure sweep:** grep `drawer header` / `irr-breakdown` / `statusBreakdown` across the spec folder, run after this edit (see the T-5 entry).

### KRC-T-5 — "N results reported" button, Approved split (amendment #2; drawer part withdrawn #3)

- **Status:** PASS · **Date:** 2026-11-03 · **Leader:** session onecgiar-pr-41
- **Attempt 1:** `akili-implementer` (effort medium; skills `angular-developer`, `spartan`, `tailwind-design-system`).
  - **Files:**
    - `kpi-status-counts.util.ts`: `approved` added; `statusGroupOf` exported; 1→editing, 2/3→submitted, 6→approved, 5→pendingReview.
    - `components/kpi-status-chip/kpi-status-chip.component.ts`: `approved` input; content `N result(s) reported` + `· ● N editing` + `›`; tint is the Editing pair, else neutral `resultStatusFg/Bg(4)`; aria-label lists the non-zero groups.
    - `dashboard-lab.component.{ts,html}`: zero fallback `approved: 0`; 6 chips bind `[approved]`.
    - `components/reporting-aow-table/reporting-aow-table.component.html`: 2 chips bind `[approved]`.
    - Specs: util, chip, `dashboard-lab.kpi-status-chip`, `dashboard-lab.kpi-status-counts`, `reporting-aow-table.kpi-status-chip`.
    - `CLAUDE.md` stamps.
  - **Drawer:** the Implementer first added a header breakdown line. It duplicated the existing IRR-R-11 `statusSplit`, so the user decided (#3) to remove it, and the Leader requested a rework before review. The drawer files were `git restore`d. Leader-verified: `git status` on `components/indicator-drawer/` is empty.
  - **Verification:**
    - First run (before the drawer revert): `1 failed, 43 passed`. The 2 failures were in the new drawer tests (separator whitespace), now removed with the drawer revert.
    - Red (mutation: util maps 6 → submitted): `Tests: 2 failed, 19 passed, 21 total`, in util spec `S-1.2 mixed …` and `status 6 is approved, 2 and 3 are submitted`, with the diff `approved 1→0`, `submitted 2→3`.
    - Green: util + chip `21 passed`. Full related run (util, chip, dashboard-lab, reporting-aow-table, indicator-drawer): `Test Suites: 44 passed; Tests: 1384 passed`.
    - `ng lint` (repeated `--lint-file-patterns`): pass.
- **Reviewer** (`akili-reviewer`, lens checklist): `STATUS: PASS`. All 6 named checks hold:
  - the Approved split;
  - the row text;
  - the aria-label (KRC-R-6.2 verbatim);
  - the neutral tint, an existing token in `colors.scss:243-244` and the `FALLBACK` pair;
  - no drawer change;
  - KRC-R-2 sum.

  All 8 `app-kpi-status-chip` hosts bind `[approved]`, and the template-lock spec requires it.
- **ADVISORY:**
  - Spec text: the stale tint cascade at design L87 and a mislabel at L88. **Applied by the Leader as a spec-only edit:** L87 now states the amended tint rule, and L88 is relabelled "amended #2".
  - S-1.5 "anywhere" vs the generic tooltip. **Applied:** S-1.5 now reads "row text and accessible label".
  - The stale T-3 bullet in `dashboard-lab/CLAUDE.md` L245 is not marked superseded, and the T-5 bullet is in English inside a Spanish section. → Pending item for `/akili-archive`.
  - Risk: the neutral pair equals the colour used for Discontinued/Draft. → Watch in the T-4 PRTest visual check.
- **Requirements covered:** KRC-R-1 (amended), S-1.1/1.2/1.3/1.5/3.1, KRC-R-2, KRC-R-6.1/6.2, KRC-R-7, KRC-R-8 (narrowed).
- **Decisions:** the approved option ("N results reported" + "· N editing") is from Santiago; the drawer is kept untouched per the #3 decision.

## Pivot Record (style): KRC-R-6.1 tint — 2026-11-03 #4

- **Trigger:** the Leader checked the local served bundle with Claude in Chrome (SP03 › AoW01 › HLO 1.1; read-only, expand and open-drawer clicks only).
  - **Behaviour confirmed:**
    - Mali-CBBP shows `1 result reported` and the drawer lists #9861 Approved (1 = 1, no "submitted").
    - Tanzania-chicken shows `7 results reported · 1 editing`, and the drawer shows 7 with the split `4 pending review · 1 approved · 1 submitted · 1 editing`.
    - Uganda-pigs shows `8 · 7 editing`; Kenya-dairy shows `2 · 2 editing`.
  - **Problem:** Santiago did not understand the grey vs yellow pills. The grey neutral looked like the adjacent tags (`ILRI`) and like the drawer's Approved/Pending pills. The yellow tinted the whole pill although only part of the results were editing. Nothing explained either colour.
- **Decision (Santiago):** colour only on the word it explains. The button is neutral and outlined on every row, and only the `● N editing` badge is yellow.
- **Spec edits:** requirements KRC-R-6.1; design §8 ("Button + editing badge"; the #2 neutral tint is withdrawn); tasks KRC-T-5 gets an amendment #4 bullet, and its status goes `[x]` → `[~]` until the rework passes review.
- **Open question for Nicoleta:** should Pending review (bilateral results awaiting the SP's review) also be highlighted? Not in scope.

### KRC-T-5 amendment #4: rework result and the separator decision (2026-11-03)

- **Implementer (rework #4):** `kpi-status-chip.component.ts`.
  - The root is now a neutral outlined `<button>`: background `--pr-surface-card`, border `--pr-border`, text `--pr-color-secondary-400`, hover `--pr-border-strong` / `--pr-surface-ground`, focus ring `--pr-color-primary-400`, `h-[20px]`.
  - The inner `<span data-part="editing">` uses `resultStatusFg/Bg(1)` and renders only when editing > 0.
  - `data-tint`, `HlmBadge` and the neutral-4 tint are removed. The aria-label, tooltip and KRC-R-7 behaviour are unchanged.
  - Spec: a new describe "amendment #4". The source-lock test is the guard against re-tinting the root, because jsdom drops `var()` inline values.
  - Red, from a temporary root re-tint: `1 failed, 15 passed, 16 total`. Green: `16 passed`.
  - Related run (chip, dashboard-lab, reporting-aow-table): `Test Suites: 41 passed; Tests: 1297 passed`.
  - Lint on the chip folder: pass. Drawer folder: clean.
- **Reviewer:** `STATUS: FAIL`, one issue. The rework dropped the visible `·` before the editing badge and edited two chip-spec text expectations to match, while S-1.1, S-1.2, S-3.1 and design L88 still require `· 1 editing`. Every other check passed:
  - all six tokens exist in `colors.scss`;
  - there is no `--pr-status-*` on the root;
  - the badge carries text;
  - there is one click target;
  - there is no R-6.2 / R-7 regression;
  - the source-lock guard is acceptable.
- **Leader adjudication:** a spec gap, not an Implementer error. The mock-up Santiago approved for #4 was `[ 8 results reported › ] [● 7 editing]`, with no `·`, because the badge is its own visual separator. The Leader verified this on the served bundle in Chrome (SP03 › HLO 1.1): neutral buttons on every row, and a yellow badge only on the editing rows. Screenshot: `C:\Users\santiagosanchez\AppData\Local\Temp\claude-chrome-screenshots-GoES6n\screenshot-1793729687693-3.png`. **The spec is amended as part of Pivot #4:**
  - requirements R-1, S-1.1, S-1.2, S-3.1, S-7.1 GIVEN, and the S-1.1 BUT clause;
  - design §8 Content;
  - both folder `CLAUDE.md` bullets.

  The code and its spec stay as they are. The Reviewer re-reviews against the amended text.

- **Re-review (same Reviewer):** `STATUS: FAIL`, text only. The chip code conforms to the amended requirements and design. Two leftovers:
  1. Four lines in `tasks.md` still use the old wording: KRC-T-5 Scope L156, Tests L163, Would-FAIL L168, and coverage L209.
  2. The chip's JSDoc (L13-14) still describes `· ● N editing`.

  The Reviewer said this becomes a PASS once both fixes land, with no further code review needed.
- **Leader fix (spec text):** the four `tasks.md` lines are rewritten to the badge form, and the #2 neutral-tint clause is marked superseded by #4. The JSDoc fix is sent to the Implementer, because it sits in a production file.

- **Final re-review (same Reviewer): `STATUS: PASS`.** Both text fixes are in. The JSDoc is rewritten (comment-only, lint passes). The code had already conformed at the previous review. ADVISORY: the chevron position was described two ways. The Leader aligned `tasks.md` L156 to the rendered order (total, then badge, then `›` at the end, as verified in Chrome). Re-check it at the T-4 visual step.
- **KRC-T-5 final status: PASS (amendments #2–#4), 2026-11-03.** Requirements covered: KRC-R-1 (amended), S-1.1/1.2/1.3/1.5/3.1, KRC-R-2, KRC-R-6.1 (#4), KRC-R-6.2, KRC-R-7, KRC-R-8 (narrowed). Pending for `/akili-archive`: the stale T-3 bullet in `dashboard-lab/CLAUDE.md` L245, and an English bullet inside a Spanish section.
