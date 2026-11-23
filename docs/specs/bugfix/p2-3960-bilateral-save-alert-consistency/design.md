# Design — P2-3960 · Bilateral save alerts tell one consistent truth

## 1. Document Control

| Field | Value |
|---|---|
| Spec | `bugfix/p2-3960-bilateral-save-alert-consistency` |
| Depth | Lite · Bug Mode |
| Requirements | `requirements.md` (BSA-R-1..4) |
| Verified at | `fcd441ad1` |
| Status | draft |

## 2. Executive Summary

The fix has two parts and needs no server, API, or data change.

- **Editor:** `selectSection()` judges failure only on the keys its own flush sends. This is the same pattern BSF-T-2 applied to Save draft. Save draft's "nothing to save" branch also requires that something was actually sent.
- **Alerts:** `show()` cancels the auto-close timers of the alerts it replaces. Removal on `animationend` tolerates a detached node, in both alert services.

## 3. Architecture Overview

No change to the architecture. The fix stays inside the existing Save coordinator, which `BilateralAutoSaveService` provides per editor. It reuses helpers that already exist and are tested: `pendingStatusKeysFor`, `hasErrorForFields`, and `lastErrorMessageForFields` (`bilateral-auto-save.service.ts:375,398,407`).

## 4. Extended Directory Structure

| File | Change |
|---|---|
| `onecgiar-pr-client/src/app/pages/bilateral/pages/bilateral-result-creator/bilateral-result-creator.component.ts` | `selectSection()` and the copy branch of `triggerManualSave()` |
| `…/bilateral-result-creator/bilateral-result-creator.component.spec.ts` | Regression tests, plus an update to one consumer test (P-6) |
| `…/bilateral-result-creator/CLAUDE.md` | Invariant text and the `Verified:` stamp |
| `onecgiar-pr-client/src/app/shared/services/customized-alerts-fe.service.ts` (+ `.spec.ts`) | Timer registry and null-safe removal |
| `onecgiar-pr-client/src/app/shared/services/customized-alerts-fs.service.ts` (+ `.spec.ts`) | Null-safe removal only |

## 5. Data Model · 6. API Design · 7. Backend Module Design

n/a. The change is client-only. No entity, endpoint, or payload changes.

## 8. Frontend Component Architecture

| ID | Decision | Requirement |
|---|---|---|
| **DD-1** | `selectSection()` captures `pendingStatusKeysFor(current)` before `flush` and passes that set to `waitForSectionSave(current, flushTargets)`. It then decides failure with `hasErrorForFields(flushTargets)` and gets the message from `lastErrorMessageForFields(flushTargets)`. The `hasPendingFor` entry guard and the `isSubmitting()` skip stay as they are | BSA-R-1 |
| **DD-2** | The wait must be scoped too, not only the final check. If the wait stays section-wide, a stale error makes it return at once (`:1388`) while the real request is still `'saving'`. The scoped check would then read "no error", navigation would go ahead, and a later failure would never be reported | BSA-R-1 "Real failure still blocks" |
| **DD-3** | In `triggerManualSave()`, the "nothing to save" branch is taken when `!hadChanges` **or** `flushTargets.length === 0`. The "saved" branch is taken only when both are true. `hadChanges` stays in the condition: Evidence always captures `['evidence']` (P-4), so dropping `hadChanges` would turn an untouched Evidence section from "Up to date" into "Draft saved" | BSA-R-2 |
| **DD-4** | `CustomizedAlertsFeService` keeps a private map from alert id to timer handle. `show()` clears every pending timer before it removes the old containers, because it removes **all** of them (`:29`). It then registers its own timer, still `3000` ms when `closeIn` is truthy. The timer callback removes its own entry. `closeAction` is unchanged | BSA-R-3 |
| **DD-5** | The `animationend` handlers in both alert services return early when the node has no parent. Everything else stays the same | BSA-R-4 |

**Design route:** n/a. There is no visual change: the same modal and the same copy strings, and only the choice of branch changes.

## 9. Shared Contracts

`CustomizedAlertsFeService.show()` keeps its public signature and its `closeIn` meaning (3000 ms when truthy). Its observable behavior changes only in that a replaced alert's timer can no longer close a newer alert.

## 10. Design Decisions — reversion challenge (Step 2.3)

**DD-1 removes a delivered behavior:** today a stale `'error'` anywhere in the section blocks navigation, and the test `…spec.ts:1953` covers it. Challenge question: *what does removing this break?*
- **Answer:** the stuck field stops forcing a modal on every rail click. The field keeps its own `'error'` status, which the section reads per field (`section-general-info.component.ts:536-538`). **Amended 2026-11-23 (T-1, P-9 settled false):** no template binds that status, so the field card does not show the failure. After DD-1, a stale failed field has no visible signal. The user accepted this gap at the T-1 gate as a known trade-off; per-field error display is a follow-up outside this spec. This is the trade-off already accepted in `BSF-OQ-1` (archived `2026-10-15-bugfix--bilateral-save-draft-footer`, design.md:56,116), now applied to navigation.
- **Breakage named:** the existing test `:1953` drives `hasErrorFor` with an empty dispatched set, so it would turn red. The fix is to drive the scoped pair instead (P-6, owned by T-1). The design addresses this. No other breakage was found.

