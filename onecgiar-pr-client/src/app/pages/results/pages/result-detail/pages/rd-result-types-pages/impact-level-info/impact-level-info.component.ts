// @akili-spec results/impact-results-reporting/result-detail-impact (IRD-T-3, design §6.2)
import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, take, tap } from 'rxjs/operators';
import { HlmDialogService } from '@spartan/dialog';
import { PreviousResultsPickerComponent, PreviousResultsPickerContext, PreviousResultsPickerResult } from './components/previous-results-picker/previous-results-picker.component';
import { ApiService } from '../../../../../../../shared/services/api/api.service';
import { CanComponentDeactivate } from '../../../../../../../shared/guards/unsaved-changes.types';
import { SectionDirtyTrackerService } from '../../../../../../../shared/services/unsaved-changes/section-dirty-tracker.service';
import { ImpactLevelInfo, ImpactPreviousResult, ImpactStudyType, SaveImpactLevelBody } from '../../../../../../../shared/interfaces/impact-level.interface';
import { PrYesOrNotComponent } from '../../../../../../../custom-fields/pr-yes-or-not/pr-yes-or-not.component';
import { SaveButtonService } from '../../../../../../../custom-fields/save-button/save-button.service';
import { countWords } from '../../../../../../../shared/utils/impact-word-count.util';

/** Server limit for the contribution statement (requirements IRD-R-4). */
export const IMPACT_CONTRIBUTION_MAX_WORDS = 100;

