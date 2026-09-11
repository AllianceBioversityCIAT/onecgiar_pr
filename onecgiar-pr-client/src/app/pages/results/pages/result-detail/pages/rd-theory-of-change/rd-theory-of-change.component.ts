import { ChangeDetectorRef, Component, inject, OnInit, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { ResultTocResultsInterface, TheoryOfChangeBody } from './model/theoryOfChangeBody';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ResultLevelService } from '../../../result-creator/services/result-level.service';
import { InstitutionsService } from '../../../../../../shared/services/global/institutions.service';
import { GreenChecksService } from '../../../../../../shared/services/global/green-checks.service';
import { RdTheoryOfChangesServicesService } from './rd-theory-of-changes-services.service';
import { DataControlService } from '../../../../../../shared/services/data-control.service';
import { filterOutAvisaInitiatives } from '../../../../../../shared/utils/avisa-initiative.util';
import { CanComponentDeactivate } from '../../../../../../shared/guards/unsaved-changes.types';
import { SectionDirtyTrackerService } from '../../../../../../shared/services/unsaved-changes/section-dirty-tracker.service';

@Component({
  selector: 'app-rd-theory-of-change',
  templateUrl: './rd-theory-of-change.component.html',
  styleUrls: ['./rd-theory-of-change.component.scss'],
  standalone: false,
  providers: [SectionDirtyTrackerService]
})
export class RdTheoryOfChangeComponent implements OnInit, CanComponentDeactivate {
  theoryOfChangeBody = new TheoryOfChangeBody();
  contributingInitiativesList = [];
  getConsumed = false;
  /**
   * Drives `[appSectionSkeleton]`. Mirrors `getConsumed`, but as a signal: the template reads it
   * from a host binding and Angular 21 is zoneless, so a plain boolean flipped inside an HTTP
   * subscriber no longer schedules a render on its own. Released on `next` AND `error` so a
   * failed GET can never leave the section shimmering forever.
   */
  readonly sectionLoading = signal(true);
  contributingInitiativeNew = [];

  submitter: string = '';

  disabledOptions = [];

  /**
   * `UCA-T-10` — component-scoped dirty-diff tracker (`providers: [SectionDirtyTrackerService]`
   * on this component). Snapshotted at the true end of `getSectionInformation()`'s load flow and
   * again directly in `performSave()`'s success branch. See
   * `docs/specs/changes/unsaved-changes-alert/design.md` `UCA-DD-1`.
   */
  private readonly dirtyTracker = inject(SectionDirtyTrackerService);

  constructor(
    public api: ApiService,
    public resultLevelSE: ResultLevelService,
    public institutionsSE: InstitutionsService,
    public greenChecksSE: GreenChecksService,
    public theoryOfChangesServices: RdTheoryOfChangesServicesService,
    public dataControlSE: DataControlService,
    private readonly changeDetectorRef: ChangeDetectorRef
  ) {
    this.api.dataControlSE.currentResultSectionName.set('Theory of Change');
  }

  ngOnInit() {
    this.getSectionInformation();
    this.GET_AllWithoutResults();
  }

  GET_AllWithoutResults() {
    this.api.resultsSE.GET_resultById().subscribe({
      next: ({ response }) => {
        this.api.dataControlSE.currentResult = response;
        const activePortfolio = this.api.dataControlSE.currentResult?.portfolio;
        this.api.resultsSE.GET_AllWithoutResults(activePortfolio).subscribe(({ response }) => {
          this.contributingInitiativesList = filterOutAvisaInitiatives(response);
          this.changeDetectorRef.detectChanges();
        });
      },
      error: err => {
        console.error(err);
      }
    });
  }

