# Tasks — Results Center: column resize must not trigger a sort

## 1. Scope of this task list

- **Module / feature:** `bugfix/results-center-title-resize-triggers-sort`
- **Linked spec:** `requirements.md` + `design.md` (same folder)
- **Owner / driver:** current session
- **Status:** `not-started`

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
  - [ ] Manually verified in a running dev server: drag-resize the Title column and release inside the header — table does not re-sort; a plain click on the Title header still sorts.
  - [ ] No secret or token leaked in logs (`.cursorrules`) — n/a, no logging added.

---

## 4. Dependency graph

```
RCR-T-1  (single task — fix + regression test in one file pair)
```

## 5. Test plan

| Test ID | Type | Covers | Location |
|---|---|---|---|
| `RCR-TEST-1` | unit (client, Jest) | `RCR-R-1`, `RCR-R-2`, `RCR-AC-1` | `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-list/results-list.component.spec.ts` (new case in the `Column resize` describe block) |
| `RCR-TEST-2` | existing unit (client, Jest) | `RCR-R-3`, `RCR-AC-2` | Same file — the existing sort/`applyDefaultSort` tests continue to pass unmodified, proving legitimate clicks still sort |

Client coverage must stay above 50/60/60/60 (unaffected — the change is a handful of lines in an already-covered file).

## 6. Rollout & verification

- [ ] PR opened with the commit message convention.
- [ ] CI green (lint, tests, build, SonarCloud — no migration involved, `migration:check:ci` is a no-op here).
- [ ] Manual QA: reproduce the original repro (drag Title column resizer, release inside header) on a running `npm start` instance — confirm no sort change — per the Session's verification pass before closing this spec.

## 7. Cleanup & follow-ups

- [ ] Move spec status to `shipped` once merged.
- [ ] File a follow-up (see `design.md` §13) to audit/fix the same duplicated resize pattern in `programme-results`, `portfolio-overview`, `bilateral-results-list`, `links-to-results-global`, and both `mapped-results-modal` components.

## 8. Roll-back plan

1. Revert the merge commit / PR.
2. No migration, no feature flag, no downstream consumer to notify — the revert is self-contained to one component file and its spec.

## Required cross-references

- `docs/specs/bugfix/results-center-title-resize-triggers-sort/requirements.md` and `design.md` (same folder).
- `onecgiar-pr-client/src/app/shared/components/pr-table/pr-sortable-column.directive.ts`.
