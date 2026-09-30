# ai-processes-trigger

**What this owns:** `app-ai-processes-trigger` (`AIQ-T-9`, `AIQ-R-10`) — the header button that
replaced the retired per-Center "AI job running" chip. One component, mounted three times by
`bilateral-page-header` (identity row < 640px, nav end ≥ 640px, `pageTitle`/create-wizard branch).

## Invariants
- **No inputs.** It injects `BilateralAiService` directly instead — the three mount sites have
  nothing Center-specific to pass it, and `AIQ-R-10` A requires the trigger NOT depend on the
  Center the job was started from. All three instances read the same app-wide service state.
- **State precedence: `working` beats `done`.** `activeCount() > 0` (running + waiting) always wins
  over `unseenCount() > 0` — a user cannot see "done" styling while another job of theirs is still
  live, even if an earlier job finished unseen in the same session.
- **Badge count differs from the aria-label breakdown.** The visible badge is one number
  (`activeCount` while working, `unseenCount` while done); the accessible name splits `working`
  into "`N` running, `M` waiting" (`AIQ-R-10` C) — building the badge from the aria string (or vice
  versa) would silently drop one of the two numbers.
- **No timer.** Elapsed time lives only in the open drawer (`ai-processes-drawer-host`'s own 1s
  tick, `AIQ-DD-9`) — this component holds no `setInterval`.
- **Below 640px only the icon + badge show.** The word "AI processes" is `hidden min-[640px]:inline`
  because in the create-wizard title slot it overlapped the page title at 375px (measured in Chrome,
  2026-09-29). The accessible name is unaffected: it comes from `aria-label`, not the visible text.
- Clicking calls `BilateralAiService.openDrawer()` only — never `HlmDialogService` directly. Opening
  the dialog shell is `AiProcessesDrawerLauncherService`'s job (`AIQ-T-8`), reacting to
  `drawerOpen()`; this component does not know that service exists.

## Data flow
- `runningCount`/`waitingCount` are computed straight off `service.jobs()` by `status`
  (`PROCESSING`/`PENDING`) — not off `service.summary()`, which is lane occupancy across ALL users,
  a different number.
- `unseenFinishedIds` is cleared by `BilateralAiService.openDrawer()` itself (`AIQ-T-5`), not by
  this component — clicking the trigger is what triggers the clear, but the clearing logic lives in
  the service.

## Gotchas
- Three simultaneous instances (mobile + desktop + wizard slots) all read the same signals and
  re-render independently on every state change — cheap (`OnPush`, plain `computed()`), but don't
  assume "the trigger" is a singleton component instance; it's a singleton service with three views.

**Verified:** 2026-09-29 · JuanGuzman-io/p2-3853-jira-understanding · e4c755a00 (+ mobile label)
