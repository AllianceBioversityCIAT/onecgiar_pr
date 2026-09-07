import { Injectable, signal, computed, inject, effect, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { PrToastService } from '../../../shared/components/pr-toast/pr-toast.service';
import { BilateralApiService } from '../../../shared/services/api/bilateral-api.service';
import { ResultsApiService } from '../../../shared/services/api/results-api.service';
import { BilateralContextService } from './bilateral-context.service';
import { BilateralCreationService } from './bilateral-creation.service';
import {
  BilateralAiCompletionNotice,
  BilateralAiDraft,
  BilateralAiJob,
  BilateralAiUploadState,
} from './bilateral-ai.interfaces';
import { ReportingApiResponse } from '../../../shared/interfaces/reporting-api.response';

const POLL_INTERVAL = 5000;
/**
 * 30 minutes. The old 5-minute ceiling was shorter than a real text-mining run: the client gave up,
 * flagged the job as failed, and the server finished anyway with nobody told (2026-09-07).
 */
const MAX_POLL_DURATION = 1_800_000;
/** The job being polled, so a reload (or a new tab) resumes it instead of losing the outcome. */
const ACTIVE_JOB_STORAGE_KEY = 'prms.bilateral-ai.active-job';

interface ActiveJobRecord {
  jobId: string;
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
  currentJob = signal<BilateralAiJob | null>(null);
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
   * The terminal outcome of the last AI job, for the app-wide `app-bilateral-ai-completion-dialog`.
   * Set once per job, from wherever the user is; cleared when they act on it. Replaces the toast
   * (2026-09-04 → 2026-09-07) that nobody noticed and the forced redirect before it.
   */
  completionNotice = signal<BilateralAiCompletionNotice | null>(null);

  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  private pollingStart = 0;
  /** Centre captured when the job started — the context signals are stale by the time it ends. */
  private activeJob: ActiveJobRecord | null = null;

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

  // ── Job lifecycle ───────────────────────────────────────────────────

  startJob(jobId: string): void {
    this.activeJob = { jobId, centerAcronym: this.ctx.centerAcronym(), startedAt: Date.now() };
    this.persistActiveJob();
    this.currentJobId.set(jobId);
    this.uploadState.set({
      jobId,
      status: 'pending',
      uploadProgress: 100,
    });
    this.startPolling(jobId);
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
   * Picks the polling back up after a reload. The record is dropped once the job is older than the
   * polling ceiling — by then the server has long finished or failed and the Drafts list is the
   * source of truth.
   */
  private resumeActiveJob(): void {
    const record = this.readActiveJob();
    if (!record) return;
    if (Date.now() - record.startedAt > MAX_POLL_DURATION) {
      this.clearActiveJob();
      return;
    }
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
    this.completionNotice.set({ jobId, centerAcronym, status, resultCount, errorMessage });
    this.clearActiveJob();
  }

  private startPolling(jobId: string, startedAt: number = Date.now()): void {
    this.stopPolling();
    this.pollingStart = startedAt;
    this.pollingTimer = setInterval(() => this.pollJob(jobId), POLL_INTERVAL);
    void this.pollJob(jobId);
  }

  stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  private async pollJob(jobId: string): Promise<void> {
    if (Date.now() - this.pollingStart > MAX_POLL_DURATION) {
      this.stopPolling();
      const errorMessage = 'Processing timed out. Please try again.';
      this.uploadState.update(s => ({ ...s, status: 'failed', errorMessage }));
      this.announce('failed', 0, errorMessage);
      return;
    }

    try {
      const { response } = await this.bilateralApi.GET_bilateralAiJob(jobId).toPromise() as any;
      const job = response as BilateralAiJob;
      this.currentJob.set(job);

      if (job.status === 'PENDING') {
        this.uploadState.update(s => ({ ...s, status: 'pending' }));
      } else if (job.status === 'PROCESSING') {
        this.uploadState.update(s => ({ ...s, status: 'processing' }));
      } else if (job.status === 'COMPLETED') {
        this.stopPolling();
        // No navigation, ever. The service is root-provided and polling survives navigation, so
        // completing used to yank the user out of whatever they had moved on to (2026-09-04);
        // the toast that replaced it went unnoticed (2026-09-07). The outcome is announced
        // through `completionNotice` — a dialog the user closes or follows to the Drafts list —
        // and the server mails the uploader a link as the durable half.
        if (job.result_count === 0) {
          this.uploadState.update(s => ({ ...s, status: 'completed_no_candidates' }));
          this.announce('completed_no_candidates', 0);
        } else {
          this.uploadState.update(s => ({ ...s, status: 'completed' }));
          this.loadAllDrafts();
          this.announce('completed', job.result_count);
        }
      } else if (job.status === 'FAILED') {
        this.stopPolling();
        const errorMessage = job.error_message ?? 'AI processing failed. Please try again.';
        this.uploadState.update(s => ({ ...s, status: 'failed', errorMessage }));
        this.announce('failed', 0, errorMessage);
      }
    } catch {
      // polling error — keep trying
    }
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
            map[p.id] = p.shortName ?? p.fullName ?? String(p.id);
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
