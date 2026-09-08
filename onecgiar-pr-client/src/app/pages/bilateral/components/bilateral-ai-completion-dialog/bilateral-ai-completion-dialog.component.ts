import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { HlmButton } from '@spartan/button';
import { PrDialogComponent } from '../../../../shared/components/pr-dialog/pr-dialog.component';
import { BilateralAiService } from '../../services/bilateral-ai.service';

/**
 * App-wide dialog that tells the user their AI-assisted job finished — wherever they are.
 *
 * Hosted once in `app.component.html`, next to the other global overlays, because the job outlives
 * the bilateral pages: the upload widget itself says "You can safely close this page", so by the
 * time the server answers the user is typically in another result, another module, or back from
 * a reload. Driven entirely by `BilateralAiService.completionNotice`; it holds no state of its own.
 *
 * Deliberately a dialog and not a navigation or a toast: the forced redirect to Drafts was pulled
 * on 2026-09-04 for tearing people out of their work, and the toast that replaced it was reported
 * on 2026-09-07 as "no feedback at all". Closing keeps the user exactly where they are; "Review
 * drafts" is the only way it moves them.
 */
@Component({
  selector: 'app-bilateral-ai-completion-dialog',
  imports: [PrDialogComponent, HlmButton],
  templateUrl: './bilateral-ai-completion-dialog.component.html',
  styleUrl: './bilateral-ai-completion-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BilateralAiCompletionDialogComponent {
  private readonly ai = inject(BilateralAiService);

  readonly notice = this.ai.completionNotice;

  readonly title = computed(() => {
    switch (this.notice()?.status) {
      case 'completed':
        return 'AI-assisted results are ready';
      case 'completed_no_candidates':
        return 'AI-assisted processing finished';
      case 'failed':
        return 'AI-assisted processing failed';
      default:
        return '';
    }
  });

  readonly center = computed(() => this.notice()?.centerAcronym || 'your center');

  /**
   * Number agreement for the "drafts are ready" copy, which the template assembles itself so the
   * count and the centre can be emphasised (the sheet's `.pr-dialog-text strong`).
   */
  readonly drafts = computed(() => {
    const n = this.notice()?.resultCount ?? 0;
    return n === 1
      ? { label: '1 result draft', was: 'was', is: 'is', them: 'it' }
      : { label: `${n} result drafts`, was: 'were', is: 'are', them: 'them' };
  });

  /** Plain copy for the states that have nothing to emphasise. */
  readonly message = computed(() => {
    const notice = this.notice();
    if (!notice) return '';
    switch (notice.status) {
      case 'completed_no_candidates':
        return `The AI could not extract enough information from the documents you uploaded for ${this.center()}. No drafts were created — try again with more documents or context.`;
      case 'failed':
        return notice.errorMessage || 'An unexpected error occurred during AI processing. Please try again.';
      default:
        return '';
    }
  });

  readonly icon = computed(() => {
    switch (this.notice()?.status) {
      case 'completed':
        return 'auto_awesome';
      case 'completed_no_candidates':
        return 'info';
      case 'failed':
        return 'error_outline';
      default:
        return '';
    }
  });

  /**
   * The sheet's identity follows the outcome: green (promote) for drafts, red for a failure and a
   * neutral blue when the job simply found nothing — the top border must match the header icon.
   */
  readonly panelClass = computed(() => {
    switch (this.notice()?.status) {
      case 'completed':
        return 'pr-dialog--promote';
      case 'failed':
        return 'bacd-panel--failed';
      case 'completed_no_candidates':
        return 'bacd-panel--info';
      default:
        return '';
    }
  });

  /** Only a completed job with drafts has somewhere to go. */
  readonly canReview = computed(() => this.notice()?.status === 'completed');

  close(): void {
    this.ai.dismissCompletionNotice();
  }

  reviewDrafts(): void {
    this.ai.openDraftsFromNotice();
  }
}