  getSectionInformation(callback?) {
    this.theoryOfChangesServices.body = [];
    this.api.resultsSE.GET_toc().subscribe({
      next: ({ response }) => {
        // Released FIRST, before any mapping. The mask carries `inert`, so an exception thrown
        // further down (several accesses below are only half-guarded: `body?.x.y`) would leave the
        // section permanently uneditable — strictly worse than the half-filled-but-usable form the
        // same exception produced before the skeleton existed. Same tick, so no visual change.
        this.sectionLoading.set(false);
        this.theoryOfChangeBody = response;

        this.theoryOfChangeBody?.contributing_and_primary_initiative.forEach(
          init => (init.full_name = `${init?.official_code} - <strong>${init?.short_name}</strong> - ${init?.initiative_name}`)
        );
        this.submitter = this.theoryOfChangeBody.contributing_and_primary_initiative.find(
          init => init.id === this.theoryOfChangeBody?.result_toc_result?.initiative_id
        )?.full_name;

        if (this.theoryOfChangeBody?.impactsTarge)
          this.theoryOfChangeBody?.impactsTarge.forEach(item => (item.full_name = `<strong>${item.name}</strong> - ${item.target}`));
        if (this.theoryOfChangeBody?.sdgTargets)
          this.theoryOfChangeBody?.sdgTargets.forEach(item => (item.full_name = `<strong>${item.sdg_target_code}</strong> - ${item.sdg_target}`));

        this.theoryOfChangesServices.theoryOfChangeBody = this.theoryOfChangeBody;

        if (this.theoryOfChangeBody?.result_toc_result?.result_toc_results !== null) {
          this.theoryOfChangesServices.result_toc_result = this.theoryOfChangeBody?.result_toc_result;
          this.theoryOfChangesServices.result_toc_result.planned_result =
            this.theoryOfChangeBody?.result_toc_result?.result_toc_results[0].planned_result ?? null;
          this.theoryOfChangesServices.result_toc_result.showMultipleWPsContent = true;
        }

        if (this.theoryOfChangeBody?.contributors_result_toc_result !== null) {
          this.theoryOfChangesServices.contributors_result_toc_result = this.theoryOfChangeBody?.contributors_result_toc_result;
          this.theoryOfChangesServices.contributors_result_toc_result.forEach((tab: any, index) => {
            tab.planned_result = tab.result_toc_results[0]?.planned_result ?? null;
            tab.index = index;
            tab.showMultipleWPsContent = true;
          });
        }

        this.theoryOfChangeBody.changePrimaryInit = this.theoryOfChangeBody?.result_toc_result.initiative_id;

        this.disabledOptions = [
          ...(this.theoryOfChangeBody?.contributing_initiatives.accepted_contributing_initiatives || []),
          ...(this.theoryOfChangeBody?.contributing_initiatives.pending_contributing_initiatives || [])
        ];

        // `UCA-T-10` — every mutation THIS GET's `next` handler makes to `theoryOfChangeBody`
        // happens synchronously, right here in this same callback — verified by reading the full
        // method body. `GET_AllWithoutResults()` (`ngOnInit()`'s other, independent call) only
        // ever touches `contributingInitiativesList`, never `theoryOfChangeBody`.
        //
        // That is NOT the whole picture, though (rework, attempt 1 FAIL — an earlier revision of
        // this comment wrongly claimed "safe to snapshot now" as if it were): the rendered child
        // subtree (`MultipleWPsComponent`/`MultipleWPsContentComponent`, mounted for both
        // `result_toc_result` and each `contributors_result_toc_result` entry) mutates the SAME
        // tracked `result_toc_results` rows on every render, AFTER this snapshot already ran — see
        // `dirtySnapshotValue()` below for the full account and the normalization that neutralizes
        // it. What IS still true, and is what makes the fix possible instead of chasing a moving
        // async target, is that this method's own mutations are synchronous and complete.
        this.dirtyTracker.snapshot(this.dirtySnapshotValue());

        this.getConsumed = true;
        this.changeDetectorRef.detectChanges();
      },
      error: err => {
        this.getConsumed = true;
        this.sectionLoading.set(false);
        this.changeDetectorRef.detectChanges();
        console.error(err);
      },
      complete: () => {
        if (callback) callback();
      }
    });
  }

  /**
   * `UCA-T-10`: builds the exact PATCH-equivalent payload `onSaveSection()` always built, factored
   * out so both the manual Save action and `saveSection()` (`CanComponentDeactivate`) send the
   * identical body — no duplicated save logic (`UCA-DD-3`). Note this mutates
   * `theoryOfChangeBody.result_toc_result.result_toc_results` (filters out null `toc_result_id`
   * rows) as a side effect, same as the original inline code.
   */
  private buildSendedData() {
    this.theoryOfChangeBody.bodyActionArea = this.theoryOfChangesServices.resultActionArea;

    this.theoryOfChangeBody.result_toc_result = this.theoryOfChangesServices.theoryOfChangeBody.result_toc_result;
    this.theoryOfChangeBody.contributors_result_toc_result = this.theoryOfChangesServices.theoryOfChangeBody.contributors_result_toc_result;

    this.theoryOfChangeBody.result_toc_result.result_toc_results =
      this.theoryOfChangeBody.result_toc_result.result_toc_results.length === 1
        ? this.theoryOfChangeBody.result_toc_result.result_toc_results
        : this.theoryOfChangeBody?.result_toc_result?.result_toc_results.filter(result => result.toc_result_id !== null);

    return {
      ...this.theoryOfChangeBody,
      contributing_initiatives: {
        ...this.theoryOfChangeBody.contributing_initiatives,
        pending_contributing_initiatives: [
          ...this.theoryOfChangeBody.contributing_initiatives.pending_contributing_initiatives,
          ...this.contributingInitiativeNew
        ]
      },
      email_template: 'email_template_contribution'
    };
  }

