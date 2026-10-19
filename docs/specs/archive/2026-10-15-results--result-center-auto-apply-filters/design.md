# Module Spec — `design.md`

## 1. Summary

Results Center's filter popover (`menu` layout, today's default) requires an explicit **Apply** click because `ResultsListFiltersComponent.onFilterFieldChanged()` only commits pending filter picks into the applied `ResultsListFilterService` signals when the panel is in `sidebar` layout. The fix is a **one-line removal of that gate** so every dropdown change commits immediately in both layouts, plus removing the now-unreachable **Apply**/**Cancel** buttons and the one method (`applyFilters()`) that becomes dead code once its only caller (its own button) is gone. No server, data-model, or API change is involved — the results list already re-renders reactively off the applied signals this spec starts writing sooner.

Link: `requirements.md` (same folder); `docs/trd/trd.md` §6 Frontend Architecture (signal-based state, no NgRx).

---

## 1A. Premise Ledger

**Count:** 7 premises — 6 verified, 1 `UNVERIFIED` (Impact: Low).
**Blast-radius triggers:** `live-path` fires (the design names the user action "select a filter dropdown option" and the branch point `isSidebarLayout()`) → P-1 row. `consumer` fires (the design removes a public method and two DOM elements) → P-5, P-6 rows. `shared-state` fires (`ResultsListFilterService` is read by more than one component) → P-4 (verified sibling) and P-7 (`UNVERIFIED` remainder).

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| `RCF-P-1` | The **only** gate between a dropdown change and an applied-signal write, across all 7 filter fields + 2 checkboxes, is the single `if (this.isSidebarLayout())` check inside `onFilterFieldChanged()` | `live-path` | `results-list-filters.component.ts:818-821` (the method body); all 9 field bindings in the shared `#filterFields` template call this same handler — `results-list-filters.component.html:239,249,259,272,282,293,303,317,326` | `0aa1f75b7` | A per-field fix would be needed instead of one shared edit; `RCF-T-1` grows a branch per field that diverges | — |
| `RCF-P-2` | Chip removal (`removeFilter()`) and "Clear all" (`clearAllNewFilters()`) already write directly to the applied `ResultsListFilterService` signals, bypassing `temp*`/Apply entirely | `existence` | `results-list-filters.component.ts:653-681` (`clearAllNewFilters`), `:683+` (`removeFilter`) — both call `this.resultsListFilterSE.selected*.set(...)` directly, no `temp*` involved | `0aa1f75b7` | `RCF-AC-3` would need new implementation work, not a regression-only check | — |
| `RCF-P-3` | The default filter layout is `'menu'` (Apply/Cancel-gated); `'sidebar'` only applies if the browser's `localStorage['rc-filter-layout']` already holds `'sidebar'` | `data-env` | `results-list-filter.service.ts:35-41` (`readStoredFilterLayout()`), `:48` (`signal(readStoredFilterLayout())`) | `0aa1f75b7` | Changes the "why most users see the bug" narrative only; the fix itself is unaffected | — |
| `RCF-P-4` | The applied signals this spec writes sooner already drive the results list reactively with no new wiring: `text_to_search`/`selectedSubmittersAdmin`/`selectedIndicatorCategories`/phase selection/`filterCreatedByMe`/`filterSubmittedByMe` via two `effect()`s that call `api.updateResultsList(...)`; `selectedStatus`/`selectedClarisaPortfolios`/`selectedFundingSource`/`selectedLeadCenters` via the template's `resultsListFilter` pipe | `shared-state` | `results-list.component.ts:294-319` (the two effects); `pipes/results-list-filter.pipe.ts:17-74` (the pipe's filter functions); mount point confirmed at `results-list.component.html:107-111` (`<app-results-list-filters>`) | `0aa1f75b7` | A new task would be needed to make the list reactive to these signals — not required here | — |
| `RCF-P-5` | `ResultsListFiltersComponent.applyFilters()` has no caller outside this component's own template | `consumer` | `grep -rn "applyFilters(" onecgiar-pr-client/src` — every hit is this component's own `.ts`/`.html`/`.spec.ts`, or the unrelated sibling `IpsrListFiltersComponent`/`IpsrListFilterService` (out of scope, `requirements.md` §3) | `0aa1f75b7` | Deleting `applyFilters()` would break an external caller; `RCF-T-1` keeps the method instead | — |
| `RCF-P-6` | No Cypress/E2E spec references the removed Apply/Cancel buttons or calls `applyFilters()` | `consumer` | `grep -rn "rc-btn--primary\|rc-btn--ghost\|rc-more-footer\|applyFilters\b" cypress/ src/**/*.cy.ts` → no hits | `0aa1f75b7` | An E2E suite would break silently; `RCF-T-1`'s Done criteria would need to update it too | — |
| `RCF-P-7` | Beyond `results-list.component.ts` (verified, `RCF-P-4`) and `shell-topbar.component.ts` (verified **not** a dependent — its own comment at `:452` states it no longer writes `ResultsListFilterService.text_to_search`), no other reader of `ResultsListFilterService` assumes filters change only on an explicit Apply click | `shared-state` | `UNVERIFIED — confirm at source before relying on it` | — | Impact: **Low** — a false premise means another file starts seeing applied-filter values update sooner, the same change `sidebar`-layout users already experience today with no prior incident; no code change anticipated | `RCF-T-1`'s Consumers field (grep + spot-read of every non-test, non-`results-list.component.ts`, non-`shell-topbar.component.ts` hit) — owner: whoever executes `RCF-T-1` |

---

## 1B. Budget (Step 2.4 tripwire)

| Metric | Estimate |
|---|---|
| Expected tasks | 2 (`RCF-T-1` code + test change, `RCF-T-2` manual browser verification) |
| Expected LOC (diff, both directions) | ~90 (mostly test-file churn: delete one `describe` block, flip one assertion, delete 2 template lines, delete ~10 TS lines, 1 comment edit) |
| Expected review rounds | 1 (`checklist` depth — single component, no shared-contract/migration/auth change) |

This is a small **Standard**-depth spec: real behavioral nuance (two layouts converging to one timing, one method retired as dead code) justified writing it up, but the touched surface is one component. If `/akili-execute` finds itself touching a second component or needing a second review round, that is a signal to stop and re-check scope against this budget, not to push through silently.

---

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Client module touched:** `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-list/components/results-list-filters/` (component + its spec). No other file changes.
- **Shared state touched (read-only in effect, no shape change):** `results-list-filter.service.ts` — this spec does not modify the service; it only changes how soon the existing component writes to its existing signals.
- **No server module, no API, no migration, no external integration touched.**

### 2.2 Interaction flow (current → fixed)

```
[User clicks a dropdown option inside the Results Center filter panel]
  └── app-pr-filter-multiselect (changed) / checkbox (ngModelChange)
        └── ResultsListFiltersComponent.onFilterFieldChanged()   [results-list-filters.component.ts:819]
              ├── TODAY:  if (isSidebarLayout()) commitTempFilters();   else → nothing happens until Apply
              └── FIXED:  commitTempFilters();                          [unconditional — RCF-DD-1]
                    └── ResultsListFilterService.selected*.set(...)
                          ├── results-list.component.ts effects (text/submitters/categories/phases/createdByMe/submittedByMe)
                          │     └── api.updateResultsList(...) → results list re-fetches
                          └── resultsListFilter pipe (status/portfolio/fundingSource/leadCenters)
                                └── template re-filters the already-loaded rows
