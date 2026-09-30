# bilateral-ai-job-watcher

**What this owns:** one headless component (`AIQ-T-10`, `design.md` §6.2, `AIQ-DD-6`). No inputs,
no template, no logic — its only job is to be injected once, app-wide, so two `providedIn: 'root'`
services actually get instantiated.

## Invariants
- A `providedIn: 'root'` service's constructor (and any `effect()` it creates there) never runs
  until something injects it — Angular does not eagerly instantiate root services. This component
  exists ONLY to be that "something", mounted once at `app.component.html` next to the other global
  overlays, exactly where the retired `app-bilateral-ai-completion-dialog` used to sit (`AIQ-DD-6`).
- It injects **both** `BilateralAiService` (job polling, gated on the per-browser hint key
  `prms.bilateral-ai.has-active-jobs` — zero requests for a user who never submitted, `AIQ-R-8` C)
  and `AiProcessesDrawerLauncherService` (`ai-processes-drawer/`, `AIQ-T-8` forward pointer): the
  launcher's `effect()` is what turns `BilateralAiService.drawerOpen()` into an actually-opened
  dialog, so `?job=` deep links, the sticky-toast **View** action and the header trigger's
  **Open AI processes** action all need this component mounted to do anything on a non-bilateral
  route.
- Never call `BilateralAiService.openDrawer()` from an `effect()` — see the launcher's own docstring
  for why (it polls; re-entrancy risk). This component has no effects of its own to worry about.

## Data flow
- No data flows through this component. `BilateralAiService.jobs()`/`summary()`/`drawerOpen()` are
  read by the drawer host and trigger (`ai-processes-drawer/`, `ai-processes-trigger/`), never here.

## Gotchas
- **Jest cannot prove app-wide instantiation with a mocked `BilateralAiService`** — a mock proves
  nothing about whether injecting it actually happened for the right reason. The spec provides the
  REAL service with `HttpClient` mocked via `HttpTestingController`, and asserts the request count
  the hint key predicts (one with it set, zero without).
- The component's own render output is always empty (`template: ''`) — do not add markup here; a
  headless mount that starts painting DOM is a sign the drawer/trigger should own that instead.

**Verified:** 2026-09-29 · branch JuanGuzman-io/p2-3853-jira-understanding · 3d62eb87b
