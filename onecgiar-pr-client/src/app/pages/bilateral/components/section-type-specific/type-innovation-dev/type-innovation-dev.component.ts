import { Component, inject, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BilateralApiService } from '../../../../../shared/services/api/bilateral-api.service';
import { BilateralCreationService } from '../../../services/bilateral-creation.service';
import { BilateralMdsTrackerService, MdsFieldItem } from '../../../services/bilateral-mds-tracker.service';
import { BilateralAutoSaveService } from '../../../services/bilateral-auto-save.service';
import { BilateralExpandableStateService } from '../../../services/bilateral-expandable-state.service';
import { InnovationControlListService } from '../../../../../shared/services/global/innovation-control-list.service';
import { CustomFieldsModule } from '../../../../../custom-fields/custom-fields.module';
import { WordCounterService } from '../../../../../shared/services/word-counter.service';
import { ReportingDesignYear } from '../../../../../shared/enum/reporting-design-year.enum';

const SECTION_NAME = 'type-specific';

/**
 * P2-3340: the ceiling `pr-input` already paints red. It never blocked anything — `maxWords` is
 * presentational across the whole platform — so a 12-word short title saved happily. The bilateral
 * Submit now refuses on it; the threshold is inclusive (10 words is valid, 11 is not), matching
 * `pr-word-counter`'s own contract test.
 */
const SHORT_TITLE_MAX_WORDS = 10;

/** Nature/typology id whose innovations are varieties or breeds — gates is_new_variety/number_of_varieties. */
const VARIETY_NATURE_ID = 12;

/** Mirrors the server's `InnovationReadinessLevelByLevel.Level_6` (see summary.service.ts) — scaling studies only apply from this readiness level up. */
const SCALING_STUDIES_READINESS_THRESHOLD = 17;

const SHORT_TITLE_DESC = `<ul>
<li>Innovations are new, improved, or adapted technologies or products, capacity development tools and services, and policies or institutional arrangements with high potential to contribute to positive impacts when used at scale.</li>
<li>Innovations may be at early stages of readiness (ideation and upstream research) or at more mature stages of readiness (delivery and scaling).</li>
<li>Try to develop a short name that facilitates clear communication about the innovation.</li>
<li>Avoid abbreviations or (technical) jargon.</li>
<li>If not essential, avoid making reference to specific countries or regions (this is captured through geotagging).</li>
<li>Avoid the use of CGIAR center, Program or organization names in the short title.</li>
<li>Varieties or breeds should be described by their generic traits or characteristics (e.g. Drought tolerant and aphid resistant groundnut cultivars).</li>
<li>The specific number of new or improved lines/ varieties can be specified elsewhere.</li>
</ul>`;

const COLLABORATORS_DESC = `Provide the full name(s), email address and organizational affiliation(s) of other CGIAR and/or partner colleagues that contribute to this innovation. Names of key contributors will feature as co-authors on the Innovation Profile document in the same order as provided below. <br>
<br>
<b>Standard format for entering collaborators:</b> <br>
Please enter each collaborator using the following format: Collaborator Name (email address).
If you register more than one collaborator, separate them using a semicolon (;).<br><br>
<b>Example:</b> Michael Thompson (m.thompson@innovationlab.org); Aisha Rahman (a.rahman@globalresearch.net)`;

const EVIDENCE_JUSTIFICATION_DESC = `<strong>Example:</strong> We chose readiness level 6 (semi-controlled testing) for the genetically improved farm tilapia (GIFT) because it is currently being tested under semi-controlled conditions in the multiplication center and hatchery in the selected countries as shown in the provided evidence.`;

const REFERENCE_MATERIALS_DESC = `Provide reference material(s) that describe the innovation<ul><li>Reference materials may include (science) publications, websites, newsletters, reports, newspaper articles, videos, etc.</li></ul>`;

const HAS_SCALING_STUDIES_OPTIONS = [
  { value: true, label: 'Yes' },
  { value: false, label: 'No' }
];

