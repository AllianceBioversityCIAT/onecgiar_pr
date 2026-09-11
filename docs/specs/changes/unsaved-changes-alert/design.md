# Module Spec: `changes/unsaved-changes-alert` — Design

Standard. Implements [`requirements.md`](./requirements.md). Intent: [`proposal.md`](./proposal.md).

## Document Control

| Field | Value |
|---|---|
| Spec Path | `changes/unsaved-changes-alert` |
| Type | Change |
| Depth | Standard |
| Approval Mode | gated |
| Status | in-review |
| Requirements | UCA-R-1 .. UCA-R-6, UCA-R-10 |
| Ticket | [P2-3638](https://cgiarmel.atlassian.net/browse/P2-3638) |

---

## 1. Summary

Result Detail section-to-section navigation is real `Router.navigate()` / `routerLink` (confirmed in `requirements.md` — not an in-page panel-menu swap). That means **one `CanDeactivate` guard**, registered once on `resultDetailRouting`, can see every navigation path in scope: `Next`/`Back`, sidebar clicks, and browser back/forward. The design adds:

1. A tiny per-component contract (`CanComponentDeactivate`: `hasUnsavedChanges()` + `saveSection()`) that each `rd-*` section implements.
2. A reusable dirty-snapshot tracker (`SectionDirtyTrackerService`, one instance per section component) — since sections bind a plain object (`generalInfoBody`-style), not a Reactive `FormGroup`, "dirty" is a snapshot diff, not `FormGroup.dirty`.
3. One guard (`UnsavedChangesGuard`) that either **auto-saves silently** (Back/Next) or **opens the Save/Discard dialog** (everything else), driven by a one-shot intent flag set by the caller right before it navigates.
4. A shared `beforeunload` directive for the native tab-close prompt.

Biggest trade-off: touching ~10 `rd-*` section components to implement the two-method interface is the bulk of the work — there is no way to make dirty-detection generic across sections that use plain bound objects instead of `FormGroup`, short of a larger reactive-forms migration that is explicitly out of scope.

---

## 2. Architecture Overview

### 2.1 Where this lives in the system

| Layer | Change |
|---|---|
| Server | None. |
| Client | New: `shared/guards/unsaved-changes.guard.ts`, `shared/services/unsaved-changes/*` (dirty tracker, navigation-intent flag, dialog service), `shared/components/unsaved-changes-dialog/` (Save/Discard `hlm-dialog`), `shared/directives/before-unload-warning.directive.ts`. Modified: `result-detail-routing.module.ts` (attach guard to `resultDetailRouting`), `section-bottom-bar.component.ts` (set the silent-save intent before `Back`/`Next` navigate), and each `rd-*` section component (implement the interface + apply the directive). |
| External | None. |

Cite `docs/trd/trd.md` W1 (client reporting flow, navigation only). UI pattern: `docs/ux-ui/design.md` hard UI rule "never a modal on top of a modal" and the `hlm-dialog` confirm pattern.

### 2.2 Sequence / interaction diagram

```text
section-bottom-bar.goPrevious()/goNext()
  └── intentSE.markSilent()          // one-shot flag, consumed by the guard
  └── router.navigate([targetSection route])
        └── UnsavedChangesGuard.canDeactivate(outgoingSectionComponent)
              ├── !hasUnsavedChanges() ────────────────────────► true (navigate)
              ├── intentSE.consumeSilent() === true (Back/Next)
              │     └── saveSection() ── success ──► true (navigate)
              │                     └── failure ──► false (stay, existing save-error UI)
              └── intentSE.consumeSilent() === false (sidebar click, browser back, …)
                    └── dialogSE.openSaveDiscard()
                          ├── Discard ──────────────────────────► true (navigate)
                          └── Save ── saveSection() ── success ──► true (navigate)
                                                  └── failure ──► false (stay, save error shown)

window:beforeunload (any rd-* section, via directive)
  └── hasUnsavedChanges() ? preventDefault() : allow close
```

`CanDeactivate` resuming the exact requested destination is Angular's own contract — the guard gates the navigation already in flight, so no manual "pending destination" bookkeeping is needed for the router paths. That was a wrong working assumption in `proposal.md` §11 (written before the guard's actual mechanics were checked against `Router.CanDeactivate` semantics) — see `UCA-DD-2`.

---

## 3. Data Model Changes

None — no entities, migrations, or CLARISA changes. Client-only.

---

## 4. API Surface

None — no new/changed endpoints. "Save" reuses each section's existing `PATCH` call verbatim (`UCA-R-1`, `UCA-R-4`). No bilateral/platform-report payload impact.

---

## 5. Server Workflow / Business Rules

None. Client-only; `W1` reporting flow's server side is unchanged.

---

## 6. Frontend Plan

### 6.1 Routes / modules

