import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgCircleProgressModule, CircleProgressOptions } from 'ng-circle-progress';

import { BilateralApiService } from '../../../../../shared/services/api/bilateral-api.service';
import { BilateralCreationService } from '../../../services/bilateral-creation.service';
import { BilateralMdsTrackerService } from '../../../services/bilateral-mds-tracker.service';
import { BilateralAutoSaveService } from '../../../services/bilateral-auto-save.service';
import { CustomFieldsModule } from '../../../../../custom-fields/custom-fields.module';
import { CustomizedAlertsFeService } from '../../../../../shared/services/customized-alerts-fe.service';
import { RolesService } from '../../../../../shared/services/global/roles.service';
import { KnowledgeProductBodyMapped } from '../../../../results/pages/result-detail/pages/rd-result-types-pages/knowledge-product-info/model/KnowledgeProductBodyMapped';
import { TocMeliaStudyItem } from '../../../../results/pages/result-detail/pages/rd-result-types-pages/knowledge-product-info/model/toc-melia-study.interface';
import {
  FairDimension,
  fairBorderColor,
  mapKnowledgeProductBody
} from '../../../../results/pages/result-detail/pages/rd-result-types-pages/knowledge-product-info/model/knowledge-product-metadata.mapper';

const SECTION_NAME = 'type-specific';

/**
 * The 2025-2030 portfolio is the one whose MELIA studies come from the Theory of Change. Bilateral
 * reporting only ever runs on it — the results list filters its reporting phases to `P25` — but the
 * story spells out both branches, so the year decides rather than an assumption baked into the code.
 */
const TOC_MELIA_FIRST_YEAR = 2025;

@Component({
  selector: 'app-type-knowledge-product',
  imports: [CommonModule, FormsModule, CustomFieldsModule, NgCircleProgressModule],
  providers: [CircleProgressOptions],
  templateUrl: './type-knowledge-product.component.html',
  styleUrl: './type-knowledge-product.component.scss'
})
export class TypeKnowledgeProductComponent implements OnInit {
  private readonly bilateralApi = inject(BilateralApiService);
  private readonly creationService = inject(BilateralCreationService);
  private readonly mdsTracker = inject(BilateralMdsTrackerService);
  private readonly autoSave = inject(BilateralAutoSaveService);
  private readonly customizedAlertsFeSE = inject(CustomizedAlertsFeService);
  readonly rolesSE = inject(RolesService);

  /** Repository metadata, already mapped for display. Never edited, never saved. */
  body = new KnowledgeProductBodyMapped();
  fairData: FairDimension[] = [];

  /** The only fields the researcher fills in, and the only ones that travel back. */
  melia: {
    isMeliaProduct: boolean | null;
    ostSubmitted: boolean | null;
    clarisaMeliaTypeId: number | null;
    ostMeliaId: number | null;
    tocMeliaStudyId: string | null;
  } = { isMeliaProduct: null, ostSubmitted: null, clarisaMeliaTypeId: null, ostMeliaId: null, tocMeliaStudyId: null };

  meliaTypes: Array<{ id: number; name: string }> = [];
  ostMeliaStudies: Array<{ melia_id: number; melia_study_title: string }> = [];
  tocMeliaStudies: TocMeliaStudyItem[] = [];

  loading = signal(true);
  /** P2-3355: a failed fetch is a state the user has to see, not something to swallow. */
  loadFailed = signal(false);

  readonly saving = computed(() => this.autoSave.fieldStatus()[SECTION_NAME] === 'saving');

  readonly isTocMeliaPortfolio = computed(() => (this.creationService.reportingYear() ?? TOC_MELIA_FIRST_YEAR) >= TOC_MELIA_FIRST_YEAR);

  /** Shown only when the second question is answered Yes, and it decides which list is offered. */
  readonly showTocMeliaSelect = computed(() => this.isTocMeliaPortfolio());

