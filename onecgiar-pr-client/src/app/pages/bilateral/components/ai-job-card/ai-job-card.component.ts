import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import {
  AiProvenanceNoticeComponent,
} from '../ai-provenance-notice/ai-provenance-notice.component';
import {
  BilateralAiExpectations,
  BilateralAiStage,
  NormalizedBilateralAiListJob,
  errorCopy,
} from '../../bilateral-ai-job.model';
import { BILATERAL_AI_PROCESSES_COPY as COPY } from '../../../../internationalization/bilateral-ai-processes.copy';

/**
 * `ai-job-card` (`AIQ-T-8`, `design.md` §6.2/§6.3, `AIQ-R-9`) — presentational, input-driven, no
 * HTTP, no timer of its own. One `NormalizedBilateralAiListJob` in, one visual variant out; the
 * host (`ai-processes-drawer`) supplies the ticking clock (`now`) and any cross-job lookups
 * (`waitReasonText`, `expectation`) it cannot resolve on its own (`AIQ-DD-8` parity).
 */

/**
 * 30 min — `APF-R-7`'s client ceiling. Duplicated from `bilateral-ai.service.ts`'s private
 * `CEILING_MS` rather than imported/shared: that constant is not exported, and this card only
 * needs it to decide the `still_running` styling (`AIQ-R-9` Scenario E), not to drive polling.
 */
const STILL_RUNNING_CEILING_MS = 1_800_000;

export type AiJobCardVariant = 'running' | 'still_running' | 'waiting' | 'completed' | 'no_candidates' | 'failed';

/** The 5 segments a RUNNING card's progress rail shows — `queued` has no segment (`AIQ-T-8`,
 * the waiting card renders the queue state on its own, never this stepper). */
const RUNNING_STAGE_ORDER: BilateralAiStage[] = ['uploading', 'reading', 'extracting', 'validating', 'creating_drafts'];

/** `reading` and `transcribing` collapse onto the same segment index (`design.md` §6.2). */
function stageSegmentIndex(stage: BilateralAiStage): number {
  if (stage === 'transcribing' || stage === 'reading_transcribing') return RUNNING_STAGE_ORDER.indexOf('reading');
  const index = RUNNING_STAGE_ORDER.indexOf(stage);
  return index === -1 ? 0 : index;
}

/** Steps PRMS pre-sets from the source mix rather than observes (`APF-DD-1`) — "estimated" caption. */
const ESTIMATED_STAGES: ReadonlySet<BilateralAiStage> = new Set(['reading', 'transcribing', 'reading_transcribing', 'extracting']);

function currentStageLabel(job: NormalizedBilateralAiListJob): string {
  const hasDocs = job.documentCount > 0;
  const hasAudio = job.audioCount > 0;
  const stage = COPY.card.stage;
  switch (job.stage) {
    case 'uploading':
      return stage.uploading;
    case 'reading':
    case 'transcribing':
    case 'reading_transcribing':
      if (hasDocs && hasAudio) return stage.readingAndTranscribing;
      if (hasAudio) return stage.transcribingAudio;
      return stage.readingDocuments;
    case 'extracting':
      return stage.extracting;
    case 'validating':
      return stage.validating;
    case 'creating_drafts':
      return stage.creatingDrafts;
    case 'queued':
    default:
      return stage.queued;
  }
}

/** "1 document · 1 audio file" — plain counts, never a size/percentage claim (`AIQ-R-9` B). */
function sourceMixLine(job: NormalizedBilateralAiListJob): string {
  const parts: string[] = [];
  if (job.documentCount > 0) parts.push(`${job.documentCount} document${job.documentCount === 1 ? '' : 's'}`);
  if (job.audioCount > 0) parts.push(`${job.audioCount} audio file${job.audioCount === 1 ? '' : 's'}`);
  if (parts.length === 0 && job.hasText) parts.push(COPY.card.textNotes);
  return parts.join(' · ');
}

