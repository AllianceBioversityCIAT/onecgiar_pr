## Context

P2-2967 has two halves: a performance bug fix and a new QA status board page.

### Performance bug (investigated via Chrome DevTools Performance traces)

- The mandatory-field feedback box (the red "X alerts" indicator) is computed by scanning the DOM for `.pr-field.mandatory` / `appFeedbackValidation` nodes.
- That scan runs from a **self-sustaining `setTimeout(0)` loop inside `ngDoCheck`** in the affected components, delegating to `DataControlService`. `ngDoCheck` fires on every change-detection cycle, so the loop re-arms itself continuously: **~2062 scans/sec idle** (CPU 1×), 345 scans/sec (CPU 4×).
- A 7-tab navigation sequence produced **4667 scans, 14.9 s wall-clock, 1699 ms blocking time** — the main thread is starved and timers drift.
- The **panel-menu** compounds it: its green-checks getter runs `JSON.stringify(green_checks)` on **every CD cycle** (hundreds of times/sec in an active tab).
- Data flow today: DOM → synchronous scan (in CD) → `fieldFeedbackList` (plain array) → template binding for the alerts count; `green_checks` (plain object) → `JSON.stringify` in getter → panel-menu template.

### QA status board (routing + asset research)

- Routes live in `shared/routing/routing-data.ts` as a `routingApp` array of `PrRoute`. **Public** routes are simply those with **no `canActivate` guard** (login at line 37, auth 38–42, `reports/result-details/:id` 79–82 follow this). Admin-gated routes go in `extraRoutingApp` (CheckAdminGuard).
- The `general-interceptor` attaches the custom `auth` header to all requests, but a same-origin static asset GET is harmless.

## Goals / Non-Goals

**Goals:**
- Eliminate the per-CD DOM scan and per-CD `JSON.stringify` from the hot path across the 5 screens, with **no behavior change** to the "X alerts" box or the green checkmarks.
- Make `fieldFeedbackList` and `green_checks` signal-backed so a single CD tick fires only on real change.
- Ship a public, JSON-driven QA status board page with zero runtime LLM cost and a documented AI-self-edit contract.

**Non-Goals:**
- Any backend change (the green-check completeness query is unchanged).
- The deferred sub-tickets P2-2973 / P2-2974 / P2-2975 and the full-OnPush half of P2-2970 (Phase 2).
- Any runtime LLM / external API call on the QA page (hard cloud-cost rule).
- Adding the page to nav or to `extraRoutingApp`.

## Decisions

### Performance fix — throttle + rAF + runOutsideAngular + trailing-edge

- **Move the scan out of `ngDoCheck`'s `setTimeout` loop.** Schedule it via `requestAnimationFrame`, **throttled to 150 ms**, and coalesced (at most one pending rAF). Run the scan inside `NgZone.runOutsideAngular` so it does not itself trigger CD.
- **Trailing-edge:** always run one final scan after activity stops, so the box reflects the true final state even when the user goes idle (CD stops firing).
- **`fieldFeedbackList` → `signal`** in `DataControlService`. The scan compares the new result and only `.set()`s on an actual change → a single CD tick, no cascading. Reference-change check prevents redundant updates.
- **Re-enter the zone only to update the signal** (the only piece that needs to drive a render), keeping the DOM walk itself outside the zone.

### Panel-menu green-checks — memoized computed

- **`green_checks` → signal-backed** in `DataControlService`, with a transparent getter/setter preserving the existing `green_checks` property API (backward compat for all current readers/writers).
- **`greenChecksString = computed(() => JSON.stringify(green_checks()))`** — recomputes only when `green_checks` actually changes. The panel-menu getter delegates to `greenChecksString()` instead of stringifying per CD.
- Seed the `green_checks` signal correctly when data loads so the computed reflects the initial state.

### Data flow after the fix

DOM → (throttled rAF, outside zone) scan → compare → `fieldFeedbackList.set()` (only on change) → template alerts count.
`green_checks.set()` (on data load/update) → `greenChecksString` computed → panel-menu template (checkmarks).

### QA status page

- **Public route:** add one `PrRoute` to `routingApp` in `shared/routing/routing-data.ts`, placed **before** the `{ path: '**' }` wildcard fallback. No `canActivate` → publicly reachable at `/qa-status`, no token required. `prHide: true` keeps it out of nav/breadcrumbs. `loadComponent` (standalone, not `loadChildren`).

  ```ts
  {
    prName: 'QA Status',
    prHide: true,
    path: 'qa-status',
    loadComponent: () => import('../../pages/qa-status/qa-status.component').then(m => m.QaStatusComponent)
  }
  ```

- **Standalone component** (`qa-status.component.ts`): `standalone: true`, `ChangeDetectionStrategy.OnPush`, minimal PrimeNG imports (`CommonModule`, `CollapsibleContainerModule`, `PageHeaderModule`, `TooltipModule` — never import all of PrimeNG). Injects `QaStatusService` as `qaStatusSE`. Exposes `board = qaStatusSE.board` (signal) and `loadError = qaStatusSE.loadError` (signal). `ngOnInit` → `qaStatusSE.load()`. Local `expanded = signal<Record<string, boolean>>({})` with `toggle(id)`. A `statusMeta` const map (status → `{ label, cssClass }`) keeps template logic minimal. `trackById` for `@for`. **No LLM calls.**