## 11. Premise Ledger

**Counts:** 9 rows · 8 verified · 1 `UNVERIFIED` (Low 1, High 0)
**Triggers fired:**
- `live-path`, because the design names rail navigation and Save draft.
- `shared-state`, because it changes a shared service (`CustomizedAlertsFeService`).
- `consumer`, because it changes the observable behavior of `show()` and which calls `selectSection` makes to the auto-save mock.

| # | Claim | Class | Citation (as run) | Verified at | If false | Settled by |
|---|---|---|---|---|---|---|
| P-1 | A clicked rail item reaches `selectSection()`. A stale `'error'` makes `hasPendingFor` true, `flush` sends nothing, the section-wide check blocks, and the method returns before `openSectionName.set` | live-path | `bilateral-result-creator.component.ts:871-900`; `bilateral-auto-save.service.ts:255,306,313-316` | `fcd441ad1` | DD-1 targets the wrong code (High) | — |
| P-2 | Save draft goes through `triggerManualSave()` to the branch on `hadChanges` at `:1339`, then to `alertsFe.show`, whose timer is at `:77-80` and whose removal is at `:82-88` | live-path | `bilateral-result-creator.component.ts:1280-1355`; `customized-alerts-fe.service.ts:23-88` | `fcd441ad1` | DD-3 and DD-4 target the wrong code (High) | — |
| P-3 | A failed field cannot be resent, because `flush` removes it from `_pendingFields` before it sends | existence | `bilateral-auto-save.service.ts:250-255,561-571` | `fcd441ad1` | The stale-error premise is wrong and DD-1 is unnecessary (High) | — |
| P-4 | For Evidence, `pendingStatusKeysFor` always returns `['evidence']` | existence | `bilateral-auto-save.service.ts:376` | `fcd441ad1` | DD-3 could drop `hadChanges` (Low) | — |
| P-5 | The scoped helpers exist and are already used by Save draft | existence | `bilateral-auto-save.service.ts:375,398,407`; `bilateral-result-creator.component.ts:1292,1300,1304` | `fcd441ad1` | T-1 would need new service API (Low) | — |
| P-6 | Consumers that pin `selectSection`'s calls to the auto-save mock: the default mock `…spec.ts:189-194`; the failure test `:1953-1970`, which drives `hasErrorFor` and would invert; and the tests at `:1238-1251`, `:1938` and `:1975-1994`, which do not drive errors. The other bilateral specs that mention `hasErrorFor`/`selectSection` (`bilateral-annual-updating.component.spec.ts:68-260` for its own `waitForSave`, and `bilateral-progress-aside.component.spec.ts:47` for an output emit) do not exercise this method | consumer | `grep -rln "selectSection\|hasErrorFor" --include=*.spec.ts --include=*.cy.ts src/app cypress` → 5 files; each read | `fcd441ad1` | A suite breaks without being listed (Low) | — |
| P-7 | Consumers of `alertsFe.show`: about 70 non-spec files; 58 non-spec `closeIn` lines. All of them close at 3000 ms today whatever value they pass, and DD-4 keeps that | consumer | `grep -rln "alertsFe\.show\|alertsFeSE\|CustomizedAlertsFeService" src --include=*.ts \| grep -v spec \| wc -l` → 70; `grep -rn closeIn src --include=*.ts \| grep -v spec \| wc -l` → 58 (run from `onecgiar-pr-client`) | `fcd441ad1` | Timing regresses app-wide (High, which is why `closeIn` stays as it is) | — |
| P-8 | Readers of the alert's shared DOM state: `show()` removes every `.custom_modal_container` (`:29`), and `closeAction` looks the alert up by id (`:92-95`). The removal listener sits on the container (`:82-88`). The sibling service `CustomizedAlertsFsService` has the same unguarded removal (`customized-alerts-fs.service.ts:35-40`) and no timer | shared-state | files as cited | `fcd441ad1` | DD-4 or DD-5 misses a reader (Low) | — |
| P-9 | A field in `'error'` is still shown as failed on its own field card after DD-1 | other | `section-general-info.component.ts:536-538` exposes the status per field; whether the card paints it red was not confirmed | `fcd441ad1` (2026-11-23) | The `BSF-OQ-1` visibility trade-off gets worse | **Settled FALSE by T-1:** the getters are read only by `section-general-info.component.spec.ts:741-747`; the card's `fc-error` (`field-card.component.ts:141`) is fed only by word-count validation. The user accepted the gap and chose to proceed (execution.md T-1) |

## 12. Budget (Step 2.4)

| Expected tasks | Expected LOC (code + tests) | Expected review rounds |
|---|---|---|
| 2 | about 130 (production about 30, tests about 100) | 2 (1 per task) |

The estimate matches the Lite depth.
