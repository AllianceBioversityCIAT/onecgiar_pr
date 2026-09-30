import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { AiJobCardComponent, mixClassFromCounts } from '../ai-job-card/ai-job-card.component';
import { BilateralAiExpectations, BilateralAiMixClass, NormalizedBilateralAiListJob, waitReasonCopy } from '../../bilateral-ai-job.model';
import { BILATERAL_AI_PROCESSES_COPY as COPY } from '../../../../internationalization/bilateral-ai-processes.copy';

/**
 * `ai-processes-drawer` (`AIQ-T-8`, `design.md` §6.2/§6.3/§6.5, `AIQ-R-9`, `AIQ-R-12`) —
 * presentational, input-driven content for the "AI processes" dialog (`AIQ-DD-7`). The host
 * (`ai-processes-drawer-host.component.ts`, the DD-7 wrapper) supplies `jobs()`/`summary()` from
 * `BilateralAiService`, but NOT by opening `AiProcessesDrawerComponent` (or a `TemplateRef`)
 * directly through `HlmDialogService.open()` — two measured limitations of `HlmDialogContent`
 * (`ai-processes-drawer.cy.ts`'s P-18 probe): (1) its `NgComponentOutlet` binds no
 * `ngComponentOutletInputs`, so an opened component can never receive an `input.required()` like
 * `jobs` (confirmed against every existing `HlmDialogService.open(ComponentType)` caller in this
 * repo — none has an `input()`); (2) passing a `TemplateRef` as the first argument — technically
 * allowed by the method's TYPE signature — throws at runtime, because the template is ALSO routed
 * through that same `NgComponentOutlet` branch rather than `ngTemplateOutlet`. The host therefore
 * opens a small wrapper component with NO external inputs of its own (injects `BilateralAiService`,
 * statically binds `[jobs]="service.jobs()"` in ITS OWN template) via
 * `HlmDialogService.open(AiProcessesDrawerHostComponent, { contentClass:
 * AI_PROCESSES_DRAWER_SHEET_CLASS, showCloseButton: false, closeOnOutsidePointerEvents: true,
 * ariaLabelledBy: 'ai-processes-drawer-title' })` — see that constant's doc comment for the
 * geometry measurement this shell rests on. That wrapper's own host MUST be `display: contents`
 * (`host: { class: 'contents' }`) — Angular custom elements default to `display: inline` with no
 * CSS of their own, which silently breaks the height chain from `hlm-dialog-content`'s `h-dvh` down
 * to this component's `h-full` (measured: the panel rendered at content height, ~511px, instead of
 * full height, until the wrapper was given `display: contents`).
 *
 * **P-18 CONFIRMED** (`ai-processes-drawer.cy.ts`, real Chromium/Electron + CDK, 2026-09-29):
 * `HlmDialogService.open` with `AI_PROCESSES_DRAWER_SHEET_CLASS` produces a right-anchored,
 * full-height, 520px panel at 1280px and a full-screen sheet at 375px, with CDK's real focus trap
 * (Tab/Shift+Tab wrap), `Esc`-to-close, scrim-click-to-close and focus-restore-to-trigger all
 * working — no quality-assessment shell fallback needed for `AIQ-DD-7`, and no second, hand-rolled
 * trap in this component (attempt 1 shipped one; a11y review correctly called it out as the exact
 * "fifth copy" `AIQ-DD-7` said to skip once P-18 passed, and it visually collided with
 * `HlmDialogContent`'s own default close button since neither the launcher nor this component ever
 * turned it off). This component owns NO focus/keyboard handling and NO `role`/`aria-modal`/
 * `aria-labelledby` of its own — CDK's dialog container is the ONE dialog assistive tech reaches,
 * named via the launcher's `ariaLabelledBy` option pointing at `#ai-processes-drawer-title` below.
 * The Jest limit this leaves (CDK's real trap cannot be exercised under the `@spartan-ng/brain`
 * mock, `tests/mocks/spartanBrainMock.ts`) is accepted and covered instead by the CT probe.
 */

type JobGroup = 'running' | 'waiting' | 'finished';

function groupOf(job: NormalizedBilateralAiListJob): JobGroup {
  if (job.status === 'PROCESSING') return 'running';
  if (job.status === 'PENDING') return 'waiting';
  return 'finished';
}

@Component({
  selector: 'app-ai-processes-drawer',
  imports: [AiJobCardComponent],
  templateUrl: './ai-processes-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full min-h-0 flex-col' },
})
export class AiProcessesDrawerComponent {
  readonly jobs = input.required<NormalizedBilateralAiListJob[]>();
  readonly summary = input<{ lanesTotal: number; lanesBusy: number; othersWaiting: number } | null>(null);
  readonly highlightJobId = input<string | null>(null);
  /** `AIQ-R-9` G: the first list request is in flight. */
  readonly loading = input(false);
  /** `AIQ-R-9` G: a poll failed but the last known list is kept on screen. */
  readonly refreshError = input(false);
  /** Tick supplied by the host, 1 s, only while this drawer is open (`AIQ-DD-9`: no timer here). */
  readonly now = input<number>(Date.now());
  /** Per-mix expected range (`GET center/ai/expectations`, `APF-R-6` D) — `null`/missing → fallback copy. */
  readonly expectations = input<Partial<Record<BilateralAiMixClass, BilateralAiExpectations>>>({});