- `resultDetailRouting` (`result-detail-routing.module.ts`) — every section route (`rd-general-information`, `rd-geographic-location`, `rd-evidences`, `rd-partners` / `rd-contributors-and-partners` per portfolio, `rd-theory-of-change`, `rd-links-to-results`, and each `rdResultTypesPages` entry) gets `canDeactivate: [UnsavedChangesGuard]`.
- No new routes.

### 6.2 Components & services

| Item | Kind | Responsibility |
|---|---|---|
| `CanComponentDeactivate` | Interface (`shared/guards/`) | `hasUnsavedChanges(): boolean`, `saveSection(): Observable<boolean>`. Implemented by each `rd-*` section. |
| `SectionDirtyTrackerService` | Injectable, **component-scoped** (`providers: [SectionDirtyTrackerService]` on each section) | `snapshot(body)` stores a deep clone after load/save; `isDirty(body)` does a cheap `JSON.stringify` structural diff against the snapshot. |
| `UnsavedNavigationIntentService` | Injectable, root-scoped | `markSilent()` / `consumeSilent(): boolean` — a one-shot flag set by `section-bottom-bar` right before `Back`/`Next` navigate, read-and-cleared by the guard on the very next `canDeactivate` call. |
| `UnsavedChangesGuard` | `CanDeactivate<CanComponentDeactivate>` (`shared/guards/`) | Orchestrates the flow in §2.2. |
| `UnsavedChangesDialogService` + `UnsavedChangesDialogComponent` | Service + `hlm-dialog`-based component (`shared/components/unsaved-changes-dialog/`) | Renders the Save/Discard warning; returns `Observable<'save' | 'discard'>`. |
| `BeforeUnloadWarningDirective` | Attribute directive (`shared/directives/`) | `[appBeforeUnloadWarning]="dirtyCheckFn"` — adds the `@HostListener('window:beforeunload')` once, reused by every section instead of ~10 duplicated listeners. |

**`section-bottom-bar.component.ts` change:** `goTo()` (called by `goPrevious`/`goNext`) injects `UnsavedNavigationIntentService` and calls `this.intentSE.markSilent()` immediately before `this.router.navigate(...)` (`section-bottom-bar.component.ts:185-189`).

