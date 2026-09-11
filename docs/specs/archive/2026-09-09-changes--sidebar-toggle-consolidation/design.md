# Sidebar Toggle Consolidation — `design.md`

Links: `requirements.md` (this folder) · `docs/ux-ui/design.md` (sidebar tokens) · `onecgiar-pr-client/src/app/shared/components/reporting-nav-sidebar/reporting-nav-sidebar.component.{ts,html}` · `onecgiar-pr-client/src/app/shared/components/shell-topbar/shell-topbar.component.{ts,html}` · `onecgiar-pr-client/src/app/pages/results/pages/result-detail/result-detail.component.ts`

## 1. Summary

Move the sidebar collapse/expand control fully inside `reporting-nav-sidebar` (both states), remove it from `shell-topbar`, and make the hint's `[data-guide="sidebar-toggle"]` anchor always resolvable by keeping the attribute on whichever of the sidebar's own two buttons is currently rendered. The only real risk is a timing race on compact viewports, where the sidebar auto-collapses and the hint fires in the same synchronous callback — solved with a zero-delay defer, the same idiom already used in `shell-topbar` for CDK focus restore.

## 2. Architecture Overview

Client-only, no server/API/data-model surface. Touches 3 files:

- `shared/components/reporting-nav-sidebar/reporting-nav-sidebar.component.html` (+ `.ts` if a small `collapseLabel` helper is added)
- `shared/components/shell-topbar/shell-topbar.component.html` (+ `.ts` — drop `toggleSidebar()` call/import if it becomes unused)
- `pages/results/pages/result-detail/result-detail.component.ts` (`watchCompactEntry()` — defer the hint call)

### 2.2 Interaction (compact entry, the risky path)

```
[result-detail] route id changes
  └── watchCompactEntry() subscribe
        ├── sidebarSE.collapseForCompactEntry()   // signal write: state → 'collapsed'
        │                                          // Angular schedules a render, not synchronous
        └── reportingGuideSE.startResultSidebarHint()
              └── setTimeout(() => driver().drive(), 0)   // NEW: yields to the render tick first
                    └── driver.js queries '[data-guide="sidebar-toggle"]'
                          └── now resolves the COLLAPSED sidebar button (only element with the attr)
```

Non-compact path is simpler: sidebar stays expanded, its own expanded-header button already carries `data-guide="sidebar-toggle"` before the route even changes — no race, no defer needed for that branch, but the defer is harmless there too so one code path covers both.

## 3. Data Model Changes

None.

## 4. API Surface

None.

## 5. Server Workflow / Business Rules

None — client-only change.

## 6. Frontend Plan

### 6.1 Components touched

- **`reporting-nav-sidebar`** (`shared/components/reporting-nav-sidebar/`)
  - Header markup (~lines 3-46): add a toggle `<button>` rendered only `@if (!isCollapsed())`, positioned in the header row's right slot (the same `justify-between` row that currently holds the build-number pill), left of or beside it — per mockup img 9 the icon sits top-right, before/above the build badge is visually secondary; place the toggle first in DOM order in that right-hand cluster so focus order stays: brand → title → toggle → build badge.
  - Reuse the existing collapsed-button's classes/icon: `lucidePanelLeft`, `aria-label`, `title`, `data-guide="sidebar-toggle"`. Click handler: `sidebarSE.toggleSidebar()` (same call the collapsed button already uses).
  - The existing collapsed-state button (~lines 57-67) is unchanged — it already has `data-guide="sidebar-toggle"`.
  - Remove/replace the header comment (~lines 27-31) that says "the collapse toggle belongs to the topbar alone" — that decision is superseded by this spec.
- **`shell-topbar`** (`shared/components/shell-topbar/`)
  - Remove the `<button class="pr-topbar-icon-btn" ... (click)="toggleSidebar()" data-guide="sidebar-toggle">` block (lines 8-15 of the current template) and its explanatory comment (lines 3-7).
  - Remove `toggleSidebar()` from `shell-topbar.component.ts` if nothing else calls it (check before deleting — it may just proxy to `sidebarSE.toggleSidebar()`).
- **`result-detail.component.ts`**
  - In `watchCompactEntry()`, wrap the existing `if (!this.reportingGuideSE.isResultSidebarHintCompleted()) { this.reportingGuideSE.startResultSidebarHint(); }` block's inner call in `setTimeout(() => this.reportingGuideSE.startResultSidebarHint(), 0)`. No new imports needed (`setTimeout` is a global). Keep the completion check outside the timeout (no need to defer the read).

### 6.2 State

No new state. `HlmSidebarService.state()` / `toggleSidebar()` / `isMobile()` are consumed exactly as today, from one more call site.

### 6.3 Design system usage

