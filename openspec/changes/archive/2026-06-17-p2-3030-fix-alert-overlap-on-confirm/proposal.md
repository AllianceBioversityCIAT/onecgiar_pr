## Why

Jira **P2-3030** (QA bounce). After confirming an evidence deletion, the confirmation popup plays its closing animation while the "Section saved successfully" toast plays its opening animation **at the same time**, so the green success message renders **on top of** the still-visible "Are you sure…?" popup. QA flagged this as a cluttered, duplicated message.

Root cause is in the shared front-end alert service `CustomizedAlertsFeService.show()`: each alert is a separate centered-modal node, and a closing alert is only removed on `animationend` (~0.75s of `bounceOut`). When a new alert opens within that window, the two overlap. This is a **timing race**: it is visible wherever a confirm-dialog callback triggers a *fast* save (evidence delete), and effectively invisible where the save is slow (e.g. CGSpace sync), which is why it appears to only happen in the evidence section.

This change is **frontend-only**.

## What Changes

- `CustomizedAlertsFeService.show()` now **removes any alert already on screen before inserting a new one**, so a new alert cancels/replaces the previous one instead of overlapping its closing animation. Centered modal alerts are shown **one at a time**.
- This fixes the evidence delete confirm→save overlap and hardens every other confirm→save / back-to-back alert flow (sync, etc.) against the same race, regardless of save latency.
- No change to alert content, the auto-save-on-delete behavior (P2-3030, already approved), or any caller.

## Capabilities

### New Capabilities
- `alert-display-behavior`: The shared front-end alert (`CustomizedAlertsFeService`) shows at most one centered alert at a time; opening a new alert removes any currently displayed alert so closing/opening animations never overlap.

### Modified Capabilities
<!-- None. -->

## Impact

- **Code (client only):** `onecgiar-pr-client/src/app/shared/services/customized-alerts-fe.service.ts` — `show()`.
- **Scope:** shared service used app-wide (save/error toasts, confirm dialogs, sync confirmations). Behavior change is "one alert at a time," which is correct for centered modal alerts.
- **Tests:** add/extend `customized-alerts-fe.service.spec.ts` to assert a second `show()` leaves a single `.custom_modal_container` in the DOM.
- **Backend:** none.
- **Related:** P2-3030 (auto-save on evidence deletion, which surfaced this latent overlap).
