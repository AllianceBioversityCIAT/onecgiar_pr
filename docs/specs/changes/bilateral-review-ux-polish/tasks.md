# Tasks — Bilateral review: UX/UI polish

## 1. Scope

- **Module / feature:** `result-framework-reporting` → `pages/bilateral-review/` (`BRP`)
- **Linked spec:** `requirements.md` + `design.md` (same folder); parents `changes/sp-bilateral-review-tab`, `changes/bilateral-review-center-strip-and-phase`
- **Approval Mode:** pre-approved (owner, 2026-09-07) — routine gates auto-pass and are logged; HALT / Pivot / budget tripwire / FATAL_FAIL stop
- **Execution limits (owner):** ≤ 1 Reviewer round per task (second FAIL escalates); targeted `npx jest <path>`; `npx ng lint --quiet`; **every task that touches a component's injections or constructor-time calls also runs the CT spec** (`project-fixtures-real-cold-boot-shapes`); Leader real-page look after every UI task
- **Budget (design §12):** 4 tasks · ~850 added source LOC · ~900 test LOC · tripwire > 1200 added source or any third attempt
- **Status:** in-progress (2026-09-07)

## 2. Pre-flight (ticked by the Leader at execution start)

- [x] `requirements.md` / `design.md` approved (pre-approved gates logged); judgment-day one pass recorded in `judgment.md` (2026-09-07 21:35).
- [x] Parent spec `changes/bilateral-review-center-strip-and-phase` all `[x]` (`bf48eeff9`).
- [x] Dev server on :4200 in watch mode; local API :3400 answered 200 at 18:10; Orca tab: screenshots still fail while hidden — owner pastes screenshots (before-1787.png captured).
- [x] No other in-flight spec touching `pages/bilateral-review/**`.

## 3. Task list

### `BRP-T-1` — Filter band, Clear filters, stat bar

