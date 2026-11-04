# Design — Impact previous-results dropdown

## 1. Summary

Frontend-only change in `impact-level-info/`. The dialog picker `components/previous-results-picker/` becomes an **inline** standalone component (same folder, same selector `app-previous-results-picker`) that keeps its E5 search pipeline and swaps its template/styles for the Contributors dropdown layout. The page renders it on Yes, owns `previousResults`, and renders the Contributors-style selected list. No server, API, payload or data change.

| Item | Value |
|---|---|
| Requirements | IPD-R-1..5, IPD-NFR-1..5 (`requirements.md`) |
| Server / E5 / DB | unchanged (E5 already accepts `q`, `typeIds`, `portfolioId`, `excludeResultId`, `page`, `limit`) |
| Contributors & partners | untouched (styles are copied, not shared — IPD-DD-3) |

## 1A. Premise ledger

| Premise | Verified |
|---|---|
| E5 filters by `portfolioId` (`version.portfolio_id`) | `impact-level-search.repository.ts:50` |
| Versioning rows carry `obj_portfolio` (id + acronym) | used today by `phaseOptionLabel()` |
| Contributors dropdown styles use tokens only (0 hex) | `rd-contributors-and-partners.component.scss` grep |
| Yes→No revert writes through `@ViewChild(PrYesOrNotComponent)` | `impact-level-info/CLAUDE.md` — logic untouched |

## 2. Architecture

```
impact-level-info (page)                       previous-results-picker (inline)
  previousReported === true && !readOnly  ──►  [resultId] [selection] (selectionChange)
  previousResults[]  ◄── selectionChange ───   field + panel (open state internal)
  Contributors-style selected list                E5 GET_impactPreviousResultsSearch
  (remove icon → removePreviousResult)            GET_versioning → portfolio options
                                                  GET_resultTypes → typology chips
```

Page selected list is the single source of truth; the dropdown only emits the next array.

## 3–5. Data, API, server

No change. Save body (`buildBody()`), dirty snapshot, green check and E4 are untouched (IPD-R-4).

## 6. Frontend plan

### 6.1 Picker component (`components/previous-results-picker/`)

| Concern | Before | After |
|---|---|---|
| Host | Spartan dialog content (`BrnDialogRef`, `injectBrnDialogContext`) | Plain inline component; inputs `resultId`, `selection`; output `selectionChange` |
| Open state | dialog | `open` signal; field click toggles; Close / Escape / outside click closes, focus back to field (IPD-NFR-1) |
| Selection | working copy + Done/Cancel | toggling a row / Clear selection emits the new array at once (IPD-A-3) |
| Phase filter | `pr-filter-select` with every phase | **removed** → Portfolio segment All / P22 / P25 built from distinct `obj_portfolio` in versioning rows; sends `portfolioId`, never `versionId` (IPD-A-1, A-4) |
| Type filter | `pr-filter-multiselect` | typology chips (`button`, `aria-pressed`) from result types, `resultTypeFilterLabel` labels → `typeIds` |
| Paging | Prev / Next | Load more: page+1 appended; filter/query change resets to page 1 and replaces |
| Pipeline | debounce 300 + distinct + switchMap | kept as is (IPD-NFR-4); the append flag travels with the request so a stale append is dropped by `switchMap` |
| States | loading / error+Retry / announcement | kept; empty text "No results match your search"; summary "Showing {total} results" |
| Row label | code / title / meta | `[portfolio · phase] code · type` + status badge, title below (IPD-R-1) |

Load triggers: the first E5 call happens when the panel first opens (not on page load), so answering Yes costs nothing until the user opens it.

### 6.2 Page (`impact-level-info.component.*`)

