# ai-processes-drawer

**What this owns:** three files, one dialog. `ai-processes-drawer.component.ts` is the "AI
processes" dialog CONTENT (`AIQ-T-8`, `AIQ-R-9`, `AIQ-R-12`) — presentational, `OnPush`,
input-driven, no service/router of its own. `ai-processes-drawer-host.component.ts` is the `AIQ-DD-7`
**wrapper**: no inputs, injects `BilateralAiService`, feeds the presentational drawer, wires its
outputs to navigation. `ai-processes-drawer-launcher.service.ts` is the `AIQ-DD-7` **launcher**: an
injectable that opens/closes the dialog by reacting to `BilateralAiService.drawerOpen()`.

## For AIQ-T-9 / AIQ-T-10 (how to use this folder)
- **T-9's trigger** calls `BilateralAiService.openDrawer()` (unchanged, already does this) — that
  flips `drawerOpen()` to `true`, which `AiProcessesDrawerLauncherService`'s effect reacts to. T-9
  needs nothing else from this folder.
- **T-10** must get `AiProcessesDrawerLauncherService` INSTANTIATED app-wide (a `providedIn: 'root'`
  service's constructor — and so its `effect()` — never runs until something injects it). Inject it
  once, e.g. as a constructor param of `app-bilateral-ai-job-watcher` at the same headless mount
  point that component already owns, so the effect listens on every route. **This task (`AIQ-T-8`)
  deliberately does NOT edit `app.component`/`app.module`/the header** (Leader adjudication) — that
  wiring is T-10's.

## Invariants
- Groups are derived from `jobs()` by `status` alone (`PROCESSING`→running, `PENDING`→waiting,
  `COMPLETED`/`FAILED`→finished); an empty group's whole `<section>` is omitted, never rendered
  empty (`AIQ-R-9` group header text).
- `ownRunningProjectName()` assumes at most one concurrently running job per user (the per-user cap,
  `BILATERAL_AI_MAX_PER_USER` default 1) — if that cap ever changes, this "first running job" read
  needs to become an explicit owner match instead.
- The live-region `announcement()` only fires on a GROUP change between two `jobs()` values (tracked
  via `previousGroupById`), never on every re-render — a job re-rendered in the same group produces
  no announcement. Text comes from `COPY.drawer.movedTo`, not an inline template literal.
- `AI_PROCESSES_DRAWER_SHEET_CLASS` and `AI_PROCESSES_DRAWER_DIALOG_OPTIONS` (the latter exported
  from the LAUNCHER) are the single source of truth for how this dialog opens — the CT probe
  (`ai-processes-drawer.cy.ts`) imports both rather than duplicating them, so the measured
  configuration and the shipped configuration can never drift.
- `waitReasonTextFor(job)` on the drawer CALLS `bilateral-ai-job.model.ts`'s `waitReasonCopy(reason,
  projectName)` — it does not re-implement that switch. The card only ever renders the string it is
  given (`waitReasonText` input).

## Data flow
- `expectationFor(job)` keys into the `expectations` input by `mixClassFromCounts(job)` (imported
  from `ai-job-card`, not duplicated) — missing entry renders the card's own fallback copy.
- Every action on the presentational drawer (`retryJob`, `uploadDifferentFiles`, `viewDrafts`,
  `reportManually`, `startWithEvidence`, `closed`) is an output; IT calls no service and no router.
  `ai-processes-drawer-host.component.ts` is what wires them: `retryJob` → `service.retryJob()`;
  `viewDrafts`/`uploadDifferentFiles`/`reportManually` → `Router.navigate(['/bilateral',
  job.centerAcronym, …])` using the JOB's OWN center (a job can belong to a different center than
  the page the drawer was opened from); `startWithEvidence` → the CURRENT `BilateralContextService`
  center (there is no job to read a center from); `closed` → `service.drawerOpen.set(false)`.
- The host owns the 1s elapsed-time tick (`now`, `AIQ-DD-9`: "elapsed times live only in the open
  drawer") via a plain `setInterval` cleared in `ngOnDestroy` — never a service-level timer.
- `BilateralAiService.hasPolledOnce`/`lastPollFailed` (added for this wrapper) drive
  `loading()`/`refreshError()`: skeleton until the first poll ever settles; the "Couldn't refresh"
  notice only once a previous poll had already populated `jobs()` — a failed FIRST poll reads as the
  empty state instead, not the refresh-error notice.

## Gotchas
- **This component owns NO focus-trap/Escape/backdrop logic** (attempt 1 shipped a hand-rolled
  `onTabKey`/`ngOnDestroy`-restore trap on top of CDK's own — a11y review correctly called this the
  exact "fifth copy" `AIQ-DD-7` said to skip once P-18 passed, and it visually doubled
  `HlmDialogContent`'s default close button since nothing turned it off). CDK's real trap is the ONE
  mechanism, exercised only by the CT probe — `@spartan-ng/brain` is a no-op stub under Jest
  (`tests/mocks/spartanBrainMock.ts`), so there is nothing to assert on in this folder's Jest specs
  for focus/Escape/restore. That is an accepted, documented Jest limit, not a gap to work around with
  a second trap.
- **This component has NO `role`/`aria-modal`/`aria-labelledby` of its own** (attempt 1 had them —
  a11y review found the id they pointed at was never wired to anything Brain reads, so the dialog
  assistive tech actually reaches — CDK's container — had NO accessible name; the component's own
  attributes were a second, inert "dialog" nested inside the real one). The launcher's
  `ariaLabelledBy: 'ai-processes-drawer-title'` option is what names the REAL dialog now.
- **P-18 CONFIRMED** (2026-09-29, real Chromium/Electron CT, `ai-processes-drawer.cy.ts`):
  `HlmDialogService.open(WrapperComponent, AI_PROCESSES_DRAWER_DIALOG_OPTIONS)` produces the
  right-anchored/full-height/520px/full-screen-below-640px geometry, a real CDK focus trap with
  Tab/Shift+Tab wrap, `Esc` close, scrim-click close, focus restore, and a named dialog. No
  quality-assessment shell fallback needed. Widened 440px → 520px post-execution (user decision,
  testing pass, 2026-09-29) — knowingly overrides `AIQ-R-12` B's 440px; `requirements.md`/`design.md`
  intentionally not edited, the deviation is the Leader's to record.
- `HlmDialogService.open()` cannot pass `@Input()`s to the opened component (`NgComponentOutlet`
  binds no `ngComponentOutletInputs`) and cannot open a raw `TemplateRef` either (its TYPE signature
  allows one, but the implementation routes it through the SAME `NgComponentOutlet` branch, which
  throws at runtime for a `TemplateRef`) — both measured in the probe. `ai-processes-drawer-host` is
  that required wrapper.
- The wrapper's own host MUST be `display: contents` (`host: { class: 'contents' }`). Angular custom
  elements default to `display: inline` with no CSS — without `contents`, the wrapper breaks the
  height chain from `hlm-dialog-content`'s `h-dvh` down to the drawer's `h-full`, and the panel
  silently renders at content height (~511px) instead of full height. Measured the hard way in the
  probe before the fix.
- The indeterminate sliding fill (running card's active segment, busy lane bars) uses one shared
  `@keyframes pr-ai-indeterminate` in `src/styles/transitions.scss` (globally loaded), referenced via
  Tailwind arbitrary `animate-[pr-ai-indeterminate_…]` — not redeclared per component.
- **The wrapper MUST subscribe to `service.expectations(mix)`, not just declare the signal**
  (attempt 2 built `expectations` but never called `.subscribe()`, so every running card silently
  fell back to the generic copy — `AIQ-R-9` B). Fixed by subscribing to BOTH mixes on construction;
  `expectations(mix)` is `shareReplay(1)`, so this costs at most 2 requests for the wrapper's whole
  lifetime regardless of which mixes `jobs()` actually contains.
- **The launcher's `closed$` subscription MUST compare `this.currentRef === ref` before nulling
  it** (a11y-lens advisory, attempt 3). Closing via the drawer's own button sets `drawerOpen(false)`
  synchronously (nulling `currentRef` right away); the real CDK `closed$` for that same ref fires
  LATER. A fast re-open in between makes `currentRef` point at a NEW ref by the time the late
  `closed$` arrives — without the identity check that stale callback nulls the new ref and sets
  `drawerOpen(false)` while the new dialog is still open.
- `bilateral-result-creator` now reads `?project=`/`?way=` from THIS folder's "Upload different
  files"/"Report manually" navigation (`AIQ-R-9` D) — see that folder's own `CLAUDE.md` for how it
  resolves the project and sets the way. The query-param names/parsers live in
  `bilateral-query-params.ts` (`AI_QUEUE_PROJECT_QUERY_PARAM`/`AI_QUEUE_WAY_QUERY_PARAM`), not
  duplicated here.

**Verified:** 2026-09-29 · JuanGuzman-io/p2-3853-jira-understanding · widened drawer to 520px
