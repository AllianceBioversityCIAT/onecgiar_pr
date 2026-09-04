import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, booleanAttribute, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PrDialogComponent } from '../pr-dialog/pr-dialog.component';
import {
  FeedbackApiService,
  FeedbackAttachment,
  FeedbackPriorityId,
  FeedbackReport,
  FeedbackType
} from '../../services/api/feedback-api.service';
import { ConsoleCaptureService } from '../../services/console-capture.service';
import { CustomFieldsModule } from '../../../custom-fields/custom-fields.module';

type DialogMode = 'report' | 'view';

const MAX_USER_FILES = 4;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

/**
 * app-report-feedback-dialog — global "Report a bug / adjustment" modal.
 *
 * Two modes behind one button (Yeck, 3-sep-2026): `report` files a new one,
 * `view` lists the ones this person already reported, with their stage.
 *
 * The list is resolved live from Jira on every open — nothing about these
 * reports is stored on our side, and the payload the server returns is a
 * whitelist: no internal comments, no assignee, no activity.
 *
 * Self-contained state; the host only drives visibility via `[(visible)]`
 * (same pattern as the "Contact us" dialog in app.component.html).
 */
@Component({
  selector: 'app-report-feedback-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, PrDialogComponent, CustomFieldsModule],
  templateUrl: './report-feedback-dialog.component.html',
  styleUrl: './report-feedback-dialog.component.scss'
})
export class ReportFeedbackDialogComponent {
  private readonly feedbackApi = inject(FeedbackApiService);
  private readonly consoleCapture = inject(ConsoleCaptureService);

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

  readonly mode = signal<DialogMode>('report');

  readonly type = signal<FeedbackType>('bug');
  readonly title = signal('');
  readonly description = signal('');
  readonly priority = signal<FeedbackPriorityId>('3');
  /**
   * Images the user attached themselves. 🛑 There is no automatic capture of
   * the screen any more — removed 4-sep-2026 (Yeck): painting the viewport to
   * a canvas froze the reporters' machines. Only files the user picks.
   */
  readonly userFiles = signal<FeedbackAttachment[]>([]);
  readonly fileError = signal<string | null>(null);

  readonly submitting = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly createdIssueKey = signal<string | null>(null);
  readonly createdIssueUrl = signal<string | null>(null);
  readonly joinedExisting = signal(false);

  /** Possible duplicates of what the user is typing. */
  readonly similar = signal<FeedbackReport[]>([]);
  readonly similarChecked = signal(false);

  /** "View" mode. */
  readonly myReports = signal<FeedbackReport[]>([]);
  readonly loadingReports = signal(false);
  readonly reportsError = signal<string | null>(null);

  readonly maxTitle = 255;
  readonly priorities: { id: FeedbackPriorityId; label: string }[] = [
    { id: '1', label: 'Highest' },
    { id: '2', label: 'High' },
    { id: '3', label: 'Medium' },
    { id: '4', label: 'Low' },
    { id: '5', label: 'Lowest' }
  ];

  private similarTimer: ReturnType<typeof setTimeout> | null = null;

  get canSubmit(): boolean {
    return !this.submitting() && this.title().trim().length > 0 && this.description().trim().length > 0;
  }

  // ------------------------------------------------------------------- modes

  setMode(mode: DialogMode): void {
    this.mode.set(mode);
    if (mode === 'view') this.loadMyReports();
  }

  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  // ------------------------------------------------------------------ report

  /** Looks for existing reports like this one, debounced while typing. */
  onTitleChange(value: string): void {
    this.title.set(value);
    if (this.similarTimer) clearTimeout(this.similarTimer);

    const query = value.trim();
    if (query.length < 6) {
      this.similar.set([]);
      this.similarChecked.set(false);
      return;
    }

    this.similarTimer = setTimeout(() => {
      this.feedbackApi.GET_similarFeedbackReports(query).subscribe({
        next: res => {
          this.similar.set(res?.response ?? []);
          this.similarChecked.set(true);
        },
        // Silent on purpose: this is an aid, not a requirement to report.
        error: () => this.similar.set([])
      });
    }, 500);
  }

