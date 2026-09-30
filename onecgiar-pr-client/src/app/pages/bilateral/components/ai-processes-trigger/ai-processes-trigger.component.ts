import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { BilateralAiService } from '../../services/bilateral-ai.service';
import { BILATERAL_AI_PROCESSES_COPY as COPY } from '../../../../internationalization/bilateral-ai-processes.copy';

export type AiProcessesTriggerState = 'idle' | 'working' | 'done';

/**
 * `ai-processes-trigger` (`AIQ-T-9`, `design.md` §6.2/§6.3, `AIQ-R-10`) — the header button that
 * replaces the retired per-Center "AI job running" chip in all three header slots. Self-contained
 * on purpose: it injects `BilateralAiService` directly (same pattern the host header already uses
 * for `draftCountDisplay()`) rather than taking inputs, because the SAME instance is mounted three
 * times in `bilateral-page-header` (identity row, nav end, `pageTitle` branch) and none of those
 * call sites have anything Center-specific to pass it — `AIQ-R-10` A requires it NOT depend on the
 * Center the job was started from.
 *
 * No timer of its own: elapsed time lives only in the open drawer (`AIQ-DD-9`). Clicking always
 * calls `openDrawer()` — never `HlmDialogService` directly, that is `ai-processes-drawer-launcher`'s
 * job (`AIQ-T-8`).
 */
@Component({
  selector: 'app-ai-processes-trigger',
  standalone: true,
  templateUrl: './ai-processes-trigger.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiProcessesTriggerComponent {
  private readonly service = inject(BilateralAiService);
  readonly copy = COPY.trigger;

  /** `PROCESSING` jobs — the "running" half of the accessible name (`AIQ-R-10` C). */
  readonly runningCount = computed(() => this.service.jobs().filter(job => job.status === 'PROCESSING').length);
  /** `PENDING` jobs — the "waiting" half of the accessible name. */
  readonly waitingCount = computed(() => this.service.jobs().filter(job => job.status === 'PENDING').length);
  /** Badge in the `working` state (`AIQ-R-10` B: "badge = active count"). */
  readonly activeCount = computed(() => this.runningCount() + this.waitingCount());
  /** Badge in the `done` state — cleared by `BilateralAiService.openDrawer()` on click. */
  readonly unseenCount = computed(() => this.service.unseenFinishedIds().size);

  readonly state = computed<AiProcessesTriggerState>(() => {
    if (this.activeCount() > 0) return 'working';
    if (this.unseenCount() > 0) return 'done';
    return 'idle';
  });

  readonly badgeCount = computed(() => {
    switch (this.state()) {
      case 'working':
        return this.activeCount();
      case 'done':
        return this.unseenCount();
      default:
        return 0;
    }
  });

  /** `AIQ-R-10` C: the accessible name always includes the counts once there are any. */
  readonly ariaLabel = computed(() => {
    switch (this.state()) {
      case 'working':
        return this.copy.ariaWorking(this.runningCount(), this.waitingCount());
      case 'done':
        return this.copy.ariaDone(this.unseenCount());
      default:
        return this.copy.ariaIdle;
    }
  });

  readonly isExpanded = computed(() => this.service.drawerOpen());

  /** Opens the drawer (`AiProcessesDrawerLauncherService` reacts to `drawerOpen()`) and marks any
   * unseen finished jobs seen — `BilateralAiService.openDrawer()` already clears
   * `unseenFinishedIds` (`AIQ-T-5`), so nothing else is required here. */
  open(): void {
    this.service.openDrawer();
  }
}