  readonly retryJob = output<string>();
  readonly uploadDifferentFiles = output<NormalizedBilateralAiListJob>();
  readonly viewDrafts = output<NormalizedBilateralAiListJob>();
  readonly reportManually = output<NormalizedBilateralAiListJob>();
  readonly startWithEvidence = output<void>();
  readonly closed = output<void>();

  readonly copy = COPY.drawer;

  readonly runningJobs = computed(() => this.jobs().filter(j => j.status === 'PROCESSING'));
  readonly waitingJobs = computed(() => this.jobs().filter(j => j.status === 'PENDING'));
  readonly finishedJobs = computed(() => this.jobs().filter(j => j.status === 'COMPLETED' || j.status === 'FAILED'));

  readonly isEmpty = computed(() => !this.loading() && this.jobs().length === 0);

  /** `AIQ-R-9` C: the fuller "Starts when your job for <project> finishes" needs the OTHER job's
   * name — the per-user cap is 1 concurrent job, so the first running job is that job. */
  readonly ownRunningProjectName = computed(() => this.runningJobs()[0]?.projectName ?? null);

  readonly lanesInUseLine = computed(() => {
    const s = this.summary();
    return this.copy.lanesInUse(s?.lanesBusy ?? 0, s?.lanesTotal ?? 0);
  });
  readonly othersWaitingLine = computed(() => this.copy.othersWaiting(this.summary()?.othersWaiting ?? 0));

  /** Lane bars for the strip (`AIQ-R-9` A, mockup `.lane`/`.lane.busy`) — one per lane, first
   * `lanesBusy` marked busy (indeterminate sliding fill), the rest idle. */
  readonly laneBars = computed<('busy' | 'idle')[]>(() => {
    const s = this.summary();
    if (!s || s.lanesTotal <= 0) return [];
    return Array.from({ length: s.lanesTotal }, (_, i) => (i < s.lanesBusy ? 'busy' : 'idle'));
  });

  /** `AIQ-R-9` H: a polite live region announces a job moving between groups. */
  readonly announcement = signal('');
  private previousGroupById = new Map<string, JobGroup>();

  constructor() {
    effect(() => {
      const jobs = this.jobs();
      const messages: string[] = [];
      for (const job of jobs) {
        const previous = this.previousGroupById.get(job.jobId);
        const current = groupOf(job);
        if (previous && previous !== current) {
          const label = job.projectName || job.programCode || job.jobId;
          messages.push(this.copy.movedTo(label, this.groupLabel(current)));
        }
      }
      this.previousGroupById = new Map(jobs.map(job => [job.jobId, groupOf(job)]));
      if (messages.length > 0) this.announcement.set(messages.join(' '));
    });
  }

  private groupLabel(group: JobGroup): string {
    if (group === 'running') return this.copy.groupRunning;
    if (group === 'waiting') return this.copy.groupWaiting;
    return this.copy.groupFinished;
  }

  expectationFor(job: NormalizedBilateralAiListJob): BilateralAiExpectations | null {
    return this.expectations()[mixClassFromCounts(job)] ?? null;
  }

  /** `AIQ-R-9` C — calls the model's `waitReasonCopy` rather than duplicating its logic (attempt 2
   * fix: attempt 1's card copied this switch inline, so the `projectName` param it added was only
   * ever exercised by tests). */
  waitReasonTextFor(job: NormalizedBilateralAiListJob): string {
    const projectName = job.waitReason === 'own_job_running' ? this.ownRunningProjectName() : null;
    return waitReasonCopy(job.waitReason, projectName);
  }

  onRetry(job: NormalizedBilateralAiListJob): void {
    this.retryJob.emit(job.jobId);
  }

  onUploadDifferentFiles(job: NormalizedBilateralAiListJob): void {
    this.uploadDifferentFiles.emit(job);
  }

  onViewDrafts(job: NormalizedBilateralAiListJob): void {
    this.viewDrafts.emit(job);
  }

  onReportManually(job: NormalizedBilateralAiListJob): void {
    this.reportManually.emit(job);
  }

  onStartWithEvidence(): void {
    this.startWithEvidence.emit();
  }

  onClose(): void {
    this.closed.emit();
  }
}

/**
 * `AIQ-T-8` First step / P-18: `HlmDialogContent`'s base classes (`hlm-dialog-content.ts`) center
 * the panel (`relative mx-auto w-full max-w-[calc(100%-2rem)] sm:max-w-md grid gap-6 p-6
 * rounded-xl`) — `contentClass` is merged over them with `tailwind-merge` (`classes()` in
 * `@spartan/utils`, later source wins per conflicting utility group), so `fixed`/`inset-y-0`/
 * `right-0` replace `relative`'s positioning entirely (a `position: fixed` element establishes its
 * own containing block against the viewport, ignoring the overlay's centering flex wrapper) and
 * `sm:w-[520px]` replaces `sm:max-w-md`. Measured in `ai-processes-drawer.cy.ts` (P-18 probe) —
 * see that file and the task report for the recorded outcome and the DD-7 decision it produced.
 * Widened from 440px to 520px post-execution (user decision, testing pass) — knowingly overrides
 * `AIQ-R-12` B's 440px; `max-w-[520px]` keeps the same viewport guard.
 */
export const AI_PROCESSES_DRAWER_SHEET_CLASS =
  'fixed! inset-y-0! right-0! left-auto! top-0! bottom-0! m-0! h-dvh! w-full! sm:w-[520px]! max-w-full! sm:max-w-[520px]! rounded-none! p-0! flex! flex-col! gap-0!';
