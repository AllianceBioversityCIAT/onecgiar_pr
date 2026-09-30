import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BilateralAiService } from '../../services/bilateral-ai.service';
import { AiProcessesDrawerLauncherService } from '../ai-processes-drawer/ai-processes-drawer-launcher.service';

/**
 * Headless, app-wide mount point (`AIQ-T-10`, `design.md` §6.2, `AIQ-DD-6`/`AIQ-DD-8`).
 *
 * Renders nothing. Its whole job is DI: `BilateralAiService` and `AiProcessesDrawerLauncherService`
 * are both `providedIn: 'root'`, so a `providedIn: 'root'` service's constructor — and its own
 * `effect()`s — never runs until SOMETHING injects it (Angular does not eagerly instantiate root
 * services). Before this task, the only thing that ever injected `BilateralAiService` app-wide was
 * the now-retired completion dialog (`BilateralAiCompletionDialogComponent`, `AIQ-DD-6`), mounted
 * once in `app.component.html`; retiring it without replacing its mount would have silently killed
 * job polling on every route except the bilateral pages themselves (`AIQ-R-11` A "must work on any
 * route").
 *
 * This component replaces that mount, one-for-one, and ALSO injects
 * `AiProcessesDrawerLauncherService` (forward pointer recorded in `ai-processes-drawer/CLAUDE.md`
 * from `AIQ-T-8`): that service's `effect()` opens/closes the "AI processes" dialog by reacting to
 * `BilateralAiService.drawerOpen()`, and without an app-wide injector for it too, `?job=` deep
 * links, the sticky-toast **View** action and the trigger's **Open AI processes** action would flip
 * `drawerOpen()` with nothing listening.
 *
 * `BilateralAiService` itself decides whether to actually poll: its constructor only calls
 * `ensurePolling()` when the per-browser hint key (`prms.bilateral-ai.has-active-jobs`) is set (or a
 * legacy single-job record is found) — a user who never submitted an AI job makes zero extra
 * requests on any route (`AIQ-R-8` C).
 *
 * Never call `BilateralAiService.openDrawer()` from an `effect()` here — that method polls, and an
 * effect that both reads and re-triggers `drawerOpen`-adjacent state risks re-entrancy. This
 * component only injects; it has no logic of its own.
 */
@Component({
  selector: 'app-bilateral-ai-job-watcher',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BilateralAiJobWatcherComponent {
  private readonly bilateralAiSE = inject(BilateralAiService);
  private readonly aiProcessesDrawerLauncherSE = inject(AiProcessesDrawerLauncherService);
}