  /**
   * `UCA-T-10`: returns the `POST_toc` `Observable` instead of self-subscribing, so both this
   * component's own Save action (`onSaveSection`, below) and `saveSection()` (the
   * `CanComponentDeactivate` contract) drive the exact same call and success branch — no
   * duplicated save logic (`UCA-DD-3`).
   *
   * `viaGuard` (Issue 4, rework attempt 2): when `saveSection()` calls this (Back/Next silent save,
   * or the guard's dialog Save), the `location.reload()` branch below is suppressed and the
   * `getSectionInformation()` branch is taken instead — even when the primary submitter changed.
   * Reason: `location.reload()` reloads the CURRENT url mid-navigation, destroying the guard's
   * pending navigation (`UCA-R-4`/`UCA-AC-4` require it to resume to the section the user actually
   * clicked). `saveSection()` already deliberately bypasses the primary-submitter confirmation
   * dialog (accepted precedent, see `saveSection()`'s own docstring below), so this reload branch
   * would otherwise be reachable with no warning to the user at all. The manual Save path
   * (`onSaveSection()`) is untouched — it still reloads on a changed primary submitter, which is
   * the existing, intended behavior there (the user is warned via the confirmation dialog first).
   */
  private performSave(sendedData, viaGuard = false): Observable<void> {
    return this.api.resultsSE.POST_toc(sendedData).pipe(
      tap(() => {
        this.getConsumed = false;
        // `UCA-T-10` — snapshot HERE, synchronously, the instant the POST resolves. Closes the
        // same class of race `UCA-T-6`'s rework fixed: `saveSection()`'s `map(() => true)` could
        // otherwise emit to `UnsavedChangesGuard` BEFORE the branch below (a full page reload, or
        // `getSectionInformation()`'s own async load-flow re-snapshot) resolves — or, on the
        // reload branch, never resolve at all within this component's lifetime.
        this.dirtyTracker.snapshot(this.dirtySnapshotValue());
        const primarySubmitterChanged = this.theoryOfChangeBody?.result_toc_result?.initiative_id !== this.theoryOfChangeBody.changePrimaryInit;
        primarySubmitterChanged && !viaGuard ? location.reload() : this.getSectionInformation();
        this.contributingInitiativeNew = [];
      }),
      map(() => undefined)
    );
  }

  onSaveSection() {
    const sendedData = this.buildSendedData();

    const doSave = () => {
      this.performSave(sendedData).subscribe();
    };

    const newInit = this.theoryOfChangeBody.contributing_and_primary_initiative.find(init => init.id === this.theoryOfChangeBody?.changePrimaryInit);
    const newInitOfficialCode = newInit?.official_code;

    if (this.theoryOfChangeBody?.result_toc_result?.official_code !== newInitOfficialCode)
      return this.api.alertsFe.show(
        {
          id: 'primary-submitter',
          title: 'Change in primary submitter',
          description: `The <strong>${newInitOfficialCode}</strong> will now be the primary submitter of this result and will have exclusive editing rights for all sections and submission. <strong>${this.theoryOfChangeBody?.result_toc_result?.official_code}</strong> will lose editing and submission rights but will remain as a contributing Initiative in this result. <br> <br> Please ensure that the new primary submitter of this result is aware of this change.`,
          status: 'success',
          confirmText: 'Proceed'
        },
        () => {
          doSave();
        }
      );

    return doSave();
  }

  /** `UCA-T-10` — `CanComponentDeactivate.hasUnsavedChanges()`. */
  hasUnsavedChanges(): boolean {
    return this.dirtyTracker.isDirty(this.dirtySnapshotValue());
  }