```

Chip removal and "Clear all" are unchanged — they already enter this diagram at the `ResultsListFilterService.selected*.set(...)` step directly (`RCF-P-2`).

---

## 3. Data Model Changes

None. No entity, migration, or CLARISA implication.

---

## 4. API Surface

None. No endpoint, DTO, or bilateral/platform-report payload is touched.

---

## 5. Server Workflow / Business Rules

None — this is a client-only interaction-timing fix.

---

## 6. Frontend Plan

### 6.1 Routes / modules

No routing change. `pages/results/pages/results-outlet/pages/results-list/components/results-list-filters/` only.

### 6.2 Components & services

| File | Change |
|---|---|
| `results-list-filters.component.ts` | Remove the `isSidebarLayout()` gate from `onFilterFieldChanged()` (now unconditionally calls `commitTempFilters()`, `RCF-DD-1`). Delete `applyFilters()` (`RCF-DD-2`, `RCF-P-5`/`RCF-P-6` clear it as dead code). Update the stale doc-comment above `onFilterFieldChanged()` (`RCF-DD-3`). No other method changes — `cancelFilters()`, `syncTempFromApplied()`, `commitTempFilters()`, `clearAllNewFilters()`, `removeFilter()` are unchanged; they remain wired to the ✕ button, outside-click, `Escape`, the layout toggle, and "Clear all," now acting as pure panel-close/clear actions instead of discard actions (nothing is ever pending to discard once `RCF-DD-1` lands). |
| `results-list-filters.component.html` | Delete the Apply/Cancel footer (`<div class="rc-more-footer">…</div>`, lines 61-64). No other markup change — the ✕ button (line 54), "Clear all" (lines 48-53), outside-click, and `Escape` handling stay exactly as they render today. |
| `results-list-filters.component.spec.ts` | Delete the `describe('applyFilters', ...)` block (its assertion duplicates what the updated `onFilterFieldChanged()` tests now cover for both layouts). Update the `describe('filter layout (menu / side column)', ...)` block: the test currently named *"should wait for Apply in the menu"* (asserting the bug) is replaced by an assertion that `menu` layout now commits immediately too — this is the mandatory regression test (`requirements.md` Bug-adjacent fix; see `task.md` Falsifier). Leave `describe('cancelFilters', ...)` and the "should hide the Filter menu button…" test untouched — unaffected by this change. |
| `results-list.component.ts`, `results-list-filter.service.ts`, `pipes/results-list-filter.pipe.ts` | **No change** (`RCF-P-4` — already reactive to the applied signals). |

State boundary: unchanged — state continues to live in `ResultsListFilterService` (`WritableSignal`s), per `docs/trd/trd.md` §6.

### 6.3 Design system usage

No new UI. Removing two existing buttons; no new tokens, no new component, no new i18n string (the two removed buttons' labels, "Cancel"/"Apply," are deleted, not relabeled — per `onecgiar-pr-client/src/CLAUDE.md` §11, structural copy like "Cancel"/"Apply" was never required to be a `TermKey`). The remaining ✕ button already carries `aria-label="Close filters"` (`.html:54`) — accessibility close affordance is preserved (`requirements.md` §7).

### 6.4 Real-time / notification UX

None.

---

## 7. Security & Authorization

Unaffected — no route, guard, or role change. No new input surface (the same 7 dropdowns and 2 checkboxes already exist and already reach the same `ResultsListFilterService` signals; only the timing of the write changes).

---

## 8. Performance & Capacity

No new request pattern: `menu` layout will now fire applied-signal writes (and the resulting `api.updateResultsList(...)` calls / pipe re-filters) at the same per-toggle rate `sidebar` layout already ships today (`app-pr-filter-multiselect`'s `changed` output emits once per option toggle — `pr-filter-multiselect.component.ts:98-99`). No debounce exists for either layout today, and none is added — this is a feature-parity fix, not a new performance surface.

---

## 9. Observability

No new logging. No change to error paths — the filter write path has no server round-trip of its own (the resulting `api.updateResultsList(...)` call already has its own existing error handling, untouched).

---

## 10. Testing Plan (forward-looking)

- **Unit (Jest):** `results-list-filters.component.spec.ts` — for each of the 7 dropdown fields + 2 checkboxes, assert that with `filterLayout() === 'menu'` (the default, no `setFilterLayout` call needed), calling the field's change path commits the applied signal immediately with no further action. One consolidated test per the existing `describe('filter layout (menu / side column)', ...)` block is enough — it already iterates representative fields; it does not need one `it()` per field to prove the single shared gate (`RCF-P-1`) is gone, but the task MUST still touch at least one previously-untested field to avoid a fixture that happens to pass by coincidence (see `task.md` Falsifier).
- **Regression (mandatory per the defect-class table in `requirements.md` §9):** the pre-fix test *"should wait for Apply in the menu"* is the documented red state; the task flips it to assert the opposite and must observe it fail against the current (pre-fix) code before the fix lands, then pass after.
- **DOM assertions:** `fixture.nativeElement.querySelector('.rc-more-footer')` (or `.rc-btn--primary` / `.rc-btn--ghost`) must be `null` in `menu` layout once the panel is open.
- **Manual/browser (human-check gap named in `requirements.md` §9):** open Results Center in a real browser, both `menu` and `sidebar` layouts, confirm no visual regression from the removed footer and that closing the panel via ✕/outside-click/`Escape` never reverts a selection.
- **Coverage:** client thresholds 50/60/60/60 unaffected — this is a net deletion of code (one method, two buttons) and should not lower the touched file's coverage.

---

## 11. Backwards Compatibility & Migration Plan

No database or API migration. No feature flag — the fix applies to all users immediately on deploy (both `menu`, today's default, and `sidebar`). No data backfill. No downstream-consumer notification needed (bilateral/platform-report payloads are untouched).

---

## 12. Design Decisions (ADRs)

### `RCF-DD-1` — Remove the `isSidebarLayout()` gate rather than removing the temp/applied split

- **Context:** Two ways to make `menu` layout auto-apply: (a) delete the one-line gate so `onFilterFieldChanged()` always commits; (b) remove the `temp*`/applied split entirely and bind each of the 7 dropdowns directly to the applied signals (the pattern `IpsrListFiltersComponent`'s primary facets already use, per the live-apply reference the user pointed to).
- **Decision:** (a).
- **Alternatives considered:** (b) rejected for this spec — it would touch 9 template bindings across the one shared `#filterFields` template, remove 9 `temp*` signals and `commitTempFilters()`/`syncTempFromApplied()`, and rewrite ~15 existing Jest assertions that construct state via `component.tempSelected*`, for no behavioral gain once the Apply/Cancel buttons are gone (temp mirrors applied at all times after (a), so the indirection is inert, not broken). Larger blast radius for the same user-visible result.
- **Consequences:** `temp*` signals and `commitTempFilters()` remain as now-purely-mechanical indirection. A future reader must learn that temp always mirrors applied; mitigated by `RCF-DD-3`'s comment fix. If a future spec wants to remove the indirection outright (closer to the IPSR pattern), it can do so as its own, separately-reviewed refactor.

