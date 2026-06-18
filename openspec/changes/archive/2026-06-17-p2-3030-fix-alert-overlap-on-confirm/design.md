## Context

`CustomizedAlertsFeService.show()` (`shared/services/customized-alerts-fe.service.ts`) builds each alert as a `.custom_modal_container` node appended to `app-root`, centered with a backdrop. Closing is animated: `closeAction()` adds `animate__bounceOut` + a `delete` class, and the node is removed only on the `animationend` event (~0.75s later).

Confirm dialogs (`confirmText`) run their callback right after `closeAction()`. When that callback triggers a **fast** save, the save's `isSavingPipe()` shows a `save-button` "Section saved successfully" toast while the confirm popup is still mid-`bounceOut` → the two centered nodes overlap (QA screenshot: green success over "Are you sure…?"). Slow saves (e.g. CGSpace sync, >1s) don't overlap because the popup finishes closing first — hence the bug looked evidence-only.

## Goals / Non-Goals

**Goals:**
- A new alert never overlaps a previous one; centered alerts show one at a time.
- Fix is in the shared service so every confirm→save / back-to-back flow is covered, independent of save latency.

**Non-Goals:**
- No change to alert markup, styling, animations, content, or the auto-save-on-delete behavior.
- No queueing of alerts (we replace, not enqueue) — centered modal alerts are meant to be singular.

## Decisions

**Decision: In `show()`, remove every existing `.custom_modal_container` before inserting the new alert.**
- Rationale: matches the intended "one centered modal alert at a time" model and directly kills the overlap regardless of timing. Simpler and more robust than tuning animation timings or delaying the save toast.
- Alternative — remove only alerts already in the closing (`delete`) state: fixes the reported overlap but still allows two non-closing alerts to coexist (e.g. two rapid saves). Rejected in favor of the simpler, fully-deduped behavior.
- Alternative — delay the success toast until the confirm finishes animating: brittle (couples save flow to animation duration) and component-specific. Rejected.

**Decision: Keep the existing close/animation machinery unchanged.**
- The exit animation still plays for the normal single-alert case; we only hard-remove leftovers when a new alert supersedes them.

## Risks / Trade-offs

- [A genuinely-needed second alert would be removed when a new one opens] → Acceptable: these are full-screen centered modal alerts with a backdrop; showing two at once is never correct. No known flow depends on stacking.
- [Shared service touched → wide blast radius] → Mitigated by keeping the change to a single guard at the top of `show()` and adding a unit test; behavior for the common single-alert path is unchanged.

## Migration Plan

Not applicable — pure frontend behavior fix. Rollback = revert the one-line guard in `show()`.
