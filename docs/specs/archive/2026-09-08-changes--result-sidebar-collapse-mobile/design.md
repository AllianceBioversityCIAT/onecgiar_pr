# Design — Result Sidebar Collapse (Compact Viewports)

## 1. Summary

Client-only change. Adds a second, dedicated viewport-width signal to the existing `HlmSidebarService` (compact ≤1366px, separate from the current 768px `isMobile` signal), a route-entry hook in `ResultDetailComponent` that force-collapses the nav sidebar on first entry to a result under that width without overwriting the user's persisted sidebar-state cookie, and a small, independent discoverability hint built on the existing `driver.js` integration already used by `ReportingGuideService`. Biggest constraint: the auto-collapse must not corrupt the user's long-lived sidebar preference (stored in a cookie shared across the whole app), which is why it cannot simply call the service's existing `setOpen()`.

Implements `docs/specs/changes/result-sidebar-collapse-mobile/requirements.md` (`SBAR-R-1..R-20`). References `docs/ux-ui/design.md` §9 (Responsive Behavior) and `docs/trd/trd.md` (no existing section covers the sidebar or tour).

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Client modules touched:**
  - `onecgiar-pr-client/src/app/spartan/sidebar/src/lib/` — `hlm-sidebar.token.ts`, `hlm-sidebar.service.ts` (extend, additive).
  - `onecgiar-pr-client/src/app/shared/components/reporting-nav-sidebar/` — template only (`data-guide` attribute).
  - `onecgiar-pr-client/src/app/pages/results/pages/result-detail/` — `result-detail.component.ts` (new entry hook).
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/services/reporting-guide.service.ts` — new independent hint method, alongside the existing SP tour (not merged into it).
- **Server modules touched:** none.
- **External integrations touched:** none.

### 2.2 Interaction flow

```
[User navigates to /result/result-detail/:id/...]
  └── ResultDetailComponent route-param subscription (id, distinctUntilChanged)
        ├── HlmSidebarService.isCompact() read (≤1366px matchMedia)
        │     └── IF compact AND state() === 'expanded'
        │           └── HlmSidebarService.collapseForCompactEntry()
        │                 └── sets internal open signal only — no cookie write
        ├── ReportingGuideService.isResultSidebarHintCompleted() read
        │     └── IF false
        │           └── ReportingGuideService.startResultSidebarHint()
        │                 └── driver.js popover anchored on [data-guide="sidebar-toggle"]
        │                 └── on complete/skip → localStorage flag set
        └── (user may click the toggle at any time → existing toggleSidebar()/setOpen()
             path, unchanged, persists the cookie as it does today)
