import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  BilateralAiExpectations,
  BilateralAiStepId,
  BilateralAiStepModel,
  NormalizedBilateralAiJob,
  buildStepperModel,
  elapsedSeconds,
  errorCopy,
} from '../../bilateral-ai-job.model';
import { BilateralAiUploadState } from '../../services/bilateral-ai.interfaces';

/** `APF-R-6` D fallback — exact copy, no trailing period (`requirements.md` §6.2 Scenario D). */
const FALLBACK_RANGE_COPY = 'This usually takes a few minutes; audio takes longer';

type PanelView = 'preparing' | 'queued' | 'processing' | 'still_running' | 'failed' | 'completed' | 'completed_no_candidates';

/**
 * Short per-step grid labels — distinct from `BilateralAiStepModel.label`, the long sentence used
 * for the active-step heading (e.g. "Extracting results (estimated)"). A six-column grid cell
 * cannot carry that sentence (`design.md` §6.3 stepper geometry); the "estimated" qualifier moves
 * to its own caption, rendered from `step.estimated` (reviewer-flagged: previously unread).
 */
const STEP_SHORT_LABELS: Record<BilateralAiStepId, string> = {
  queued: 'Queued',
  uploading: 'Uploading',
  reading_transcribing: 'Reading / Transcribing',
  extracting: 'Extracting',
  validating: 'Validating',
  creating_drafts: 'Creating drafts',
};

