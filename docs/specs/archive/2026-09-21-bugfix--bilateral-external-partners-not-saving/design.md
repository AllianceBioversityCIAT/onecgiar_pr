# Design — Bilateral External Partners Not Saving (Lite / Bug)

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `bugfix/bilateral-external-partners-not-saving` |
| Depth | Lite |
| Architecturally significant? | No — single-component, additive UI-only change. `software-architect` Decision Spine not invoked (no new module/service/integration/data flow/NFR). |
| Delegation | Design written inline (no scout needed — root cause and fix site were already pinpointed to 3 files during Phase 1/proposal; below the 4-file scout threshold). |

## 2. Executive Summary

`section-contributors.component.ts`'s `loadCenters()` swallows a centers-catalogue load failure with no visible error and no recovery path, which silently and permanently blocks the "External partners" field from ever being persisted (see `requirements.md` § Context for the full chain). The fix adds a `centersLoadFailed` signal + Retry banner, reusing the exact `app-alert-status` + Retry pattern the component already uses for the sibling partners-GET failure (`partnersLoadFailed`, lines 148–163 of the template).

## 3. Architecture Overview

No architectural change. One component (`SectionContributorsComponent`) gains one new signal and one new template branch. No new service, no new route, no new API call — `CentersService.getData()` is already called today; this only adds an error branch to the existing call site.

## 4. Root Cause Confirmation (code trace)

`onecgiar-pr-client/src/app/shared/services/global/centers.service.ts`:
- `getData()` retries the CLARISA centers request twice (`RETRY_COUNT = 2`, 600ms delay) and only calls `loadedCenters.emit(true)` on the `next` (success) path (line 105). On final failure it rejects the returned promise (line 109) and **never emits** on `loadedCenters`.

`section-contributors.component.ts` → `loadCenters()`:
```
this.centersSubscription = this.centersService.loadedCenters.subscribe(() => {
  this.mapCenters();
});
this.centersService.getData()?.catch(() => {});
```
- `centersReady` is only ever set inside `mapCenters()` (called from the `loadedCenters` subscription, or synchronously if `centersService.centersList?.length` was already truthy at `ngOnInit`).
- The `.catch(() => {})` on the `getData()` call discards the rejection — no signal, no flag, no log.
- Result: if the centers catalogue fails all retries, `centersReady()` stays `false` for the lifetime of the component. `hydrateWhenReady` (lines 263–279) never runs — it explicitly early-returns while `!centersReady`. `loadExternalPartnersState()` is therefore never called, `partnersHydrated()` stays `false`, and `buildContributorsPayload()` (line 437) permanently omits `institutions`/`no_external_partners`/`is_lead_by_partner` from every PATCH, while `updateContributorsMds()` (line 495) permanently reports `external-partners: filled = false` — exactly the reported symptom, with zero visible error.

This differs from `loadProjects()`'s error handler, which DOES call `this.projectsReady.set(true)` on error (fail-open) — `loadCenters()` has no equivalent, which is the asymmetry that produces the bug. No further live-session repro is needed; the chain is fully determined by these three files.

## 5. Extended Directory Structure

Only existing files are touched — no new files.

```
onecgiar-pr-client/src/app/pages/bilateral/components/section-contributors/
├── section-contributors.component.ts     # + centersLoadFailed signal, error handling in loadCenters(), retryLoadCenters()
├── section-contributors.component.html   # + error banner branch (mirrors partnersLoadFailed block)
└── section-contributors.component.spec.ts  # + regression test
```

## 6. Data Model

No change.

## 7. API Design

No change. No new HTTP call — `CentersService.getData()` is the same existing call; only its rejection is now handled instead of swallowed.

## 8. Backend Module Design

N/A — frontend-only fix.

## 9. Frontend / UX Component Architecture

### `section-contributors.component.ts`

- New signal: `readonly centersLoadFailed = signal(false);`
- `loadCenters()` gains an explicit failure path:
  - When `centersService.centersList?.length` is falsy, subscribe to `loadedCenters` as today, but also attach an `error` handler in the `getData()` call: on rejection, `this.centersLoadFailed.set(true)`.
  - On success (via the existing `loadedCenters` subscription firing `mapCenters()`), reset `this.centersLoadFailed.set(false)` — defensive, covers the Retry-then-succeed path.
- New method: `retryLoadCenters(): void` — resets `centersLoadFailed` to `false` and re-invokes `loadCenters()`. Mirrors `retryLoadExternalPartners()` exactly (same shape, same section).

### `section-contributors.component.html`

- New `@if (centersLoadFailed())` block, placed alongside the existing `@if (partnersLoadFailed())` block (both are independent failure states that can show simultaneously — no mutual exclusion needed, they cover different upstream calls). Reuses `app-alert-status status="error"` + the same Retry button markup/classes, with description text specific to centers: *"We could not load the centers catalogue needed for this section, so nothing here can be saved right now. Please retry."* and `(click)="retryLoadCenters()"`.
- No change to the existing `partnersLoadFailed`, checkbox, or multi-select blocks — this is purely additive.

## 10. Shared Contracts or Package Extensions

None. `CentersService` itself is not modified (Option C from the proposal was explicitly rejected — its blast radius covers ~25 other screens per its own doc comment).

## 11. Design Decisions

### DD-1: Fail-visible (error banner) over fail-open (silently proceed with empty centers list)

**Decision:** Show an explicit error + Retry, rather than making `loadCenters()` fail-open like `loadProjects()` does (setting `centersReady = true` even on failure, proceeding with an empty centers list).

**Rejected alternative:** Mirror `loadProjects()`'s fail-open pattern exactly.

**Why rejected:** Centers are load-bearing for the **lead center** identification (`hydrateLeadAndSelection()` derives `readonlyLeadCenterInstitutionId` from `availableCenters()`). Failing open with an empty centers list would let `hydrateWhenReady` proceed, incorrectly conclude there is no matching lead center, and desynchronize `contributorsHydrated` state from reality — a worse, harder-to-diagnose defect than the one being fixed. Fail-visible (same pattern already proven for the partners GET) is the smallest safe choice.

**Reversion challenge (Step 2.3):** This DD does not revert any already-shipped behavior — it is purely additive (a new signal, a new template branch, a new method). No existing code path is removed, disabled, or inverted. Challenge skipped per the skill's own rule (applies only to reversions).

## 12. Budget (Step 2.4)

| Signal | Value |
|---|---|
| Expected tasks | 1 |
| Expected LOC | ~45 (≈15 `.ts`, ≈15 `.html`, ≈15 `.spec.ts`) |
| Expected review rounds | 1 (`checklist` depth — scoped, additive, no shared symbol changed) |

Depth check: this estimate lands comfortably within **Lite** — no downgrade or upgrade needed.

## 13. Open Gaps & Follow-ups

- None identified for this fix. If a future session finds the *projects* chain also gets stuck silently in some other scenario, that is out of scope here (it already fails open per `loadProjects()`'s existing error handler) and would need its own investigation.
