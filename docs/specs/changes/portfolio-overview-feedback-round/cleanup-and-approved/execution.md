# Execution — Portfolio Overview: cleanup + W3 Approved (PCA)

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/portfolio-overview-feedback-round/cleanup-and-approved` |
| Branch | `qa-development-2026-ss` (no commit without explicit user go-ahead) |
| Approval Mode | `gated` — user asked 2026-11-04 to run all tasks to the end ("continua hasta que termines"); gates auto-pass on PASS, HALT/pivot/V-1 still stop |
| Leader | Claude Code session (opus); Implementer `akili-implementer`, Reviewer `akili-reviewer` wrappers |
| Started | 2026-11-04 |

## 2. Pre-flight

| Item | Result |
|---|---|
| Free RAM | ~6.4 GB at start (> 4 GB); all Jest runs `--maxWorkers=2`, scoped, one at a time |
| Guide read | Implementers briefed to read `portfolio-overview/CLAUDE.md` |
| V-1 SQL | Handed to the user inline in chat 2026-11-04; result pending |
| Tooling note | `npm run test:local -- --testPathPattern=…` exited 1 with no Jest output during T-1 (not investigated); evidence uses `npx jest --no-coverage --maxWorkers=2 --testPathPattern=…`. Plain `npx eslint` has no flat config; lint evidence uses `npx ng lint --quiet --lint-file-patterns <files>` |

## 3. Task Execution History

### PCA-T-1 — Service: drop % fields, W3 split by status slot — PASS (2026-11-04)

- **Attempts:** 1 · effort medium · skills `angular-developer`, `tdd` (as listed)
- **Files:** `internationalization/portfolio-overview.copy.ts` (+9, `w3Split`), `services/portfolio-overview.service.ts` (`PortfolioW3SplitPart`, `bilateralNewSplit`, `bilateralReplicatedSplit`; removed `w1w2SubmittedPercent`, `bilateralApprovedPercent`, `bilateralCentersCount`, `bilateralNewSubmitted/Editing`), `services/portfolio-overview.service.spec.ts`, `portfolio-overview.component.spec.ts` (−1: `bilateralCentersCount` assertion, field gone), `portfolio-overview.component.html` (Leader-approved minimum: two chip spans deleted; `kpi-bilateral-split` loops `bilateralNewSplit`). Diff +98/−61.
- **Verification:** `npx jest --no-coverage --maxWorkers=2 --testPathPattern=portfolio-overview.service` → 2 suites / 91 tests passed. `--testPathPattern=portfolio-overview.component` → 2 failed / 342 passed; both in `portfolio-overview.component.spec.ts` (~L217, ~L226), old sub-line copy ("Submitted 8 · Editing 1" / "Submitted 0 · Editing 0") → **carried to PCA-T-2**. `ng lint` on changed ts → clean. Grep: no reader of removed fields outside `dashboard-lab/program-overview` (independent, P-6).
- **Not Done / Assumptions (verbatim gist):** no red-run captured (spec edited first, run only after implementation). Reviewer traced the falsifier instead: the status-2 New row would push Approved 2→3 and break both the ordered `toEqual` and the sum check. Recorded as a process gap, not owed scope.
- **Reviewer:** `STATUS: PASS` — fields removed + asserted absent; split via `resolveStatusSlot` (DD-1); Approved on both lines (DD-2); order/visibility, copy labels, sums, W1/W2 untouched, no dead imports; template edit within approved minimum.
- **ADVISORY (not gating):** (1) readability — inline `@for … {{{ part.label }} … }}}` brace packing; split it when T-2 rewrites the sub-line. (2) `tally()` still computes `newSubmitted/newEditing` for W3 (harmless, W1/W2 uses helper). (3) `npm run test:local` wrapper failure should be looked at before T-4.
- **Forward pointers → PCA-T-2:** fix the 2 component-spec assertions; add Replicated sub-line + `kpi-bilateral-replicated-split`; advisory (1).
- **Requirements covered:** PCA-R-1 (data side), PCA-R-3 (logic).

### PCA-T-3 — Centers block: dedupe by result, drop chip/%/Centers reporting — Reviewer PASS, **[~] pending V-1** (2026-11-04)

- **Attempts:** 1 · effort medium · skills `angular-developer`, `tdd`, `spartan` (as listed). Ran in parallel with T-1 review (disjoint files; Jest runs serialized).
- **Files:** `centers-block.aggregate.ts` (+`dedupeById`, −`sumRows`), `centers-block.aggregate.spec.ts`, `centers-block.component.ts` (`distinctRows`, `statusTotals`; `kpis()` = `{bilateral, bilateralNew, bilateralReplicated}`; removed `viewRows`, `centerTotals`, `loadedCenterRows`, `centersReporting`, `centersCount`, `bilateralApproved`), `centers-block.component.html` (chip, Centers reporting card, tile `(N%)` removed; grid single column; bar width kept), `centers-block.component.spec.ts`, `internationalization/portfolio-centers-block.copy.ts` (−`kpiBilateralChip`, `kpiCentersReporting`, `kpiReportingHint`; subtitle "Each result counts once, even when several Centers share it."). Diff +153/−97.
- **Red run:** new PCA-T-3 describe → 6 failed (e.g. `Expected: 3 / Received: 4` — id 10 shared by both Centers counted twice; tile text `Editing1(25%)…`; grid `sm:grid-cols-2`).
- **Green:** `npx jest --no-coverage --maxWorkers=2 --testPathPattern=centers-block` → 3 suites / 81 tests passed. `ng lint --quiet` on 5 ts → clean. No `ng build`.
- **Existing assertions changed (task requires the record):** `centerTotals()`→`statusTotals()` (same values); "builds one row per Center" dropped `viewRows()[0].counts`; KPI test → `toEqual {bilateral:3,bilateralNew:3,bilateralReplicated:0}` (removed `bilateralApproved`≈33.3, `kpi-centers-reporting` "2 / 2"); RCP-5 `toEqual` on 3 fields; CNR-T-2 cases 1/6/8/9 dropped `centersReporting`/`centersCount`/`bilateralApproved` (case 6 renamed "adds nothing to the figures"); GLF multi-Center test dropped `viewRows` codes + denominator; GLF "a selected Center with no rows still counts in the denominator" **deleted** (only tested removed fields); aggregate `sumRows` describe → `dedupeById` describe.
- **Assumption:** rows with null/undefined `id` are all kept (real API rows always carry an id; old fixtures lack it).
- **Reviewer:** `STATUS: PASS` — dedupe by `id` after the Center filter; KPIs, donut, tiles all read `distinctRows`; filters compose; retry/partial unchanged; bar kept; `%` tests non-vacuous; removed assertions all target intentionally removed fields.
- **ADVISORY (not gating):** (1) sr-only donut table in `centers-block.charts.ts` keeps a "Share %" column — out of R-5 scope (chip + tiles); removing it is a product decision. (2) `portfolio-overview/CLAUDE.md` L53–56 + DD-4 still describe the old rules → PCA-T-4 (R-7). (3) `status-tile-5` `toContain('1')` weak but covered by `segments()` assertion. (4) No `ng build` → template not type-checked; confirm in T-4.
- **Forward pointers → PCA-T-4:** advisory (2) guide lines; advisory (4) template type-check (scoped build or served-bundle check).
- **Open:** V-1 result from the user (`w3_total` vs `w3_with_center`). Task stays `[~]` until it is recorded.
- **Requirements covered:** PCA-R-4 (code), PCA-R-5, PCA-R-6 (code; full-width visual → T-4).

### PCA-T-2 — Page template: remove chips and tile %, render W3 split — PASS (2026-11-04)

- **Attempts:** 1 (plus one Leader re-brief inside the attempt to finish owed scope; no Reviewer FAIL) · effort medium · skills `angular-developer`, `spartan` (as listed). Started after T-3's tests finished (Jest serialized).
- **Files:** `portfolio-overview.component.html` (tile `({{ segment.percent }}%)` removed, `[style.width.%]` kept; `kpi-bilateral-split` rewritten multi-line (T-1 advisory 1); new `kpi-bilateral-replicated-split` under Replicated), `portfolio-overview.component.spec.ts`. Combined file diff incl. T-1 edits +90/−13. No new copy.
- **First report `Not Done`:** split text asserted only on the page fixture (all Editing), not the task's T-1 fixture string → Leader re-sent the Implementer for the owed test + real card click + falsifier run.
- **Verification (final):** `npx jest --no-coverage --maxWorkers=2 --testPathPattern=portfolio-overview.component` → 15 suites / 353 tests passed. `ng lint` on spec → clean.
- **Falsifier:** temporarily re-added `<span class="chip">x</span>` to the W3 header → `renders no percentage and no placeholder chip in the deck cards (PCA-R-1)` failed `Expected: 1 Received: 2`; reverted (grep 0).
- **Assertions changed:** `kpi-bilateral-split` "Submitted 8 · Editing 1" → "Submitted 4 · Approved 0 · Editing 5"; empty case → "Submitted 0 · Approved 0 · Editing 0"; replicated-split assertions added to both. New tests: deck no `%` + single-child headers; 6 tiles exist → no `%`, bar width 60%, click → `toggleStatus('editing')`; split with real status ids → New `Submitted 1 · Approved 2 · Editing 3 · Quality Assessed 1`, Replicated `Submitted 0 · Approved 4 · Editing 2 · Rejected 1`, counts 7/7, real W3 card click → `/result-framework-reporting/bilateral-results`.
- **Reviewer:** `STATUS: PASS` — R-1/R-2/R-3 template conformance; `toggleStatus` is a one-line wrapper over `toggleValue('status', key)` (`portfolio-overview.component.ts:254`), click binding untouched.
- **ADVISORY (not gating):** header test locates the header via `div.justify-between` (styling class); a `data-testid` per card header would be sturdier.
- **Requirements covered:** PCA-R-1, PCA-R-2, PCA-R-3 (render).

### PCA-T-4 — Guide sync + visual check — in progress (2026-11-04)

**Leader deviation:** guide-sync part started while T-3 is `[~]` (code PASS, only V-1 pending). V-1 can only add an optional note line (`centers-no-center-note`); if it does, the guide gets one more line in the same task. Visual check pending the stack (no listener on 4200/3400).

- **Attempt 1** · effort low-medium · no skills (docs) · file: `portfolio-overview/CLAUDE.md` (+/− 47-line diff). Related Jest: `npx jest --no-coverage --maxWorkers=2 --findRelatedTests <11 changed files>` → 31 suites / 1061 tests passed. Sweep greps reported; guide 126 lines (cap 120, was 125).
- **Reviewer attempt 1: `STATUS: FAIL`** (verbatim):
  1. Discovered Issue: New L22 rule "No % figures as text" is unscoped and names one exception, but the page still renders % text in 4 out-of-scope places: `typology-card-percent` (typology-block.html L26), `toc-kpi-percent`/`toc-kpi-summary-percent` (toc-kpi-block.html L53/L109), `projects-kpi-percent` (projects-block.html L60/L65), Centers donut tooltip `formatter: '{b}: {c} ({d}%)'` (centers-block.charts.ts L77). A later agent would read these as violations and remove them. L22 also contains the literal `% approved`, so the Done grep still matches. · Violated Rule: requirements.md §PCA-R-7 (rules must be true to the tree so later agents do not re-add/remove); tasks.md PCA-T-4 Done "guide grep has no `% approved`"; PCA-R-5 scope is chip + tiles. · Remediation: scope the rule to the KPI deck, the Status section and the Centers block chip/tiles; name the two Centers exceptions (sr-only "Share" column, donut tooltip `({d}%)`); state Typology / ToC KPI / Projects percentages are out of scope and stay; reword so literal `% approved` disappears.
  2. Discovered Issue: L20 rewrote the `kpis()` contract and dropped `w1w2NewSubmitted`/`w1w2NewEditing` and the Editing = `status_id === 1` rule, which are still live (service L82-83, L290/L342-343; `kpi-w1w2-split` html L139); L47-48 no longer mention the W1/W2 Submitted/Editing split. · Violated Rule: requirements.md §PCA-R-7 (only drop statements this spec reverses). · Remediation: restore the W1/W2 fields in L20 ("`w1w2NewSubmitted`/`w1w2NewEditing` (Editing = `Number(status_id) === 1`, otherwise Submitted; W1/W2 only)"); deck bullet says W1/W2 card keeps Submitted / Editing (`kpi-w1w2-split`); keep the `resolveStatusSlot` rule scoped to W3.
- **Leader adjudication:** both in scope (R-7). Attempt 2 → effort medium.
- **Attempt 2** · effort medium · same file. Fix 1: L22 scoped to KPI deck, Status section and Centers chip/tiles (PCA-R-5); Centers exceptions named (sr-only "Share %" column, donut tooltip `({d}%)`); Typology / ToC KPI / Projects % stay. Fix 2: L20 restores `w1w2NewSubmitted`/`w1w2NewEditing` (Editing = `Number(status_id) === 1`); deck bullet keeps `kpi-w1w2-split`; `resolveStatusSlot` rule W3-only. Greps: `% approved` 0, `counts once for each` 0. No Jest rerun (docs only; related suite green in attempt 1).
- **Reviewer attempt 2: `STATUS: PASS`** — every claim verified against the tree (charts.ts L77, L116-117; typology-block.html L26; toc-kpi-block.html L53/L109; projects-block.html L60/L65; service L82-83/L290-293/L342-343; html L139, L289). Three 🛑 lines present (L21, L22, L45).
- **Budget note:** T-4 guide part used 2 review rounds vs 1 budgeted → reported to the user.
- **Still open for `[x]`:** visual check (HITL, read-only, served bundle must contain `kpi-bilateral-replicated-split`) + user confirms screenshots; possible V-1 note line.

## V-1 result (PCA-DD-4 gate) — 2026-11-04

Run by the user in DBeaver on PRMSPROD / prdb (screenshot shared in chat): **`w3_total` = 324 · `w3_with_center` = 287** → 37 open-phase W3 (`source = 'API'`) results have no active `results_center` link. Expected deduped Centers block total = 287. Deck W3 total still to be read on the served page (the deck classifies by `source_name === 'W3/Bilaterals'`, P-1, so 324 is the expected but unconfirmed deck value). Note-line decision pending the user.

### PCA-T-3 follow-up — no-Center note (V-1 gate, user chose "Add the note" 2026-11-04)

- **Attempt 1** · effort medium · skills `angular-developer`, `tdd`, `spartan`. Files: `centers-block.component.ts` (inputs `deckW3Total`, `deckVersionId`; computed `noCenterCount`), `.html` (`<p data-testid="centers-no-center-note">` under the W3 total, `@if (noCenterCount() > 0)`), `.spec.ts` (describe "PCA-T-3 V-1 gate"), `portfolio-centers-block.copy.ts` (`noCenterNote(count)` with singular/plural), `portfolio-overview.component.ts` (`centersDeckW3Total`: null unless `hasFigures() && !isPartial() && !filtersPending()`), `portfolio-overview.component.html` (2 bindings), guide +1 line. Hidden while loading, on a partial load, on a phase mismatch, or when `notAffected()` is non-empty. Red: 4 failed / 48 passed. Green: centers-block 3 suites / 88 tests; portfolio-overview.component 15 / 360. Lint clean.
- **Reviewer attempt 1: `STATUS: FAIL`** (verbatim gist): under an active Center filter the deck keeps only results linked to a selected Center (`matchesRow`, portfolio-filters.ts L105), so a non-zero N cannot mean "no Center"; it can only come from the P-1 classification gap. Violated rule: PCA-R-4 Scenario ("no filter active"), PCA-DD-4 L129. Remediation: return 0 when any global dimension is active, add Center and Program specs, update the guide line.
- **Attempt 2** · effort high · `noCenterCount` returns 0 when `isActive(selection())`. New spec covers center `{CENTER-13}` and program `{SP01}` (no note). Guide line updated. Red: 1 failed / 52 passed. Green: centers-block 3 suites / 89 tests. Lint clean.
- **Reviewer attempt 2: `STATUS: PASS`**. `isActive()` checks all 5 dimensions (portfolio-filters.ts L34-35), and the new spec would have failed before the fix.
- **ADVISORY / residue (R-4 Scenario NOT closed):** on the live local page (localhost:4200, TEST ENVIRONMENT banner, phase Reporting 2026 – P25, no filter, all Centers loaded) the deck W3 shows **615** (New 496, Replicated 119) and the Centers block shows **645** (New 499, Replicated 146). The block is 30 above the deck, the reverse of the V-1 direction (prod: 324 vs 287). V-1 does not explain it. Likely cause: P-1 (deck `source_name === 'W3/Bilaterals'` vs Centers `source = 'API'`). Also, the local stack reads a different DB/phase than the prod V-1 run, so the two sets of numbers cannot be compared. The note stays hidden (deck < distinct) as intended. Escalated to the user before T-3 is marked `[x]`.
- **Budget:** this follow-up was not in the 4-task budget (user-approved scope through the V-1 gate). It took 2 review rounds.

## Visual check (PCA-T-4 HITL) — 2026-11-04, Leader, read-only

Served bundle confirmed: `kpi-bilateral-replicated-split` is present, so the new code is live. Navigation only, no write button, no storage touched. Desktop (2560-wide window):
- The deck has no chips. W1/W2 shows `Submitted 37 · Editing 399`. W3 New shows `Submitted 147 · Approved 40 · Editing 296 · Rejected 13` (= 496). Replicated shows `Submitted 0 · Approved 1 · Editing 117 · Discontinued 1` (= 119).
- The status tiles show label + count with no `%`, and the bars are kept.
- The Centers block has no chip and no Centers reporting card. The grid is `grid grid-cols-1 gap-[16px]`, the W3 card is full width, and the subtitle is new. The note is absent (deck < distinct).
- Screenshots: `C:\Users\santiagosanchez\AppData\Local\Temp\claude-chrome-screenshots-Sh9Zs7\screenshot-1793800832201-5.jpg` (deck), `…\screenshot-1793800935319-6.jpg` (Centers block).
- **Not done:** the ~390 px check. `resize_window` had no effect because the window is maximized (innerWidth stayed 2560). Handed to the user (DevTools device mode).
- **Not verified:** the R-3 Scenario "Approved = Results Center W3+Approved". The deck says 41 (40+1), the Centers block says 40. The Results Center comparison needs the user.

## Gap analysis — deck 615 vs Centers 645 (2026-11-04, user-run SQL on the DB behind the local stack, version 36 = Reporting 2026)

Server rules compared: deck = `result.repository.ts` ~L764 (`source <> 'Result'`, INNER JOIN active lead initiative `rbi.initiative_role_id = 1` + `ci.active`, excludes types 10/11); Centers = `getResultsByBilateralCenter` ~L4243 (`source = 'API'`, active `results_center`, no lead-initiative requirement, `rt.is_active`).

Q1 (DISTINCT r.id): `deck_w3` 615 · `centers_w3` 646 · `centers_sin_lead_initiative` 41 · `centers_tipo_10_11` 0 · `deck_sin_center` 10 · `otras_fuentes` 0. Reconciles exactly: 615 − 10 + 41 = 646. Page shows 645 → 1 result whose Center is not in the client Center catalogue (unverified).

Q2 (the 41): 30 = replicated Innovation use (type 2, `is_replicated = 1`, Editing) with no active lead initiative (CENTER-14 ×24, CENTER-07 ×4, CENTER-12 ×4 — counts approximate from screenshot); 11 = new results (types 1, 5, 6, 7, 8; Editing) without lead initiative, mostly test titles ("Test 1006", "aj ss test 2", "AJ SS TEST 1", …).

Root cause: not "results with no Center" — the two sides disagree on whether a W3 result **without an active lead Program/Accelerator** belongs to the portfolio. V-1 (prod, 324/287) and these numbers come from different DBs/phase snapshots (324 total API < 646) — to be confirmed by the user. PCA-R-4 Scenario "deck and Centers agree" is **not** met; a rule decision is needed (spec gap → user).

## Pivot Record: PCA-T-3 (amendment, 2026-11-04)

- **Blocker:** PCA-R-4 Scenario "deck and Centers agree" cannot hold. The deck and the Centers block apply different W3 membership rules (lead P/A required vs not), giving a 41-row gap (see the gap analysis above).
- **Alternatives offered:** (1) Centers follows the deck. (2) Deck follows Centers (server query shared with Results Center → own spec). (3) Keep both and add a second note. (4) Data fix only.
- **User decision (chat, 2026-11-04):** (1) Centers follows the deck.
- **Spec edits:** requirements.md PCA-R-4 +1 clause; design.md new PCA-DD-6; tasks.md PCA-T-3 amendment paragraph. No TRD ADR is affected.
- **Correction sweep:** grep of `lead|w3_with_center|no Center` across the spec folder. The V-1 SQL in DD-4 is still valid as a prod check; it does not apply the lead-P/A rule, so its numbers are an upper bound.
- **Unverified assumption:** each Centers row exposes the lead initiative from the server subquery at `getResultsByBilateralCenter` ~L112-121. If it does not, the change needs the server → stop and escalate.
- **Equivalence check (2026-11-04):** the Implementer stopped (no edits). The Centers payload exposes the lead P/A as `submitter` (`ci.official_code`, `result.repository.ts:4355-4367`: `rbi.is_active > 0 AND rbi.initiative_role_id = 1`, **no `ci.active`**). The deck adds `ci.active > 0` (`result.repository.ts:802-807`). The user ran a SQL check on version 36 (API, active lead role 1): `inactive_lead` = 0, `blank_code` = 0 → `!!row.submitter` is equivalent to the deck rule on current data. Proceeding client-only. **Accepted risk:** it diverges if a lead initiative is set inactive in CLARISA, or if an active one has a blank official_code. Recorded in design PCA-DD-6.

### PCA-T-3 amendment PCA-DD-6 — Reviewer PASS (2026-11-04)

- **Attempt 1** (after the equivalence stop) · effort high · skills `angular-developer`, `tdd`. `hasLeadProgram(row)` in `centers-block.aggregate.ts` (non-blank `submitter`), applied at the single load site `centers-block.component.ts:272` (`.filter(isW3Row).filter(hasLeadProgram)`) before `applyGlobal`/`dedupeById`; `isW3Row` unchanged. Guide +1 line. Fixtures: `submitter: 'SP01'` on 8 inline API rows, no assertions removed. Red: 7 failed / 90 passed. Green: centers-block 97 passed. Lint clean.
- **Reviewer: `STATUS: PASS`** — no leak (retry uses the same load path; a Center whose rows are all filtered out is `ready` with `[]`, not failed; export/detail read the page's `filteredRows()`); predicate exact for null/undefined/missing/''. Fixture edits honest; V-1 Program guard still discriminates.
- **ADVISORY:** (1) whitespace-only code: client stricter than deck. The user's check used `TRIM(...) = ''` → 0, so this is covered. (2) No `ng build`, but the live `ng serve` compiled and rendered the change (served page shows new figures) — the template/type check is effectively confirmed. (3) Close the gap-analysis "not met" line once live figures are recorded (below).
- **Live result (localhost:4200, v36, no filter, all Centers loaded):** Centers **604** (New 488, Replicated 116) + note **"11 W3 results have no Center"** = deck **615**. Reconciles. Screenshot `C:\Users\santiagosanchez\AppData\Local\Temp\claude-chrome-screenshots-Sh9Zs7\screenshot-1793803441494-8.jpg`.
- **Residue (1 result):** SQL says 10 with no Center (expected Centers 605); the page shows 604 / note 11. This is the same 1-row gap seen before (SQL 646 vs page 645): most likely a result whose only Center is not in the client's Center catalogue, so the note counts it as "no Center". Identification SQL handed to the user. PCA-R-4 Scenario: met (deck = Centers + note); wording residue of 1 is open.

## Visual check ~390 px (PCA-T-4 HITL) — 2026-11-04, Leader, read-only

The window is maximized, so `resize_window` had no effect. Substitute: a same-origin 390×844 iframe of `/portfolio-overview` overlaid on the page. It made GET requests only, no clicks inside it, and was removed afterwards. Iframe innerWidth 387, document scrollWidth 374 → no horizontal scroll.
- The W3 deck card is 346 px wide (full width) and both splits wrap cleanly.
- The Centers W3 card (`centers-kpis`) is 346 px wide (full width). The note "11 W3 results have no Center" renders. The New/Replicated buttons and status tiles are full width.
- Screenshots: `C:\Users\santiagosanchez\AppData\Local\Temp\claude-chrome-screenshots-Sh9Zs7\screenshot-1793804332712-10.png` (deck), `…\screenshot-1793804355734-11.png` (Centers).

## Residue of 1 — client Center catalogue (2026-11-04)

The user ran SQL: no API + lead result has an active `results_center` whose code is missing from `clarisa_center` (0 rows). So the extra 1 comes from the **client catalogue**. `CentersService.getData()` on the live page loads 16 Centers: CENTER-01..15 and CENTER-17. **CENTER-16 is absent**, although DB rows reference it (e.g. result 12193 → CENTER-01,CENTER-16). A result linked only to CENTER-16 (or another code outside the catalogue) is dropped by the block and counted by the note as "no Center". Identification SQL handed to the user.
- **Identified (user SQL, 2026-11-04):** result **11528** (code 9060, "CGIAR NPS Initiative Strengthens Policy Coherence…Ethiopia") is linked only to **CENTER-16 = SMO** (former CGIAR System Organization, inst 221). The user deactivated CENTER-16 on purpose on 2026-10-16 (memory: SO/SMO fix; System Office = inst 11605 = CENTER-17), so the catalogue omits it correctly. The code is right. This is a **data residue**: the result needs re-linking to CENTER-17 (user decision, data fix outside this spec).
- **Data fix (user, 2026-11-04):** `results_center` row for result 11528 moved CENTER-16 → CENTER-17 (UPDATE + COMMIT, run by the user in the DB behind the local stack). Live page after reload: Centers **605** (New 489, Replicated 116) + note **"10 W3 results have no Center"** = deck **615**. This matches Q1 exactly (deck_sin_center = 10). **PCA-R-4 Scenario "deck and Centers agree": met.** Prod has not been checked for the same CENTER-16-only residue (follow-up).

## R-3 Scenario — Approved = Results Center (2026-11-04, Leader, read-only)

Portfolio page → Approved tile → "View in Results Center" → `/result/results-outlet/results-list?phase=36&status=6` → **"Showing 41 of 1071 results"**, all Funding = Bilateral. Deck Approved = 40 (New) + 1 (Replicated) = **41**. Met. Screenshot `C:\Users\santiagosanchez\AppData\Local\Temp\claude-chrome-screenshots-Sh9Zs7\screenshot-1793804655415-12.jpg`. The Approved filter was left on the portfolio URL (`?status=approved`), which is client state only.

## Final verification (2026-11-04)

`cd onecgiar-pr-client && npx jest --no-coverage --maxWorkers=2 --silent --findRelatedTests <12 changed non-md files>` → **Test Suites: 31 passed, 31 total · Tests: 1077 passed, 1077 total**. Free RAM 7.1 GB. The live `ng serve` compiled every change (template type-check effectively covered).

### PCA-T-4 — closed PASS
Guide: Reviewer PASS on attempt 2, plus later DD-6 and no-Center lines covered by those tasks' reviews. Visual: desktop + 390 px OK. R-3 Scenario met.

### PCA-T-3 — closed PASS
Dedupe, no-Center note (2 attempts) and DD-6 lead-P/A rule each got a Reviewer PASS. V-1 resolved; deck = Centers + note.

## Summary

| Task | Result | Review rounds |
|---|---|---|
| PCA-T-1 service split | PASS | 1 |
| PCA-T-2 page template | PASS | 1 |
| PCA-T-3 Centers dedupe + note + DD-6 | PASS | 1 + 2 (note) + 1 (DD-6) |
| PCA-T-4 guide + visual | PASS | 2 |

- **Budget:** 4 tasks as planned. Review rounds went over budget (T-3 4 vs 2, T-4 2 vs 1) because of user-approved scope: the V-1 note and the PCA-DD-6 pivot. LOC is above ~220 (tests are the bulk).
- **Spec amendments:** PCA-R-4 +1 clause, PCA-DD-6 (pivot). No server change, no migration.
- **Open follow-ups (outside this spec):** (1) check prod for W3 results linked only to CENTER-16 (SMO), using the same fix. (2) The `submitter` predicate equals the deck only while no lead initiative is inactive or blank (accepted risk; fix = server `has_active_lead_pa` flag). (3) `npm run test:local` exits 1 silently on this machine. (4) Optional product decision: sr-only "Share %" column and donut tooltip `({d}%)`. (5) The 30 replicated innovations without a P/A are hidden from the Portfolio until they get one (PAA follow-up). (6) Guide is at 127+ lines vs 120 cap.
- **No commit yet** — awaiting the user.
