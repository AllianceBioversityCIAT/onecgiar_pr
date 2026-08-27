## Context

Notifications tab: `results-notifications.component.{html,ts}`. Helper text is hardcoded (html:31-34). Phases `<p-select>` binds `resultsNotificationsSE.phaseFilter` (html:42-52), options `phaseList` from `GET_versioning` in `getAllPhases()` (ts:102-109); Entity `<p-select>` is disabled until a phase is set and refreshes via `onPhaseChange()` → `filterInitiativesByPhase()` (ts:77-100). Active phase is available via `dataControlSE.reportingCurrentPhase`.

Notification item buttons: `notification-item.component.html:81,97`. Confirm label is a `@let` ternary; reject label is inline.

Accept modal: `share-request-modal.component.ts:42-54` `validateAcceptOrReject()` — currently `missingTocIds = !toc_result_id || !toc_level_id` is evaluated regardless of planned_result, so a "No" answer with empty ToC ids still disables Accept. The modal is shared between notifications (`dataControlSE.inNotifications`) and the result-detail share flow.

## Goals / Non-Goals

**Goals:** AC1 text swap; AC2 default active phase + entity refresh (query-param aware); rename buttons; make the ToC requirement apply only on "Yes" in the notifications accept flow.

**Non-Goals:** no backend; no change to the result-detail share flow's validation; no change to Updates tab text; no change to the reject confirmation dialog beyond its trigger label.

## Decisions

**D1 — AC1: direct hardcoded swap.** Replace the `*ngIf="…/requests"` paragraph text (html:31-34). Same `*ngIf` (covers received/sent under Requests) — scope unchanged.

**D2 — AC2: default in `getAllPhases()`.** After `phaseList` loads, if `phaseFilter` is unset AND no phase query param was applied, set `phaseFilter = reportingCurrentPhase.phaseId` (matched against `phaseList`), then call `onPhaseChange(phaseFilter)` to populate Entity. Keep `setQueryParams()` precedence so a deep-linked phase wins.

**D3 — Rename, text-only.** Set confirm label to `'Accept contribution'` and reject label to `'Decline contribution'` for all cases; the `(click)` handlers (`acceptOrReject` / `mapAndAccept`) are unchanged.

**D4 — Validation scoped to notifications.** In `validateAcceptOrReject()`, gate `missingTocIds` on planned_result being Yes: `const missingTocIds = plannedResult && (!result.toc_result_id || !result?.toc_level_id);`. This makes "No" enable Accept without ToC, and "Yes" keep requiring ToC ids + indicator. Because the existing `missingIndicator` already guards on `plannedResult`, and result-detail's "Yes/No" maps to the same `planned_result`, the change is behavior-preserving for valid result-detail submissions (which always answer the question); to be safe, only relax when `dataControlSE.inNotifications` if testing shows any result-detail regression.

## Risks / Trade-offs

- [Shared modal regression] → `validateAcceptOrReject` is shared. Mitigation: the relaxed rule only changes the "No + empty ToC" case; verify both flows (notifications accept, result-detail share) still behave. If result-detail needs the old strictness, wrap the relaxation in `if (dataControlSE.inNotifications)`.
- [Default phase vs query param] → must not override a deep-linked phase. Mitigation: set default only when `phaseFilter` is still falsy after `setQueryParams()`.
- [No unit tests for these components] → verify via `build:dev` + Jest suite + visual: helper text, default phase preselected + entity enabled, button labels, and Accept enable/disable on Yes/No.