@Component({
  selector: 'app-type-innovation-dev',
  imports: [FormsModule, CustomFieldsModule],
  templateUrl: './type-innovation-dev.component.html',
  styleUrl: './type-innovation-dev.component.scss'
})
export class TypeInnovationDevComponent implements OnInit {
  private readonly bilateralApi = inject(BilateralApiService);
  private readonly creationService = inject(BilateralCreationService);
  private readonly mdsTracker = inject(BilateralMdsTrackerService);
  private readonly autoSave = inject(BilateralAutoSaveService);
  private readonly expandableState = inject(BilateralExpandableStateService);
  private readonly wordCounter = inject(WordCounterService);
  readonly innovationControlListSE = inject(InnovationControlListService);

  body: any = {};
  readonly saving = computed(() => this.autoSave.fieldStatus()['type-specific'] === 'saving');
  showAllFields = signal(false);

  readonly shortTitleDesc = SHORT_TITLE_DESC;
  /** Bound by the template so the counter and the Submit check can never drift apart. */
  readonly shortTitleMaxWords = SHORT_TITLE_MAX_WORDS;
  readonly collaboratorsDesc = COLLABORATORS_DESC;
  readonly evidenceJustificationDesc = EVIDENCE_JUSTIFICATION_DESC;
  readonly referenceMaterialsDesc = REFERENCE_MATERIALS_DESC;
  readonly hasScalingStudiesOptions = HAS_SCALING_STUDIES_OPTIONS;

  get isVarietyType(): boolean {
    return this.body.innovation_nature_id === VARIETY_NATURE_ID;
  }

  get isReadyForScalingStudies(): boolean {
    return Number(this.body.innovation_readiness_level_id) >= SCALING_STUDIES_READINESS_THRESHOLD;
  }

  /**
   * P2-3265 (epic P2-3243) — whether the "Have any studies been conducted to inform the innovation
   * scaling strategy design…" question renders on the BILATERAL surface.
   *
   * From the 2026 reporting phase the question is dropped **entirely, at every readiness level**, not
   * only from level 6 up: the ticket's own table pairs "< 6: not applicable (never shown)" with
   * ">= 6: remove", and the union covers 0-9. Ángel Jarrín confirmed the `>= 6` reading on the ticket
   * on 26-Aug-2026, and Yeck restated the resulting per-form rule on 27-Aug-2026 ("Innovation
   * Development, from the 2026 round: every level -> question gone completely").
   *
   * ⚠️ Gated on the reporting phase YEAR (`BilateralCreationService.reportingYear`, resolved from the
   * result's own version), never on `isP25()`: the P25 portfolio also holds 2025-phase results, so a
   * portfolio gate would strip the question from a 2025 result — which the epic's governing note
   * (Ángel Jarrín, 23-Aug-2026) forbids absolutely. Same axis and same threshold constant as the
   * W1/W2 surface's `showScalingStudiesQuestion()`.
   *
   * A result whose phase year has not resolved yet is treated as the current phase and the question
   * stays hidden — the bilateral creator only ever opens results of the running cycle. Same reasoning
   * as `showInnovationLinkQuestion()` in the sibling `type-innovation-use` component.
   */
  get showScalingStudies(): boolean {
    const year = this.creationService.reportingYear();
    if (year == null || year >= ReportingDesignYear.InnovationDevFormReduction) {
      return false;
    }
    return this.isReadyForScalingStudies;
  }

  ngOnInit(): void {
    const resultId = this.creationService.currentResultId();
    this.showAllFields.set(this.expandableState.getShowAllFields(resultId ?? 0, SECTION_NAME));
    this.loadData();
  }

  toggleShowAll(): void {
    this.showAllFields.update(v => !v);
    const resultId = this.creationService.currentResultId();
    this.expandableState.setShowAllFields(resultId ?? 0, SECTION_NAME, this.showAllFields());
  }