  readonly plannedQuestionLabel = computed(() =>
    this.isTocMeliaPortfolio() ? 'Do you have a MELIA study planned in your TOC?' : 'Was it planned in your Initiative proposal?'
  );

  /**
   * Sync re-reads the repository record. It is hidden for Journal Articles because their metadata
   * is curated centrally — an administrator can still force it.
   */
  readonly canSync = computed(() => this.body?.type !== 'Journal Article' || this.rolesSE.isAdmin);

  get sourceName(): string {
    return this.body?.source || 'the repository';
  }

  get fairGuideline(): string {
    return `FAIR (findability, accessibility, interoperability, and reusability) scores are used to support reporting that aligns with the <a href="https://cgspace.cgiar.org/handle/10568/113623" target="_blank">CGIAR Open and FAIR Data Assets Policy</a>. FAIR scores are calculated based on the presence or absence of metadata in ${this.sourceName}. If you wish to enhance the FAIR score for a knowledge product, review the metadata flagged with a red icon below and liaise with your Center's knowledge management team to implement improvements.`;
  }

  ngOnInit(): void {
    this.loadData();
  }

  calculateBorderColor(value: number): string {
    return fairBorderColor(value);
  }

  private loadData(): void {
    const resultId = this.creationService.currentResultId();
    if (!resultId) {
      this.publish(null, true);
      return;
    }

    this.bilateralApi.GET_knowledgeProduct(resultId).subscribe({
      next: ({ response }) => this.publish(response, false),
      error: () => this.publish(null, true)
    });

    this.bilateralApi.GET_clarisaMeliaStudyTypes().subscribe({
      next: ({ response }) => (this.meliaTypes = response ?? []),
      error: () => (this.meliaTypes = [])
    });

    this.loadMeliaStudies(resultId);
  }

  private loadMeliaStudies(resultId: number): void {
    if (this.isTocMeliaPortfolio()) {
      const programId = this.creationService.resultInitiativeId() ?? this.creationService.selectedPrimarySp()?.programId;
      if (programId == null) return;
      this.bilateralApi.GET_tocMeliaStudies(programId).subscribe({
        next: ({ response }) => (this.tocMeliaStudies = response ?? []),
        error: () => (this.tocMeliaStudies = [])
      });
      return;
    }

    this.bilateralApi.GET_ostMeliaStudies(resultId).subscribe({
      next: ({ response }) => (this.ostMeliaStudies = response ?? []),
      error: () => (this.ostMeliaStudies = [])
    });
  }

  /**
   * P2-3355: the checklist is published on EVERY outcome, including failure.
   *
   * Registering it only on success left the section with an empty field list — the "0/0 fields" QA
   * reported. That number is the tell: a successful load always registers at least one field, so a
   * real success reads 0/1 or 1/1, never 0/0. Publishing an unfilled item on failure keeps the
   * counter honest and shows the section as incomplete rather than as "nothing required here".
   */
  private publish(response: any, failed: boolean): void {
    if (response) {
      const { mapped, fairData } = mapKnowledgeProductBody(response);
      this.body = mapped;
      this.fairData = fairData;
      this.melia = {
        isMeliaProduct: response.is_melia ?? null,
        ostSubmitted: response.melia_previous_submitted ?? null,
        clarisaMeliaTypeId: response.melia_type_id ?? null,
        ostMeliaId: response.ost_melia_study_id ?? null,
        tocMeliaStudyId: response.toc_melia_study_id ?? null
      };
    } else {
      this.body = new KnowledgeProductBodyMapped();
      this.fairData = [];
    }

    this.loadFailed.set(failed);
    this.loading.set(false);
    this.updateMds();
  }

  /**
   * Answering No to the first question, or switching the second one, leaves the discarded selection
   * behind. Clearing it here is what keeps a hidden value from being saved — the story asks for the
   * sub-fields to be cleared, not merely hidden.
   */
  onMeliaProductChange(): void {
    if (this.melia.isMeliaProduct !== true) {
      this.melia.ostSubmitted = null;
      this.clearMeliaSelections();
    }
    this.onFieldChange();
  }

