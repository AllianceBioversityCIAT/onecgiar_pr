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

  readonly message = computed(() => {
    const notice = this.notice();
    if (!notice) return '';
    const center = notice.centerAcronym || 'your center';
    switch (notice.status) {
      case 'completed': {
        const n = notice.resultCount;
        return `${n} result draft${n === 1 ? '' : 's'} ${n === 1 ? 'was' : 'were'} identified from your documents and ${n === 1 ? 'is' : 'are'} waiting in the Drafts list of ${center}. You can review ${n === 1 ? 'it' : 'them'} now or keep working and come back later.`;
      }
      case 'completed_no_candidates':
        return `The AI could not extract enough information from the documents you uploaded for ${center}. No drafts were created — try again with more documents or context.`;
      case 'failed':
        return notice.errorMessage || 'An unexpected error occurred during AI processing. Please try again.';
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

  /** Only a completed job with drafts has somewhere to go. */
  readonly canReview = computed(() => this.notice()?.status === 'completed');

  close(): void {
    this.ai.dismissCompletionNotice();
  }

  reviewDrafts(): void {
    this.ai.openDraftsFromNotice();
  }
}