**Per-section change (one per `rd-*` component):**
- Inject `SectionDirtyTrackerService`.
- Call `dirtyTracker.snapshot(body)` at the end of the existing "load section" flow and again after a successful save (both call sites already exist — `getSectionInformation()`-style methods and `performSave()`'s success branch).
- Implement `hasUnsavedChanges()` → `dirtyTracker.isDirty(body)`.
- Implement `saveSection(): Observable<boolean>` by wrapping the existing save call (e.g. `performSave()`) to emit `true`/`false` instead of void, reusing the exact same PATCH call and error handling already in place — no duplicated save logic.
- Apply `[appBeforeUnloadWarning]="hasUnsavedChanges.bind(this)"` on the section's root element.

### 6.3 Design system usage

- Dialog built on **`hlm-dialog`** (Spartan/Helm CDK Dialog), not `app-pr-dialog` — `src/CLAUDE.md` §21.7 documents `app-pr-dialog` has no focus trap/autofocus/restore, which this warning dialog needs since it can be reached without a mouse. Consult the Spartan MCP for the current `hlm-dialog` contract before implementing.
- Two actions, `brand` (Save) + `outline` or `ghost` (Discard) per the client's "one `brand` button per screen" hard rule — the dialog is the only surface open at that moment, so Save can be the one brand button.
- Copy is a plain string constant (not a `TermKey` — see `requirements.md` §8 Internationalization) since it does not vary P22/P25.
- Escape key: bound to Discard (per `UCA-OQ-3` resolution below), consistent with the hard rule "Escape closes drawer/dialog/popovers/menus" — there being no third "stay" action, closing must resolve to one of the two real actions rather than doing nothing.
- A11y: dialog title/description linked via `aria-labelledby`/`aria-describedby`; Save button gets initial focus (safer default than Discard for a data-loss decision).

### 6.4 Real-time / notification UX

None new. The save call inside the dialog's "Save" path and inside the silent Back/Next path is the section's pre-existing save action — whatever notifications that action already triggers (or doesn't) are unchanged (`requirements.md` §8 "No new side effects").

---

## 7. Security & Authorization

No new auth surface. The guard and dialog run entirely client-side after the existing JWT/role gates on the section's save endpoint; a rejected save (e.g. expired session) surfaces through the section's existing error handling, unchanged. No token/URL/credential logging introduced (`.cursorrules`, `AC-9`).

---

## 8. Performance & Capacity

- `hasUnsavedChanges()` is a synchronous `JSON.stringify` diff of one section's payload-sized object — negligible cost, and only runs on navigation attempts, not on every keystroke (`requirements.md` §8 Performance).
- No new subscriptions, polling, or background timers.

---

## 9. Observability

None new. Do not add navigation debug logs (consistent with `bugfix/smart-back-button` SBB precedent in this same navigation layer).

---

## 10. Testing Plan (forward-looking)

| Case | Layer | Notes |
|---|---|---|
| `hasUnsavedChanges()` false right after load/save, true after a field change | `section-dirty-tracker.service.spec.ts` | Core snapshot-diff logic, isolated from any one section. |
| Guard returns `true` synchronously when not dirty | `unsaved-changes.guard.spec.ts` | `UCA-R-5` / defect class "guard fires with nothing unsaved". |
| Guard calls `saveSection()` directly (no dialog) when the intent flag is silent | `unsaved-changes.guard.spec.ts` | `UCA-R-1`. |
| Guard opens the dialog when dirty and intent is not silent; resolves `true`/`false` per Save success/failure and per Discard | `unsaved-changes.guard.spec.ts` | `UCA-R-2`, `UCA-R-4`. |
| `section-bottom-bar.goNext()`/`goPrevious()` call `intentSE.markSilent()` before `router.navigate` | `section-bottom-bar.component.spec.ts` | `UCA-R-1`. |
| Per-section: `saveSection()` resolves `false` on a failing save and the existing error UI still shows | one `*.component.spec.ts` per `rd-*` section touched | `UCA-R-1` failure scenario, `UCA-AC-2`. |
| Dialog renders exactly two actions, Escape resolves as Discard, focus starts on Save | `unsaved-changes-dialog.component.spec.ts` | `UCA-R-3`; keyboard focus trap itself needs the manual pass below (jsdom can't prove a real trap). |
| `beforeunload` native prompt | **Manual browser check only** | Accepted gap — `requirements.md` §6 defect-class table; Jest/jsdom cannot dispatch/assert `beforeunload`. |

Scoped Jest per touched file (`--testPathPattern=...`), never the full suite, per client `CLAUDE.md` hard rule.

---

## 11. Backwards Compatibility & Migration Plan

- No migration, no API contract change.
- Behavior for a clean section is byte-for-byte the same as today (`UCA-R-5`) — this is purely additive for the dirty case.
- Intentional behavior change: `Back`/`Next` now always save first, where today they navigate without saving — this is the entire point of the ticket, not a regression risk to mitigate.

---

## 12. Design Decisions (ADRs)

### `UCA-DD-1` — Dirty detection is a snapshot diff, not `FormGroup.dirty`

- **Context:** `rd-*` sections bind a plain object (e.g. `generalInfoBody`) directly to `custom-fields` components via two-way binding, not a Reactive `FormGroup` (confirmed: no `FormGroup`/`FormControl` usage in `rd-general-information.component.ts`). There is no built-in `.dirty` flag to read.
- **Decision:** Each section stores a deep-cloned snapshot of its bound object right after a successful load or save, and computes "dirty" as a `JSON.stringify` structural diff against that snapshot, on demand (at navigation time), not reactively on every keystroke.
- **Alternatives considered:** (1) Migrate every `rd-*` section to Reactive Forms first — rejected, far larger scope than this ticket and its own multi-spec effort. (2) Add a manual `markDirty()` call to every field's `(change)`/`(ngModelChange)` handler — rejected, error-prone (any missed field silently never marks dirty) and touches far more template lines than a snapshot diff.
- **Consequences:** Cheap and correct for these payload-sized objects; false negative only if a field mutates the object without changing its serialized shape (not expected for the primitive/array field types these sections use).

### `UCA-DD-2` — One `CanDeactivate` guard, mode selected by a one-shot intent flag

- **Context:** `Back`/`Next` and every other exit (sidebar click, browser back) all resolve to the same `Router.navigate()` mechanism, so a single guard sees all of them — but they need different behavior (silent auto-save vs. Save/Discard dialog). The proposal's own working assumption (`proposal.md` §11) — that section switches are "not always full route changes" and would need a second, non-route check — was wrong; corrected once `section-bottom-bar.component.ts:185-189` and `result-sections-sidebar.component.html:69` were actually read.
- **Decision:** `section-bottom-bar.goTo()` sets a synchronous one-shot flag (`UnsavedNavigationIntentService.markSilent()`) immediately before calling `router.navigate`; the guard reads and clears that flag on the very next `canDeactivate` invocation to decide silent-save vs. dialog.
- **Alternatives considered:** (1) Two separate guards / mechanisms (one for Back/Next, one for everything else) — rejected, `Back`/`Next` already goes through the router, so a second mechanism would race the guard rather than complement it. (2) Pass a `NavigationExtras.state` flag instead of a service — rejected, ties the guard to router-internal state shape for no benefit over a small dedicated service, and `state` isn't available on a popstate-triggered (browser back) navigation, which must default to "show the dialog" anyway.
- **Consequences:** The intent flag must be consumed (cleared) unconditionally on every `canDeactivate` call, including the "not dirty" short-circuit, so a stray `true` never leaks into a later, unrelated navigation. Covered by a guard unit test.
- **Reversion challenge (Step 2.3):** N/A — this design adds new gating; it does not revert or disable anything Result Detail already ships.

### `UCA-DD-3` — Reuse the section's existing save call verbatim, never a new "silent save" endpoint or debounce

- **Context:** The proposal explicitly rejected continuous background autosave (Option A) because it can fire side-effecting notifications on an in-progress, not-yet-corrected selection.
- **Decision:** Both the Back/Next silent-save path and the dialog's Save action call the exact same method the section's existing `Save Draft` button already calls (`saveSection()` just wraps it to return a boolean) — no new debounce, no new trigger surface.
- **Alternatives considered:** A dedicated lightweight "draft save" endpoint that skips notification side effects — rejected as unnecessary scope; today's `Save Draft` action already goes through production traffic with whatever side effects it has, and this spec does not change when a user chooses to save, only automates two additional trigger points (`Next`/`Back`) that already existed as manual actions.
- **Consequences:** No new backend risk surface. If a section's save action has a known side effect today, that risk is unchanged, not introduced.

---

## 13. Open Gaps & Follow-ups

- **Confirmed with user (2026-09-10):** `rd-contributors-and-partners.component.ts:764` sends `email_template: 'email_template_contribution'` in its `PATCH_ContributorsPartners` payload — the only section confirmed to trigger an email side effect on save. Asked whether this section should be excluded from the Back/Next silent-save path given that risk. **User's answer: no exception — behavior stays uniform across all sections.** The reasoning restated: what was rejected (Option A / continuous background autosave) is a save with no user action behind it; a save triggered by an explicit click on Back/Next (or any other explicit navigation the user chose) is a user action, same category as clicking "Save Draft" today, regardless of which section it's on. No `autosaveDisabled`-style carve-out (unlike the different, narrower concern in the unrelated `realtime-section-completion` spec) is introduced by this spec.
- **`UCA-OQ-1` (resolved):** Discard does not reset in-memory fields — it just navigates away. The section's own "load on entry" flow re-fetches from the server the next time it's opened, so stale in-memory state is never shown as if it were saved.
- **`UCA-OQ-2` (must confirm per section during task execution):** Every `rd-*` section listed in §6.2's affected-components set must be checked for a serializable bound object (`generalInfoBody`-style) before its task is marked done — a section built differently (e.g. holding File/Blob fields that don't serialize cleanly) needs a per-field dirty check instead of a whole-object diff. Flag any such section in its task rather than silently forcing a bad fit.
- **`UCA-OQ-3` (resolved):** Escape resolves as Discard (§6.3) — consistent with "no third stay option."
- Browser back/forward and `CanDeactivate` returning `false`: Angular restores the URL but the browser's own history pointer already moved: a known Angular Router quirk, not specific to this design. Accepted risk, consistent with how the rest of the app's guards (`CheckLoginGuard`) already behave under browser back.
- `UCA-R-10` (reusable primitive for IPSR/bilateral): the pieces in §6.2 are already written generically (interface + guard + dialog + directive, no Result-Detail-specific code inside them) — actual adoption by IPSR/bilateral is explicitly deferred, not attempted here.

## Budget (Step 2.4)

| Signal | Estimate |
|---|---|
| Tasks | ~11–13: 1 shared-primitives task (interface, tracker, intent service, guard, dialog, directive + their unit tests) + 1 task for `section-bottom-bar`'s silent-intent wiring + ~1 task per `rd-*` section group touched (general-information, geographic-location, evidences, partners/contributors-and-partners, theory-of-change, links-to-results, result-types-pages as one grouped task since they share one pattern) |
| LOC | ~450–700 (mostly the per-section `saveSection()`/`hasUnsavedChanges()` wiring repeated ~8–10 times at ~15–25 LOC each, plus the shared primitives at ~200–250 LOC combined) |
| Review rounds | 1–2 (the repetitive per-section wiring is mechanical once the first section sets the pattern; risk is mainly a section whose save call doesn't cleanly wrap into an `Observable<boolean>`) |

**Depth check (Step 2.4):** `Standard` matches — no data/API/migration surface (which would push to `Full`), but real multi-file frontend work spanning ~10 components plus 4-5 new shared primitives (too much for `Lite`). If the first 2-3 section tasks reveal every section shares the exact same save-wrapping shape, consider dropping the remaining sections' grouped task even further; if a section turns out to need bespoke dirty logic (`UCA-OQ-2`), split it into its own task and flag the budget as exceeded per section, not for the whole spec.