- [x] **Status:** PASS on attempt 2 (2026-09-07, `execution.md`)
- **Type:** `client`
- **Description:** Replace the status chip row + strip mount with the **filter band** (design §6.2): labeled rows, status **segmented control** (same `data-testid`s and `setStatus` semantics), centers row with chevron (`aria-expanded`, `aria-controls`) and the strip's new `collapsed` input; tonal **count badges** on both rows via one shared class helper; `centersExpanded` state with the `> 6 || isNarrow()` default, `sessionStorage['pr.bilateral.centersExpanded']` (`'1'|'0'`, try/catch) and the R-21 one-shot auto-expand; the strip's `collapsed` mode renders exactly one summary chip (empty / one / several) and suppresses "+N more"; `isNarrow` signal (copy the my-work-board `matchMedia` guard, `my-work-board.component.ts:56, 322-323, 695-706`); `activeFilterCount` over the **five** filter dimensions and `clearEverything()` (one `router.navigate`, the five keys `null`, no `view`/`group`/`phase` key) behind a toolbar "Clear filters · N" ghost button that **replaces** the existing toolbar clear at `.html:216-224`; **stat bar** rewrite of `BilateralReviewKpisComponent` in place (same inputs/outputs, all six `data-testid`s, host `data-testid="bilateral-review-statbar"`, page wrapper padding removed). Rewrite the parent CT cases R-14 (a)(b)(c) in `bilateral-review.cy.ts` (KPI grid → stat bar; focus order; BRC-AC-11 expands the row first). Copy in `bilateral-review.copy.ts`.
- **Implements:** BRP-R-1, R-2, R-3, R-4, R-5, R-6, R-14 (band part), R-15, R-20, R-21; AC-1, 2, 3, 4, 5, 6, 7 (band half), 13, 14; scenario "First screen shows the queue" (band clauses), scenario "Reset in one click" (all clauses)
- **Design refs:** §6.1 (`centersExpanded`, `isNarrow`, `activeFilterCount`, `clearEverything`), §6.2 filter band / strip / toolbar / stat bar, §6.3, BRP-DD-1, DD-2
- **Files:** `bilateral-review.component.{ts,html,spec.ts}`, `bilateral-review.copy.ts`, `components/bilateral-review-center-strip/*.{ts,html,spec.ts}`, `components/bilateral-review-kpis/*.{ts,html,spec.ts}`, `bilateral-review.cy.ts` (only the R-14 (a)(b)(c) cases + fixtures for new inputs)
- **Depends on:** — · **Blocks:** T-2 (page files), T-4
- **Estimate:** M
- **Skills:** `angular-developer`, `ui-ux-pro-max`, `frontend-design`
- **Tests:** page — status control keeps every existing chip test green unchanged; centers default collapsed with 7 centers and expanded with 6 (FAIL input: swap the threshold); stored `'0'` beats the `> 6` default and stored `'1'` beats narrow; R-21: `?center=CIP` + no stored choice → expanded once, with stored `'0'` → collapsed showing "CIP 9 ✕"; chevron toggles `aria-expanded` and writes storage; `activeFilterCount` = 0 with defaults and increments once per dimension (5 `it`s) and does NOT count phase ≠ current, group ≠ project or view (3 `it`s); `clearEverything` → exactly one `router.navigate` whose `queryParams` has the five keys `null` and none of `view`/`group`/`phase`, `replaceUrl: true`, and `httpMock.verify()` shows no list request; exactly one element with the "Clear filters" label in the toolbar (FAIL input: leave the old `:216-224` button); button absent at 0 and reads "Clear filters · 3" at 3. Strip — `collapsed` renders exactly one chip in each state: "All centers 131" pressed with `[]`, "CIP 9" + ✕ with `[CIP]`, "2 centers" + ✕ with `[IITA, CIP]`; never the "+N more" tail (FAIL input: 14 items collapsed); ✕ emits `null`; badge class matrix (count > 0 / 0 × pressed / unpressed) asserted on rendered classes; `motion-reduce:transition-none` present on animated classes. Kpis — five figures and all six `data-testid`s rendered from the fixture; pending toggle `aria-pressed` + emit; height not asserted in Jest (CT).
- **Verification:** `npx jest src/app/pages/result-framework-reporting/pages/bilateral-review --silent --reporters=summary --no-coverage`; `npx ng lint --quiet`; `CT_DEV_SERVER_PORT=8090 npx cypress run --component --spec src/app/pages/result-framework-reporting/pages/bilateral-review/bilateral-review.cy.ts` (must stay green — fixtures may need the new inputs). **Disqualifiers:** a status control that changes `data-testid`s or `setStatus` semantics; two clear controls rendered in the toolbar; a collapse test that never exercises the stored-choice override; a `clearEverything` test that does not assert the absence of `view`/`group`/`phase`; badge contrast "verified" by class name only (HITL measures it); CT edits beyond the R-14 (a)(b)(c) cases and fixture inputs.
- **Done when:** green; Leader live look at 1787 and 840: band ≤ 96 px collapsed, stat bar host ≤ 44 px, four badge combinations and the captions ≥ 4.5:1 measured (oklch via canvas), exactly one Clear filters that appears/disappears with the URL, first row < 420 px from the viewport top at 1130 px tall.

### `BRP-T-2` — Table density, placeholders, group mode