- Remove `HlmDialogService`, `openPreviousResultsPicker()`, the "Add results" button and dialog wiring.
- On Yes: `app-pr-field-header` "Please select a result" (required), then `<app-previous-results-picker>` when `!readOnly`, then the selected list ("Results selected (N)", one line per result, remove icon `button` with `aria-label="Remove result <code>"` when `!readOnly`).
- `onSelectionChange(list)` sets `previousResults` (new array) → dirty tracking picks it up.
- `removePreviousResult` keeps its focus logic; the final fallback target changes from "Add results" to the dropdown field.
- Hidden `appFeedbackValidation` markers unchanged (label of the Yes ⇒ ≥1 link marker becomes "Please select a result").

### 6.3 Design system

Copy the dropdown rules (`.custom-dropdown-panel`, search bar, `.filter-chip`, segmented `.grouped-chip`, `.result-list-item`, `.panel-footer`, selected-chip line) from `rd-contributors-and-partners.component.scss` into the picker's own `.scss` and the page `.scss`. Token values only (`var(--pr-…)`); no new tokens (IPD-NFR-2). Chips/segments become `<button>`s (Contributors uses `div`s) with a reset so they look identical.

## 7–9. Security, performance, observability

No auth change. E5 page size stays 20; at most one in-flight request. Nothing new to log.

## 10. Testing plan

| Layer | File | Covers |
|---|---|---|
| Jest | `previous-results-picker.component.spec.ts` (rewritten) | params per action, Load more append / last page, stale drop, Reset, Clear, toggle emits, error/empty, portfolio options from versioning |
| Jest | `impact-level-info.component.spec.ts` (adapted) | selection → `previousResults` + dirty, remove + focus fallback, Yes→No confirm, read-only, no dialog service |
| Cypress CT | `impact-level-info.picker.cy.ts` (rewritten) | real keyboard (Tab/Enter/Space/Escape + focus return), no horizontal scroll at 1280/900 |
| Visual | screenshot 1280 px next to Contributors | IPD-NFR-2 (HITL / T6) |

## 11. Compatibility

Stored data unchanged; existing links render in the new list. Rollback = revert the commit(s).

## 12. Design decisions

### IPD-DD-1 — Convert the existing picker in place (not a new component)
Keeps the proven E5 pipeline, constants and spec seam; avoids a dead dialog component. Rejected: new `previous-results-dropdown` + delete picker (more churn, same result).

### IPD-DD-2 — Portfolio segment from versioning rows
P22/P25 ids derived from `obj_portfolio` so no hard-coded ids. Rejected: hard-code ids (breaks across DBs); Contributors' year rule (`phase_year <= 2024`) (client-side, not supported by E5).

### IPD-DD-3 — Copy styles, do not extract a shared partial
Extracting would edit Contributors (out of scope, regression risk on a heavily patched screen). Cost: two copies of ~120 lines of SCSS. Follow-up candidate if a third consumer appears.

### IPD-DD-4 — Reversions (Step 2.3 challenge: "what does removing this break?")

| Removed | What it breaks | Answer |
|---|---|---|
| Dialog focus trap / restore | Keyboard users lose a contained flow | Escape + Close return focus to the field; CT proves it |
| Cancel / Done working copy | User cannot discard a batch of picks | Accepted (U-1, IPD-A-3); unsaved guard + Save still gate storage; same as Contributors |
| Specific-phase filter | Users who filtered "Reporting 2026 only" | Accepted by user (IPD-A-4); search + portfolio + type remain; results ordered newest phase first |
| Prev/Next paging | Jumping to page N | Load more covers forward browsing; search is the intended narrowing tool |
| IRD-T-4 CT + picker spec assertions on the dialog | Tests fail | Rewritten in IPD-T-1/T-3, not deleted without replacement |

## 13. Budget (Step 2.4)

| Expected tasks | Expected LOC (incl. tests) | Expected review rounds |
|---|---|---|
| 3 | ~550 (picker ~250 incl. SCSS copy, page ~60, Jest ~180, CT ~80) | 2 |

Sizing note: this lands above Lite's "1 task" shape — closer to a small Standard. Kept in Lite documents per the request; `/akili-execute` must stop and escalate if actuals exceed 4 tasks or ~700 LOC.