### `RCF-DD-2` — Delete `applyFilters()` as dead code; keep `cancelFilters()` as a pure panel-close action

- **Context:** Removing the Apply button (`requirements.md` `RCF-R-2`) leaves `applyFilters()` with zero callers (`RCF-P-5`, `RCF-P-6`). `cancelFilters()` remains referenced by the ✕ button, outside-click, `Escape`, the layout-switch guard, and "Clear all" — all five sites still need *a* close action, even though nothing is left to discard once `RCF-DD-1` lands.
- **Decision:** Delete `applyFilters()` entirely (project convention: no unused code, no "just in case" dead methods). Keep `cancelFilters()`/`syncTempFromApplied()` under their current names — do not rename to something like `closeFiltersPanel()`.
- **Alternatives considered:** Renaming `cancelFilters()` for semantic accuracy (it no longer "cancels" anything, since there is nothing pending) — rejected as out-of-scope churn: it would touch 5 call sites plus the existing, still-accurate `describe('cancelFilters', ...)` Jest block for a comment-level clarity gain only, with no behavior change. `requirements.md` `RCF-OQ-1` resolves the one genuinely stale comment (at `onFilterFieldChanged()`, not at `cancelFilters()`) instead.
- **Consequences:** `cancelFilters()`'s name is a minor, accepted clarity debt (noted here so a future reader isn't surprised); its existing test continues to pass unmodified.

