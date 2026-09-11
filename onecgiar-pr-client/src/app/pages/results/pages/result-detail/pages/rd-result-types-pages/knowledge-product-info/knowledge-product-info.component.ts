import { Component, OnInit, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { ApiService } from '../../../../../../../shared/services/api/api.service';
import { FullFairData, KnowledgeProductBody } from './model/knowledgeProductBody';
import {
  FairDimension,
  fairBorderColor,
  fairInnerColor,
  mapKnowledgeProductBody,
  splitFairDimensions
} from './model/knowledge-product-metadata.mapper';
import { KnowledgeProductBodyMapped } from './model/KnowledgeProductBodyMapped';
import { KnowledgeProductSaveDto } from './model/knowledge-product-save.dto';
import { TocMeliaStudyItem } from './model/toc-melia-study.interface';
import { RolesService } from '../../../../../../../shared/services/global/roles.service';
import { CustomizedAlertsFeService } from '../../../../../../../shared/services/customized-alerts-fe.service';
import { FieldsManagerService } from '../../../../../../../shared/services/fields-manager.service';
import { CanComponentDeactivate } from '../../../../../../../shared/guards/unsaved-changes.types';
import { SectionDirtyTrackerService } from '../../../../../../../shared/services/unsaved-changes/section-dirty-tracker.service';

@Component({
  selector: 'app-knowledge-product-info',
  templateUrl: './knowledge-product-info.component.html',
  styleUrls: ['./knowledge-product-info.component.scss'],
  standalone: false,
  providers: [SectionDirtyTrackerService]
})
export class KnowledgeProductInfoComponent implements OnInit, CanComponentDeactivate {
  knowledgeProductBody = new KnowledgeProductBodyMapped();
  sectionData: KnowledgeProductSaveDto = new KnowledgeProductSaveDto();
  meliaTypes = [];
  ostMeliaStudies = [];
  tocMeliaStudiesList: TocMeliaStudyItem[] = [];
  fair_data: FairDimension[];

  constructor(
    public api: ApiService,
    public fieldsManagerSE: FieldsManagerService,
    public rolesSE: RolesService,
    private customizedAlertsFeSE: CustomizedAlertsFeService,
    private dirtyTracker: SectionDirtyTrackerService
  ) {
    this.api.dataControlSE.currentResultSectionName.set('Knowledge product information');
  }

  get fairGuideline(): string {
    const repositoryName = this.knowledgeProductBody?.source || 'the repository';
    return `FAIR (findability, accessibility, interoperability, and reusability) scores are used to support reporting that aligns with the <a href="https://cgspace.cgiar.org/handle/10568/113623" target="_blank">CGIAR Open and FAIR Data Assets Policy</a>. FAIR scores are calculated based on the presence or absence of metadata in ${repositoryName}. If you wish to enhance the FAIR score for a knowledge product, review the metadata flagged with a red icon below and liaise with your Center's knowledge management team to implement improvements.`;
  }

  /**
   * Drives `[appSectionSkeleton]`. TRUE from construction: the body object is empty until the
   * section GET lands, so without it every mandatory field paints orange ("empty") first.
   * Released on `next` AND `error` — a failed GET must not leave the section shimmering.
   */
  readonly sectionLoading = signal(true);

  ngOnInit(): void {
    this.getSectionInformation();
  }

  getSectionInformation() {
    this.api.resultsSE.GET_resultknowledgeProducts().subscribe({
      next: ({ response }) => {
        this.knowledgeProductBody = this._mapFields(response as KnowledgeProductBody);
        this.sectionData.clarisaMeliaTypeId = response.melia_type_id;
        this.sectionData.isMeliaProduct = response.is_melia;
        this.sectionData.ostMeliaId = response.ost_melia_study_id;
        this.sectionData.ostSubmitted = response.melia_previous_submitted;
        if (this.api.fieldsManagerSE.isP25()) {
          this.sectionData.tocMeliaStudyId = response.toc_melia_study_id ?? null;
          const currentResult = this.api.dataControlSE.currentResultSignal() ?? this.api.dataControlSE.currentResult;
          const programId = currentResult?.initiative_id;
          if (programId != null) {
            // `UCA-T-11`: this async call only ever writes to `tocMeliaStudiesList` (a dropdown
            // catalog), never to `sectionData` (the tracked/save-payload object) — so it does not
            // need to settle before the snapshot below, unlike the child-mutation bugs found in
            // `UCA-T-7`/`UCA-T-9` (which wrote INTO the tracked object after the parent snapshotted).
            this.api.resultsSE.GET_meliaStudiesByToc(programId).subscribe(({ response: tocResponse }) => {
              this.tocMeliaStudiesList = tocResponse ?? [];
            });
          }
        } else {
          // Same as above: `ostMeliaStudies` is a catalog list, not part of `sectionData`.
          this.api.resultsSE.GET_ostMeliaStudiesByResultId().subscribe(({ response: ostResponse }) => {
            this.ostMeliaStudies = ostResponse ?? [];
          });
        }
        // `UCA-T-11` — true end of this load flow for the TRACKED object: every `sectionData` field
        // above is assigned synchronously inside this `next` handler, and no child component in this
        // section's template mutates `sectionData` (verified against `knowledge-product-info.component.html`
        // — every bound control is a plain `custom-fields` CVA control with no auto-assign side effect).
        this.dirtyTracker.snapshot(this.dirtySnapshotValue());
        this.sectionLoading.set(false);
      },
      error: () => this.sectionLoading.set(false)
    });
    this.api.resultsSE.GET_allClarisaMeliaStudyTypes().subscribe(({ response }) => {
      this.meliaTypes = response;
    });
  }

  /** `UCA-T-11` — `CanComponentDeactivate.hasUnsavedChanges()`. */
  hasUnsavedChanges(): boolean {
    return this.dirtyTracker.isDirty(this.dirtySnapshotValue());
  }

  /**
   * `UCA-T-11` — `CanComponentDeactivate.saveSection()`. Wraps `performSave()`'s exact PATCH call
   * (reused verbatim by `onSaveSection()` below, `UCA-DD-3`) to resolve `true`/`false` instead of
   * void, for `UnsavedChangesGuard`.
   */
  saveSection(): Observable<boolean> {
    return this.performSave().pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  /**
   * `UCA-T-11` — the value the dirty tracker snapshots/diffs. `sectionData` (the
   * `KnowledgeProductSaveDto`) IS the save-payload object PATCHed by `performSave()` below —
   * `knowledgeProductBody` is display-only metadata pulled from CGSpace/WoS/Altmetric and is never
   * sent back to the server, so it is deliberately excluded from the diff. `UCA-OQ-2`: every field
   * on `KnowledgeProductSaveDto` (`isMeliaProduct: boolean`, `ostSubmitted: boolean`,
   * `ostMeliaId: number`, `tocMeliaStudyId: string | null`, `clarisaMeliaTypeId: number`) is a
   * primitive — no `File`/`Blob`/circular refs, so no normalization/exclusion is needed (unlike
   * `UCA-T-8`'s evidences File exclusion).
   */
  private dirtySnapshotValue(): KnowledgeProductSaveDto {
    return { ...this.sectionData };
  }

  onSyncSection() {
    const confirmationMessage = `Sync result with CGSpace? <br/> Unsaved changes in the section will be lost. `;

    this.customizedAlertsFeSE.show(
      {
        id: 'delete-tab',
        title: 'Sync confirmation',
        description: confirmationMessage,
        status: 'warning',
        confirmText: 'Yes, sync information'
      },
      () => {
        this.api.resultsSE.PATCH_resyncKnowledgeProducts().subscribe(resp => {
          this.getSectionInformation();
        });
      }
    );
  }

  /** Delegates to the shared mapper — see `model/knowledge-product-metadata.mapper.ts`. */
  private _mapFields(response: KnowledgeProductBody): KnowledgeProductBodyMapped {
    const { mapped, fairData } = mapKnowledgeProductBody(response);
    this.fair_data = fairData;
    return mapped;
  }

  public calculateInnerColor(value: number) {
    return fairInnerColor(value);
  }

  public calculateBorderColor(value: number) {
    return fairBorderColor(value);
  }

  filterOutObject(fairObject: FullFairData): FairDimension[] {
    return splitFairDimensions(fairObject);
  }

  onSaveSection() {
    this.performSave().subscribe();
  }

  /**
   * `UCA-T-11`: returns the PATCH `Observable` instead of self-subscribing, so both this
   * component's own Save action (`onSaveSection`, above) and `saveSection()` (the
   * `CanComponentDeactivate` contract, above) drive the exact same call — no duplicated save
   * logic (`UCA-DD-3`).
   */
  private performSave(): Observable<void> {
    return this.api.resultsSE.PATCH_knowledgeProductSection(this.sectionData).pipe(
      tap(() => {
        // `UCA-T-11` (per `UCA-T-6`'s rework lesson) — snapshot HERE, synchronously, the instant
        // the PATCH resolves, in addition to (not instead of) the reload below. If the reload
        // below fails, the section must not stay "dirty" forever despite a genuinely successful
        // save; and `saveSection()`'s `map(() => true)` must not race the reload's own re-snapshot.
        this.dirtyTracker.snapshot(this.dirtySnapshotValue());
        this.getSectionInformation();
      }),
      map(() => undefined),
      catchError(err => throwError(() => err))
    );
  }
}