- No new tokens. Reuses `--pr-sidebar-fg-muted`, existing `hover:bg-sidebar-accent text-sidebar-foreground` utility combo already used by the collapsed button, and `@ng-icons/lucide`'s `lucidePanelLeft` (already imported in this component).
- A11y: `aria-label="Collapse sidebar"` (expanded button) mirrors the collapsed button's `aria-label="Expand sidebar"` — distinct labels per state, both already the established pattern.
- No i18n key needed — the two existing buttons' labels are structural chrome, same category as the rest of this component's un-keyed labels (`aria-label="Toggle sidebar"` today, English-only, no P22/P25 variance).

### 6.4 Real-time / notifications

None.

## 7. Security & Authorization

None — no auth/role change.

## 8. Performance & Capacity

Negligible — one fewer DOM node in the topbar, one more (conditionally rendered) in the sidebar header.

## 9. Observability

None.

## 10. Testing Plan (forward-looking)

- **Unit (Jest):** update `reporting-nav-sidebar.component.spec.ts` to assert the expanded-header button renders when `!isCollapsed()` and calls `sidebarSE.toggleSidebar()` on click; update `shell-topbar.component.spec.ts` to assert the old button/handler is gone.
- **Manual (the defect class no automated check covers — recorded as an accepted gap in `requirements.md`):** STC-AC-3/STC-AC-4 — clear `pr.tour.result-sidebar.completed` from localStorage, open a result at >1366px width (hint should anchor on the expanded button) and again at ≤1366px width (hint should anchor on the collapsed button after auto-collapse). Confirm no console error from `driver.js` ("Element not found").

## 11. Backwards Compatibility & Migration Plan

Pure UI relocation — no contract, no migration, no flag. `RESULT_SIDEBAR_HINT_STORAGE_KEY` semantics unchanged (same key, same one-time behavior); a user who already saw the hint pre-change stays unaffected.

## 12. Design Decisions

### STC-DD-1 — Single owner for `data-guide="sidebar-toggle"`: the sidebar itself, not the topbar

- **Context:** two buttons carried the same guide-hook; mockups approve only the sidebar-internal one.
- **Decision:** the hook moves entirely into `reporting-nav-sidebar` — one button per state, both carrying it, so exactly one match exists in the DOM at all times.
- **Alternatives considered:** (a) keep both buttons, hide the topbar one visually only — rejected, leaves a dead interactive element and two `data-guide` matches, which is worse for `driver.js` (undefined which one it binds to) than today. (b) Change the hint's selector strategy to accept multiple candidates — rejected, adds branching to a service used by 3 other tours for no benefit once (a) is off the table.
- **Consequences:** the hint now depends entirely on `reporting-nav-sidebar` being mounted before `result-detail` fires the hint — already true today (the sidebar is shell-level, mounted before any routed page).

### STC-DD-2 — Reversion challenge: removing the topbar's "always-present anchor" guarantee

- **What is reverted:** the topbar button's role as a viewport-agnostic, state-agnostic, always-in-DOM anchor (see the comment it carried, now removed).
- **Challenge — what does removing this break?** The compact-entry path, where `collapseForCompactEntry()` and `startResultSidebarHint()` fire back-to-back synchronously: the sidebar's own collapsed-state button might not be in the DOM yet (Angular hasn't rendered the new `isCollapsed()` value) when `driver.js` looks for `[data-guide="sidebar-toggle"]`.
- **Resolution:** `startResultSidebarHint()`'s call is deferred with `setTimeout(..., 0)` in `result-detail.component.ts` (§6.1), which yields to Angular's render/CD tick first. This is the same defer idiom `shell-topbar`'s own `CLAUDE.md` documents for a structurally identical CDK-focus race (see its "onGlobalKeydown focuses the trigger BEFORE opening" note) — not a novel pattern for this codebase.
- **Outcome:** accepted with the mitigation above; no automated test proves the race is closed (see §10 manual step and the accepted gap in `requirements.md` §8), so this is flagged for deliberate manual verification during execution, not assumed fixed by inspection alone.

## 13. Open Gaps & Follow-ups

- No automated coverage for `driver.js` anchor-timing races in this codebase today; this spec does not introduce one (out of scope — would require a headless-browser/Cypress spec asserting the popover element renders, which is disproportionate to a Lite change). Recorded as an accepted risk, mitigated manually per STC-AC-3/4.

## Budget (Step 2.4)

- **Expected tasks:** 2 (one frontend markup/behavior task covering both components + the defer fix; one test-update task).
- **Expected LOC:** ~40-60 (mostly HTML template moves, a few lines of TS).
- **Expected review rounds:** 1.

Matches the **Lite** depth chosen at escalation — no re-scoping needed.

## Required cross-references

- `docs/specs/changes/sidebar-toggle-consolidation/requirements.md`
- `onecgiar-pr-client/src/app/shared/components/shell-topbar/CLAUDE.md` (documents the superseded role — must be re-stamped in the same commit per the client's folder-doc convention)
- `onecgiar-pr-client/src/app/shared/components/reporting-nav-sidebar/reporting-nav-sidebar.component.html`
