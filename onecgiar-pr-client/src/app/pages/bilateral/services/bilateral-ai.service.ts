import { Injectable, signal, computed, inject, effect, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { Router } from '@angular/router';
import { PrToastService } from '../../../shared/components/pr-toast/pr-toast.service';
import { BilateralApiService } from '../../../shared/services/api/bilateral-api.service';
import { ResultsApiService } from '../../../shared/services/api/results-api.service';
import { BilateralContextService } from './bilateral-context.service';
import { BilateralCreationService } from './bilateral-creation.service';
import {
  BilateralAiCompletionNotice,
  BilateralAiDraft,
  BilateralAiUploadState,
} from './bilateral-ai.interfaces';
import {
  BilateralAiExpectations,
  BilateralAiMixClass,
  NormalizedBilateralAiJob,
  RawBilateralAiJob,
  normalizeJob,
} from '../bilateral-ai-job.model';
import { ReportingApiResponse } from '../../../shared/interfaces/reporting-api.response';

/** First 2 minutes: poll every 5 s — the user is staring at the screen (`APF-R-20`). */
const POLL_INTERVAL_INITIAL = 5_000;
/** From 2 minutes until the ceiling: poll every 15 s (`APF-R-20`). */
const POLL_INTERVAL_MID = 15_000;
/** In "still running", past the ceiling: poll every 30 s (`APF-R-20`). */
const POLL_INTERVAL_CEILING = 30_000;
const ADAPTIVE_SWITCH_MS = 120_000;
/**
 * 30 minutes. The client no longer declares a failure at this mark (`APF-DD-6` — the old 5-minute,
 * then 30-minute, ceiling produced a client-invented timeout message with no server truth behind
 * it). Past
 * this point the panel switches to "still running": polling slows to 30 s and the resume record is
 * kept — the server (its own per-attempt timeout + stale-job sweeper) is now the only party that
 * can declare the job over.
 */
const CEILING_MS = 1_800_000;
/** The job being polled, so a reload (or a new tab) resumes it instead of losing the outcome. */
const ACTIVE_JOB_STORAGE_KEY = 'prms.bilateral-ai.active-job';

interface ActiveJobRecord {
  jobId: string;
  /** Optional at runtime only — older stored records predate this field; tolerated on read. */
  centerAcronym: string;
  startedAt: number;
}

@Injectable({ providedIn: 'root' })
export class BilateralAiService implements OnDestroy {
  private readonly bilateralApi = inject(BilateralApiService);
  private readonly resultsApi = inject(ResultsApiService);
  private readonly router = inject(Router);
  private readonly messageService = inject(PrToastService);
  private readonly ctx = inject(BilateralContextService);
  private readonly creationService = inject(BilateralCreationService);

  currentJobId = signal<string | null>(null);
  currentJob = signal<NormalizedBilateralAiJob | null>(null);
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

  /**
   * `APF-DD-7`: which of the two outcome surfaces is live. Set by the host that renders
   * `<app-ai-processing-panel>` (mount/destroy) — `announce()` reads it to decide whether the
   * app-wide completion dialog should speak at all. Never both: the panel renders the terminal
   * outcome inline while this is true; the dialog is the only surface while it is false.
   */
  readonly panelVisible = signal(false);

  /**
   * The terminal outcome of the last AI job, for the app-wide `app-bilateral-ai-completion-dialog`.
   * Set once per job, from wherever the user is; cleared when they act on it. Replaces the toast
   * (2026-09-04 → 2026-09-07) that nobody noticed and the forced redirect before it. Suppressed
   * entirely while `panelVisible()` is true (`APF-R-8` A/B).
   */
  completionNotice = signal<BilateralAiCompletionNotice | null>(null);

  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  private currentIntervalMs = POLL_INTERVAL_INITIAL;
  /** Centre captured when the job started — the context signals are stale by the time it ends. */
  private activeJob: ActiveJobRecord | null = null;
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

    this.resumeActiveJob();
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

  /** Whether the processing panel is currently the outcome surface (`APF-DD-7`). */
  setPanelVisible(visible: boolean): void {
    this.panelVisible.set(visible);
  }

  // ── Job lifecycle ───────────────────────────────────────────────────

  startJob(jobId: string): void {
    this.activeJob = { jobId, centerAcronym: this.ctx.centerAcronym(), startedAt: Date.now() };
    this.persistActiveJob();
    this.currentJobId.set(jobId);
    this.currentJob.set(null);
    this.uploadState.set({
      jobId,
      status: 'pending',
      uploadProgress: 100,
    });
    this.startPolling(jobId, this.activeJob.startedAt);
  }

  /**
   * `APF-R-5`/`APF-R-9`: re-enqueues the same stored sources under the same job id — no re-upload,
   * no new job. Disabled while the job is alive is a UI concern (the panel), not this method's.
   */
  retryJob(jobId: string): void {
    this.bilateralApi.POST_bilateralAiJobRetry(jobId).subscribe({
      next: () => {
        this.activeJob = {
          jobId,
          centerAcronym: this.activeJob?.centerAcronym || this.ctx.centerAcronym(),
          startedAt: Date.now(),
        };
        this.persistActiveJob();
        this.currentJobId.set(jobId);
        this.currentJob.set(null);
        this.uploadState.set({ jobId, status: 'pending', uploadProgress: 100 });
        this.startPolling(jobId, this.activeJob.startedAt);
      },
      error: (err: { status?: number } | null) => {
        if (err?.status === 410) {
          // The stored sources are gone (bucket expiry) — nothing left to retry against.
          this.clearActiveJob();
          this.currentJobId.set(null);
          this.currentJob.set(null);
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
   * session so the panel and any other caller share one HTTP call.
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

  /** The user acknowledged the outcome and stays where they are. */
  dismissCompletionNotice(): void {
    this.completionNotice.set(null);
  }

  /** The user chose to review the drafts: the centre's Drafts list, from anywhere in the app. */
  openDraftsFromNotice(): void {
    const notice = this.completionNotice();
    this.completionNotice.set(null);
    if (!notice?.centerAcronym) return;
    void this.router.navigate(['/bilateral', notice.centerAcronym, 'drafts']);
  }

  /**
   * Picks the polling back up after a reload. `APF-R-7` AND-IT-MUST: resumed **regardless of the
   * record's age** — the record is dropped only by a terminal server state or a 404/410 on poll,
   * never by client-side elapsed time. (Removed: the previous `MAX_POLL_DURATION`-age drop, which
   * silently lost jobs older than 30 minutes on reload even while the server was still working.)
   */
  private resumeActiveJob(): void {
    const record = this.readActiveJob();
    if (!record) return;
    this.activeJob = record;
    this.currentJobId.set(record.jobId);
    this.uploadState.set({ jobId: record.jobId, status: 'pending', uploadProgress: 100 });
    this.startPolling(record.jobId, record.startedAt);
  }

  private persistActiveJob(): void {
    try {
      if (this.activeJob) localStorage.setItem(ACTIVE_JOB_STORAGE_KEY, JSON.stringify(this.activeJob));
    } catch {
      // storage unavailable — polling still works for this tab's lifetime
    }
  }

  private readActiveJob(): ActiveJobRecord | null {
    try {
      const raw = localStorage.getItem(ACTIVE_JOB_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.jobId && typeof parsed.startedAt === 'number' ? (parsed as ActiveJobRecord) : null;
    } catch {
      return null;
    }
  }

  private clearActiveJob(): void {
    this.activeJob = null;
    try {
      localStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
    } catch {
      // nothing to clear
    }
  }

  /** Terminal state reached: record the outcome for the dialog and forget the job. */
  private announce(status: BilateralAiCompletionNotice['status'], resultCount: number, errorMessage?: string): void {
    const jobId = this.activeJob?.jobId ?? this.currentJobId() ?? '';
    const centerAcronym = this.activeJob?.centerAcronym || this.ctx.centerAcronym();
    this.clearActiveJob();
    // APF-DD-7: the panel renders the terminal outcome inline — the dialog must stay silent so
    // the two surfaces never both speak (APF-R-8 A/B).
    if (this.panelVisible()) return;
    this.completionNotice.set({ jobId, centerAcronym, status, resultCount, errorMessage });
  }

  private startPolling(jobId: string, startedAt: number = Date.now()): void {
    this.stopPolling();
    this.currentIntervalMs = POLL_INTERVAL_INITIAL;
    this.pollingTimer = setInterval(() => this.pollJob(jobId), this.currentIntervalMs);
    void this.pollJob(jobId);
  }

  stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  /**
   * The reference instant every age-based client rule (interval bucket, "still running" ceiling)
   * measures from: the normalized job's queue-entry clock once we have one, or the record's
   * `startedAt` before the first poll response lands (Leader decision — there is no job yet to
   * read a `queueEntryDate` off of).
   */
  private pollReferenceMs(job: NormalizedBilateralAiJob | null): number {
    if (job) return job.queueEntryDate.getTime();
    return this.activeJob?.startedAt ?? Date.now();
  }

  private isAtCeiling(job: NormalizedBilateralAiJob | null): boolean {
    return Date.now() - this.pollReferenceMs(job) >= CEILING_MS;
  }

  private desiredIntervalMs(job: NormalizedBilateralAiJob | null): number {
    const elapsed = Date.now() - this.pollReferenceMs(job);
    if (elapsed >= CEILING_MS) return POLL_INTERVAL_CEILING;
    if (elapsed >= ADAPTIVE_SWITCH_MS) return POLL_INTERVAL_MID;
    return POLL_INTERVAL_INITIAL;
  }

  /** Recreates the interval timer only when the desired cadence actually changes. */
  private adjustPollInterval(jobId: string, job: NormalizedBilateralAiJob | null): void {
    if (!this.pollingTimer) return;
    const desired = this.desiredIntervalMs(job);
    if (desired === this.currentIntervalMs) return;
    this.currentIntervalMs = desired;
    clearInterval(this.pollingTimer);
    this.pollingTimer = setInterval(() => this.pollJob(jobId), desired);
  }

  private async pollJob(jobId: string): Promise<void> {
    try {
      const { response } = (await this.bilateralApi.GET_bilateralAiJob(jobId).toPromise()) as { response: RawBilateralAiJob };
      const job = normalizeJob(response);
      this.currentJob.set(job);
      this.adjustPollInterval(jobId, job);

      if (job.status === 'PENDING') {
        this.uploadState.update(s => ({ ...s, status: this.isAtCeiling(job) ? 'still_running' : 'pending' }));
      } else if (job.status === 'PROCESSING') {
        this.uploadState.update(s => ({ ...s, status: this.isAtCeiling(job) ? 'still_running' : 'processing' }));
      } else if (job.status === 'COMPLETED') {
        this.stopPolling();
        // No navigation, ever. The service is root-provided and polling survives navigation, so
        // completing used to yank the user out of whatever they had moved on to (2026-09-04);
        // the toast that replaced it went unnoticed (2026-09-07). The outcome is announced
        // through `completionNotice` — a dialog the user closes or follows to the Drafts list —
        // and the server mails the uploader a link as the durable half.
        if (job.resultCount === 0) {
          this.uploadState.update(s => ({ ...s, status: 'completed_no_candidates' }));
          this.announce('completed_no_candidates', 0);
        } else {
          this.uploadState.update(s => ({ ...s, status: 'completed' }));
          this.loadAllDrafts();
          this.announce('completed', job.resultCount);
        }
      } else if (job.status === 'FAILED') {
        this.stopPolling();
        const errorMessage = job.errorMessage ?? 'AI processing failed. Please try again.';
        this.uploadState.update(s => ({ ...s, status: 'failed', errorMessage }));
        this.announce('failed', 0, errorMessage);
      }
    } catch (err: unknown) {
      this.handlePollError(err);
    }
  }

  /**
   * `APF-R-7` AND-IT-MUST / `APF-DD-6`: the ceiling used to be the only thing that stopped an
   * eternal poll; removing it means this branch on the HTTP status of a failed poll is now the
   * terminating condition, and had to be written rather than inherited from "every error keeps
   * polling" (today's — yesterday's — behaviour, kept as the `else` arm below).
   */
  private handlePollError(err: unknown): void {
    const status = (err as { status?: number } | null | undefined)?.status;
    if (status === 404 || status === 410) {
      // The job row is gone server-side — nothing left to resume.
      this.stopPolling();
      this.clearActiveJob();
    } else if (status === 401) {
      // The session is gone; retrying the request would only produce more 401s.
      this.stopPolling();
    }
    // Network blip / 500 / 503 / anything else: keep polling on the current interval.
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

  clearUploadState(): void {
    this.uploadState.set({
      jobId: null,
      status: 'idle',
      uploadProgress: 0,
    });
    this.currentJobId.set(null);
    this.currentJob.set(null);
  }
}