function formatElapsed(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** "1 document · 1 audio file" — plain counts, never a size/percentage claim. */
function sourceMixLabel(job: NormalizedBilateralAiJob): string {
  const docs = job.documentKeys.length;
  const audio = job.audioKeys.length;
  const parts: string[] = [];
  if (docs > 0) parts.push(`${docs} document${docs === 1 ? '' : 's'}`);
  if (audio > 0) parts.push(`${audio} audio file${audio === 1 ? '' : 's'}`);
  return parts.join(' · ');
}

/**
 * `AiProcessingPanelComponent` (`APF-T-6`, `design.md` §6.2/§6.3) — presentational, input-driven,
 * no internal loading state. Renders the stage stepper, elapsed time, expected range, queue
 * position, attempt/retrying badge, source mix, the "you can leave" line and every terminal
 * outcome (still running / failed / completed / no candidates). Every poll re-renders the SAME
 * branch with the SAME bound values — there is never a skeleton or a loading frame between polls
 * (`APF-R-6` A AND-IT-MUST): the host swaps `job`/`status`/`expectation`/`now` inputs, this
 * component owns no HTTP call and no timer of its own.
 */
@Component({
  selector: 'app-ai-processing-panel',
  imports: [CommonModule],
  templateUrl: './ai-processing-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiProcessingPanelComponent {
  readonly job = input<NormalizedBilateralAiJob | null>(null);
  readonly status = input.required<BilateralAiUploadState['status']>();
  readonly expectation = input<BilateralAiExpectations | null>(null);
  /** Tick supplied by the host (1 s `setInterval` while a job is alive) — never read from `Date.now()` here. */
  readonly now = input<number>(Date.now());

  /** "Try again" on a FAILED job — the host calls `BilateralAiService.retryJob`. */
  readonly retry = output<void>();
  /**
   * "Upload different files" / "Start another" — the host resets the upload form. Named
   * `resetUpload`, not `reset`: `@angular-eslint/no-output-native` blocks an output named after a
   * native DOM event (`reset`, the form-reset event).
   */
  readonly resetUpload = output<void>();
  /** "Review drafts" / "Go to Draft Results" — the host navigates to the Drafts tab. */
  readonly openDrafts = output<void>();

  readonly viewState = computed<PanelView>(() => {
    const job = this.job();
    const status = this.status();
    if (status === 'pending' || status === 'processing') {
      if (!job) return 'preparing';
      return status === 'pending' ? 'queued' : 'processing';
    }
    if (status === 'still_running') return 'still_running';
    if (status === 'failed') return 'failed';
    if (status === 'completed') return 'completed';
    if (status === 'completed_no_candidates') return 'completed_no_candidates';
    return 'preparing';
  });

  readonly isLive = computed(() => this.viewState() === 'queued' || this.viewState() === 'processing');

  readonly stepper = computed<BilateralAiStepModel[]>(() => {
    const job = this.job();
    return job ? buildStepperModel(job) : [];
  });

  readonly activeStep = computed<BilateralAiStepModel | null>(() => this.stepper().find(s => s.state === 'active') ?? null);

  readonly elapsedLabel = computed(() => {
    const job = this.job();
    if (!job) return '00:00';
    return formatElapsed(elapsedSeconds(job, this.now()));
  });

  readonly queuePositionLine = computed(() => {
    const job = this.job();
    if (!job) return '';
    const n = job.queuePosition ?? 0;
    return `Queued · ${n} job${n === 1 ? '' : 's'} ahead of you · waiting for a free AI worker`;
  });

  readonly mixLine = computed(() => {
    const job = this.job();
    return job ? sourceMixLabel(job) : '';
  });

  readonly expectedRangeLine = computed(() => {
    const exp = this.expectation();
    if (!exp || exp.sampleSize < 5 || exp.p25Minutes == null || exp.p75Minutes == null) {
      return FALLBACK_RANGE_COPY;
    }
    return `Usually ${exp.p25Minutes}–${exp.p75Minutes} min once processing starts`;
  });

  readonly isRetrying = computed(() => this.job()?.retrying ?? false);

  /** `APF-R-6`: the badge shows once `attempts > 1` OR `retrying` — not only while retrying. */
  readonly showAttemptBadge = computed(() => {
    const job = this.job();
    return !!job && (job.retrying || job.attempts > 1);
  });

  readonly attemptBadgeLabel = computed(() => {
    const job = this.job();
    if (!job) return '';
    return `(attempt ${job.attempts} of ${job.maxAttempts})`;
  });

  /** Only while `retrying` — a job on a later, non-retrying attempt shows no error line (`APF-R-6` C). */
  readonly retryingErrorLine = computed(() => {
    const job = this.job();
    if (!job?.retrying) return '';
    return `Last error: ${errorCopy(job.errorCode).message}`;
  });

  readonly failureCopy = computed(() => errorCopy(this.job()?.errorCode));

  /** Guards "Try again" explicitly rather than relying only on the branch it renders in (`APF-AC-15`). */
  readonly isJobAlive = computed(() => {
    const job = this.job();
    return !!job && (job.status === 'PENDING' || job.status === 'PROCESSING');
  });

  readonly resultCount = computed(() => this.job()?.resultCount ?? 0);

  readonly completedTitle = computed(() => {
    const n = this.resultCount();
    return `${n} result draft${n === 1 ? '' : 's'} ${n === 1 ? 'is' : 'are'} ready`;
  });

  readonly attemptsSummary = computed(() => {
    const job = this.job();
    if (!job) return '';
    return `Attempt ${job.attempts} of ${job.maxAttempts}`;
  });

  readonly shortJobId = computed(() => {
    const id = this.job()?.jobId ?? '';
    return id.length > 8 ? `${id.slice(0, 8)}…` : id;
  });

  /** The short grid caption — never the long sentence carried by `step.label` (reviewer issue 2). */
  stepShortLabel(step: BilateralAiStepModel): string {
    return STEP_SHORT_LABELS[step.id];
  }

  stepDotClass(step: BilateralAiStepModel): string {
    if (step.state === 'done') return 'bg-[var(--pr-color-primary-300)] border-[var(--pr-color-primary-300)]';
    if (step.state === 'active') return 'border-[var(--pr-color-primary-300)] bg-[var(--pr-surface-card)] shadow-[var(--pr-focus-ring)]';
    return 'border-[var(--pr-border)] bg-[var(--pr-surface-card)]';
  }

  stepLabelClass(step: BilateralAiStepModel): string {
    if (step.state === 'done') return 'text-[var(--pr-text-secondary)]';
    if (step.state === 'active') return 'text-[var(--pr-text-heading)] font-semibold';
    return 'text-[var(--pr-text-subtle)]';
  }

  /**
   * Connector fill for the line leading INTO this step. Estimated steps (`step.estimated`, from
   * the T-5 model, previously never read here) render a dotted/repeating fill instead of a solid
   * one, per the mockup's `.step.est::before`; every literal below is a complete, static Tailwind
   * class string so the build-time scanner can find it (a runtime-interpolated class name would
   * never get a generated rule).
   */
  stepConnectorClass(step: BilateralAiStepModel): string {
    if (step.estimated) {
      return step.state === 'done'
        ? 'bg-[image:repeating-linear-gradient(90deg,var(--pr-color-primary-300)_0_6px,transparent_6px_10px)]'
        : 'bg-[image:repeating-linear-gradient(90deg,var(--pr-border)_0_6px,transparent_6px_10px)]';
    }
    return step.state === 'done' ? 'bg-[var(--pr-color-primary-300)]' : 'bg-[var(--pr-border)]';
  }

  onRetry(): void {
    this.retry.emit();
  }

  onReset(): void {
    this.resetUpload.emit();
  }

  onOpenDrafts(): void {
    this.openDrafts.emit();
  }
}
