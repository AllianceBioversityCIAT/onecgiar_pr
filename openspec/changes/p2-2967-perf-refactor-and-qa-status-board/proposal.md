## Why

Jira **P2-2967** (Performance): switching tabs in Result Detail / Result Creator / IPSR is slow and janky. Profiling found the root cause is a **per-change-detection DOM scan** for the mandatory-field feedback box (the red "X alerts" indicator). A self-sustaining `setTimeout(0)` loop inside `ngDoCheck` re-scans the DOM for `.pr-field.mandatory` / `appFeedbackValidation` nodes on every cycle — **~2062 scans/sec while idle** (CPU 1×), and a 7-tab navigation sequence triggered **4667 scans, 14.9 s wall-clock, 1699 ms blocking time**. This starves the main thread, drifts timers, and makes tab switching feel frozen. The panel-menu compounds it with a per-CD `JSON.stringify(green_checks)` call for the section green-checks indicator.

This change does two things:

1. **Fixes the performance bug** across the 5 affected screens by moving the scan off the per-CD hot path (throttle + `requestAnimationFrame` + `runOutsideAngular` + trailing-edge), turning `fieldFeedbackList` and `green_checks` into signals, and replacing the per-CD `JSON.stringify` with a memoized `computed()`.
2. **Adds a NEW public QA Status Board page** at `/qa-status` so QA/business can track, per sub-ticket, what changed, how to test it, and the before/after metrics — driven entirely by a static JSON asset (no runtime LLM, zero cloud cost), maintained by an AI-self-edit contract documented in a `rules.md`-style maintenance doc.

**Scope: frontend-only** (`onecgiar-pr-client`). No backend, no migrations. The section green-check itself is backend-computed and is **not** touched here — only the client-side `green_checks` memoization that renders it.

## What Changes

### Performance fix (5 screens + shared service)

- **P2-2969 — Result Detail** (`result-detail.component` / `data-control.service`): move the mandatory-field DOM scan out of the `ngDoCheck` `setTimeout` loop into a throttled (150 ms), coalesced `requestAnimationFrame` running **outside** Angular's zone; `fieldFeedbackList` becomes a signal that updates only on real change (trailing-edge captures the final state).
- **P2-2971 — Result Creator + ReportResultForm** (`result-creator.component` + `report-result-form.component`): same throttle + rAF + zone-outside + trailing-edge pattern.
- **P2-2972 — IPSR Detail + Creator** (`innovation-package-detail.component` + `innovation-package-creator.component`): same pattern; both share `DataControlService.fieldFeedbackList`.
- **P2-2970 (safe half) — Panel-Menu green-checks** (`panel-menu.component.ts` / `data-control.service`): replace the per-CD inline `JSON.stringify(green_checks)` with a memoized `computed()` (`greenChecksString`); `green_checks` becomes signal-backed with a transparent getter/setter for backward compatibility.

### New QA Status Board page

- **Public route** `/qa-status` (no `canActivate` guard — its absence is what makes it public), added to `routingApp` in `shared/routing/routing-data.ts`, `prHide: true`, loaded via `loadComponent` (standalone).
- **Standalone page** under `pages/qa-status/`: OnPush component + `providedIn: 'root'` service + interfaces, rendering a data-driven board with global before/after metrics and one expandable card per sub-ticket (status chip, what changed, how to test, affects, risks, per-item metrics, screenshots).
- **Runtime data** from a static JSON asset `assets/qa-status/perf-refactor.json` fetched via `HttpClient` on init — **no runtime LLM / external API**. Updating statuses/metrics is a JSON-only edit (no recompile).
- **AI-self-edit rules doc** `docs/qa-status-board.md`: JSON schema, the 4 statuses, the allowed status state machine, and the exact contract an AI session follows to update an item.

## Capabilities

### New Capabilities
- `perf-mandatory-field-scan`: the throttled / zone-outside / signal-backed behavior of the mandatory-field feedback scan and the green-checks indicator across Result Detail, Result Creator + ReportResultForm, IPSR Detail/Creator, and the panel-menu.
- `qa-status-board`: the public, read-only, JSON-driven QA status board page — public route, runtime asset fetch (no runtime LLM), status state machine, and AI-self-edit maintenance contract.

### Modified Capabilities
<!-- none — no existing specs under openspec/specs/ for these areas -->

## Impact

- **Frontend (in scope):**
  - `pages/results/pages/result-detail/result-detail.component.*` (P2-2969)
  - `pages/results/pages/result-creator/result-creator.component.*` + `report-result-form.component.*` (P2-2971)
  - `pages/ipsr/.../innovation-package-detail.component.*` + `innovation-package-creator.component.*` (P2-2972)
  - `shared/components/panel-menu/panel-menu.component.ts` (P2-2970 safe half)
  - `shared/services/data-control.service.ts` (signals: `fieldFeedbackList`, `green_checks`; `computed()` `greenChecksString`) — shared by all of the above
  - `shared/routing/routing-data.ts` (new public `qa-status` route, before the `**` wildcard)
  - `pages/qa-status/qa-status.component.{ts,html,scss}`, `qa-status.service.ts`, `qa-status.interfaces.ts` (new standalone page)
  - `assets/qa-status/perf-refactor.json` (new data asset)
  - `docs/qa-status-board.md` (new maintenance / AI-self-edit doc)
  - Jest specs for the touched components + the new page (client thresholds 50/60/60/60).
- **Deferred to a later phase (out of scope here, tracked on the board as `pendiente`):**
  - **P2-2970 (full OnPush in sections):** blocked on validating 2969/2971/2972; safe only after scan elimination is confirmed.
  - **P2-2973 (trackBy + virtualize lists):** `trackBy` is safe but virtualization carries scroll-behavior risk (high blast radius for the tab-switch scenario) — defer.
  - **P2-2974 (`@defer` + section cache):** needs re-proof of 100+ cases (data staleness / cache invalidation) — defer.
  - **P2-2975 (event coalescing global + full signals migration):** blast radius is the entire app — Phase 2 only, goes last after every other fix is validated.
- **Backend:** none. The green-check completeness query is backend-owned and unchanged; this change only memoizes the client-side string used to render it.
- **Baseline refs:** UI rules per `docs/system-design/design.md`; technical layout per `docs/detailed-design/detailed-design.md`. Jira: **P2-2967** (sub-tickets P2-2969, P2-2970, P2-2971, P2-2972).
