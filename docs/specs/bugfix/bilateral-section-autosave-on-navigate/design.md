# `bugfix/bilateral-section-autosave-on-navigate` — Design

**Depth:** Lite (Bug Mode) · Links: `requirements.md` (same folder), `docs/prd.md` `US-S5`, `docs/trd/trd.md` Bilateral module.

## 1. Summary

Replace the `window.confirm(...)` gate in `BilateralResultCreatorComponent.selectSection()` with a flush-then-navigate sequence that reuses the exact save call the "Save draft" button already makes (`autoSaveService.flush(autoSaveService.getEndpointKeys(section))`), awaited via the existing `waitForSectionSave()` helper. Only advance `openSectionName` once the flush settles without error; on error, keep the section open and reuse the existing save-failure alert. No new service, no new endpoint, no route changes — the biggest constraint is that Bilateral's section switch is a local signal, not a route, so the shared W1/W2 `UnsavedChangesGuard` cannot apply and is not used.

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Client module touched:** `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/bilateral-result-creator.component.ts` (and its `.spec.ts`).
- **Client service consumed, unmodified:** `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-auto-save.service.ts` (`flush`, `hasPendingFor`, `hasErrorFor`, `lastErrorMessageFor`, `getEndpointKeys`).
- **Doc touched:** `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/CLAUDE.md`.
- No server modules, no API surface, no data model changes.

### 2.2 Sequence — Next/Back/side-rail click (corrected)

```
[User clicks Next/Back/section tab]
  └── moveSection(direction) or direct selectSection(section)
        └── selectSection(section)
              ├── if section === current → no-op (unchanged)
              ├── if !autoSaveService.hasPendingFor(current) → openSectionName.set(section) immediately (unchanged fast path)
              └── else (pending edits exist):
                    ├── await autoSaveService.flush(autoSaveService.getEndpointKeys(current))
                    ├── await waitForSectionSave(current)   [reused as-is from triggerManualSave()]
                    ├── if autoSaveService.hasErrorFor(current):
                    │     └── surface the same save-failure alert triggerManualSave() shows
                    │           (serverReason via lastErrorMessageFor, + missing fields) — do NOT navigate
                    └── else:
                          └── pendingOpen.set(false); openSectionName.set(section)
```

This mirrors W1/W2's shape (`saveThenGo`: resolve target → save → navigate only on non-failure) without touching the route-based guard machinery, which does not apply here (Bilateral sections are not separate routes).

## 3. Data Model Changes

None. No entity, migration, or schema change.

## 4. API Surface

None. No new or changed endpoint — `flush()` already calls the same PATCH endpoints `triggerManualSave()` uses today; this design only changes *when* `flush()` is invoked (also on Next/Back/side-rail, not only on the explicit Save-draft click).

## 5. Client Workflow / Business Rules

- **`selectSection(section)`** becomes `async`. Its early-return guards (`current === section`) are unchanged. The `window.confirm(...)` branch is replaced by the flush sequence in §2.2.
- **Fast path preserved:** when `hasPendingFor(current)` is false, behavior is byte-for-byte what it is today (immediate `openSectionName.set(section)`, no flush call, no added latency) — this satisfies `BIL-R-3`.
- **Failure path:** on `hasErrorFor(current)` after the flush settles, do not call `openSectionName.set(...)`. Reuse the exact alert shape `triggerManualSave()` already builds (`serverReason` via `lastErrorMessageFor`, `missing` via `missingFieldsFor`) so the message a user sees for a failed Next-triggered save is identical in wording to a failed Save-draft click — no new copy to write or i18n-key to add.
- **`moveSection(direction)`** is unchanged in shape (still resolves the target section and delegates to `selectSection`) but must now `await`/return the promise from `selectSection` so callers (template click handlers) don't need to change, since Angular template event bindings tolerate an async handler returning a Promise.
- **Evidence section note:** `getEndpointKeys('evidence')` returns an empty array; `flush([])` with an explicit (non-`undefined`) empty array flushes nothing for that section. This is **not a new gap introduced by this design** — `triggerManualSave()` already calls `flush(getEndpointKeys(activeSection))` identically today for every section including `'evidence'`, so whatever the evidence section's existing save behavior is under Save-draft, it is preserved unchanged under Next/Back (`BIL-OQ-2`, resolved: confirmed by reading `triggerManualSave()` — no separate evidence-flush path exists to diverge from).
- **Read-only mode:** `BilateralAutoSaveService.flush()` already no-ops when `isReadOnly()` is true (`bilateral-auto-save.service.ts:195`), and `hasPendingFor()` reflects no pending edits in a read-only session in practice (nothing can be typed to stage a pending field). No extra read-only branch is needed in `selectSection()`; the regression test for `BIL-AC-4` verifies this end-to-end via the existing `isFormReadOnly()`/`setReadOnly()` wiring documented in the folder's `CLAUDE.md`, not via new code.

## 6. Frontend Plan

### 6.1 Routes / modules

No route change. `BilateralResultCreatorComponent` stays under its existing route; no new guard is registered.

### 6.2 Components & services

