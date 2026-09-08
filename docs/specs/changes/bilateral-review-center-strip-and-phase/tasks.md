# Tasks — Bilateral review: center chip strip + phase scoping

## 1. Scope

- **Module / feature:** `result-framework-reporting` → `pages/bilateral-review/` (`BRC`)
- **Linked spec:** `requirements.md` + `design.md` (same folder); parent `changes/sp-bilateral-review-tab`
- **Approval Mode:** pre-approved (owner, 2026-09-07) — routine gates auto-pass and are logged; HALT / Pivot / budget tripwire / FATAL_FAIL stop
- **Execution limits (owner):** ≤ 1 Reviewer round per task (second FAIL escalates); targeted `npx jest <path>`; `npx ng lint --quiet`; no `ng build` needed (no routing/DI change) unless a template error is suspected; Leader real-page look after T-2 (before T-3) per `project-hitl-looks-catch-what-diff-reviews-miss`
- **Budget (design §12):** 3 tasks · ~320 added source LOC · ~460 test LOC · tripwire > 450 added source or any third attempt
- **Status:** in-progress (2026-09-07)

## 2. Pre-flight (ticked by the Leader at execution start)

- [x] `requirements.md` / `design.md` approved (pre-approved gates logged); judgment-day one pass recorded in `judgment.md`. (2026-09-07)
- [x] Parent spec `changes/sp-bilateral-review-tab` all `[x]` (`116948c88`).
- [x] Dev server on :4200 (`ng serve` since 10:22, watch mode); local API :3400 answers 200. (2026-09-07 18:10)
- [x] No other in-flight spec touching `pages/bilateral-review/**` or the band badge call (`result-detail-back-rail` is disjoint).

## 3. Task list

### `BRC-T-1` — Phase-scoped list and badge

