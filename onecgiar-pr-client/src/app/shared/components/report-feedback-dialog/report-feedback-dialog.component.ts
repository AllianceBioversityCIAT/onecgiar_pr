import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, booleanAttribute, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PrDialogComponent } from '../pr-dialog/pr-dialog.component';
import { FeedbackApiService, FeedbackType } from '../../services/api/feedback-api.service';

/**
 * app-report-feedback-dialog — global "Report a bug / adjustment" modal.
 *
 * Text-only report (no images, per P2-3472 scope). Sends {type,title,description}
 * plus auto-collected context (current URL + browser) to POST /api/feedback, which
 * creates a Jira issue (Bug / Enhancement) under the feedback epic.
 *
 * Self-contained state; the host only drives visibility via `[(visible)]`
 * (same pattern as the "Contact us" dialog in app.component.html).
 */
@Component({
  selector: 'app-report-feedback-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, PrDialogComponent],
  templateUrl: './report-feedback-dialog.component.html',
  styleUrl: './report-feedback-dialog.component.scss'
})
export class ReportFeedbackDialogComponent {
  private readonly feedbackApi = inject(FeedbackApiService);

  private _visible = false;
  @Input({ transform: booleanAttribute })
  set visible(value: boolean) {
    if (value === this._visible) return;
    this._visible = value;
    if (value) this.resetForm();
  }
  get visible(): boolean {
    return this._visible;
  }
  @Output() visibleChange = new EventEmitter<boolean>();

  readonly type = signal<FeedbackType>('bug');
  readonly title = signal('');
  readonly description = signal('');

  readonly submitting = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly createdIssueKey = signal<string | null>(null);
  readonly createdIssueUrl = signal<string | null>(null);

  readonly maxTitle = 255;

  get canSubmit(): boolean {
    return !this.submitting() && this.title().trim().length > 0 && this.description().trim().length > 0;
  }

  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  submit(): void {
    if (!this.canSubmit) return;
    this.submitting.set(true);
    this.errorMsg.set(null);

    this.feedbackApi
      .POST_reportFeedback({
        type: this.type(),
        title: this.title().trim(),
        description: this.description().trim(),
        contextUrl: window.location.href,
        userAgent: navigator.userAgent
      })
      .subscribe({
        next: res => {
          this.submitting.set(false);
          this.createdIssueKey.set(res?.response?.issueKey ?? '');
          this.createdIssueUrl.set(res?.response?.issueUrl ?? null);
        },
        error: () => {
          this.submitting.set(false);
          this.errorMsg.set('Something went wrong sending your report. Please try again.');
        }
      });
  }

  private resetForm(): void {
    this.type.set('bug');
    this.title.set('');
    this.description.set('');
    this.submitting.set(false);
    this.errorMsg.set(null);
    this.createdIssueKey.set(null);
    this.createdIssueUrl.set(null);
  }
}