- Modify `BilateralResultCreatorComponent.selectSection()` (and adjust `moveSection()`'s call site to `await`/return it) — no new component, no new service.
- No new API method — reuses `BilateralAutoSaveService.flush()`/`hasPendingFor()`/`hasErrorFor()`/`lastErrorMessageFor()`/`getEndpointKeys()`, all already public and already exercised by `triggerManualSave()`.

### 6.3 Design system usage

Not applicable — no new markup, no new visual element. The user-visible change is the *absence* of the native `window.confirm()` dialog; the save-failure alert already exists (`api.alertsFe.show(...)`, the same call `triggerManualSave()` uses) and needs no new styling.

### 6.4 Real-time / notification UX

Not applicable — no socket/Pusher event involved.

## 7. Security & Authorization

No change. No new endpoint, no new role check. `flush()`'s existing read-only short-circuit (`isReadOnly()`) is unchanged and continues to gate writes for a non-editable session per the component's documented "solo lectura" contract.

## 8. Performance & Capacity

- No added network calls in the common case (clean section navigates immediately, per `BIL-R-3`).
- For a dirty section, this moves an already-necessary PATCH earlier in time (from "next explicit Save-draft click, or never" to "at the moment of navigation") — no new endpoint, no new payload shape, no measurable capacity impact.

## 9. Observability

No new logging required. Existing `alertsFe` error surface is reused verbatim; no secrets involved.

## 10. Testing Plan (forward-looking)

- **Unit (Jest, component):** `bilateral-result-creator.component.spec.ts` — new cases for `BIL-AC-1..4` (see `requirements.md` §7a/§8): spy on `window.confirm` (must not be called), spy on `autoSaveService.flush`/`hasErrorFor`/`hasPendingFor`, assert `openSectionName` transitions only on non-error settlement, assert the clean-section fast path makes no flush call, assert no flush call under `isFormReadOnly()`.
- **Regression test (mandatory, Bug Mode):** one test reproducing the exact reported symptom — dirty section + click Next today shows `window.confirm`; after the fix, the same setup calls `flush()` and never calls `window.confirm`. Red before the fix (asserting no-confirm fails against current code), green after.
- Coverage uplift: `bilateral-result-creator.component.ts` already has a `.spec.ts`; no new file needed, extend it. Client thresholds (50/60/60/60) are unaffected at this scale.

## 11. Backwards Compatibility & Migration Plan

Not applicable — client-only behavioral change, no persisted contract, no feature flag, no rollback beyond reverting the PR.

## 12. Design Decisions (ADRs)

### `BIL-DD-1` — Reuse `BilateralAutoSaveService.flush()` directly instead of wiring into the shared `UnsavedChangesGuard`

- **Context:** W1/W2 solves the identical UX problem via a route-based `CanDeactivate` guard (`UnsavedChangesGuard`) plus `UnsavedNavigationIntentService`. Bilateral's sections are not separate routes — they are one route with a local `openSectionName` signal — so that guard structurally cannot fire on a Bilateral section switch.
- **Decision:** Call `BilateralAutoSaveService.flush()` directly from `selectSection()`, mirroring the exact sequence `triggerManualSave()` already uses (`flush` → `waitForSectionSave` → check `hasErrorFor`), rather than restructuring Bilateral into per-section routes to reuse the W1/W2 guard.
- **Alternatives considered:**
  1. Convert each Bilateral section into its own route so `UnsavedChangesGuard` applies unmodified — rejected: a much larger, riskier restructuring for the same outcome, and explicitly rejected in `proposal.md` Option B.
  2. Add a debounced background auto-save independent of navigation — rejected: doesn't guarantee persistence *before* the user leaves the section (race with the timer), and changes save cadence for the whole editor rather than fixing the reported navigation-time behavior; `proposal.md` Option C.
- **Consequences:** The fix is scoped entirely to one component method plus its call site, using primitives that are already tested via `triggerManualSave()`. Trade-off: Bilateral and W1/W2 now share the *outcome* (no popup, auto-save on navigate) but not the *mechanism* — a future reader must know both patterns exist and why (documented in `bilateral-result-creator/CLAUDE.md` and cross-referenced from `requirements.md`).

**Step 2.3 reversion challenge:** This DD does not revert any already-delivered behavior — it removes a `window.confirm()` popup that was itself the defect being fixed (not a deliberate guard the codebase relies on elsewhere), and no test or documented contract asserts the popup must appear. No reversion challenge required per the Step 2.3 skip condition (Lite depth, no test covers the popup's presence, no other surface depends on it).

## 13. Open Gaps & Follow-ups

- `BIL-OQ-1` (message wording for a flush failure triggered by navigation vs. explicit save) is resolved by design choice: reuse the Save-draft error message verbatim (§5) — no distinct copy, no new i18n key needed. If the user wants a different message, this is a one-line follow-up in the same task.
- No other follow-ups. This is a self-contained, single-component fix.

## Budget (Step 2.4)

| Signal | Value |
|---|---|
| Expected tasks | 2 (implementation + regression test are combined into one Bug Mode task per Lite convention; doc update is a second, tiny task) |
| Expected LOC | ~35–55 (component method rewrite ~20–30 LOC, new/updated spec cases ~15–20 LOC, `CLAUDE.md` doc line ~2 LOC) |
| Expected review rounds | 1 |

This lands comfortably inside **Lite** depth — no downgrade to `/akili-quick` (the fix has real logic: an async flush-then-navigate sequence with an error branch, not a copy/color tweak) and no upgrade needed (single component, no cross-cutting surface, no migration).

## Required cross-references

- `docs/specs/bugfix/bilateral-section-autosave-on-navigate/requirements.md` (same folder).
- `docs/prd.md` `US-S5`; `docs/trd/trd.md` Bilateral module.
- `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/CLAUDE.md` (to be updated by this spec's tasks).
- `onecgiar-pr-client/src/app/pages/results/pages/result-detail/CLAUDE.md` (W1/W2 reference pattern, not modified).
