import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AiProcessesDrawerComponent } from './ai-processes-drawer.component';
import { BilateralAiService } from '../../services/bilateral-ai.service';
import { BilateralContextService } from '../../services/bilateral-context.service';
import { BilateralAiExpectations, BilateralAiMixClass, NormalizedBilateralAiListJob } from '../../bilateral-ai-job.model';
import { AI_QUEUE_PROJECT_QUERY_PARAM, AI_QUEUE_WAY_QUERY_PARAM } from '../../bilateral-query-params';

/** Both mixes the expectations endpoint understands (`design.md` §6.2) — fetched once each, on
 * construction, regardless of which mixes are present in `jobs()` right now: a job can appear in
 * ANY mix at any later poll, and the underlying `expectations(mix)` call is cached (`shareReplay(1)`
 * in `BilateralAiService`), so eagerly fetching both costs at most 2 requests for the drawer's
 * whole lifetime. */
const AI_QUEUE_MIXES: readonly BilateralAiMixClass[] = ['documents', 'audio'];

/**
 * `ai-processes-drawer-host` (`AIQ-T-8`, `AIQ-DD-7` wrapper) — the DD-7 "no-input wrapper" the
 * launcher (`ai-processes-drawer-launcher.service.ts`) opens through `HlmDialogService.open()`.
 * Declares NO `@Input()` of its own (`HlmDialogContent`'s `NgComponentOutlet` cannot set one — see
 * `ai-processes-drawer.component.ts`'s header comment); instead it injects `BilateralAiService`
 * directly and binds every `AiProcessesDrawerComponent` input from it in its own template.
 *
 * `host: { class: 'contents' }` is load-bearing (P-18 CT probe, `ai-processes-drawer.cy.ts`):
 * Angular custom elements default to `display: inline` with no CSS, which silently breaks the
 * height chain from `hlm-dialog-content`'s `h-dvh` down to the presentational drawer's `h-full` —
 * without it the panel renders at content height instead of full height.
 */
@Component({
  selector: 'app-ai-processes-drawer-host',
  imports: [AiProcessesDrawerComponent],
  host: { class: 'contents' },
  template: `
    <app-ai-processes-drawer
      [jobs]="service.jobs()"
      [summary]="service.summary()"
      [highlightJobId]="service.highlightJobId()"
      [loading]="loading()"
      [refreshError]="refreshError()"
      [now]="now()"
      [expectations]="expectations()"
      (retryJob)="onRetryJob($event)"
      (uploadDifferentFiles)="onUploadDifferentFiles($event)"
      (viewDrafts)="onViewDrafts($event)"
      (reportManually)="onReportManually($event)"
      (startWithEvidence)="onStartWithEvidence()"
      (closed)="onClosed()" />
  `,
})
export class AiProcessesDrawerHostComponent implements OnDestroy {
  readonly service = inject(BilateralAiService);
  private readonly ctx = inject(BilateralContextService);
  private readonly router = inject(Router);

  /** `AIQ-R-9` G: skeleton until the first `pollList()` attempt (success or failure) settles. */
  readonly loading = computed(() => !this.service.hasPolledOnce());
  /** `AIQ-R-9` G: the "Couldn't refresh. Retrying…" notice — only once a previous poll already
   * populated the list; a failed FIRST poll reads as the empty state instead. */
  readonly refreshError = computed(() => this.service.lastPollFailed() && this.service.jobs().length > 0);

  /** `AIQ-R-9` B: the per-mix expected range (`GET center/ai/expectations`, `APF-R-6` D) —
   * `BilateralAiService.expectations(mix)` exists and is called here; attempt 2 built this signal
   * but never subscribed, so every running card silently fell back to the generic copy. */
  readonly expectations = signal<Partial<Record<BilateralAiMixClass, BilateralAiExpectations>>>({});

  /** Elapsed-time tick (`AIQ-DD-9`: "elapsed times live only in the open drawer") — owned here,
   * only while this wrapper (and so the dialog) exists, never by the presentational drawer/card. */
  readonly now = signal(Date.now());
  private readonly tickId = setInterval(() => this.now.set(Date.now()), 1_000);

  constructor() {
    for (const mix of AI_QUEUE_MIXES) {
      this.service.expectations(mix).subscribe(expectation => {
        this.expectations.update(current => ({ ...current, [mix]: expectation }));
      });
    }
  }

  ngOnDestroy(): void {
    clearInterval(this.tickId);
  }

  onRetryJob(jobId: string): void {
    this.service.retryJob(jobId);
  }

  /** `AIQ-R-9` D: "opens the creator's AI way for that project" — `way: 'ai'` so the creator (which
   * reads `?project=`/`?way=` in the same branch as `?job=`) both preselects the project AND
   * activates the AI way, not just the project (attempt 2's gap).
   *
   * Every action here that navigates ALSO closes the drawer (`drawerOpen.set(false)`) — otherwise
   * the CDK dialog is left open over the page it just routed to (post-execution bug fix,
   * P2-3853). The launcher (`ai-processes-drawer-launcher.service.ts`) reacts to `drawerOpen()`
   * and closes the dialog ref; this component never calls `openDrawer`/the launcher directly. */
  onUploadDifferentFiles(job: NormalizedBilateralAiListJob): void {
    if (!job.centerAcronym) return;
    this.service.drawerOpen.set(false);
    void this.router.navigate(['/bilateral', job.centerAcronym, 'create'], {
      queryParams: { [AI_QUEUE_PROJECT_QUERY_PARAM]: job.projectId, [AI_QUEUE_WAY_QUERY_PARAM]: 'ai' },
    });
  }

  onViewDrafts(job: NormalizedBilateralAiListJob): void {
    if (!job.centerAcronym) return;
    this.service.loadAllDrafts();
    this.service.drawerOpen.set(false);
    void this.router.navigate(['/bilateral', job.centerAcronym, 'drafts'], { queryParams: { job: job.jobId } });
  }

  onReportManually(job: NormalizedBilateralAiListJob): void {
    if (!job.centerAcronym) return;
    this.service.drawerOpen.set(false);
    void this.router.navigate(['/bilateral', job.centerAcronym, 'create'], {
      queryParams: { [AI_QUEUE_PROJECT_QUERY_PARAM]: job.projectId, [AI_QUEUE_WAY_QUERY_PARAM]: 'manual' },
    });
  }

  /** No specific job to return to — sends the user to the CURRENT center's creator (`ctx`, the
   * page the drawer was opened from), unlike the per-job actions above which always use the JOB's
   * own center (a job can belong to a different center than the page currently open). */
  onStartWithEvidence(): void {
    const acronym = this.ctx.centerAcronym();
    if (!acronym) return;
    this.service.drawerOpen.set(false);
    void this.router.navigate(['/bilateral', acronym, 'create']);
  }

  onClosed(): void {
    this.service.drawerOpen.set(false);
  }
}