  /**
   * `UCA-T-10` — `CanComponentDeactivate.saveSection()`. Deliberately bypasses the
   * primary-submitter-change confirmation dialog (`api.alertsFe.show(...)`, in `onSaveSection()`
   * above) that gates a manual Save click: same precedent as `UCA-T-6`'s P25
   * discontinued-options confirmation modal, also bypassed by its wrapped `saveSection()`. Per
   * `UCA-DD-3`, the guard's silent auto-save (Back/Next) drives the exact same underlying persist
   * call — not the manual-click UI affordances layered on top of it.
   *
   * Passes `viaGuard = true` to `performSave()` (Issue 4, rework attempt 2) so a changed primary
   * submitter never triggers `location.reload()` on this path — see `performSave()`'s docstring.
   */
  saveSection(): Observable<boolean> {
    const sendedData = this.buildSendedData();
    return this.performSave(sendedData, true).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  /**
   * `UCA-T-10` (Issue 2, rework attempt 2) — the value the dirty tracker snapshots/diffs. Projects
   * out every field the rendered ToC child subtree writes onto the tracked `result_toc_results`
   * rows (or their owning initiative object) AFTER `getSectionInformation()`'s own snapshot, so the
   * diff is insensitive to that decoration. Same shape as `UCA-T-7`'s `normalizeCountriesForDiff()`
   * — this is this section's own `UCA-OQ-2` exception.
   *
   * Verified writers (read in full, not assumed):
   * - `MultipleWPsComponent.ngOnChanges()` stamps a FRESH random `uniqueId` on EVERY row on EVERY
   *   change-detection pass — worse than a stable/deterministic key, it can never converge across
   *   renders, so re-snapshotting after some "settled" point cannot work here; normalization is the
   *   only option (`toc-initiative-out/multiple-wps/multiple-wps.component.ts`).
   * - `MultipleWPsContentComponent.getIndicator()` writes `indicators`, `impactAreasTargets`,
   *   `sdgTargest`, `actionAreaOutcome`, `is_sdg_action_impact` and `wpinformation` onto `activeTab`
   *   (`initiative.result_toc_results[0]`) once its `Get_indicator` call resolves
   *   (`toc-initiative-out/multiple-wps/components/multiple-wps-content/multiple-wps-content.component.ts`).
   * - `getSectionInformation()` itself (and `TocInitiativeOutComponent.clearTocResultId()`, on user
   *   edit) sets `.showMultipleWPsContent`/`.index` on the initiative object (main
   *   `result_toc_result` and each `contributors_result_toc_result` entry) — stable at load time,
   *   projected out anyway for symmetry with the row-level fields above.
   */
  private dirtySnapshotValue(): Partial<TheoryOfChangeBody> {
    return {
      ...this.theoryOfChangeBody,
      result_toc_result: this.normalizeInitiativeForDiff(this.theoryOfChangeBody?.result_toc_result),
      contributors_result_toc_result: (this.theoryOfChangeBody?.contributors_result_toc_result ?? []).map(contributor =>
        this.normalizeInitiativeForDiff(contributor)
      )
    } as Partial<TheoryOfChangeBody>;
  }

  private normalizeInitiativeForDiff(initiative: any): any {
    if (!initiative) return initiative;
    const { showMultipleWPsContent, index, result_toc_results, ...rest } = initiative;
    return { ...rest, result_toc_results: this.normalizeTocResultsForDiff(result_toc_results) };
  }

  private normalizeTocResultsForDiff(rows: any[] | undefined | null): any[] {
    return (rows ?? []).map(row => {
      const { uniqueId, indicators, impactAreasTargets, sdgTargest, actionAreaOutcome, is_sdg_action_impact, wpinformation, ...rest } = row ?? {};
      return rest;
    });
  }

  someEditable() {
    return Boolean(document.querySelector('.global-editable'));
  }

  onSelectContributingInitiative() {
    this.theoryOfChangeBody?.contributing_initiatives.accepted_contributing_initiatives.forEach((resp: any) => {
      const contributorFinded = this.theoryOfChangeBody.contributors_result_toc_result?.find((result: any) => result?.initiative_id === resp.id);
      const contributorToPush = new ResultTocResultsInterface();
      contributorToPush.initiative_id = resp.id;
      contributorToPush.short_name = resp.short_name;
      contributorToPush.official_code = resp.official_code;
      if (!contributorFinded) this.theoryOfChangeBody.contributors_result_toc_result?.push(contributorToPush);
    });
  }

  toggleActiveContributor(item) {
    item.is_active = !item.is_active;
  }

  onRemoveContributingInitiative(e) {
    const contributorFinded = this.theoryOfChangeBody.contributors_result_toc_result?.findIndex(
      (result: any) => result?.initiative_id === e.remove.id
    );
    this.theoryOfChangeBody.contributors_result_toc_result.splice(contributorFinded, 1);
    this.theoryOfChangeBody.contributing_and_primary_initiative = this.theoryOfChangeBody.contributing_and_primary_initiative?.filter(
      init => init.id !== e.remove.id
    );
  }

  onRemoveAcceptedContributing(index: number) {
    this.theoryOfChangeBody?.contributing_initiatives.accepted_contributing_initiatives.splice(index, 1);
  }

  onRemoveNewContributing(index: number) {
    this.contributingInitiativeNew.splice(index, 1);
  }
}