- **Service** (`qa-status.service.ts`, `providedIn: 'root'`): `http = inject(HttpClient)`; `readonly board = signal<QaStatusBoard | null>(null)`; `readonly loadError = signal(false)`. `load()` does `http.get<QaStatusBoard>('./assets/qa-status/perf-refactor.json')` → `board.set(d)` on success, `loadError.set(true)` on error. **Runtime fetch of a static asset** → updating the board needs only a JSON edit + asset redeploy, no recompile. Same-origin; the `auth` header is harmless. **No LLM / external API.**

- **Template** (`qa-status.component.html`, new control flow): `<app-page-header>` with `boardTitle` / `boardSubtitle`; a global-metrics card rendering `globalMetrics` as two columns Before/After (`domScansPerSecIdle`, `tabSwitchWallClockSec`, `blockingTimeMs`) + `summary` + `testsPassing`; `@if (loadError())` error banner `@else @if (board())` render `@else` loading skeleton; `@for (item of board().items; track trackById)` one expandable card per item (status chip, ticket id, title, expand caret `material-icons-round`) and, when expanded, body sections in order: What changed → How to test (numbered `<ol>`) → Affects (bullets) → Risks/validation notes (bullets) → Metrics (two cols before/after) → Screenshots (`<img loading="lazy">`; `@if` empty → "No screenshots").

- **Interfaces** (`qa-status.interfaces.ts`): `QaStatusBoard` + `QaStatusItem` mirroring the JSON schema exactly. `status` is a union of the 4 allowed strings.

- **Styles** (`qa-status.component.scss`): only `--pr-*` tokens (no hex). `.qa-status-chip` base + 4 distinct-color modifiers — `.qa-chip--pendiente` (neutral grey), `.qa-chip--en-progreso` (yellow-300), `.qa-chip--listo-para-pruebas` (blue-500), `.qa-chip--done` (green-500). `.qa-card`, `.qa-card__header/__body`, `.qa-metrics` (two-col grid), `.qa-thumb`. Icons `material-icons-round`. No `.module.ts`, no routing module.

### Data schema (`assets/qa-status/perf-refactor.json`)

`{ boardTitle, boardSubtitle, lastUpdated, globalMetrics{ summary, before{domScansPerSecIdle, tabSwitchWallClockSec, blockingTimeMs}, after{...}, testsPassing }, items[]{ id, ticket, title, area, status, whatChanged, howToTest[], affects[], risks[], metricsBefore, metricsAfter, screenshots[] } }`.

- `status` MUST be exactly one of `pendiente | en-progreso | listo-para-pruebas | done` (a typo → unstyled chip).
- `screenshots` MAY be `[]` → "No screenshots". `blockingTimeMs` MAY be `null`.
- `id` is a stable, unique kebab-case slug (drives `trackBy` + expansion state) — never recycled.

### Status state machine (documented in `docs/qa-status-board.md`)

- Forward: `pendiente → en-progreso → listo-para-pruebas → done`.
- Backward on QA fail/regression: `listo-para-pruebas → en-progreso`, `done → en-progreso` (append the reason to `risks`).
- **No skipping forward** (e.g. `pendiente → done`) — must pass through `listo-para-pruebas` to give QA a test window.
- Any status → `pendiente` only when work is explicitly deferred (note reason in `risks`).

### AI-self-edit contract (the `rules.md`-style doc)

`docs/qa-status-board.md` documents: what the page is (public, read-only, never calls an LLM at runtime), the files, the full JSON schema, the 4 status meanings, the allowed transitions, and the **exact 7-step contract** an AI session follows to update an item (open only the JSON; locate by `id`; never change `id`/`ticket`/`title` on a status update; set `status` to a reachable value, appending a reason to `risks` if backward; update `metricsBefore`/`metricsAfter`/`globalMetrics` with **measured** values only, citing the trace/test source; update `screenshots`; bump `lastUpdated`; validate JSON + status spelling, then stop). Guardrails: never add a runtime LLM/API call, never put secrets in the world-readable JSON, keep `status` spelling exact.

## Risks / Trade-offs

- **[Throttle could make the "X alerts" box stale]** → trailing-edge guarantees a final scan after activity stops; reference-change check keeps it synchronized with real DOM state. Validate the 7→6 field transition reflects in <600 ms intra-section.
- **[Signal migration of `green_checks` could break existing readers/writers]** → transparent getter/setter preserves the `green_checks` property API; seed the signal on data load. Verify checkmarks render identically.
- **[runOutsideAngular scan never re-enters the zone → UI doesn't update]** → re-enter only to `.set()` the signal; the DOM walk stays outside the zone.
- **[QA route accidentally guarded / placed after `**`]** → it MUST sit before the wildcard and carry no `canActivate`; confirm reachable at `/qa-status` with no token.
- **[`status` typo in JSON → unstyled chip]** → documented guardrail; the 4 strings are an enforced TS union in the interface.
- **[Local-only screenshot paths under `context/` won't render in deployed env]** → documented; prefer hosted/asset paths in the JSON.

## Migration Plan

Pure frontend. No data migration. Rollback = revert the commit (the JSON asset and page are additive; the perf fix is a localized refactor of the scan path). Verify on local + prtest with DevTools Performance traces (idle scan count = 0, 7-tab sequence wall-clock down) and the QA page reachable publicly at `/qa-status`.
