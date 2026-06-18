## Why

Entering any page without a partner dropdown (e.g. `/result/results-outlet/results-list`) prints `TypeError: Cannot read properties of null (reading 'addEventListener')` in the console. Root cause: `DataControlService.findClassTenSeconds()` polls the DOM for 10s and **resolves `false` on timeout** (it does not reject); callers ignore that value and call `document.querySelector('.X').addEventListener(...)` directly, so when the element is absent `querySelector` returns `null` and dereferencing it throws. The error is swallowed by a `try/catch` but still logs, and the 10s `setInterval` runs inside the Angular zone on every mount, triggering needless change detection.

This is **frontend-only** and a **pre-existing bug** (identical in `master`), NOT introduced by the performance refactor (P2-2973) — it surfaced while QA validated that ticket on the QA build.

## What Changes

- Convert `DataControlService.showPartnersRequest` from a plain `boolean` to a `WritableSignal<boolean>` (signals are the project's preferred state primitive).
- Replace the fragile per-component `findClassTenSeconds()` + manual `addEventListener` with a **single document-level event-delegation listener** in the app shell (`app.component.ts`): on click, if `event.target.closest('.pSelectP, .alert-event, .alert-event-2, .alert-event-3')` matches → open the partners-request modal. Registered via `NgZone.runOutsideAngular` and re-entering the zone only on a match (no change-detection storms), torn down on destroy.
- Remove the `findClassTenSeconds` + `addEventListener` blocks from `app.component.ts`, `ipsr-contributors`, `step-n4`, `step-n1` (all of them just opened the same modal).
- **BREAKING (template binding):** split the modal's two-way `[(visible)]="...showPartnersRequest"` into `[visible]="showPartnersRequest()"` + `(visibleChange)="showPartnersRequest.set($event)"`; change the close button `= false` → `.set(false)`.
- Update affected `*.spec.ts` to read/write the signal (`showPartnersRequest()` / `.set(true)`).
- `findClassTenSeconds` left in place only if still referenced elsewhere; flagged for removal if it becomes unused.

## Capabilities

### New Capabilities
- `partners-request-trigger`: opening the shared "request a partner" modal from anchor links embedded in `[innerHTML]` field descriptions and IPSR alerts, via robust global click delegation (no DOM polling, no null deref) and a signal-backed visibility flag.

### Modified Capabilities
<!-- None: no existing OpenSpec capability spec governs this behavior today. -->

## Impact

- **Frontend only.** No server changes.
- Files: `src/app/app.component.ts`, `src/app/shared/services/data-control.service.ts`, `src/app/pages/results/pages/result-detail/components/partners-request/partners-request.component.html`, IPSR `ipsr-contributors` / `step-n4` / `step-n1` components, and their `*.spec.ts`.
- Behavior preserved: clicking the embedded "request" links / IPSR alerts still opens the partners-request modal, on every page, without console errors.
- Jira: separate ticket (TBD — to be created; not P2-2973). Branch: `performance-refactor`.
- Test gates unchanged (client Jest 50/60/60/60).