```

No second flow — this is the only user-facing path the spec adds.

## 3. Data Model Changes

None. No entities, no migrations, no CLARISA implications.

## 4. API Surface

None. Client-only, no new/changed endpoints. No bilateral/platform-report impact.

## 5. Server Workflow / Business Rules

Not applicable — no server-side change.

## 6. Frontend Plan

### 6.1 Routes / modules

No new routes. `result-detail` route/module unchanged in shape; only its root component gains a subscription. No new guards.

### 6.2 Components & services

- **`hlm-sidebar.token.ts`** — add a `compactBreakpoint: string` field to the config interface, defaulted to `'1366px'`, alongside the existing `mobileBreakpoint: '768px'`. Both are independent, named thresholds — the existing `mobileBreakpoint` is not renamed, redefined, or reused for this feature (`SBAR-DD-1`).
- **`hlm-sidebar.service.ts`** — add a second `matchMedia` registration for `compactBreakpoint`, following the exact same `afterNextRender` / debounced-resize / `destroyRef` cleanup pattern already used for `mobileBreakpoint`, so there is one consistent lifecycle for both listeners rather than a bespoke one for the new signal. Expose the result as a new readonly `isCompact: Signal<boolean>`, parallel to the existing `isMobile`. Add one new public method, `collapseForCompactEntry()`, that forces the internal open-state signal to `false` **without** writing the sidebar cookie — distinct from `setOpen()`, which remains the only path that persists a user's deliberate choice (`SBAR-DD-2`).
- **`result-detail.component.ts`** — inject `HlmSidebarService`; subscribe to the route's `id` param with `distinctUntilChanged` so the check runs once per distinct result, not on every child-route/section navigation or `?phase=` change (`SBAR-DD-3`). On a new id, if `isCompact()` is true and `state()` is currently `'expanded'`, call `collapseForCompactEntry()`. A user who then manually expands uses the existing toggle, which persists normally — nothing here disables or overrides that path.
- **`reporting-nav-sidebar.component.html`** — add `data-guide="sidebar-toggle"` to the existing toggle button (no other markup change).
- **`reporting-guide.service.ts`** — add a small, self-contained addition alongside the existing SP tour, not merged into it: a new storage-key constant (parallel to `SP_TOUR_STORAGE_KEY`), a completion-check method, and a `startResultSidebarHint()` method that reuses the same `driver.js` instance-lifecycle pattern (`instance?.destroy()` then a fresh `driver()` call) with a single `DriveStep` targeting `[data-guide="sidebar-toggle"]`. It is **not** added to the `catalogue`/`TutorialId` union — that catalogue drives the Science-Program tutorial picker UI, a different, unrelated screen (`SBAR-DD-4`).
- **State boundary:** sidebar open/compact state stays in `HlmSidebarService` (already the single owner app-wide). Hint-seen state stays in `ReportingGuideService` via `localStorage`, matching the existing pattern. `result-detail.component.ts` owns no new state of its own — it only reads and triggers.

### 6.3 Design system usage

- No new PrimeNG/Spartan components — reuses the existing sidebar toggle button and `driver.js` popover styling already shipped for the SP tour (same CSS classes, e.g. `pr-guide-step-copy`).
- No new design tokens. No color/typography change.
- Responsive plan: introduces a feature-local breakpoint (1366px) that sits between the documented `lg` (1280px) and `xl` (1600px) in `docs/ux-ui/design.md` §9. It is deliberately **not** folded into that shared scale in this spec — see Open Gaps §13 — because promoting it would be a cross-cutting UX-baseline change with a different, wider blast radius than this feature.
- A11y: the toggle button's existing keyboard reachability and ARIA labeling are untouched. The `driver.js` popover inherits the same focus-management behavior already shipped for the SP tour (no new a11y surface).
- i18n: the hint's copy is new user-facing text and MUST be authored as a `TermKey` (or, if it does not differ P22/P25, plain structural copy per the project's i18n rule) — not hardcoded English.

### 6.4 Real-time / notification UX

Not applicable.

## 7. Security & Authorization

No new endpoint, no new role check. The feature reads client-only viewport/state signals and a `localStorage` flag; no secrets, tokens, or PII involved.

## 8. Performance & Capacity

- One additional `matchMedia` listener plus reuse of the existing debounced resize handler — no new polling loop, no measurable bundle-size impact (no new dependency; `driver.js` is already a dependency via `ReportingGuideService`).
- The entry-time check (`isCompact()` read + a signal write) is a synchronous, in-memory operation — no network call, no perceptible delay to route activation.

## 9. Observability

No new logging. This is a client-only UI default/state change with no server-visible signal.

## 10. Testing Plan (forward-looking)

- **Unit (Jest):**
  - `hlm-sidebar.service.spec.ts` — new `isCompact` signal reacts to a mocked `matchMedia` at the compact threshold; `collapseForCompactEntry()` sets `state()` to `'collapsed'` and does **not** write the sidebar cookie (assert `document.cookie` unchanged), while `setOpen()` still does (regression guard for `SBAR-DD-2`).
  - `result-detail.component.spec.ts` — entry hook only fires on a genuine `id` change (mock `ActivatedRoute.params`), calls `collapseForCompactEntry()` only when `isCompact()` is true and state is `expanded`, and does not fire again on a `?phase=` query-only change.
  - `reporting-guide.service.spec.ts` — new hint completion-flag get/set, and that `startResultSidebarHint()` builds a step targeting `[data-guide="sidebar-toggle"]`.
- **E2E (Cypress)** — covers the scenarios in `requirements.md` §7 directly, using `cy.viewport()`:
  - Compact laptop entering a result → sidebar collapsed (`SBAR-AC-1`).
  - Desktop viewport unaffected (`SBAR-AC-2`).
  - Manual re-expand respected across section navigation within the same result (`SBAR-AC-3`).
  - Resize after entry does not retrigger; a fresh entry to a different result still does (`SBAR-AC-4`).
  - Hint shown once, flag persists across reload (`SBAR-AC-5`).
- **Manual QA (accepted gap, per requirements.md §9):** popover placement/visual correctness of the hint is not covered by any automated check in this repo — verify by eye at the `/akili-test` or `/akili-validate` pause, on at least one compact and one desktop viewport.
- **Coverage:** all touched files are outside the `custom-fields/` and `rd-contributors-and-partners/` exclusions; expect the new/changed lines to count toward the existing 50/60/60/60 client thresholds.

## 11. Backwards Compatibility & Migration Plan

- Purely additive: existing `isMobile` (768px) signal, `setOpen()`, `toggleSidebar()`, and the sidebar cookie contract are all untouched (`SBAR-R-2`, verified by the `collapseForCompactEntry()` vs `setOpen()` split in `SBAR-DD-2`).
- No feature flag needed — this is a small, low-risk, reversible client behavior change; a revert is a plain code revert.
- No data backfill. No downstream consumers (bilateral, BI) are affected — this never touches API payloads.

## 12. Design Decisions (ADRs)

### `SBAR-DD-1` — Dedicated `isCompact` signal, not a reused/redefined `isMobile`

- **Context:** the proposal originally assumed reusing `HlmSidebarService`'s existing `_isMobile` signal. Confirmed in code, that signal's threshold is `768px` (`hlm-sidebar.token.ts:21`), far narrower than the ~1350px laptop case the user clarified after the proposal.
- **Decision:** add a second, independently configured threshold (`compactBreakpoint`, default `1366px`) and a parallel `isCompact` signal, sharing the service's existing listener-lifecycle plumbing.
- **Alternatives considered:** (a) widen `mobileBreakpoint` itself to 1366px — rejected, `isMobile` gates other behavior (`openMobile`, mobile-specific toggle branching in `toggleSidebar()`) that has nothing to do with this feature and must not change; (b) build the detection standalone inside `result-detail.component.ts` — rejected, it would duplicate the exact matchMedia/resize/cleanup pattern the service already has, for no benefit.
- **Consequences:** `HlmSidebarService`'s public surface grows by one signal and one config field; a future feature needing the same "compact" concept can reuse it instead of inventing a third threshold.

### `SBAR-DD-2` — Auto-collapse must not persist to the sidebar cookie

- **Context:** `setOpen()` always writes `sidebarCookieName`, which is the single, app-wide source of the user's remembered sidebar preference. Calling it from an automatic, viewport-driven default would silently overwrite that preference — a user who prefers the sidebar expanded on their desktop could find it collapsed there too, days later, because they once opened a result on a laptop.
- **Decision:** add `collapseForCompactEntry()` as a separate method that sets the open-state signal directly, bypassing the cookie write. Only a genuine user click (`toggleSidebar()` → `setOpen()`) persists.
- **Alternatives considered:** (a) call `setOpen(false)` directly and accept the cross-route persistence — rejected, this is the exact silent-preference-corruption risk described above; (b) don't touch `HlmSidebarService` at all and hold a separate result-detail-local "visually collapsed" flag in the component, layered on top of the service's `state()` — rejected, it would mean two sources of truth for what the sidebar looks like, which the component/template would need to reconcile.
- **Consequences:** the service's collapse/expand state model gains a documented split between "the persisted preference" and "a transient, feature-driven override" — the next feature that needs an automatic default should reuse `collapseForCompactEntry()`'s pattern rather than reinventing it.

### `SBAR-DD-3` — Trigger only on result-id change, not on every section/tab navigation

- **Context:** `result-detail` is a single component instance reused across its child routes (sections/tabs) and the `?phase=` query param; re-running the check on every internal navigation would repeatedly fight a user who just manually re-expanded the sidebar.
- **Decision:** subscribe to the route's `id` param with `distinctUntilChanged`; the check runs once per distinct result entered, never on section switches or phase changes within the same result.
- **Alternatives considered:** running the check in `ngOnInit` only — rejected, `result-detail`'s component instance can be reused across different result ids without a full re-instantiation (deep-link navigation between two results), so `ngOnInit` alone would miss the second entry.
- **Consequences:** implementers must wire this off the existing `id`-param stream already present in `result-detail.component.ts`, not a one-time lifecycle hook.

### `SBAR-DD-4` — Hint lives as a small, separate addition in `ReportingGuideService`, not a new service and not folded into the SP tour

- **Context:** the only existing tour infrastructure (`driver.js`, instance lifecycle, storage-flag pattern) lives in `ReportingGuideService`, scoped today to the Science-Program dashboard's `catalogue`/`TutorialId` tutorial picker. `result-detail` is a different, unrelated screen; a user who deep-links straight into a result never sees the dashboard tour.
- **Decision:** add one new, independent method + storage key to the same service (reusing its `driver.js` lifecycle pattern) rather than building a new tour service or bolting a `result-detail` step onto the SP `catalogue`.
- **Alternatives considered:** (a) add a step to the SP tour's `basics` tutorial — rejected, unreachable for a user who never visits the dashboard; (b) new dedicated `ResultDetailGuideService` — rejected, it would duplicate `ReportingGuideService`'s `driver.js` lifecycle handling for a single popover, more machinery than the requirement needs.
- **Consequences:** `ReportingGuideService` now hosts two unrelated concerns (SP tutorial catalogue + this one-off hint). Acceptable at this size; if a third unrelated hint shows up later, extracting a shared "single-step hint" helper becomes worth it.

**Step 2.3 reversion challenge:** none of the four DDs above removes, disables, or inverts already-delivered behavior — all are additive (new signal, new method, new subscription, new service method). No reversion challenge required.

## 13. Open Gaps & Follow-ups

- The 1366px "compact" breakpoint is a feature-local constant, not yet part of `docs/ux-ui/design.md` §9's `xs/sm/md/lg/xl` scale (carried over from `SBAR-OQ-2`). If a second feature needs the same concept, promote it to the shared baseline then.
- The hint's exact copy and whether it should also reference other sidebar-hideable content is left to the implementer within `SBAR-R-10`/`R-11`'s constraints (one-time, dismissible, non-repeating).
- Popover visual correctness has no automated gate (see Testing Plan §10) — accepted risk, covered by manual QA only.

## Budget (Step 2.4)

| Signal | Value |
|---|---|
| Expected tasks | 6 |
| Expected LOC | ~180 (excluding tests), ~320 including new/updated specs |
| Expected review rounds | 1 |

Matches the **Standard** depth chosen for this spec — no adjustment recommended. `/akili-execute` should treat these as the tripwire: if actuals run meaningfully past this, stop and escalate rather than continue silently.

## Required cross-references

- `docs/specs/changes/result-sidebar-collapse-mobile/requirements.md` (same folder) — `SBAR-R-1..R-20`, `SBAR-AC-1..AC-5`.
- `docs/prd.md` — `G1`, `US-S1`.
- `docs/ux-ui/design.md` §9 (Responsive Behavior).
- `docs/trd/trd.md` — no existing section on the sidebar/tour; none to cite.