@Component({
  selector: 'app-impact-level-info',
  templateUrl: './impact-level-info.component.html',
  styleUrls: ['./impact-level-info.component.scss'],
  standalone: false,
  providers: [SectionDirtyTrackerService]
})
export class ImpactLevelInfoComponent implements OnInit, CanComponentDeactivate {
  readonly api = inject(ApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly dirtyTracker = inject(SectionDirtyTrackerService);
  private readonly dialog = inject(HlmDialogService);
  private readonly saveButtonSE = inject(SaveButtonService);

  readonly maxWords = IMPACT_CONTRIBUTION_MAX_WORDS;
  /** Same word definition as the server (IRD-DD-3). */
  readonly impactWordCount = countWords;

  /** Drives `[appSectionSkeleton]`; released on `next` AND `error` of the combined load. */
  readonly sectionLoading = signal(true);
  /** E2 or E3 failed: banner shown, form hidden, save disabled (Scenario 2.3). */
  readonly loadError = signal(false);
  readonly saving = signal(false);
  readonly studyTypes = signal<ImpactStudyType[]>([]);

  /** The Yes/No control, re-written explicitly on revert (see `onPreviouslyReportedChange`). */
  @ViewChild(PrYesOrNotComponent) private yesNoControl?: PrYesOrNotComponent;

  impactStudyTypeId: number | null = null;
  cgiarContribution: string | null = null;
  previouslyReported: boolean | null = null;
  previousResults: ImpactPreviousResult[] = [];

  constructor() {
    this.api.dataControlSE.currentResultSectionName.set('Impact level info');
  }

  ngOnInit(): void {
    this.loadSection();
  }

  get readOnly(): boolean {
    return !!this.api.rolesSE?.readOnly;
  }

  get saveDisabled(): boolean {
    return this.sectionLoading() || this.loadError() || this.saving();
  }

  /** Definition of the selected study type, shown under the select (Scenario 3.1). */
  get selectedDefinition(): string {
    return this.studyTypes().find(type => type.id === this.impactStudyTypeId)?.definition ?? '';
  }

  /** All definitions, listed in the field description (placement to confirm at IRD-T-8). */
  get studyTypeDescription(): string {
    return this.studyTypes()
      .map(type => `${type.name}: ${type.definition}`)
      .join(' ');
  }

  /** Text of the polite live region (IRD-NFR-1); the shared counter is not live and is not touched. */
  get wordCountAnnouncement(): string {
    return `${countWords(this.cgiarContribution)} of ${IMPACT_CONTRIBUTION_MAX_WORDS} words`;
  }

  get contributionOverLimit(): boolean {
    return countWords(this.cgiarContribution) > IMPACT_CONTRIBUTION_MAX_WORDS;
  }

  private loadSection(): void {
    const resultId = this.api.resultsSE.currentResultId;
    forkJoin([this.api.resultsSE.GET_impactStudyTypes(), this.api.resultsSE.GET_impactLevelInfo(resultId)]).subscribe({
      next: ([types, info]) => {
        this.studyTypes.set(types?.response ?? []);
        this.hydrate(info?.response);
        this.dirtyTracker.snapshot(this.dirtyValue());
        this.sectionLoading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.sectionLoading.set(false);
      }
    });
  }

  /** The server is the source of truth: used on load and after a successful save. */
  private hydrate(info: ImpactLevelInfo | null | undefined): void {
    this.impactStudyTypeId = info?.impact_study_type_id ?? null;
    this.cgiarContribution = info?.cgiar_contribution ?? null;
    this.previouslyReported = info?.previously_reported ?? null;
    this.previousResults = info?.previous_results ? [...info.previous_results] : [];
  }

  private dirtyValue(): SaveImpactLevelBody {
    return this.buildBody();
  }

  /** Full E4 body: all four keys always; No never sends ids (Scenario 5.1). */
  buildBody(): SaveImpactLevelBody {
    const contribution = this.cgiarContribution;
    return {
      impact_study_type_id: this.impactStudyTypeId ?? null,
      cgiar_contribution: contribution === null || contribution === undefined || contribution === '' ? null : contribution,
      previously_reported: this.previouslyReported ?? null,
      previous_result_ids: this.previouslyReported === true ? this.previousResults.map(result => result.result_id) : []
    };
  }

  /** Yes/No change. Switching to No with links asks first (Scenario 5.1); the control is put back to Yes until confirmed. */
  onPreviouslyReportedChange(value: boolean): void {
    if (value !== false || !this.previousResults.length) return;
    const count = this.previousResults.length;
    this.previouslyReported = true;
    // `pr-yes-or-not` already wrote "No" into itself and ngModel, and the `[ngModel]` binding value is
    // unchanged (true -> true), so ngModel would never re-write it: push Yes back into the control.
    this.yesNoControl?.writeValue(true);
    this.api.alertsFe.show(
      {
        id: 'impact-switch-to-no',
        title: 'Remove linked results?',
        description: `${count} ${count === 1 ? 'link' : 'links'} will be removed.`,
        status: 'warning',
        confirmText: 'Switch to No'
      },
      () => {
        this.previouslyReported = false;
        this.previousResults = [];
        // ngModel's view value is already `false` here, so it would skip the write: set the control directly.
        this.yesNoControl?.writeValue(false);
        this.cdr.markForCheck();
      }
    );
  }

  removePreviousResult(resultId: number): void {
    const index = this.previousResults.findIndex(result => result.result_id === resultId);
    this.previousResults = this.previousResults.filter(result => result.result_id !== resultId);
    // The focused Remove button is destroyed with its row: render now, then move focus to the next row's
    // Remove button, else the previous one, else "Add results" (IRD-NFR-1).
    this.cdr.detectChanges();
    const root = this.host.nativeElement;
    const buttons = root.querySelectorAll<HTMLElement>('[data-cy="impact-remove-result"]');
    const target = buttons.length ? buttons[Math.min(Math.max(index, 0), buttons.length - 1)] : root.querySelector<HTMLElement>('[data-cy="impact-add-results"]');
    target?.focus();
  }

  /**
   * Opens the picker (IRD-T-4). The dialog edits its own working copy; the list is replaced only when it
   * closes with a selection (Done). Cancel/Escape close with `undefined` and change nothing. CDK restores
   * focus to "Add results" (the element focused before opening).
   */
  openPreviousResultsPicker(): void {
    const context: PreviousResultsPickerContext = { resultId: this.api.resultsSE.currentResultId, initialSelection: [...this.previousResults] };
    const ref = this.dialog.open<PreviousResultsPickerResult, PreviousResultsPickerContext>(PreviousResultsPickerComponent, {
      context,
      // Helm classes are concatenated, not tailwind-merged: the `!` beats `sm:max-w-md`. px, not rem (root is 12px).
      contentClass: 'sm:max-w-[760px]! overflow-visible',
      showCloseButton: false
    });
    ref.closed$.pipe(take(1)).subscribe(selection => {
      if (!selection) return;
      this.previousResults = [...selection];
      this.cdr.markForCheck();
    });
  }

  hasUnsavedChanges(): boolean {
    return this.dirtyTracker.isDirty(this.dirtyValue());
  }

  saveSection(): Observable<boolean> {
    return this.performSave();
  }

  onSaveSection(): void {
    this.performSave().subscribe();
  }

  /** The server's 400 message is shown verbatim (Scenario 7.3); Nest may send a string or a list. */
  private serverMessage(error: any): string {
    const message = error?.error?.message;
    if (Array.isArray(message)) return message.join(' ');
    return message || 'The section could not be saved.';
  }

  private performSave(): Observable<boolean> {
    if (this.loadError() || this.sectionLoading()) return of(false);
    if (this.contributionOverLimit) {
      this.api.alertsFe.show({
        id: 'impact-over-limit',
        title: 'Contribution is too long',
        description: `The CGIAR contribution statement can have up to ${IMPACT_CONTRIBUTION_MAX_WORDS} words.`,
        status: 'error'
      });
      return of(false);
    }

    this.saving.set(true);
    return this.api.resultsSE.PATCH_impactLevelInfo(this.api.resultsSE.currentResultId, this.buildBody()).pipe(
      tap(({ response }) => {
        this.hydrate(response);
        // Snapshot inside the success tap so `hasUnsavedChanges()` never reads dirty during the round-trip.
        this.dirtyTracker.snapshot(this.dirtyValue());
        this.saving.set(false);
        // IRD-T-8 F-3: field cards clear their "Unsaved changes" chip on a SUCCESSFUL settle (`savedTick`).
        this.saveButtonSE.savedTick.update(count => count + 1);
        this.api.alertsFe.show({ id: 'impact-saved', title: 'Impact level info', description: 'Section saved correctly', status: 'success', closeIn: 500 });
      }),
      map(() => true),
      catchError(error => {
        // The form keeps what the user typed; only the server message is shown.
        this.saving.set(false);
        this.api.alertsFe.show({
          id: 'impact-save-error',
          title: 'Impact level info',
          description: this.serverMessage(error),
          status: 'error'
        });
        return of(false);
      })
    );
  }
}