function formatElapsed(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** "1 min 52 s" / "48 s" — the mockup's long duration format for a finished card's "took …" line. */
function formatDurationLong(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  if (minutes === 0) return `${seconds} s`;
  return `${minutes} min ${seconds} s`;
}

function mixClassFromCounts(job: NormalizedBilateralAiListJob): 'documents' | 'audio' {
  return job.audioCount > 0 ? 'audio' : 'documents';
}

@Component({
  selector: 'app-ai-job-card',
  imports: [AiProvenanceNoticeComponent],
  templateUrl: './ai-job-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiJobCardComponent {
  readonly job = input.required<NormalizedBilateralAiListJob>();
  /** Tick supplied by the host (1 s, only while the drawer is open) — never `Date.now()` in here. */
  readonly now = input<number>(Date.now());
  /** The per-mix expected range, or `null` to render the fallback copy (`APF-R-6` D). */
  readonly expectation = input<BilateralAiExpectations | null>(null);
  /** Resolved by the drawer via `waitReasonCopy(job.waitReason, projectName)` over the full job
   * list (`AIQ-R-9` C) — this card never computes wait-reason text itself. */
  readonly waitReasonText = input('');
  /** Whether this card should render the highlight cue (`AIQ-R-8` D deep link/legacy). */
  readonly highlighted = input(false);

  readonly retry = output<void>();
  readonly uploadDifferentFiles = output<void>();
  readonly viewDrafts = output<void>();
  readonly reportManually = output<void>();

  readonly copy = COPY.card;

  readonly variant = computed<AiJobCardVariant>(() => {
    const job = this.job();
    if (job.status === 'PROCESSING') {
      const elapsedMs = this.now() - job.queueEntryDate.getTime();
      return elapsedMs >= STILL_RUNNING_CEILING_MS ? 'still_running' : 'running';
    }
    if (job.status === 'PENDING') return 'waiting';
    if (job.status === 'FAILED') return 'failed';
    return job.resultCount > 0 ? 'completed' : 'no_candidates';
  });

  readonly isRunningLike = computed(() => this.variant() === 'running' || this.variant() === 'still_running');

  /** `AIQ-R-9` B fix: a running/still-running card's elapsed clock reads from `started_date` when
   * the server has set it, falling back to `queueEntryDate` only while it has not (e.g. the
   * optimistic placeholder right after submit) — never `queueEntryDate` once the job is actually
   * running, or elapsed would double-count time already spent waiting. Waiting cards ("time in
   * queue") intentionally keep `queueEntryDate` — see `waitingElapsedLabel`. */
  readonly elapsedLabel = computed(() => {
    const job = this.job();
    const startMs = (job.startedDate ?? job.queueEntryDate).getTime();
    return formatElapsed((this.now() - startMs) / 1000);
  });

  readonly waitingElapsedLabel = computed(() => formatElapsed((this.now() - this.job().queueEntryDate.getTime()) / 1000));

  readonly stageLabel = computed(() => currentStageLabel(this.job()));
  readonly stageEstimated = computed(() => ESTIMATED_STAGES.has(this.job().stage));
  readonly stageSegments = computed(() => {
    const activeIndex = stageSegmentIndex(this.job().stage);
    return RUNNING_STAGE_ORDER.map((_, index) => (index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'pending'));
  });

  readonly sourceMixLine = computed(() => sourceMixLine(this.job()));

  readonly expectedRangeLine = computed(() => {
    const exp = this.expectation();
    if (!exp || exp.sampleSize < 5 || exp.p25Minutes == null || exp.p75Minutes == null) {
      return this.copy.expectedRangeFallback;
    }
    return this.copy.expectedRange(exp.p25Minutes, exp.p75Minutes);
  });

  readonly positionLabel = computed(() => {
    const ahead = this.job().jobsAhead;
    if (ahead === null || ahead === 0) return this.copy.nextPosition;
    return this.copy.aheadPosition(ahead);
  });

  readonly isRetrying = computed(() => this.job().retrying);

  readonly showAttemptBadge = computed(() => {
    const job = this.job();
    return job.retrying || job.attempts > 1;
  });

  readonly attemptBadgeLabel = computed(() => this.copy.attemptBadge(this.job().attempts, this.job().maxAttempts));

  /** Only while `retrying` — `ai-processing-panel`'s parity line (`AIQ-DD-8`). */
  readonly retryingErrorLine = computed(() => {
    const job = this.job();
    if (!job.retrying) return '';
    return this.copy.lastError(errorCopy(job.errorCode).message);
  });

  readonly failureCopy = computed(() => errorCopy(this.job().errorCode));

  /** Guards "Try again" explicitly rather than relying only on the branch it renders in. */
  readonly isJobAlive = computed(() => {
    const status = this.job().status;
    return status === 'PENDING' || status === 'PROCESSING';
  });

  readonly draftsReadyLine = computed(() => this.copy.draftsReady(this.job().resultCount));
  readonly viewDraftsLabel = computed(() => this.copy.viewDrafts(this.job().resultCount));

  /** "took 1 min 52 s" (`AIQ-DD-8` parity, mockup) — duration from `started_date` (falling back to
   * `queueEntryDate`) to `completed_date`; empty when either timestamp is missing. */
  readonly tookLine = computed(() => {
    const job = this.job();
    if (!job.completedDate) return '';
    const startMs = (job.startedDate ?? job.queueEntryDate).getTime();
    const seconds = (job.completedDate.getTime() - startMs) / 1000;
    if (seconds < 0) return '';
    return this.copy.took(formatDurationLong(seconds));
  });

  /** "10:42" — the finished timestamp shown next to `copy.finishedLabel` (`AIQ-DD-8` parity). */
  readonly finishedAtLabel = computed(() => {
    const completed = this.job().completedDate;
    if (!completed) return '';
    return `${String(completed.getHours()).padStart(2, '0')}:${String(completed.getMinutes()).padStart(2, '0')}`;
  });

  onRetry(): void {
    this.retry.emit();
  }

  onUploadDifferentFiles(): void {
    this.uploadDifferentFiles.emit();
  }

  onViewDrafts(): void {
    this.viewDrafts.emit();
  }

  onReportManually(): void {
    this.reportManually.emit();
  }
}

/** Exported for `ai-processes-drawer` to compute the mix key its `expectations` map is keyed by. */
export { mixClassFromCounts };