  /** "This happened to me too" — joins that report instead of duplicating it. */
  joinReport(report: FeedbackReport): void {
    if (this.submitting()) return;
    this.submitting.set(true);
    this.errorMsg.set(null);

    this.feedbackApi.POST_meTooFeedback(report.issueKey).subscribe({
      next: res => {
        this.submitting.set(false);
        this.joinedExisting.set(true);
        this.createdIssueKey.set(res?.response?.issueKey ?? report.issueKey);
        this.createdIssueUrl.set(res?.response?.issueUrl ?? report.issueUrl);
      },
      error: () => {
        this.submitting.set(false);
        this.errorMsg.set('We could not add you to that report. Please try again.');
      }
    });
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input?.files ?? []);
    this.fileError.set(null);
    if (!files.length) return;

    const accepted: FeedbackAttachment[] = [];
    const room = MAX_USER_FILES - this.userFiles().length;

    for (const file of files.slice(0, Math.max(room, 0))) {
      if (!file.type.startsWith('image/')) {
        this.fileError.set('Only images can be attached.');
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        this.fileError.set(`"${file.name}" is over 5MB and was skipped.`);
        continue;
      }
      accepted.push({ name: file.name, mimeType: file.type, dataBase64: '' });
      this.readFile(file, accepted[accepted.length - 1]);
    }

    if (files.length > Math.max(room, 0)) {
      this.fileError.set(`You can attach up to ${MAX_USER_FILES} images.`);
    }
    this.userFiles.update(current => [...current, ...accepted]);
    // Let the same file be picked again after removing it.
    if (input) input.value = '';
  }

  removeFile(index: number): void {
    this.userFiles.update(current => current.filter((_, i) => i !== index));
    this.fileError.set(null);
  }

  submit(): void {
    if (!this.canSubmit) return;
    this.submitting.set(true);
    this.errorMsg.set(null);

    // Only what the user attached themselves — nothing is captured for them.
    const attachments = this.userFiles().filter(f => f.dataBase64);

    this.feedbackApi
      .POST_reportFeedback({
        type: this.type(),
        title: this.title().trim(),
        description: this.description().trim(),
        contextUrl: window.location.href,
        userAgent: navigator.userAgent,
        priority: this.priority(),
        attachments,
        consoleLogs: this.consoleCapture.snapshot()
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

  // -------------------------------------------------------------------- view

  loadMyReports(): void {
    this.loadingReports.set(true);
    this.reportsError.set(null);

    this.feedbackApi.GET_myFeedbackReports().subscribe({
      next: res => {
        this.loadingReports.set(false);
        this.myReports.set(res?.response ?? []);
      },
      error: () => {
        this.loadingReports.set(false);
        this.reportsError.set('We could not load your reports right now.');
      }
    });
  }

  // ----------------------------------------------------------------- helpers

  private readFile(file: File, target: FeedbackAttachment): void {
    const reader = new FileReader();
    reader.onload = () => {
      target.dataBase64 = String(reader.result ?? '');
      // The array holds the same object references; nudge the signal so the
      // template re-reads it now that this entry actually has content.
      this.userFiles.update(current => [...current]);
    };
    reader.readAsDataURL(file);
  }

  private resetForm(): void {
    this.mode.set('report');
    this.type.set('bug');
    this.title.set('');
    this.description.set('');
    this.priority.set('3');
    this.userFiles.set([]);
    this.fileError.set(null);
    this.submitting.set(false);
    this.errorMsg.set(null);
    this.createdIssueKey.set(null);
    this.createdIssueUrl.set(null);
    this.joinedExisting.set(false);
    this.similar.set([]);
    this.similarChecked.set(false);
    this.myReports.set([]);
    this.reportsError.set(null);
    if (this.similarTimer) clearTimeout(this.similarTimer);
  }
}
