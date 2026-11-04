# Archive Summary — Impact previous-results dropdown (`IPD`)

**Outcome:** shipped to `qa-development-2026-ss`.
- When the Impact level info question is answered Yes, the page shows an inline dropdown in the Contributors & partners style. It replaces the "Add results" button and its pop-up dialog.
- The dropdown is still fed by the Impact search (E5).
- The user approved the screenshots on 2026-11-03. The work is not yet on `performance-refactor` or PRTest.

## 1. Document Control

| Field | Value |
|---|---|
| Spec Path | `results/impact-results-reporting/impact-previous-results-dropdown` |
| Archive Date | 2026-11-03 |
| Branch | `qa-development-2026-ss` (spec branch; `Default Branch: master`, `Integration Branch: staging`) |
| Final Status | **Complete** — IPD-T-1..T-3 `[x]` |
| Commits | `44ae21908` (code, together with the question copy from `quick/impact-previously-reported-label`) and `d4f5fda93` (spec docs). Both pushed to `origin/qa-development-2026-ss` |

## 2. Original Spec Path

`docs/specs/results/impact-results-reporting/impact-previous-results-dropdown/`

## 3. Requirements Delivered

| Requirement | Task | Evidence |
|---|---|---|
| IPD-R-1 Inline dropdown on Yes, no dialog, no "Add results" | T-1, T-2 | Jest picker + page; CT |
| IPD-R-2 Search, typology chips and portfolio drive E5; debounce; stale responses dropped; Load more; error and empty states | T-1 | Jest picker 14/14 (each param assertion reads the call args) |
| IPD-R-3 Selected list, remove with focus order, Clear selection | T-1, T-2 | Jest page 51/51 |
| IPD-R-4 Save body, dirty flag, Yes→No confirm and Cancel unchanged | T-2 | Jest page (clicks the real `.choice`) |
| IPD-R-5 Read-only: no field, no remove buttons | T-2 | Jest page |
| IPD-NFR-1 Keyboard: Tab, Enter, Space, Escape, focus returns to the field | T-1, T-3 | CT with real keys, 1280 and 900 px |
| IPD-NFR-2 Visual parity with Contributors | T-1, T-3 | Panel capture approved by the user |
| IPD-NFR-3 No horizontal scroll at 1280 and 900 px | T-3 | CT: 4 boxes asserted, also in the screenshot state |
| IPD-NFR-4 / NFR-5 Debounce and stale drop; aria-live count | T-1 | Jest picker |

## 4. Files Changed Summary

All files are under `onecgiar-pr-client/src/app/pages/results/pages/result-detail/pages/rd-result-types-pages/impact-level-info/`.

| File | Change |
|---|---|
| `components/previous-results-picker/*.ts, .html, .spec.ts` | Rewritten from a dialog into an inline dropdown. Gained a public `focusField()` |
| `components/previous-results-picker/*.scss` | New. Copied from Contributors, tokens only |
| `impact-level-info.component.ts, .html, .scss, .spec.ts` | Wiring, selected list, focus fallback; the question copy from the quick change |
| `impact-level-info.module.ts` | Imports the standalone picker |
| `impact-level-info.picker.cy.ts` | Rewritten as a real-key CT spec |
| `CLAUDE.md` (module) | Picker contract rewritten; `Verified:` re-stamped |

12 files, +1,209 / −625 (`44ae21908`).

## 5. Test Evidence Summary

| Run | Result |
|---|---|
| `npx jest --testPathPattern=previous-results-picker --maxWorkers=2` | 14 / 14 |
| `npx jest --testPathPattern=impact-level-info.component --maxWorkers=2` | 51 / 51 |
| `npx jest --findRelatedTests <3 changed .ts> --maxWorkers=2` | 22 suites / 775 tests |
| `npx ngc -p tsconfig.app.json --noEmit` | 0 errors |
| `npx cypress run --component --spec impact-level-info.picker.cy.ts` | 7 passing, exit 0 |
| `ng lint --lint-file-patterns` (touched files) | clean |

## 6. Validation Summary

There is no `test-report.md` and no `validation-report.md`. The user accepted archiving without them on 2026-11-03. The substitutes are:
- the Reviewer verdicts for each task (5 review rounds in total);
- the real-key CT run;
- the user's approval of the screenshots.

## 7. Accepted Warnings Or Follow-Ups

| Follow-up | Priority |
|---|---|
| PRTest smoke on a P25 Impact contribution result: open, filter by P25 and one type, select 2, save, reload, remove 1, save (tasks.md §6). Needs `performance-refactor` first | High |
| Load more visual parity was not captured; the stub has only 1 page | Low |
| Real-key coverage of Load more, Clear, Close and remove icons is Jest only | Low |
| `npm run test:ct:batch` path filter matches nothing on Windows (backslashes) | Low (pending item P2) |
| `node_modules/primeicons/fonts/` was found empty and restored locally from `npm pack` | Info |

## 8. Historical Notes

- **Budget tripwire at T-1.** Design §13 planned ~550 LOC; T-1 alone reached +817, mostly copied SCSS (377 lines vs ~120 estimated). The user chose "Accept and review" and the budget was re-baselined to ~1,100 LOC.
- **Rework.**
  - T-1 attempt 1 failed on two points: typing the same query after Reset or × was suppressed by `distinctUntilChanged`, and an outside click lost focus.
  - T-3 attempt 1 failed on two points: the overflow assertion did not run in the screenshot state, and the panel was cut off in the capture.
  - Both tasks passed on attempt 2.
- **Late defect.** T-2 added the page `.scss` with a wrong `@use` depth (9 levels up instead of 8). Jest and `ngc --noEmit` passed because neither compiles SCSS. The T-3 CT mount caught it, and the fix was authorized as a T-2 defect correction.
- **Phantom scrollbar.** The horizontal scrollbar in the first capture came from Cypress scaling the capture (viewport 1280×800 inside a 720 px-tall `cypress run` window). The page did not overflow.
- **Concurrent session.** Another session committed `3ae5d249b` (`quick/impact-section-order`) in the same checkout during execution. This spec committed with explicit paths only.
