# Design — Notifications filter toolbar: one dropdown per facet

## 1. Summary

**Answer first:** replace the hand-rolled single **Filter** popover in `results-notifications.component` with **seven Spartan `hlm-popover`s**, one per facet, driven by **one** `openFacet` signal so at most one is open. Facet state, predicates, chips and "Clear all" stay in `ResultsNotificationsService` untouched. This is a client-only change to one component (template + TS + spec), its module imports and its copy file.

- **Shape:** component state (`openFacet`, per-facet counts, Phase/Program pick handlers, Program search) → template row of popovers → ported tests.
- **Biggest trade-off:** we drop the custom outside-click/Escape/alignment code (≈45 LOC) in favor of the CDK overlay inside `BrnPopover`. It positions and dismisses better, but its behavior can only be fully checked in a real browser (jsdom has no layout).

Links: [`requirements.md`](./requirements.md) · `docs/ux-ui/design.md` §7/§8/§10 · `docs/trd/trd.md` (client notifications page) · predecessor `docs/specs/notifications/inbox-revamp/`.

## 1A. Premise Ledger

| # | Premise | Source of truth | How verified | Status | If false |
|---|---|---|---|---|---|
| FTD-P-1 | `@spartan/popover` is generated, tracked and builds | `git ls-files src/app/spartan/popover` | 7 lib files + `index.ts` tracked; imported by `dashboard-lab/program-overview.component.ts:6` | `verified` | Generate it with `@spartan-ng/cli` first (new T-0) |
| FTD-P-2 | `BrnPopover` dismisses on outside pointer **and** Escape on its own | `node_modules/@spartan-ng/brain/fesm2022/spartan-ng-brain-dialog.mjs` `_connectDismissalEvents` | Reads `outsidePointerEvents()` → `dismiss('outside')`; `keydownEvents()` filtered on `Escape` → `dismiss('escape')`; popover config `closeOnOutsidePointerEvents: true`, `hasBackdrop: false` | `verified` | Keep a component-level Escape/outside handler (today's code) |
| FTD-P-3 | Controlled `[state]` + `(stateChanged)` keeps an external signal in sync | `program-overview.component.html:294` + `.ts` `onScopeStateChanged` | Same pattern ships and is Jest-tested in `program-overview.scope.spec.ts` | `verified` | Fall back to `brnPopoverTriggerFor` + local open flags per popover |
| FTD-P-4 | Clicking the **trigger of the open popover** does not count as an "outside" click that closes it and then lets the click handler reopen it | CDK `OverlayOutsideClickDispatcher` | Not checked: depends on whether the trigger is excluded from outside clicks | `assumed` | DD-4's re-open guard is needed (see §13) — T-1 adds it unconditionally so either outcome is safe |
| FTD-P-5 | A phase change reloads the inbox (`onPhaseChange` → `loadInbox`) | `results-notifications.service.ts:571-577` | Read: `this.loadInbox(phaseId); this.filterInitiativesByPhase(phaseId);` | `verified` | Re-pick of Phase could be allowed to clear |
| FTD-P-6 | Program options come from `filteredInitiatives` (`initiative_id`, `full_name`), single value in `initiativeIdFilter` | template L104-113 + `activeFilterChips` | Read | `verified` | — |
| FTD-P-7 | Phase options are `phaseList` (`id`, `phase_name_status`), Reporting **and** IPSR | template L88-98 + user statement 2026-10-05 | Read + user | `verified` | — |

## 2. Architecture Overview

### 2.1 Where this lives

- **Server:** none.
- **Client:** `onecgiar-pr-client/src/app/pages/results/pages/results-outlet/pages/results-notifications/`
  - `results-notifications.component.{html,ts,spec.ts}`
  - `results-notifications.module.ts` (add `HlmPopoverImports` and `NgIcon`; `hlmInput` already resolves today — no change)
  - `src/app/internationalization/contribution-request-drawer.copy.ts` (`filterToolbar` keys)
- **External:** none.

### 2.2 Interaction

```
[facet trigger click] → toggleFacet(key)
      ├─ openFacet() === key → closeFacet()            (R-3.S2)
      └─ else → openFacet.set(key)                     (R-3.S1: replaces any open one)
[hlm-popover key] [state] = openFacet()===key ? open : closed
      └─ (stateChanged 'closed')  ← outside click / Escape (BrnPopover)
            → onFacetStateChanged(key,'closed') → if openFacet()===key: openFacet.set(null)
[Escape] → BrnPopover closes → focus back to that trigger (DD-5)
[checkbox inside] → existing on<Facet>FilterChange(...)   (popover stays open — R-4.S1)
[Phase option]    → selectPhase(id) → no-op if same, else phaseFilter=id + onPhaseChange(id); close
[Program option]  → selectProgram(id) → toggle initiativeIdFilter; close
```

## 3. Data Model Changes

None.

## 4. API Surface

None. No new HTTP calls (NFR performance).

## 5. Server Workflow / Business Rules

None. Client business rules preserved: `onPhaseChange` single owner of the reload (FTD-P-5); facet predicates untouched.

## 6. Frontend Plan

### 6.1 Routes / modules

No routing change. `ResultsNotificationsModule` gains `...HlmPopoverImports` and `NgIcon` (chevron, `lucideChevronDown` via `provideIcons` on the component). Settings-route gate (`!isSettingsRoute`) still wraps the whole toolbar.

### 6.2 Components & state (component TS)

| Member | Kind | Purpose | Req |
|---|---|---|---|
| `FilterFacetKey` | type | `'phase' \| 'type' \| 'funding' \| 'resultType' \| 'program' \| 'center' \| 'bilateral'` | R-1 |
| `filterFacets` | readonly array | Ordered `{ key, label }` list driving the trigger row — the single place the order lives | R-1 |
| `openFacet` | `signal<FilterFacetKey \| null>` | Which popover is open | R-3 |
| `toggleFacet(key)` / `closeFacet(refocus)` / `onFacetStateChanged(key, state)` | methods | Open/close + overlay sync; refocus trigger on close | R-2/R-3/R-4 |
| `facetSelectedCount(key)` | method | Per-trigger badge count, reading the same service fields as `activeFilterCount` | R-6 |
| `selectedPhaseLabel` | getter | `phase_name_status` of `phaseFilter` for the Phase trigger | R-6 |
| `selectPhase(id)` | method | No-op on same id; else set `phaseFilter`, call `onPhaseChange`, close | R-5.S2/S3 |
| `selectProgram(id)` | method | Toggle `initiativeIdFilter` (same → `null`); close | R-5.S3 |
| `programSearchQuery` + `filteredProgramOptions` | signal + getter | Search inside Program | R-5.S4 |
| **Removed:** `filterPopoverOpen`, `filterTriggerRef`, `filterPanelRef`, `filterPopoverAlign`, `FILTER_POPOVER_WIDTH`, `FILTER_POPOVER_VIEWPORT_MARGIN`, `computeFilterPopoverAlign`, `toggleFilterPopover`, `onDocumentClick`, `onDocumentEscape` | — | Replaced by overlay (DD-1) | — |

`activeFilterCount`, `activeFilterChips`, `removeFilterChip`, `clearAllFilters`, every `on…FilterChange` / `is…FilterChecked` / facet-option getter and the search signals stay as they are.

### 6.3 Template

- Toolbar row: `flex flex-wrap items-center gap-[8px]` → search input (`w-[320px]` — amended 2026-10-06, user decision; was 240) then `@for (facet of filterFacets)` one `hlm-popover` each, `align="start"`, `sideOffset="6"`, `[autoFocus]="false"`, `[attachTo]` = the facet trigger (amended 2026-10-06 — without an origin brain centres the overlay on screen), controlled `[state]` / `(stateChanged)`.
- **Trigger** (`<button type="button">`): `aria-haspopup="dialog"`, `[attr.aria-expanded]`, `[attr.data-facet]="facet.key"`, label + count badge (`hlmBadge`) or phase name + `lucideChevronDown`. Style mirrors today's Filter button (`h-[36px] rounded-[8px] border-[var(--pr-color-accents-2)] bg-[var(--pr-color-white)] text-[13px]`); active state adds `border-[var(--pr-color-primary-300)] text-[var(--pr-color-primary-400)]`. All tokens already exist.
- **Content** (`hlm-popover-content *hlmPopoverPortal`, `w-[260px] p-[12px]`, `role="dialog"`, `[attr.aria-label]="facet.label"`): one `@switch (facet.key)` with the body moved verbatim from today's popover sections — no new option logic. Phase and Program bodies become option buttons (`role="option"` in a `role="listbox"`) instead of `app-pr-select` (DD-3).
- Spacer, "Mark all as read", "Notification settings" unchanged and stay right-aligned on the same row.

### 6.3a Design system usage

Spartan `hlm-popover`, `hlm-checkbox`, `hlmInput`, `hlmBadge`; `@ng-icons/lucide` chevron. Tokens `--pr-color-accents-2/5`, `--pr-color-secondary-400`, `--pr-color-primary-300/400`, `--pr-color-white`, `--pr-focus-ring` — no new tokens, no hex. Px type sizes only. Responsive: the row wraps (R-10); popover keeps itself in the viewport via the CDK flexible position strategy (R-2.S2).

### 6.3b A11y

Trigger `aria-haspopup="dialog"` + `aria-expanded`; content `role="dialog"` named by the facet label; Escape restores focus to the trigger (DD-5); focus ring on triggers and options.

### 6.3c i18n (new `filterToolbar` keys)

`phaseLabel` ("Phase"), `programLabel` ("Program / Accelerator"), `programSearchPlaceholder` ("Search programs"), `selectPhaseFirst` ("Select a phase first"), `noProgramsYet` ("No programs available for this phase."). `searchPlaceholder` → "Search result, person or code". `filterButton` becomes unused and is removed; `phasesLabel` / `phasesPlaceholder` are replaced by `phaseLabel` (sweep for other readers in T-2).

### 6.4 Real-time

None.

## 7. Security & Authorization

No change. No data leaves the client.

## 8. Performance & Capacity

Facet option getters are evaluated per change detection today; popover content renders only while open, so idle cost drops. No HTTP.

## 9. Observability

None.

## 10. Testing Plan

- **Jest (component spec):** port the "Filter toolbar" `describe` (spec L305-443): state transitions (`toggleFacet`, single-open, `onFacetStateChanged`), `selectPhase` no-op/reload, `selectProgram` toggle, `facetSelectedCount`, Phase label, DOM order of the 7 triggers, no `Filter` button, settings-route absence, popover content renders only its facet. Keep every facet-option / chip / clear-all test as is.
- **Real browser (manual, HITL):** outside click, Escape focus return, trigger re-click (FTD-P-4), viewport fit at 1280/768 px, visual match with the reference.
- Runs: `npm run test:local -- --testPathPattern=results-notifications.component` (scoped, ≤2 workers).

## 11. Backwards Compatibility & Migration Plan

Query params `init`/`phase`/`search` unchanged. Rollback = revert the commit(s).

## 12. Design Decisions

### FTD-DD-1 — Spartan `hlm-popover` per facet, replacing the hand-rolled popover *(reversion)*

- **Context:** seven anchored dropdowns need positioning near the viewport edge, outside-click and Escape. Today's code does this by hand for one panel.
- **Decision:** one `hlm-popover` per facet, controlled by `openFacet`.
- **Alternatives:** (a) generalize the hand-rolled panel to 7 (keeps manual align math ×7, absolute positioning clips at the right edge — rejected); (b) one popover whose content switches by facet, anchored to the clicked trigger (fewer overlays but re-anchoring a single overlay is not supported by `BrnPopover` — rejected).
- **Consequences:** follows the `program-overview` precedent and the "Spartan for UI" rule. Dismissal is now exercised by the overlay, which jsdom tests only partially.
- **Reversion challenge — "what does removing the custom popover + `document:click` / `keydown.escape` listeners + align math break?"**
  1. 5 existing tests assert `filterPopoverOpen`, `[role=dialog][aria-label=Filter]` and document clicks → deleted in FTD-T-2 together with the members they read, replaced by DOM tests in FTD-T-3 (owned; re-sequenced 2026-10-05).
  2. `app-pr-select` inside the old panel used `overlayToBody`; inside a CDK overlay its body-portaled list would be an *outside* click and close the popover → DD-3 removes `app-pr-select` from the popovers (addressed).
  3. Escape anywhere on the page closed the panel; the CDK keyboard dispatcher routes Escape to the top-most overlay from the document, so parity holds (FTD-P-2).
  4. Trigger re-click race (FTD-P-4) → DD-4.
  No unaddressed breakage remains.

### FTD-DD-2 — One `openFacet` signal instead of seven booleans

- **Decision:** a single nullable key makes "at most one open" true by construction (R-3).
- **Alternatives:** seven flags + mutual-exclusion code (more state, more bugs); let overlays stack (violates R-3).

### FTD-DD-3 — Phase and Program as in-popover option lists, not `app-pr-select`

- **Context:** a dropdown inside a dropdown (body-portaled `app-pr-select` list) breaks outside-click and is a "popover on popover" pattern the UI rules avoid.
- **Decision:** render options as buttons in a `role="listbox"`; Program adds the same search box used by Center. Picking closes the popover.
- **Alternatives:** keep `app-pr-select` with `overlayToBody=false` (clipped by the 260 px popover); Spartan `hlm-select` nested in a popover (same nesting issue).
- **Consequence:** Phase cannot be cleared (matches today: no `showClear`; FTD-P-5).

### FTD-DD-4 — Re-open guard on the trigger

- **Decision:** `onFacetStateChanged(key,'closed')` records `{ key, at: performance.now() }`; `toggleFacet(key)` ignores an open request for the same key within 50 ms of its close. Safe whether or not CDK treats the trigger as outside (FTD-P-4).
- **Alternative:** `closeOnOutsidePointerEvents=false` + own document listener (re-introduces the code DD-1 removes).

### FTD-DD-5 — Focus returns to the trigger on Escape/pick

- **Decision:** `closeFacet(refocus=true)` and the overlay `closed` path focus `[data-facet=key]` via `queueMicrotask` (same shape as `program-overview.closeScopePopover`). Outside-click closes without refocus (focus already moved).

## 12A. Budget (tripwire for `/akili-execute`)

| Metric | Expected |
|---|---|
| Tasks | 3 |
| LOC (diff, incl. tests) | ~450 (TS ±90, HTML ±200, spec ±150, copy/module ±15) |
| Review rounds | ≤ 2 per task |

Depth check: Standard fits — three tasks, one component, no contract change.

## 13. Open Gaps & Follow-ups

- **FTD-P-4** assumed; covered by DD-4 regardless; confirm in the browser check (T-3).
- Layout/viewport fit and visual match have **no automated gate** → manual check at 1280/768 px in T-3 (and T6 at `/akili-validate`).
- FTD-OQ-1 (Phase position) defaulted to "first".
- `inbox-revamp` docs describing the single Filter popover become historical; no edit (spec branch discipline).

## Required cross-references

- [`requirements.md`](./requirements.md) · `docs/prd.md` (AC-8) · `docs/ux-ui/design.md` §7/§8/§10 · `docs/trd/trd.md` (client notifications page).
