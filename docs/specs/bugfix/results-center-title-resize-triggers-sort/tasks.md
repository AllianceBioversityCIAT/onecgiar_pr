# Tasks — Results Center: column resize must not trigger a sort

## 1. Scope of this task list

- **Module / feature:** `bugfix/results-center-title-resize-triggers-sort`
- **Linked spec:** `requirements.md` + `design.md` (same folder)
- **Owner / driver:** current session
- **Status:** `done` — `RCR-T-1` shipped and merged into `performance-refactor`; `RCR-T-2..4` (amendment) implemented, tested green, and pending commit

## 2. Pre-flight checklist

- [x] `requirements.md` drafted (no proposal existed; root cause confirmed by direct code read per Bug Mode)
- [x] `design.md` drafted
- [x] No open questions
- [x] No migration involved
- [x] No conflicting in-flight spec found touching `results-list.component.ts`'s resize/sort code

## 3. Task list

### `RCR-T-1` — Swallow the phantom sort-click after a column-resize drag

- **Type:** `client`, `tests`
- **Description:** In `ResultsListComponent`, register a capture-phase, one-shot `click` guard on `document` when a resize drag starts (`onResizeStart`), so the native `click` the browser synthesizes on mouseup-over-`<th>` never reaches `PrSortableColumnDirective`'s click listener or the template's `(click)="validateOrder(...)"`. Clean the guard up on `mouseup` (with a `setTimeout(0)` safety net) and on `ngOnDestroy`. See `design.md` §6.2 and `RCR-DD-1` for the exact mechanism and why a boolean flag inside `validateOrder` alone is insufficient.
- **Implements:** `RCR-R-1`, `RCR-R-2`, `RCR-R-3`, `RCR-AC-1`, `RCR-AC-2`
- **Files (expected):**
  - `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-list/results-list.component.ts` (add the guard field + wiring in `onResizeStart`/`onWindowMouseUp`/`ngOnDestroy`)
  - `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-list/results-list.component.spec.ts` (regression test)
- **Depends on:** —
- **Blocks:** —
- **Estimate:** `S`
- **Review:** `checklist` — standard scoped client fix touching no shared symbol, payload, or auth surface
- **Verification:**
  - **Falsifier:** Simulate `onResizeStart({clientX:100,...}, titleColumn, th)` → `window mousemove` (clientX 150) → `window mouseup`, exactly as the existing "persists resized column widths on mouseup" test does (`results-list.component.spec.ts:543-553`); then dispatch `document.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))` and assert the dispatched event's `defaultPrevented === true`. A second, later `click` dispatched after the guard's own cleanup MUST have `defaultPrevented === false` (proves the guard does not leak and swallow an unrelated future click).
  - **Red run:** `npx jest --silent --reporters=summary --no-coverage --testPathPattern="results-list.component"` — write the test first against the **unmodified** component: the first assertion (`defaultPrevented === true`) fails because no guard exists yet. Then implement the fix; the same command must pass, including the pre-existing `Column resize` tests (ts:537-559) and `applyDefaultSort`/sort-related tests, unchanged.
  - **Disqualifier:** If the dispatched `click` in the test is not `cancelable: true`, `preventDefault()` is a silent no-op and `defaultPrevented` stays `false` regardless of whether the guard ran — the test would falsely fail (or falsely pass with an inert guard) if this flag is wrong. If the guard is implemented as `{ once: true }` **without** the `setTimeout(0)` fallback and the test's dispatched click is what consumes it, the "second click not swallowed" assertion would pass even with a leaking guard purely because the test itself supplied the one click that `once` was waiting for — the test must dispatch that first click as part of the *drag* sequence (i.e., the click that stands in for the browser's phantom click), not skip straight to the second-click assertion.
  - **Consumers:** none (no shared symbol changed — `onResizeStart`'s signature and the template's call site `(mousedown)="onResizeStart($event, column, thEl)"` (html:232) are unchanged; the guard is a private implementation detail. `PrSortableColumnDirective` is a consumer of *the click event*, not of any symbol this task exports, and is exercised indirectly by the fact that the directive's own listener is what the phantom click would otherwise have reached — the design's `P-2` premise names it explicitly so the fix targets the DOM event, not a symbol that would need a grep sweep).