- [x] **Status:** PASS on attempt 2 (2026-09-07, `execution.md`; live look owed — Orca eval down)
- **Type:** `client`
- **Description:** Generalize `groups` to `BilateralReviewGroup { key, label, caption, center, results }` (design §6.1) with `group` signal + `?group=` (eighth key, `bilateral-review.query-params.ts`), `setGroup` (navigate only — **no nonce bump**), center-mode ordering (pending desc, acronym asc, blank bucket → `UNASSIGNED_CENTER_CODE` / "Not specified" **always last**); table: new `groupMode` input, component-owned `expandedKeys` signal as the single expansion source (seeds `[expandedRowKeys]`, written by `onToggleGroup`), `userCollapsedKeys`/`lastKeys` namespaced by mode, `dataKey`/`groupRowsBy` bound to `"key"`, `onToggleGroup` keyed off `group.key`; toolbar **Group: Project | Center** segmented control (`@if (view() === 'grouped')`). Table row template per §6.2: category column removed → caption under the title; `line-clamp-2` + `title` on the title; inline role tag after the code; status `whitespace-nowrap` `min-w-[128px]`; TOC/Indicator placeholders → `aria-hidden` "—" + `sr-only` original text + `title`; date `d MMM y` right-aligned; `!py-[6px]` cells with the leadings of design §6.2; row hover with `motion-reduce:transition-none`; group header restyle (label / caption / **token-based** yellow pending badge). Copy split `resultsLabel` / `pendingLabel`.
- **Implements:** BRP-R-8, R-9, R-10, R-11, R-12, R-14 (table part); AC-8, 9, 10, 13; scenario "Distribute review work by center" (all clauses)
- **Design refs:** §6.1 (`group`, `groups`, namespaced collapse), §6.2 table + group control, BRP-DD-4
- **Files:** `bilateral-review.component.{ts,html,spec.ts}`, `bilateral-review.query-params.ts`, `bilateral-review.copy.ts`, `components/bilateral-review-table/*.{ts,html,spec.ts}`
- **Depends on:** T-1 · **Blocks:** T-3, T-4
- **Estimate:** L
- **Skills:** `angular-developer`, `ui-ux-pro-max`, `tdd` (group arithmetic)
- **Tests:** page — `?group=center` hydrates, invalid → project + param removed; `setGroup` → one navigate (`group: 'center'`, `replaceUrl`), `expandAllNonce` unchanged, **no** list request (`httpMock.verify()`); `groups` fixture: 3 centers with distinct pending (3/1/0), **two blank-center rows with 2 pending**, one center spanning two projects → center mode yields 4 groups ordered `[3-pending, 1-pending, 0-pending, Not specified (2 pending)]` — the blank bucket trails despite out-ranking two centers (FAIL input: sort blank by count) — with caption "2 projects" on the spanning one; project mode unchanged from today's assertions. Table — role tag inline (same `td` as the code) and no category `th`; title `title` attr equals the full text; "Not specified"/"Not Applicable"/`null` → "—" with `title` and `aria-label`; date renders `23 Feb 2026` from `2026-02-23`; group header shows the pending badge only when M > 0 (rendered classes contain the pending tone) and "0 pending" muted otherwise; collapse IITA in center mode → switch to project → back → IITA still collapsed and no group force-expanded (FAIL input: bump the nonce on switch); existing row-action and toggle tests unchanged.
- **Verification:** `npx jest src/app/pages/result-framework-reporting/pages/bilateral-review --silent --reporters=summary --no-coverage`; `npx ng lint --quiet`; CT spec green. **Disqualifiers:** group arithmetic asserted on the computed instead of rendered headers; a fixture where two centers share a pending count; a "no request on group switch" test with no `HttpTestingController` verify; a mode switch that clears the manual-collapse memory; the warning badge in raw Tailwind colors.
- **Done when:** green; Leader live look at 1787: two-line rows ≤ 64 px and one-line rows ≤ 44 px on the CIP rows with the "Contributor" tag, "—" placeholders, caption/badge contrast ≥ 4.5 measured, Group: Center shows IITA 99 / IWMI 20 / CIP 9 / … headers with pending badges, `?group=center` survives reload.

### `BRP-T-3` — Cards below 900 px

- **Type:** `client`
- **Description:** `narrow` input on the table component fed by the page's `isNarrow`; `@if (narrow())` branch rendering `ul[role=list]` cards per design §6.2 (grouped: `<button aria-expanded>` header bars + cards gated by the component-owned `expandedKeys` from T-2; flat: `sortedFlatRows` order); no `<table>`, no `overflow-x`, no `overflow-y` in this branch; toolbar wraps at 375 (search full width, controls on one row). Rewrite the parent CT case R-14 (d) in `bilateral-review.cy.ts` (table horizontal scroll + sticky Actions asserted at 1024; the 840 case becomes the cards gate).
- **Implements:** BRP-R-13, R-14; AC-11, 12
- **Design refs:** §6.2 cards, BRP-DD-5
- **Files:** `components/bilateral-review-table/*.{ts,html,spec.ts}`, `bilateral-review.component.{html,spec.ts}`, `bilateral-review.cy.ts` (only the R-14 (d) case)
- **Depends on:** T-2 · **Blocks:** T-4
- **Estimate:** M
- **Skills:** `angular-developer`, `ui-ux-pro-max`, `frontend-design`
- **Tests:** table — `narrow=true` renders `ul[role=list]` with `li` count = row count and **no** `table` element (FAIL input: leave the table branch mounted); card shows code, status pill, title, caption with "—" placeholders, date and the action button; grouped narrow: group header bar toggles the group's cards through the owned `expandedKeys` (collapsing in cards then switching `narrow=false` shows the group collapsed in the table too); `narrow=false` unchanged. Page — `isNarrow` from a `matchMedia` stub flips the table input.
- **Verification:** `npx jest src/app/pages/result-framework-reporting/pages/bilateral-review --silent --reporters=summary --no-coverage`; `npx ng lint --quiet`. **Disqualifiers:** cards asserted by CSS class only; a narrow test that does not assert the absence of `<table>`.
- **Done when:** green; Leader live look at 840 and 375 (viewport 700 and 313 requested): cards, no body overflow, no second scroller, `firstCard.top − workArea.top` ≤ 270 px.

