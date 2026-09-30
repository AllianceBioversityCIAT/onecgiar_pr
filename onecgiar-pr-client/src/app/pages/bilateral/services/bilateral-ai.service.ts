import { Injectable, signal, computed, inject, effect, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { Router } from '@angular/router';
import { PrToastService } from '../../../shared/components/pr-toast/pr-toast.service';
import { BilateralApiService } from '../../../shared/services/api/bilateral-api.service';
import { ResultsApiService } from '../../../shared/services/api/results-api.service';
import { BilateralContextService } from './bilateral-context.service';
import { BilateralCreationService } from './bilateral-creation.service';
import { BilateralAiDraft, BilateralAiJobStatus, BilateralAiUploadState } from './bilateral-ai.interfaces';
import {
  BilateralAiExpectations,
  BilateralAiMixClass,
  NormalizedBilateralAiListJob,
  RawBilateralAiListJob,
  errorCopy,
  normalizeListJob,
} from '../bilateral-ai-job.model';
import { ReportingApiResponse } from '../../../shared/interfaces/reporting-api.response';

/** First 2 minutes: poll every 5 s — the user is staring at the screen (`APF-R-7`). */
const POLL_INTERVAL_INITIAL = 5_000;
/** From 2 minutes until the ceiling: poll every 15 s (`APF-R-7`). */
const POLL_INTERVAL_MID = 15_000;
/** Past the ceiling: poll every 30 s (`APF-R-7`). */
const POLL_INTERVAL_CEILING = 30_000;
const ADAPTIVE_SWITCH_MS = 120_000;
/** 30 minutes — the second cadence breakpoint (`APF-R-7`: 5 s → 15 s → 30 s). */
const CEILING_MS = 1_800_000;

/**
 * `AIQ-R-8` C: set on submit, cleared once a poll finds no active job. Its mere presence is what
 * lets a fresh tab (reload, second tab) know to start polling before the first list response has
 * landed.
 */
const HAS_ACTIVE_JOBS_KEY = 'prms.bilateral-ai.has-active-jobs';
/**
 * The single-job record this service used to keep (`APF-T-5`). Read once on construction, its job
 * id kept only for the drawer highlight, then removed (`AIQ-R-8` C) — the list endpoint is now the
 * only source of truth for whether that job is still alive.
 */
const LEGACY_ACTIVE_JOB_KEY = 'prms.bilateral-ai.active-job';

const ACTIVE_STATUSES: ReadonlySet<BilateralAiJobStatus> = new Set(['PENDING', 'PROCESSING']);
const TERMINAL_STATUSES: ReadonlySet<BilateralAiJobStatus> = new Set(['COMPLETED', 'FAILED']);

/**
 * `AIQ-T-5` (`design.md` §6.2): the multi-job list service. One poll fetches every one of the
 * caller's jobs at once (`GET_bilateralAiJobs`, never one request per job) and diffs consecutive
 * polls to raise sticky completion toasts. Single-job members (`currentJob`, `startJob`,
 * `panelVisible`, `completionNotice`, …) are retired — the drawer/card/trigger (`AIQ-T-7..T-9`)
 * read `jobs()`/`summary()` instead.
 */
@Injectable({ providedIn: 'root' })
export class BilateralAiService implements OnDestroy {
  private readonly bilateralApi = inject(BilateralApiService);
  private readonly resultsApi = inject(ResultsApiService);
  private readonly router = inject(Router);
  private readonly messageService = inject(PrToastService);
  private readonly ctx = inject(BilateralContextService);
  private readonly creationService = inject(BilateralCreationService);

  // ── Job list state (`AIQ-R-8`, `AIQ-R-9`, `AIQ-R-11`) ────────────────────

  jobs = signal<NormalizedBilateralAiListJob[]>([]);
  summary = signal<{ lanesTotal: number; lanesBusy: number; othersWaiting: number } | null>(null);
  drawerOpen = signal(false);
  /** The job the drawer should scroll to and highlight once open (`AIQ-R-8` D, deep link/legacy). */
  highlightJobId = signal<string | null>(null);
  /** `AIQ-R-9` G: flips `true` once the first `pollList()` attempt has settled (success OR
   * failure) — the drawer host reads this to know when to stop showing the skeleton. */
  hasPolledOnce = signal(false);
  /** `AIQ-R-9` G: `true` while the MOST RECENT poll failed, cleared on the next success. The
   * drawer host derives its "Couldn't refresh. Retrying…" notice from this AND `jobs().length > 0`
   * — a failure on the very first poll ever (no "last known list" to keep) reads as the empty
   * state instead, not the refresh-error notice; that distinction is the host's, not this flag's. */
  lastPollFailed = signal(false);
  /** Session memory of finished jobs the trigger badge has not been shown yet (`AIQ-R-10` B). */
  unseenFinishedIds = signal<ReadonlySet<string>>(new Set());

  // ── Upload-form-local state (kept; narrowed to the upload's own submission, `AIQ-DD-11`) ────

  draftList = signal<BilateralAiDraft[]>([]);
  currentDraft = signal<BilateralAiDraft | null>(null);
  isDraftListLoaded = signal(false);

  projectNameMap = signal<Record<number, string>>({});
  initiativeNameMap = signal<Record<string, string>>({});
  isPromoting = signal(false);

  uploadState = signal<BilateralAiUploadState>({
    jobId: null,
    status: 'idle',
    uploadProgress: 0,
  });

  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  private currentIntervalMs = POLL_INTERVAL_INITIAL;
  private previousJobsById = new Map<string, NormalizedBilateralAiListJob>();
  private readonly expectationsCache = new Map<BilateralAiMixClass, Observable<BilateralAiExpectations>>();

  draftCount = computed(() => this.draftList().length);
  draftCountDisplay = computed(() => {
    const count = this.draftCount();
    if (count === 0) return '';
    return count > 9 ? '9+' : String(count);
  });

  constructor() {
    // Re-fetch drafts whenever the resolved center changes — covers both the
    // initial page-load race (center context resolves asynchronously after
    // this service's first loadAllDrafts() call) and switching centers
    // mid-session without a full reload.
    effect(() => {
      const centerId = this.ctx.centerInstitutionId();
      if (centerId != null) {
        this.loadAllDrafts();
      }
    });

    const legacyJobId = this.migrateLegacyActiveJob();
    if (legacyJobId) this.highlightJobId.set(legacyJobId);
    if (legacyJobId || this.hasActiveHint()) this.ensurePolling();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  setUploadProgress(progress: number): void {
    this.uploadState.update(s => ({ ...s, uploadProgress: progress }));
  }

  setUploadStatus(status: BilateralAiUploadState['status'], errorMessage?: string): void {
    this.uploadState.update(s => ({ ...s, status, errorMessage }));
  }

  clearUploadState(): void {
    this.uploadState.set({
      jobId: null,
      status: 'idle',
      uploadProgress: 0,
    });
  }

  // ── Drawer / submission entry points ─────────────────────────────────

  /** `AIQ-R-8` D: opens the drawer, optionally highlighting one job, and marks unseen ones seen. */
  openDrawer(jobId?: string): void {
    this.drawerOpen.set(true);
    if (jobId) this.highlightJobId.set(jobId);
    this.unseenFinishedIds.set(new Set());
    this.ensurePolling();
  }

  /**
   * `AIQ-R-7` B: the new job appears in the drawer at once. `response` is
   * `POST_bilateralAiJob`'s own body (`{ jobId, jobStatus }`) — everything else about the job
   * (project, program, source counts…) is filled in by the very next poll, which this call also
   * kicks off immediately.
   */
  addSubmittedJob(response: { jobId?: string; jobStatus?: string } | null | undefined): void {
    const jobId = response?.jobId;
    if (!jobId) return;
    if (this.jobs().some(j => j.jobId === jobId)) return;
    const placeholder = normalizeListJob({
      job_id: jobId,
      status: response?.jobStatus ?? 'PENDING',
      queue_entry_date: new Date().toISOString(),
    } as RawBilateralAiListJob);
    this.jobs.update(list => [placeholder, ...list]);
    // Reviewer fix (AIQ-T-5 attempt 2): the placeholder must also seed `previousJobsById`, or the
    // FIRST real poll that already sees this job terminal (fast failures, ~30 s text jobs under a
    // 30 s cadence) finds `prev === undefined` in `detectTerminalTransitions` and silently drops
    // the toast/unseen-id — exactly the multi-job case `AIQ-R-7` A describes.
    this.previousJobsById.set(jobId, placeholder);
    this.setHasActiveHint();
    this.ensurePolling();
  }

  /**
   * `APF-R-5`/`APF-R-9`: re-enqueues the same stored sources under the same job id — no re-upload,
   * no new job. Disabled while the job is alive is a UI concern (the card), not this method's.
   */
  retryJob(jobId: string): void {
    this.bilateralApi.POST_bilateralAiJobRetry(jobId).subscribe({
      next: () => {
        this.uploadState.set({ jobId, status: 'pending', uploadProgress: 100 });
        this.setHasActiveHint();
        this.ensurePolling();
      },
      error: (err: { status?: number } | null) => {
        if (err?.status === 410) {
          // The stored sources are gone (bucket expiry) — nothing left to retry against; reset the
          // upload form the same way a poll's own 410 used to (`AIQ-R-9` D "Try again … a 410 on
          // retry shows that the files are gone").
          this.uploadState.set({
            jobId: null,
            status: 'idle',
            uploadProgress: 0,
            errorMessage: 'The uploaded sources are no longer available. Please upload them again.',
          });
        } else {
          this.uploadState.update(s => ({ ...s, status: 'failed', errorMessage: 'Could not retry the job. Please try again.' }));
        }
      },
    });
  }

  /**
   * `APF-R-6` D / `APF-R-21`: the expected-duration range for a source mix, cached per mix for the
   * session so the "AI processes" drawer's running cards (`ai-processes-drawer-host`, `AIQ-T-8`)
   * and any other caller share one HTTP call.
   */
  expectations(mix: BilateralAiMixClass): Observable<BilateralAiExpectations> {
    let cached = this.expectationsCache.get(mix);
    if (!cached) {
      cached = this.bilateralApi.GET_bilateralAiJobExpectations(mix).pipe(
        map(({ response }: { response: BilateralAiExpectations }) => response),
        shareReplay(1),
      );
      this.expectationsCache.set(mix, cached);
    }
    return cached;
  }

  // ── Legacy migration + hint storage (`AIQ-R-8` C) ────────────────────

  private migrateLegacyActiveJob(): string | null {
    try {
      const raw = localStorage.getItem(LEGACY_ACTIVE_JOB_KEY);
      localStorage.removeItem(LEGACY_ACTIVE_JOB_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return typeof parsed?.jobId === 'string' ? parsed.jobId : null;
    } catch {
      return null;
    }
  }

  private setHasActiveHint(): void {
    try {
      localStorage.setItem(HAS_ACTIVE_JOBS_KEY, '1');
    } catch {
      // storage unavailable — polling still works for this tab's lifetime
    }
  }

  private clearHasActiveHint(): void {
    try {
      localStorage.removeItem(HAS_ACTIVE_JOBS_KEY);
    } catch {
      // nothing to clear
    }
  }

  private hasActiveHint(): boolean {
    try {
      return localStorage.getItem(HAS_ACTIVE_JOBS_KEY) != null;
    } catch {
      return false;
    }
  }

  // ── Poller (`AIQ-R-8` A/B, `APF-R-7` cadence) ────────────────────────

  /**
   * Reviewer fix (AIQ-T-5 attempt 2): this used to return early when a timer already existed,
   * which left a job just submitted while another one is running waiting up to a whole 15 s/30 s
   * interval for its first poll — contradicting `addSubmittedJob`'s own doc comment ("kicks off
   * immediately") and delaying the cadence drop back to `POLL_INTERVAL_INITIAL` (`AIQ-R-8` A
   * "measured from the most recent active job"). Now it always resets to the initial cadence and
   * polls right away, whether or not a timer was already running.
   */
  private ensurePolling(): void {
    if (this.pollingTimer) clearInterval(this.pollingTimer);
    this.currentIntervalMs = POLL_INTERVAL_INITIAL;
    this.pollingTimer = setInterval(() => this.pollList(), this.currentIntervalMs);
    void this.pollList();
  }

  stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  private async pollList(): Promise<void> {
    try {
      const { response } = (await this.bilateralApi.GET_bilateralAiJobs().toPromise()) as {
        response: {
          jobs: RawBilateralAiListJob[];
          summary: { lanes_total: number; lanes_busy: number; others_waiting: number };
        };
      };
      const fromServer = (response?.jobs ?? []).map(normalizeListJob);
      // Reviewer fix (AIQ-T-5 attempt 2): carry forward a placeholder (`addSubmittedJob`) the
      // server has not listed yet — an immediate poll can race the DB write it is reading, and
      // silently overwriting `jobs()` with a server response that drops the just-submitted job
      // would erase the seed `detectTerminalTransitions` needs on the poll after this one.
      const serverIds = new Set(fromServer.map(j => j.jobId));
      const carried = this.jobs().filter(j => ACTIVE_STATUSES.has(j.status) && !serverIds.has(j.jobId));
      const normalized = [...carried, ...fromServer];
      this.detectTerminalTransitions(normalized);
      this.jobs.set(normalized);
      this.summary.set({
        lanesTotal: response?.summary?.lanes_total ?? 0,
        lanesBusy: response?.summary?.lanes_busy ?? 0,
        othersWaiting: response?.summary?.others_waiting ?? 0,
      });
      this.adjustPollInterval(normalized);
      this.reconcileHintKey(normalized);
      this.lastPollFailed.set(false);
      this.hasPolledOnce.set(true);
    } catch (err: unknown) {
      this.handlePollError(err);
      this.lastPollFailed.set(true);
      this.hasPolledOnce.set(true);
    }
  }

  /**
   * `AIQ-DD-5`-adjacent: only a **401** stops the list poll (design §7 — the client poller already
   * stopped on 401 and this task keeps that behaviour). Every other failure — network blip, 5xx —
   * keeps polling on the current interval; the last known list stays on screen (`AIQ-R-9` G).
   */
  private handlePollError(err: unknown): void {
    const status = (err as { status?: number } | null | undefined)?.status;
    if (status === 401) {
      this.stopPolling();
    }
  }

  private referenceMsFor(jobs: NormalizedBilateralAiListJob[]): number | null {
    const activeJobs = jobs.filter(j => ACTIVE_STATUSES.has(j.status));
    if (activeJobs.length === 0) return null;
    return Math.max(...activeJobs.map(j => j.queueEntryDate.getTime()));
  }

  private desiredIntervalMs(referenceMs: number | null): number {
    if (referenceMs === null) return POLL_INTERVAL_INITIAL;
    const elapsed = Date.now() - referenceMs;
    if (elapsed >= CEILING_MS) return POLL_INTERVAL_CEILING;
    if (elapsed >= ADAPTIVE_SWITCH_MS) return POLL_INTERVAL_MID;
    return POLL_INTERVAL_INITIAL;
  }

  /** Recreates the interval timer only when the desired cadence actually changes. */
  private adjustPollInterval(jobs: NormalizedBilateralAiListJob[]): void {
    if (!this.pollingTimer) return;
    const desired = this.desiredIntervalMs(this.referenceMsFor(jobs));
    if (desired === this.currentIntervalMs) return;
    this.currentIntervalMs = desired;
    clearInterval(this.pollingTimer);
    this.pollingTimer = setInterval(() => this.pollList(), desired);
  }

  /** `AIQ-R-8` B: stop once idle, unless the drawer is still open. Clear the hint key either way. */
  private reconcileHintKey(jobs: NormalizedBilateralAiListJob[]): void {
    const hasActive = jobs.some(j => ACTIVE_STATUSES.has(j.status));
    if (hasActive) return;
    this.clearHasActiveHint();
    if (!this.drawerOpen()) this.stopPolling();
  }

  // ── Terminal-transition detection → toasts (`AIQ-R-11`) ──────────────

  /**
   * A job counts as "newly terminal" only when `previousJobsById` already had it active — on the
   * very first poll ever `previousJobsById` is empty, so `prev` is `undefined` for every job and
   * nothing toasts (otherwise every already-finished job in the last-24h window would re-announce
   * itself on every reload). This per-job check is the whole guard — no separate "have we ever
   * polled" flag is needed, and a flag caused the AIQ-T-5 attempt-2 review bug: `addSubmittedJob`
   * seeds `previousJobsById` with the placeholder precisely so a job that turns terminal on the
   * very first poll after submission (fast failures, ~30 s jobs under a 30 s cadence) still gets
   * its toast even when nothing has polled before.
   */
  private detectTerminalTransitions(newJobs: NormalizedBilateralAiListJob[]): void {
    const newlyTerminal = newJobs.filter(job => {
      const prev = this.previousJobsById.get(job.jobId);
      return TERMINAL_STATUSES.has(job.status) && prev !== undefined && ACTIVE_STATUSES.has(prev.status);
    });
    if (newlyTerminal.length > 0) {
      this.unseenFinishedIds.update(set => {
        const next = new Set(set);
        for (const job of newlyTerminal) next.add(job.jobId);
        return next;
      });
      this.announceTerminalJobs(newlyTerminal);
    }
    this.previousJobsById = new Map(newJobs.map(job => [job.jobId, job]));
  }

  /** `AIQ-R-11` B: more than 2 in one poll collapse into a single grouped toast. */
  private announceTerminalJobs(jobs: NormalizedBilateralAiListJob[]): void {
    if (jobs.length > 2) {
      this.messageService.add({
        key: 'globalUserNotification',
        severity: 'info',
        summary: `${jobs.length} jobs finished`,
        detail: 'Open AI processes to see the results.',
        sticky: true,
        action: { label: 'View', run: () => this.openDrawer() },
      });
      return;
    }
    for (const job of jobs) this.announceTerminalJob(job);
  }

  private announceTerminalJob(job: NormalizedBilateralAiListJob): void {
    const label = job.projectName || job.programCode || job.jobId;
    if (job.status === 'COMPLETED' && job.resultCount > 0) {
      this.messageService.add({
        key: 'globalUserNotification',
        severity: 'success',
        summary: `${label} is ready`,
        detail: `${job.resultCount} draft${job.resultCount === 1 ? '' : 's'} ready.`,
        sticky: true,
        action: { label: 'Open drafts', run: () => this.openDraftsForJob(job) },
      });
    } else if (job.status === 'COMPLETED') {
      this.messageService.add({
        key: 'globalUserNotification',
        severity: 'info',
        summary: `${label} finished`,
        detail: 'No results were found in this evidence.',
        sticky: true,
        action: { label: 'View', run: () => this.openDrawer(job.jobId) },
      });
    } else {
      const copy = errorCopy(job.errorCode);
      this.messageService.add({
        key: 'globalUserNotification',
        severity: 'error',
        summary: `${label} failed`,
        detail: copy.message,
        sticky: true,
        action: { label: 'View', run: () => this.openDrawer(job.jobId) },
      });
    }
  }

  private openDraftsForJob(job: NormalizedBilateralAiListJob): void {
    this.loadAllDrafts();
    if (job.centerAcronym) void this.router.navigate(['/bilateral', job.centerAcronym, 'drafts']);
  }

  // ── Draft CRUD ──────────────────────────────────────────────────────

  loadAllDrafts(): void {
    const centerId = this.ctx.centerInstitutionId();
    if (centerId == null) return;

    this.loadProjectNames();
    this.loadInitiativeNames();
    this.bilateralApi.GET_bilateralAiDrafts(centerId).subscribe({
      next: (data: any) => {
        this.draftList.set(data ?? []);
        this.isDraftListLoaded.set(true);
      },
      error: () => {
        this.isDraftListLoaded.set(true);
      },
    });
  }

  loadInitiativeNames(): void {
    this.resultsApi.GET_AllInitiatives().subscribe({
      next: (data: any) => {
        const list = data?.response ?? [];
        const map: Record<string, string> = {};
        for (const i of list) {
          if (i.official_code) {
            map[i.official_code] = i.short_name ?? i.name ?? i.official_code;
          }
        }
        this.initiativeNameMap.set(map);
      },
    });
  }

  loadProjectNames(): void {
    this.resultsApi.GET_ClarisaProjects().subscribe({
      next: (data: any) => {
        const projects = data?.response ?? data ?? [];
        const map: Record<number, string> = {};
        for (const p of projects) {
          if (p.id != null) {
            if (p.shortName && p.fullName) {
              map[p.id] = `${p.shortName} — ${p.fullName}`;
            } else {
              map[p.id] = p.shortName ?? p.fullName ?? String(p.id);
            }
          }
        }
        this.projectNameMap.set(map);
      },
    });
  }

  loadDraft(draftId: number): void {
    this.bilateralApi.GET_bilateralAiDraft(draftId).subscribe({
      next: ({ response }) => {
        this.currentDraft.set(response);
      },
    });
  }

  getDraft(draftId: number): Observable<ReportingApiResponse<BilateralAiDraft>> {
    return this.bilateralApi.GET_bilateralAiDraft(draftId);
  }

  promoteDraft(draftId: number): void {
    this.isPromoting.set(true);
    this.bilateralApi.POST_promoteBilateralAiDraft(draftId).subscribe({
      next: ({ response }) => {
        this.isPromoting.set(false);
        this.uploadState.update(s => ({ ...s, status: 'promoted' }));
        this.draftList.update(list => list.filter(d => d.id !== draftId));
        const resultId = response?.resultId ?? response?.result_id;
        // Canonical editor URL is result_code + ?phase (the shape the results list opens): the
        // backend resolves `:id` by code+version when `phase` travels, and by internal id only as
        // the fallback. Navigating with the bare id produced /result/11514 instead of
        // /result/9046?phase=36. Older servers do not send resultCode/versionId — keep the fallback.
        const resultCode = response?.resultCode ?? response?.result_code;
        const versionId = response?.versionId ?? response?.version_id;
        if (resultCode && versionId) {
          this.creationService.isAiGenerated.set(true);
          void this.router.navigate(['/bilateral', this.ctx.centerAcronym(), 'result', resultCode], { queryParams: { phase: versionId } });
        } else if (resultId) {
          this.creationService.isAiGenerated.set(true);
          void this.router.navigate(['/bilateral', this.ctx.centerAcronym(), 'result', resultId]);
        } else {
          void this.router.navigate(['/bilateral', this.ctx.centerAcronym(), 'drafts']);
        }
      },
      error: () => {
        this.isPromoting.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to create the result' });
      },
    });
  }

  discardDraft(draftId: number): void {
    this.bilateralApi.DELETE_bilateralAiDraft(draftId).subscribe({
      next: () => {
        this.uploadState.update(s => ({ ...s, status: 'discarded' }));
        this.draftList.update(list => list.filter(d => d.id !== draftId));
        this.currentDraft.set(null);
        void this.router.navigate(['/bilateral', this.ctx.centerAcronym(), 'drafts']);
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to discard draft' });
      },
    });
  }
}