- [x] **Status:** PASS on attempt 2 (2026-09-07, `execution.md`)
- **Type:** `client`
- **Description:** Add `phase` to `bilateral-review.query-params.ts` (numeric). Page: `reportingPhases` signal seeded from `phasesSE.phases.reporting` + `getPhasesObservable()` subscription (mirror `dashboard-lab.component.ts:2839-2841`), fallback `GET_versioning(ALL, ALL)` filtered `app_module_id == 1` when still empty after the shell load; `knownPhases` = portfolio-filtered (`obj_portfolio.id` vs program portfolio), current first then `phase_year` desc, ids as `Number`; `currentPhaseId` (tracks `reportingPhaseVersion()` then `Number(reportingCurrentPhase.phaseId)`, null on NaN); `selectedVersionId` (valid `Number(?phase)` ∈ known → param, else current; unknown → rewrite URL with `replaceUrl`); `phaseIndicator`; a `loaded` flag. Split effects: entity details on code only; list on code + `selectedVersionId` (skip while null), calling the single loader `loadResults(code, versionId)` also used by `retry()` and `onDecisionMade()`; on phase change set `allExpanded` true + bump nonce; keep search/status/centers. Deep-link effect fires when `loaded` settles (rows may be empty) → match or `{ id, result_code }` fallback (R-10). Catalog/phase failure → existing error state with Retry (R-5). Popover gains a **Cycle** single select (`app-pr-filter-select`; re-pick is a no-op enforced in `setPhase()` + `writeValue` re-sync — see design §6.2 correction, not via `emptyValue`) writing `?phase=` only on change; indicator pill "Showing <phase name>" when selected ≠ current. `BilateralReviewCountService` keyed `CODE::<Number(versionId)>`: `count(code, versionId)`, `ensure(code, versionId)` (no-op on null/NaN), `setFromRows(code, versionId, rows)`, `refresh(code, versionId)`; page calls `setFromRows` only when `Number(selected) === Number(current)`. Band: inject `DataControlService`, compute `currentPhaseId` the same way, `bilateralReviewCount = count(programCode(), currentPhaseId())`, `ensure(code, currentPhaseId)` only when both set; **no band template change**; both band specs gain one `useValue` stub for `DataControlService` and the existing `ensure('SP02')` assertion becomes `('SP02', <number>)`. Copy in `bilateral-review.copy.ts`.
- **Implements:** BRC-R-5, R-6, R-7, R-8, R-9 (phase part), R-10; AC-5, 6, 7, 8, 8b, 9, 10, 12, 13, 14; scenarios "Numbers match the hero cycle" (all clauses) and "Finishing last cycle's queue" (all clauses); DD-1 reversion challenge items (1) and (5)
- **Design refs:** §2.2, §6.1, §6.2 (Cycle select, indicator, badge), BRC-DD-1, DD-2
- **Files:** `bilateral-review.component.{ts,html,spec.ts}`, `bilateral-review.query-params.ts`, `bilateral-review.copy.ts`, `services/bilateral-review-count.service.{ts,spec.ts}`, `reporting-program-band.component.{ts,spec.ts}` (+ `reporting-program-band.favorites.spec.ts` stub signature)
- **Depends on:** — · **Blocks:** T-2 (shares page files), T-3
- **Estimate:** M
- **Skills:** `angular-developer`
- **Tests:** page — no list request before the phase resolves (FAIL input: resolve rows before `phaseId`); every list request URL contains `versionId=<number>` (initial, `retry()`, after `decisionMade`); one entity-details request per program even across a phase switch; `?phase=<Q>` → `versionId=Q`, select shows Q's name, indicator visible; `?phase=999` → current id + `router.navigate` with `replaceUrl`; phase change P→Q preserves `search`/`status`/`centers`, sets `allExpanded` true, bumps nonce, issues exactly one list request; re-picking the shown phase → no request, no navigate (AC-8b); `setFromRows` called with `(code, P, rows)` when selected === current — including when the wire delivers `"36"` and the param is `36` — and NOT called when selected ≠ current; deep link with an EMPTY phase list opens `{ id, result_code }` and clears params (AC-13; FAIL input: keep the old rows-non-empty guard); catalog failure → error state with Retry (AC-14). Count service — keys isolated across phases; `"36"`/`36` share a key; `ensure(code, null)` and `ensure(code, NaN)` issue nothing; `refresh`. Band — `DataControlService` stub; `ensure` called with `(code, <number>)`; badge absent while the phase is null; the pre-existing `ensure('SP02')` assertion updated to the two-argument form; no other existing assertion changed.
- **Verification:** `npx jest src/app/pages/result-framework-reporting/pages/bilateral-review src/app/pages/result-framework-reporting/pages/dashboard-lab/components/reporting-program-band --silent`; `npx ng lint --quiet`. **Disqualifiers:** a request assertion that only checks the path without `versionId=`; a "no premature request" test that never resolves rows before the phase (it must be able to fail); band spec edits beyond the `DataControlService` stub, the updated `ensure` assertion and new `it`s; a mixed-type test that compares two numbers.
- **Done when:** green; Leader live check on SP02: record the shell's resolved current phase P; badge and Pending KPI read P's pending count (12 if P = Reporting 2026, 131 if P = Reporting 2025 on today's DB); switching Cycle to the other phase shows the other count with the indicator and leaves the badge unchanged.

### `BRC-T-2` — Center chip strip

- [x] **Status:** PASS on attempt 2 (2026-09-07, `execution.md`)
- **Type:** `client`
- **Description:** New `components/bilateral-review-center-strip/bilateral-review-center-strip.component.{ts,html,spec.ts}` (inputs `items`, `allPending`, `selectedCodes`, `maxVisible=12`; output `selectCenter` — renamed from `select`, see design §6.2 correction); page computed `centerStrip` over `searchFiltered` (pending per `lead_center`, acronym→code via `acronymToCode` with acronym fallback when unmapped, sorted pending desc / acronym asc, trailing "Not specified" bucket for blank centers; `allPending` = Σ = KPI Pending); mount under the status chips (chip classes from `bilateral-review.component.html:235-296`); `onCenterChipSelect(code|null)` sets `centers` to `[code]` or `[]` (existing URL sync writes `?center=`); pressed rules per BRC-R-2; "+N more" tail (BRC-R-21). Chip classes copied from the status chips; `role="group"` with `aria-label`; accessible names "IITA, 100 pending"; no native `disabled`.
- **Implements:** BRC-R-1, R-2, R-3, R-4, R-9 (strip part), R-20, R-21; AC-1, 2, 3, 4, 12, 15; scenario "Review center by center" (all clauses: THEN / AND counts unchanged / BUT no status-search-phase change / AND IT MUST clear with one click)
- **Design refs:** §6.1 (`centerStrip`), §6.2 strip component, §6.3, BRC-DD-3, DD-4
- **Files:** new strip component; `bilateral-review.component.{ts,html,spec.ts}`; `bilateral-review.copy.ts`
- **Depends on:** T-1 · **Blocks:** T-3
- **Estimate:** M
- **Skills:** `angular-developer`, `frontend-design`
- **Tests:** strip spec — fixture IITA 3 / CIP 2 (+1 approved) / IWMI 0 (+2 approved) / blank-center 1 pending renders `All centers 6 · IITA 3 · CIP 2 · IWMI 0 · Not specified 1` in that order (FAIL input: swap two counts); an acronym missing from the catalog yields a chip whose value is the acronym; pressed states for `selectedCodes` = [] / [CIP] / [IITA, CIP]; `select` emits code on click and `null` on pressed-chip or All click; 14 items → 12 + "+2 more" → expand shows 14. Page spec — click CIP → `centers() === [CIP code]`, `router.navigate` merge with `center=<code>` and `replaceUrl`, rows only CIP, popover value CIP; click again → `[]`; status chip Approved leaves strip counts at 3/2/0; `All centers` equals KPI pending with no center selected (assert both rendered texts equal).
- **Verification:** `npx jest src/app/pages/result-framework-reporting/pages/bilateral-review --silent`; `npx ng lint --quiet`. **Disqualifiers:** counts asserted against the computed instead of rendered text; a fixture where two centers share a count; a click test that clicks the row/container instead of the chip button.
- **Done when:** green; **Leader HITL look** (Orca, SP02 phase 36 and 34, 1536 + 840 CSS px): strip visually matches the status chips, wraps at 840, counts match the KPI, chip click filters and updates the popover + URL; contrast of pressed/unpressed chips ≥ 4.5 measured (oklch via canvas).

### `BRC-T-3` — CT extension, guide, bookkeeping

- **Type:** `tests` + `docs`
- **Description:** Extend `bilateral-review.cy.ts`: 9-center fixture; at 840 the strip wraps to ≥ 2 lines with no clipped chip and body `scrollWidth <= clientWidth`; chip click collapses rows to that center; FAIL-input detector case (`.bilateral-review-center-strip { white-space: nowrap; min-width: 3000px !important }` + `overflow-x: visible` on its wrapper → body overflow detected) with a RED probe recorded (KZ-MWB-3, parent T-7 lesson). Update `pages/bilateral-review/CLAUDE.md` (phase contract, `?phase=`, badge keyed by phase, strip semantics) and the parent-spec follow-up note. Record in `execution.md` that `BRT-DD-7` is superseded (archive sync flips it).
- **Implements:** BRC-R-20 (gate), AC-11, AC-12; defect classes "strip wrap / body overflow", "indicator copy / chip a11y"
- **Design refs:** §6.4, §13
- **Files:** `bilateral-review.cy.ts`, `pages/bilateral-review/CLAUDE.md`
- **Depends on:** T-1, T-2 · **Blocks:** —
- **Estimate:** S
- **Skills:** `angular-developer`, `cognitive-doc-design`
- **Verification:** `CT_DEV_SERVER_PORT=8090 npx cypress run --component --spec src/app/pages/result-framework-reporting/pages/bilateral-review/bilateral-review.cy.ts` green after the RED probe line is recorded; `npx ng lint --quiet`; guide ≤ 150 lines. **Disqualifiers:** a RED produced by inverting an already-false assertion (the real body-overflow gate must fail under the injection); viewport assertions on requested instead of measured width.
- **Done when:** CT green with RED evidence; guide updated; owner sign-off on the HITL look.

## 4. Dependency graph

```
BRC-T-1 (phase scoping: page + count service + band call)
   └── BRC-T-2 (center strip; same page files)
         └── BRC-T-3 (CT + guide)
```
Serial (shared page files). Parent-spec suites are the regression net at every step.

## 5. Coverage

| Clause | Task |
|---|---|
| R-1, R-2, R-3, R-4, R-20, R-21; AC-1..4, AC-15; scenario "center by center" (4 clauses) | T-2 |
| R-5, R-6, R-7, R-8, R-10; AC-5..10, 8b, 13, 14; scenarios "hero cycle" (4 clauses), "last cycle's queue" (4 clauses); DD-1 challenge items (1), (5) | T-1 |
| R-9 / AC-12 | T-1 (band + count specs), T-2 (page), T-3 (CT) |
| AC-11 | T-3 |
| OQ-1 (pending counts), OQ-2 (badge = current phase) | assumed; T-2 / T-1 implement the assumption |

## 6. Test plan

| ID | Type | Covers | Location |
|---|---|---|---|
| BRC-TEST-1 | unit | R-5..R-8, AC-5..10 | `bilateral-review.component.spec.ts`, `bilateral-review-count.service.spec.ts`, `reporting-program-band.component.spec.ts` |
| BRC-TEST-2 | unit | R-1..R-4, R-21, AC-1..4 | `bilateral-review-center-strip.component.spec.ts`, `bilateral-review.component.spec.ts` |
| BRC-TEST-3 | CT | R-20, AC-11 | `bilateral-review.cy.ts` |
| HITL | manual | visual parity, contrast, real counts | Orca looks after T-1 and T-2 |

## 7. Rollout · 8. Cleanup · 9. PR · 10. Rollback

- One PR against `qa-development-2026` (`✨ feat(bilateral-review) [SPEC:changes/bilateral-review-center-strip-and-phase]: …`); ~320 source + ~460 test LOC; review the count-service key change and the band injection first, then the page effects, then the strip.
- After merge: `/akili-archive` flips `BRT-DD-7`; CodeGraph re-index.
- Rollback: revert the PR; no data/API change.