  private loadData(): void {
    const resultId = this.creationService.currentResultId();
    if (!resultId) return;
    this.bilateralApi.GET_innovationDev(resultId).subscribe(({ response }) => {
      this.body = response || {};
      this.updateMds();
    });
  }

  onFieldChange(): void {
    this.updateMds();
    this.queueTypeSave();
  }

  onSave(): void {
    this.queueTypeSave(0);
  }

  addReferenceMaterial(): void {
    if (!this.body.reference_materials) this.body.reference_materials = [];
    this.body.reference_materials.push({ link: '' });
    this.onFieldChange();
  }

  deleteReferenceMaterial(index: number): void {
    this.body.reference_materials.splice(index, 1);
    this.onFieldChange();
  }

  addScalingStudyUrl(): void {
    if (!this.body.scaling_studies_urls) this.body.scaling_studies_urls = [];
    this.body.scaling_studies_urls.push('');
    this.onFieldChange();
  }

  deleteScalingStudyUrl(index: number): void {
    this.body.scaling_studies_urls.splice(index, 1);
    this.onFieldChange();
  }

  private queueTypeSave(debounceMs = 800): void {
    this.autoSave.schedulePayload('typeSpecific', this.buildPayload(), {
      debounceMs,
      statusKey: 'type-specific',
      executor: (resultId, body) => this.bilateralApi.PATCH_innovationDev(resultId, body)
    });
  }

  private buildPayload(): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      short_title: this.body.short_title ?? null,
      innovation_characterization_id: this.body.innovation_characterization_id ?? null,
      innovation_nature_id: this.body.innovation_nature_id ?? null,
      innovation_developers: this.body.innovation_developers ?? null,
      innovation_readiness_level_id: this.body.innovation_readiness_level_id ?? null,
      is_new_variety: this.body.is_new_variety ?? null,
      number_of_varieties: this.body.number_of_varieties ?? null,
      innovation_collaborators: this.body.innovation_collaborators ?? null,
      evidences_justification: this.body.evidences_justification ?? null,
      reference_materials: this.body.reference_materials ?? [],
      has_scaling_studies: this.body.has_scaling_studies ?? null,
      scaling_studies_urls: this.body.scaling_studies_urls ?? []
    };
    // Omit null PK so the server can AUTO_INCREMENT on first create.
    if (this.body.result_innovation_dev_id != null) {
      payload['result_innovation_dev_id'] = this.body.result_innovation_dev_id;
    }
    return payload;
  }

  /**
   * P2-3391 AC9/AC10: the green check is the three MDS fields the story names — typology, innovation
   * developer, readiness level — and nothing else. Short title moved to full metadata (AC8: strictly
   * optional), so it can no longer hold the section back.
   *
   * P2-3340 still applies though: the 10-word ceiling on the short title is only painted red by
   * `pr-input`, so it is reported here as an INVALID item — but only while it is actually over the
   * limit. Listing it unconditionally would add a permanently unfilled slot and the section could
   * never reach 100%, which is exactly what AC9 forbids. Over the limit the item is `filled: true`,
   * so it keeps the percentage at 100 and blocks Submit through `invalidFields` with a reason.
   */
  updateMds(): void {
    const fields: MdsFieldItem[] = [
      {
        key: 'nature',
        label: 'Innovation typology (nature)',
        filled: this.body.innovation_nature_id != null
      },
      {
        key: 'developers',
        label: 'Innovation developer',
        filled: !!this.body.innovation_developers?.trim()
      },
      {
        key: 'readiness',
        label: 'Readiness level',
        filled: this.body.innovation_readiness_level_id != null
      }
    ];

    const shortTitleWords = this.wordCounter.counter(this.body.short_title);
    if (shortTitleWords > SHORT_TITLE_MAX_WORDS) {
      fields.push({
        key: 'short-title',
        label: 'Short title',
        filled: true,
        invalid: true,
        invalidReason: `${shortTitleWords} words; the maximum is ${SHORT_TITLE_MAX_WORDS}`
      });
    }

    this.mdsTracker.setSectionFields('type-specific', fields);
  }
}