- **Definition of done:**
  - [ ] Code merged via the project commit convention (`<emoji> <type>(<scope>) [ticket]: <description>` per root `CLAUDE.md`), e.g. `🔧 fix(results-list): swallow phantom sort-click after column resize`.
  - [ ] Lint clean: `npx ng lint --quiet`.
  - [ ] Regression test added and green: red before the fix, green after (see Falsifier/Red run above).
  - [ ] Existing `Column resize` tests (`results-list.component.spec.ts:537-559`) and any other sort-related tests in the same spec file still pass unmodified.
  - [x] Manually verified in a running dev server: drag-resize the Title column and release inside the header — table does not re-sort; a plain click on the Title header still sorts. Verified against the real running app (not jsdom) by driving the exact `onResizeStart`→`mousemove`→`mouseup`→phantom-`click` sequence on the live `<th>` and confirming the click was prevented and the sort state was untouched.
  - [x] No secret or token leaked in logs (`.cursorrules`) — n/a, no logging added.

---

### `RCR-T-2` — Parity: Programme Results *(Amendment 2026-09-22)*

- **Type:** `client`, `tests`
- **Description:** Apply the identical guard mechanism from `RCR-T-1` to `ProgrammeResultsComponent`, matching its existing class-field style exactly (`P-4`).
- **Implements:** `RCR-R-4`, `RCR-AC-3`
- **Files:**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/programme-results/programme-results.component.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/programme-results/programme-results.component.spec.ts`
- **Depends on:** — (independent of `RCR-T-1`; same pattern applied in parallel)
- **Blocks:** —
- **Estimate:** `S`
- **Review:** `checklist` — mechanical parity fix, same shape as the already-reviewed `RCR-T-1`
- **Verification:**
  - **Falsifier:** Simulate `onResizeStart({clientX:300,...}, titleCol, fakeTh)` → `mousemove` (clientX 250) → `mouseup`, then dispatch a real `click` `MouseEvent` on `document` and assert `defaultPrevented === true` and `jest.spyOn(table(), 'sort')` was NOT called. A second, later click MUST have `defaultPrevented === false`.
  - **Red run:** `npx jest --silent --reporters=summary --no-coverage --testPathPattern="programme-results.component"` — confirmed red (1 failing) against the unmodified component via `git stash` on the `.ts` file only, green after restoring the fix.
  - **Disqualifier:** Same as `RCR-T-1` — a non-`cancelable` dispatched click, or a guard lacking the `setTimeout(0)` fallback tested only against the same click that consumed its `once`, would produce a false result.
  - **Consumers:** none (no shared symbol changed; own copy of the pattern, per `P-6`).
- **Definition of done:**
  - [x] Lint clean: `npx ng lint --quiet` (run across the whole client, includes this file).
  - [x] Regression test added and green: red before the fix, green after.
  - [x] Existing `column resizing (TRC-R-1..4)` describe block tests still pass unmodified.
  - [ ] Code merged via the project commit convention.

### `RCR-T-3` — Parity: Bilateral centre results *(Amendment 2026-09-22)*

- **Type:** `client`, `tests`
- **Description:** Apply the identical guard mechanism from `RCR-T-1` to `BilateralResultsListComponent`, matching its existing class-field style exactly (`P-4`).
- **Implements:** `RCR-R-4`, `RCR-AC-3`
- **Files:**
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.ts`
  - `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-results-list/bilateral-results-list.component.spec.ts`
- **Depends on:** — · **Blocks:** — · **Estimate:** `S`
- **Review:** `checklist` — mechanical parity fix
- **Verification:**
  - **Falsifier:** Same shape as `RCR-T-2`, spying on `component.table!.sort`.
  - **Red run:** `npx jest --silent --reporters=summary --no-coverage --testPathPattern="bilateral-results-list.component"` — confirmed red before, green after (same `git stash` method as `RCR-T-2`).
  - **Disqualifier:** Same as `RCR-T-1`/`RCR-T-2`.
  - **Consumers:** none.
- **Definition of done:**
  - [x] Lint clean.
  - [x] Regression test added and green: red before, green after.
  - [x] Existing `Column resize and pagination` describe block tests still pass unmodified.
  - [ ] Code merged via the project commit convention.

### `RCR-T-4` — Parity: Portfolio Overview *(Amendment 2026-09-22)*

