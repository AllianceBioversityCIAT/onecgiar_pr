import { Injectable, signal, computed, inject, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { BilateralApiService } from '../../../shared/services/api/bilateral-api.service';
import {
  BilateralAiDraft,
  BilateralAiJob,
  BilateralAiJobStatus,
  BilateralAiUploadState,
  DraftEvidence,
} from './bilateral-ai.interfaces';
import { ReportingApiResponse } from '../../../shared/interfaces/reporting-api.response';

const POLL_INTERVAL = 5000;
const MAX_POLL_DURATION = 300_000;

@Injectable({ providedIn: 'root' })
export class BilateralAiService implements OnDestroy {
  private readonly bilateralApi = inject(BilateralApiService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  currentJobId = signal<string | null>(null);
  currentJob = signal<BilateralAiJob | null>(null);
  draftList = signal<BilateralAiDraft[]>([]);
  currentDraft = signal<BilateralAiDraft | null>(null);
  isDraftListLoaded = signal(false);

  uploadState = signal<BilateralAiUploadState>({
    jobId: null,
    status: 'idle',
    uploadProgress: 0,
  });

  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  private pollingStart = 0;

  draftCount = computed(() => this.draftList().filter(d => d.status === 'draft').length);
  draftCountDisplay = computed(() => {
    const count = this.draftCount();
    if (count === 0) return '';
    return count > 9 ? '9+' : String(count);
  });

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
    this.currentJobId.set(jobId);
    this.uploadState.set({
      jobId,
      status: 'pending',
      uploadProgress: 100,
    });
    this.startPolling(jobId);
  }

  private startPolling(jobId: string): void {
    this.stopPolling();
    this.pollingStart = Date.now();
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
      this.uploadState.update(s => ({
        ...s,
        status: 'failed',
        errorMessage: 'Processing timed out. Please try again.',
      }));
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
        this.uploadState.update(s => ({ ...s, status: 'completed' }));
        this.loadAllDrafts();
        await this.router.navigate(['/bilateral/drafts']);
      } else if (job.status === 'FAILED') {
        this.stopPolling();
        this.uploadState.update(s => ({
          ...s,
          status: 'failed',
          errorMessage: job.error_message ?? 'AI processing failed. Please try again.',
        }));
      }
    } catch {
      // polling error — keep trying
    }
  }

  // ── Draft CRUD ──────────────────────────────────────────────────────

  loadAllDrafts(): void {
    this.bilateralApi.GET_bilateralAiDrafts().subscribe({
      next: (data: any) => {
        this.draftList.set(data ?? []);
        this.isDraftListLoaded.set(true);
      },
      error: () => {
        this.isDraftListLoaded.set(true);
      },
    });
  }

  getDraft(draftId: number): Observable<ReportingApiResponse<BilateralAiDraft>> {
    return this.bilateralApi.GET_bilateralAiDraft(draftId);
  }

  toggleEvidence(draftId: number, evidenceId: number, isFormalEvidence: boolean): void {
    this.toggleFormalEvidence(draftId, evidenceId, isFormalEvidence);
  }

  loadDraft(draftId: number): void {
    this.bilateralApi.GET_bilateralAiDraft(draftId).subscribe({
      next: ({ response }) => {
        this.currentDraft.set(response);
      },
    });
  }

  toggleFormalEvidence(draftId: number, evidenceId: number, isFormalEvidence: boolean): void {
    this.bilateralApi.PATCH_bilateralAiEvidence(draftId, evidenceId, { is_formal_evidence: isFormalEvidence }).subscribe({
      next: () => {
        this.currentDraft.update(draft => {
          if (!draft) return draft;
          const updateEvidence = (items: DraftEvidence[]) =>
            items.map(e => (e.id === evidenceId ? { ...e, is_formal_evidence: isFormalEvidence } : e));
          return {
            ...draft,
            evidence: updateEvidence(draft.evidence),
          };
        });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update evidence' });
      },
    });
  }

  promoteDraft(draftId: number): void {
    this.bilateralApi.POST_promoteBilateralAiDraft(draftId).subscribe({
      next: ({ response }) => {
        this.uploadState.update(s => ({ ...s, status: 'promoted' }));
        this.currentDraft.update(d => d ? { ...d, status: 'promoted' } : d);
        const resultId = response?.resultId ?? response?.result_id;
        if (resultId) {
          void this.router.navigate(['/bilateral/result', resultId]);
        } else {
          void this.router.navigate(['/bilateral/drafts']);
        }
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to promote draft' });
      },
    });
  }

  discardDraft(draftId: number): void {
    this.bilateralApi.DELETE_bilateralAiDraft(draftId).subscribe({
      next: () => {
        this.uploadState.update(s => ({ ...s, status: 'discarded' }));
        this.draftList.update(list => list.filter(d => d.id !== draftId));
        this.currentDraft.set(null);
        void this.router.navigate(['/bilateral/drafts']);
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