### `BRP-T-4` — CT gates, guide, HITL evidence

- **Type:** `tests` + `docs`
- **Description:** Extend `bilateral-review.cy.ts` (narrow cases at `cy.viewport(w, 1600)`): at 1536 band + stat bar ≤ 140 px and `firstRow.top − workArea.top` ≤ 210 px with a RED probe (inject `min-height: 300px` on the band → the gate fails; record the line, revert); row height ≤ 64 / ≤ 44; chevron collapse/expand with `aria-expanded`; at 840 and 375: no `<table>`, card count = rows, body `scrollWidth <= clientWidth`, `firstCard.top − workArea.top` ≤ 270 px; single-scroller gate (no descendant of `#workArea` with `overflow-y: auto|scroll` besides the table wrapper; FAIL input: `overflow-y: auto` on the cards list, RED recorded); exactly one Clear filters control. Update `pages/bilateral-review/CLAUDE.md` (eight URL keys, group mode, collapse memory, stat bar, cards; keep ≤ 150 lines — trim) and append the icon-set deviation to `onecgiar-pr-client/docs/DESIGN-DEVIATIONS.md`. Leader records the before/after screenshots and the contrast matrix in `execution.md`.
- **Implements:** AC-7, AC-11, AC-12, AC-13; R-15 gate; defect classes "chrome height regression", "second scroll container", "cards below 900", "contrast of new text" (HITL)
- **Design refs:** §6.4
- **Files:** `bilateral-review.cy.ts`, `pages/bilateral-review/CLAUDE.md`, `onecgiar-pr-client/docs/DESIGN-DEVIATIONS.md`
- **Depends on:** T-1, T-2, T-3 · **Blocks:** —
- **Estimate:** S
- **Skills:** `angular-developer`, `cognitive-doc-design`
- **Verification:** `CT_DEV_SERVER_PORT=8090 npx cypress run --component --spec src/app/pages/result-framework-reporting/pages/bilateral-review/bilateral-review.cy.ts` green with the RED line recorded; `npx ng lint --quiet`; guide ≤ 150 lines. **Disqualifiers:** RED by inverting an assertion; viewport assertions on requested instead of measured width.
- **Done when:** CT green with RED evidence; guide updated; owner sign-off on the before/after look.

## 4. Dependency graph

```
BRP-T-1 (band + clear + stat bar)
   └── BRP-T-2 (table density + group mode)
         └── BRP-T-3 (cards)
               └── BRP-T-4 (CT + guide + HITL)
```
Serial (shared page and table files).

## 5. Coverage

| Clause | Task |
|---|---|
| R-1..R-6, R-20, R-21; AC-1..6, AC-3b, AC-14; scenarios "First screen" (band clauses), "Reset in one click" | T-1 |
| R-15 | T-3 (impl), T-4 (CT gate) |
| R-8..R-12; AC-8..10; scenario "Distribute review work by center" | T-2 |
| R-13; AC-11, AC-12 | T-3 (impl), T-4 (CT) |
| R-7 | dropped (requirements) |
| R-14; AC-13 | every task (parent suites; CT cases (a)(b)(c) → T-1, (d) → T-3, (e) → T-1, (f) → T-2) |
| AC-7 | T-1 (impl), T-4 (CT gate) |
| OQ-1..3 | assumed; T-1/T-2 implement the assumptions |

## 6. Test plan

| ID | Type | Covers | Location |
|---|---|---|---|
| BRP-TEST-1 | unit | R-1..R-6, R-21 | `bilateral-review.component.spec.ts`, strip spec, kpis spec |
| BRP-TEST-2 | unit | R-8..R-12 | table spec, page spec |
| BRP-TEST-3 | unit | R-13 | table spec |
| BRP-TEST-4 | CT | AC-7, AC-11, AC-12 | `bilateral-review.cy.ts` |
| HITL | manual | contrast, look, before/after | Orca looks after T-1, T-2, T-3 |

## 7. Rollout · 8. Cleanup · 9. PR · 10. Rollback

- One PR against `qa-development-2026` (`🎨 style(bilateral-review) [SPEC:changes/bilateral-review-ux-polish]: …`); review the group-shape generalization and `clearEverything` first, then the band, then the cards.
- Rollback: revert the PR; no data/API change; `?group=` ignored by older builds.