  onOstSubmittedChange(): void {
    this.clearMeliaSelections();
    this.onFieldChange();
  }

  private clearMeliaSelections(): void {
    this.melia.clarisaMeliaTypeId = null;
    this.melia.ostMeliaId = null;
    this.melia.tocMeliaStudyId = null;
  }

  onFieldChange(): void {
    this.updateMds();
    this.queueSave();
  }

  onSave(): void {
    this.queueSave(0);
  }

  onSync(): void {
    const resultId = this.creationService.currentResultId();
    if (!resultId) return;

    this.customizedAlertsFeSE.show(
      {
        id: 'bilateral-kp-sync',
        title: 'Sync confirmation',
        description: `Sync result with ${this.sourceName}? <br/> Unsaved changes in the section will be lost. `,
        status: 'warning',
        confirmText: 'Yes, sync information'
      },
      () => {
        this.loading.set(true);
        this.bilateralApi.PATCH_resyncKnowledgeProduct(resultId).subscribe({
          next: () => this.loadData(),
          error: () => this.publish(null, true)
        });
      }
    );
  }

  private queueSave(debounceMs = 800): void {
    this.autoSave.schedulePayload('typeSpecific', this.buildSavePayload(), {
      debounceMs,
      statusKey: SECTION_NAME,
      executor: (resultId, body) => this.bilateralApi.PATCH_knowledgeProductMelia(resultId, body)
    });
  }

  /** Only the MELIA answers of the answered branch — repository metadata is never sent back. */
  private buildSavePayload(): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      isMeliaProduct: this.melia.isMeliaProduct,
      ostSubmitted: this.melia.isMeliaProduct === true ? this.melia.ostSubmitted : null,
      clarisaMeliaTypeId: null,
      ostMeliaId: null,
      tocMeliaStudyId: null
    };

    if (this.melia.isMeliaProduct === true) {
      if (this.melia.ostSubmitted === false) {
        payload['clarisaMeliaTypeId'] = this.melia.clarisaMeliaTypeId;
      } else if (this.melia.ostSubmitted === true) {
        if (this.isTocMeliaPortfolio()) {
          payload['tocMeliaStudyId'] = this.melia.tocMeliaStudyId;
        } else {
          payload['ostMeliaId'] = this.melia.ostMeliaId;
        }
      }
    }

    return payload;
  }

  /**
   * P2-3384: the green check follows the MELIA answers of the branch the user is in. It used to be
   * a single item on `handle` — a field the researcher cannot edit — so the section turned green on
   * data nobody had entered while the MELIA questions sat unanswered.
   */
  updateMds(): void {
    const fields = [
      {
        key: 'is-melia-product',
        label: 'Is this knowledge product a MELIA Product?',
        filled: this.melia.isMeliaProduct !== null && this.melia.isMeliaProduct !== undefined
      }
    ];

    if (this.melia.isMeliaProduct === true) {
      fields.push({
        key: 'melia-planned',
        label: this.plannedQuestionLabel(),
        filled: this.melia.ostSubmitted !== null && this.melia.ostSubmitted !== undefined
      });

      if (this.melia.ostSubmitted === false) {
        fields.push({ key: 'melia-type', label: 'Select MELIA type', filled: !!this.melia.clarisaMeliaTypeId });
      } else if (this.melia.ostSubmitted === true) {
        fields.push(
          this.isTocMeliaPortfolio()
            ? { key: 'melia-study-toc', label: 'Select the MELIA study from the drop-down', filled: !!this.melia.tocMeliaStudyId }
            : { key: 'melia-study-ost', label: 'Select MELIA from those included in OST Section 6.3', filled: !!this.melia.ostMeliaId }
        );
      }
    }

    this.mdsTracker.setSectionFields(SECTION_NAME, fields);
  }
}