### `RCF-DD-2 — Reversion challenge (Step 2.3)`

This DD removes already-shipped UI (the Apply/Cancel buttons and the `applyFilters()` method) — triggering the mandatory one-question challenge.

- **Challenge:** *What does removing the Apply/Cancel buttons break?*
- **Answer:** Nothing found. `sidebar` layout has shipped with **no** Apply/Cancel buttons and instant-apply-on-every-change since it was built, with no incident on record (no `kaizen-log.md` entry, no related spec). Chip removal and "Clear all" are already instant and unaffected (`RCF-P-2`). No Cypress/E2E suite references the removed buttons or `applyFilters()` (`RCF-P-6`). The only user-facing risk — "I can no longer back out of a filter pick before committing" — is explicitly what the user's own acceptance criteria asked to remove, and the mitigation (chip-remove / "Clear all," one click away) already exists today for `sidebar`-layout users. No design change required as a result of this challenge.

### `RCF-DD-3` — Correct the stale `onFilterFieldChanged()` doc-comment

- **Context:** The comment at `results-list-filters.component.ts:818` ("Side column behaves like a shop's filter rail: each change applies at once") describes `sidebar`-only behavior that, after `RCF-DD-1`, is no longer sidebar-specific.
- **Decision:** Replace it with a comment reflecting that every layout now commits immediately (`requirements.md` `RCF-OQ-1`, resolved here).
- **Alternatives considered:** Leave it — rejected; a one-line, zero-risk edit directly prevents the next reader from re-introducing the gate "to restore the documented behavior."
- **Consequences:** None.

---

## 13. Open Gaps & Follow-ups

- No automated gate covers rendered visual layout (popover/side-column spacing after the footer is removed) — named explicitly in `requirements.md` §9 as an accepted human-check gap at the manual QA step.
- `RCF-P-7` (`shared-state`, `UNVERIFIED`) is owned by `RCF-T-1`'s Consumers field — resolve before marking that task done.
- `RCF-DD-1`'s accepted indirection (temp signals that always mirror applied) is a candidate for a future, separately-scoped cleanup toward the IPSR direct-binding pattern — not undertaken here.

---

## Required cross-references

- `docs/specs/results/result-center-auto-apply-filters/requirements.md`
- `docs/prd.md`, `docs/ux-ui/design.md`, `docs/trd/trd.md`