- **Type:** `client`, `tests`
- **Description:** Apply the same guard mechanism to `PortfolioOverviewComponent`, adapted to its inline-closure `onResizeStart` (`P-5`) — a local `const resizeClickGuard`, registered inline, cleaned up in the local `onMouseUp` closure. No `ngOnDestroy` added (pre-existing gap, out of scope — see `design.md` §13).
- **Implements:** `RCR-R-4`, `RCR-AC-3`
- **Files:**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/portfolio-overview.component.ts`
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/portfolio-overview/portfolio-overview.component.spec.ts` (new describe block — this file had no prior resize test)
- **Depends on:** — · **Blocks:** — · **Estimate:** `S`
- **Review:** `checklist` — mechanical parity fix, adapted signature (no `thElement` arg, `sortBy(column)` instead of `PrSortableColumnDirective`)
- **Verification:**
  - **Falsifier:** Simulate `onResizeStart({clientX:300,...}, column)` → `mousemove` (clientX 250) → `mouseup`, dispatch a real `click` on `document`, assert `defaultPrevented === true` and `component.sortKey()`/`component.sortAsc()` unchanged from their pre-drag values. A second, later click MUST have `defaultPrevented === false`.
  - **Red run:** `npx jest --silent --reporters=summary --no-coverage --testPathPattern="portfolio-overview.component"` — confirmed red before, green after (same `git stash` method).
  - **Disqualifier:** Same as `RCR-T-1`. Additionally: asserting only `sortKey()` without also asserting `sortAsc()` would miss a defect that flips direction without changing the key (this component's `sortBy` can do either depending on prior state).
  - **Consumers:** none.
- **Definition of done:**
  - [x] Lint clean.
  - [x] Regression test added and green: red before, green after.
  - [ ] Code merged via the project commit convention.

---

## 4. Dependency graph

```
RCR-T-1  (original — results-list.component.ts)
RCR-T-2  (parity — programme-results.component.ts)      ─┐
RCR-T-3  (parity — bilateral-results-list.component.ts)  ├─ independent of each other and of RCR-T-1
RCR-T-4  (parity — portfolio-overview.component.ts)      ─┘
```

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `RCR-TEST-1` | unit (client, Jest) | `RCR-R-1`, `RCR-R-2`, `RCR-AC-1` | `results-list.component.spec.ts` (`Column resize` describe block) |
| `RCR-TEST-2` | existing unit (client, Jest) | `RCR-R-3`, `RCR-AC-2` | Same file — existing sort/`applyDefaultSort` tests, unmodified |
| `RCR-TEST-3` | unit (client, Jest) | `RCR-R-4`, `RCR-AC-3` | `programme-results.component.spec.ts` (`column resizing (TRC-R-1..4)` describe block) |
| `RCR-TEST-4` | unit (client, Jest) | `RCR-R-4`, `RCR-AC-3` | `bilateral-results-list.component.spec.ts` (`Column resize and pagination` describe block) |
| `RCR-TEST-5` | unit (client, Jest) | `RCR-R-4`, `RCR-AC-3` | `portfolio-overview.component.spec.ts` (new `Column resize does not trigger a sort` describe block) |

Client coverage must stay above 50/60/60/60 (unaffected — each change is a handful of lines in an already-covered file). Combined suite run: `npx jest --silent --reporters=summary --no-coverage --testPathPattern="results-list.component|programme-results.component|bilateral-results-list.component|portfolio-overview.component"` → 220/220 passed. `npx ng lint --quiet` → all files pass.

## 6. Rollout & verification

- [x] `RCR-T-1` PR merged (commit `9f3c1f657` on `qa-development-2026-mc`, merged into `performance-refactor` at `16140d597`).
- [ ] `RCR-T-2..4` PR/commit opened with the commit message convention.
- [x] CI-equivalent local gate green (lint, full targeted Jest run — no migration involved, `migration:check:ci` is a no-op here).
- [x] Manual QA for `RCR-T-1`: reproduced the original repro (drag Title column resizer, release inside header) against the real running app with an injected session — confirmed no sort change.
- [ ] Manual QA for `RCR-T-2..4`: not yet done in a real browser (mechanism-level Jest proof only, same real-DOM-event technique as `RCR-T-1`'s Jest tests) — recommended before closing this spec if a browser session is available.

## 7. Cleanup & follow-ups

- [x] `RCR-T-1` shipped and merged.
- [x] Audited the duplicated resize pattern (`design.md` §13): `programme-results`, `portfolio-overview`, `bilateral-results-list` fixed (`RCR-T-2..4`); `links-to-results-global` and both `mapped-results-modal` components confirmed to have no resize handle — no fix needed.
- [ ] Still open: extract the four independent guard copies into one shared resizable-column directive/mixin (`RCR-DD-2`) — separate follow-up, not required here.
- [ ] Move spec status fully to `shipped` once `RCR-T-2..4` are committed (and merged, if this branch also gets merged like `RCR-T-1` did).

## 8. Roll-back plan

1. Revert the merge commit / PR for whichever task(s) need rolling back — `RCR-T-1..4` are independent commits/diffs across four separate files, so a partial revert (e.g. only `RCR-T-4`) does not affect the others.
2. No migration, no feature flag, no downstream consumer to notify — every revert is self-contained to one component file (+ its spec) per task.

## Required cross-references

- `docs/specs/bugfix/results-center-title-resize-triggers-sort/requirements.md` and `design.md` (same folder).
- `onecgiar-pr-client/src/app/shared/components/pr-table/pr-sortable-column.directive.ts`.
