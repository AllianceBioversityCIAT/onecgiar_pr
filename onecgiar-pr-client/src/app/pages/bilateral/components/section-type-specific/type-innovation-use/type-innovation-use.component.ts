import { Component, inject, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BilateralApiService } from '../../../../../shared/services/api/bilateral-api.service';
import { BilateralCreationService } from '../../../services/bilateral-creation.service';
import { BilateralMdsTrackerService } from '../../../services/bilateral-mds-tracker.service';
import { BilateralAutoSaveService } from '../../../services/bilateral-auto-save.service';
import { BilateralExpandableStateService } from '../../../services/bilateral-expandable-state.service';
import { InnovationControlListService } from '../../../../../shared/services/global/innovation-control-list.service';
import { InnovationUseResultsService } from '../../../../../shared/services/global/innovation-use-results.service';
import { CustomFieldsModule } from '../../../../../custom-fields/custom-fields.module';

const SECTION_NAME = 'type-specific';

/** actor_type_id whose row needs a free-text label (mirrors the W1/W2 anticipated-user-demand form). */
const OTHER_ACTOR_TYPE_ID = 5;

/** institution_types_id codes with an extra field, per the CLARISA institution-type tree (mirrors W1/W2). */
const OTHER_INSTITUTION_TYPE_ID = 78;
const GRADUATE_STUDENTS_INSTITUTION_TYPE_ID = 50;

/**
 * P2-3428 AC1 / P2-3331 AC2 — verbatim text of the MDS note. Kept as a constant (and not inlined in the
 * template like the sibling sections do) so the wording is asserted by a unit test: it is copy the story
 * quotes character for character and QA reads it back word for word.
 */
const MDS_INFO_NOTE =
  'The fields displayed on this screen correspond to the minimum data standard (MDS) required for bilateral result reporting. ' +
  'If you need to complete the full metadata for this section, click the button on the right.';

/**
 * P2-3424: "QA'd" asumido como status_id = 2 (Quality Assessed) — supuesto declarado por el PO, pendiente de confirmación de negocio
 * (Ángel Jarrín, 23-ago-2026, comentario en P2-3424; ver `result-status.enum.ts` del server).
 */
const QUALITY_ASSESSED_STATUS_ID = 2;

/** Result-type label returned by `GET /v2/api/results/get/innov-use-linked-results` for Innovation Development. */
const INNOVATION_DEVELOPMENT_TYPE_NAME = 'innovation development';

/**
 * P2-3424 (PO instruction recorded on the ticket, 23-ago-2026): the link-to-a-QA'd-Innovation-Development
 * question exists only from the 2026 reporting phase onwards; earlier phases must render exactly as they do
 * today. This is a PHASE-YEAR threshold, not a portfolio one — prtest holds 2025-phase results inside the P25
 * portfolio, so `isP25()` would switch the field on for them. Declared locally instead of inside
 * `ReportingDesignYear` because that enum is a shared file this story does not own; if a second bilateral
 * section needs the same cut-off, promote it there.
 */
const INNOVATION_LINK_MIN_PHASE_YEAR = 2026;

/**
 * P2-3294 / P2-3428 AC13: the scaling-strategy-studies question disappears from use level 6 upwards.
 * The W1/W2 form still shows it from level 5 up with no ceiling
 * (`innovation-use-form.component.html:334`) because P2-3294 is still Open there; this section
 * implements the ceiling the story spells out. See CLAUDE.md — divergence reported on the ticket.
 */
const SCALING_STUDIES_MAX_USE_LEVEL = 6;

/** W1/W2 shows the use-level explanation for levels 5..9 (`innovation-use-form.component.html:325`). */
const USE_LEVEL_EXPLANATION_MIN = 5;
const USE_LEVEL_EXPLANATION_MAX = 9;

@Component({
  selector: 'app-type-innovation-use',
  imports: [FormsModule, CustomFieldsModule],
  templateUrl: './type-innovation-use.component.html',
  styleUrl: './type-innovation-use.component.scss',
})
export class TypeInnovationUseComponent implements OnInit {
  private readonly bilateralApi = inject(BilateralApiService);
  private readonly creationService = inject(BilateralCreationService);
  private readonly mdsTracker = inject(BilateralMdsTrackerService);
  private readonly autoSave = inject(BilateralAutoSaveService);
  private readonly expandableState = inject(BilateralExpandableStateService);
  readonly innovationControlListSE = inject(InnovationControlListService);
  /** Same catalog the W1/W2 Contributors & Partners dropdown consumes — reused, not re-fetched here. */
  readonly innovationUseResultsSE = inject(InnovationUseResultsService);

  body: any = {};
  actorsTypeList: any[] = [];
  institutionsTypeTreeList: any[] = [];
  private readonly institutionsTypeTreeChildrenCache: Record<string, any[]> = {};

  readonly otherActorTypeId = OTHER_ACTOR_TYPE_ID;
  readonly otherInstitutionTypeId = OTHER_INSTITUTION_TYPE_ID;
  readonly graduateStudentsInstitutionTypeId = GRADUATE_STUDENTS_INSTITUTION_TYPE_ID;
  readonly mdsInfoNote = MDS_INFO_NOTE;

  readonly saving = computed(() => this.autoSave.fieldStatus()['type-specific'] === 'saving');
  showAllFields = signal(false);

  get visibleActors(): any[] {
    return (this.body.actors ?? []).filter((a: any) => a.is_active !== false);
  }

  get visibleOrganizations(): any[] {
    return (this.body.organization ?? []).filter((o: any) => o.is_active !== false);
  }

  get visibleMeasures(): any[] {
    return (this.body.measures ?? []).filter((m: any) => m.is_active !== false);
  }

  /** Numeric use level (0..9) behind the selected `innovation_use_level_id`; -1 when nothing is picked. */
  get useLevelNumber(): number {
    const selectedId = this.body.innovation_use_level_id;
    if (selectedId === null || selectedId === undefined) return -1;
    const selected = (this.innovationControlListSE.useLevelsList ?? []).find((lvl: any) => String(lvl?.id) === String(selectedId));
    const level = Number(selected?.level);
    return Number.isFinite(level) ? level : -1;
  }

  /** P2-3294 / P2-3428 AC13 — shown while the use level is below 6, hidden from 6 upwards. */
  get showScalingStudies(): boolean {
    const level = this.useLevelNumber;
    return level >= 0 && level < SCALING_STUDIES_MAX_USE_LEVEL;
  }

  /** Mirrors the W1/W2 gate for the use-level justification textarea. */
  get showUseLevelExplanation(): boolean {
    const level = this.useLevelNumber;
    return level >= USE_LEVEL_EXPLANATION_MIN && level <= USE_LEVEL_EXPLANATION_MAX;
  }

  /**
   * P2-3424 — the question is 2026-onwards only. A draft whose phase year has not been resolved yet is
   * treated as the current phase: the bilateral creator only ever opens results of the running cycle.
   */
  get showInnovationLinkQuestion(): boolean {
    const year = this.creationService.reportingYear();
    return year == null || year >= INNOVATION_LINK_MIN_PHASE_YEAR;
  }

  /**
   * P2-3424 — Innovation Development results the user may link to.
   *
   * ⚠️ The catalog endpoint (`GET /v2/api/results/get/innov-use-linked-results`,
   * `result.repository.ts:2645 getResultsForInnovUse`) selects only id, acronym, phase_year, result_code,
   * name and title — it carries NO `status_id`, so the Quality-Assessed gate below cannot bite today.
   * Options that do not carry the field are let through on purpose: filtering them out would render an
   * always-empty dropdown. The moment the backend exposes `status_id`, the filter starts applying with no
   * further change here. Reported on the ticket; do not "fix" it by inventing a status client-side.
   */
  get qaInnovationDevelopmentResults(): any[] {
    return (this.innovationUseResultsSE.resultsList ?? []).filter((r: any) => this.isLinkableInnovationDevelopment(r));
  }

  private isLinkableInnovationDevelopment(result: any): boolean {
    if (String(result?.name ?? '').trim().toLowerCase() !== INNOVATION_DEVELOPMENT_TYPE_NAME) return false;
    if (result?.status_id === null || result?.status_id === undefined) return true;
    return Number(result.status_id) === QUALITY_ASSESSED_STATUS_ID;
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
    this.bilateralApi.GET_actorsTypes().subscribe(({ response }) => {
      this.actorsTypeList = response || [];
    });
    this.bilateralApi.GET_institutionsTypeTree().subscribe(({ response }) => {
      this.institutionsTypeTreeList = response || [];
    });
    const resultId = this.creationService.currentResultId();
    if (!resultId) return;
    this.bilateralApi.GET_innovationUse(resultId).subscribe(({ response }) => {
      this.body = response || {};
      this.hydrateOrganizations();
      this.hydrateStoredAnswers();
      this.hydrateInnovationLink();
      this.updateMds();
    });
  }

  /**
   * The server only ever stores one code in `institution_types_id` (the leaf, if a sub-type
   * was picked). It hydrates `parent_institution_type_id` alongside it so the UI can show a
   * parent dropdown + a refining child dropdown — split that back out on load; `buildPayload()`
   * flattens it back into a single code before every save.
   */
  private hydrateOrganizations(): void {
    (this.body.organization ?? []).forEach((org: any) => {
      if (org.parent_institution_type_id) {
        org.institution_sub_type_id = org.institution_types_id;
        org.institution_types_id = org.parent_institution_type_id;
      }
    });
  }

  /**
   * P2-3424 — the contract carries the link as a list (`linked_results`) because W1/W2 allows several;
   * this story caps it at one ("UI enforces one selection maximum"), so the UI binds a single id and the
   * payload puts it back into the list.
   */
  private hydrateInnovationLink(): void {
    const linked = this.body.linked_results;
    const first = Array.isArray(linked) ? linked[0] : linked;
    // Only written when something was stored — an untouched section must stay an empty body.
    if (first != null) this.body.linked_result_id = Number(first?.id ?? first);
    this.normalizeStoredBoolean('has_innovation_link');
  }

  /**
   * P2-3424 — the yes/no radios bind `true`/`false`, but MySQL `tinyint` columns come back as `1`/`0`
   * (same reason the W1/W2 section compares with `=== 1`, `innovation-use-info.component.ts:55-64`).
   * Without this the stored answer reloads unselected and the block it gates stays hidden.
   */
  private hydrateStoredAnswers(): void {
    this.normalizeStoredBoolean('has_scaling_studies');
    this.normalizeStoredBoolean('innov_use_2030_to_be_determined');
  }

  /** Rewrites `1`/`0` as `true`/`false`. An unanswered field (`null`/absent) is left untouched. */
  private normalizeStoredBoolean(key: string): void {
    const value = this.body[key];
    if (value === null || value === undefined || typeof value === 'boolean') return;
    this.body[key] = Boolean(value);
  }

  getInstitutionsTypeTreeChildren(institutionTypesId: number): any[] {
    const key = String(institutionTypesId);
    if (this.institutionsTypeTreeChildrenCache[key]) {
      return this.institutionsTypeTreeChildrenCache[key];
    }
    const parent = this.institutionsTypeTreeList.find(inst => inst.code == institutionTypesId);
    const children = parent?.childrens ?? [];
    this.institutionsTypeTreeChildrenCache[key] = children;
    return children;
  }

  addActor(): void {
    if (!this.body.actors) this.body.actors = [];
    this.body.actors.push({ actor_type_id: null, sex_and_age_disaggregation: false, is_active: true });
    this.onFieldChange();
  }

  deleteActor(actor: any): void {
    actor.is_active = false;
    this.onFieldChange();
  }

  onDisaggregationChange(actor: any): void {
    actor.women = null;
    actor.women_youth = null;
    actor.men = null;
    actor.men_youth = null;
    actor.how_many = null;
    this.onFieldChange();
  }

  addOrganization(): void {
    if (!this.body.organization) this.body.organization = [];
    this.body.organization.push({ institution_types_id: null, is_active: true });
    this.onFieldChange();
  }

  deleteOrganization(organization: any): void {
    organization.is_active = false;
    this.onFieldChange();
  }

  onOrganizationTypeChange(organization: any): void {
    organization.institution_sub_type_id = null;
    this.onFieldChange();
  }

  addMeasure(): void {
    if (!this.body.measures) this.body.measures = [];
    this.body.measures.push({ is_active: true });
    this.onFieldChange();
  }

  deleteMeasure(measure: any): void {
    measure.is_active = false;
    this.onFieldChange();
  }

  /** Study links are plain strings, exactly as the W1/W2 `app-studies-link` stores them. */
  addStudyLink(): void {
    if (!Array.isArray(this.body.scaling_studies_urls)) this.body.scaling_studies_urls = [];
    this.body.scaling_studies_urls.push('');
    this.onFieldChange();
  }

  deleteStudyLink(index: number): void {
    this.body.scaling_studies_urls?.splice(index, 1);
    this.onFieldChange();
  }

  /** P2-3424 — answering "No" drops the previously chosen result so the payload cannot keep a stale link. */
  onInnovationLinkChange(): void {
    if (this.body.has_innovation_link !== true) this.body.linked_result_id = null;
    this.onFieldChange();
  }

  /**
   * P2-3294 / P2-3428 AC13 — from use level 6 the scaling-studies question disappears, so the answer it
   * held is dropped: leaving it behind would keep persisting a "Yes" and its URLs behind a control the
   * user can no longer see or correct. Same reason `onInnovationLinkChange` drops the linked result.
   */
  onUseLevelChange(): void {
    if (this.useLevelNumber >= SCALING_STUDIES_MAX_USE_LEVEL) {
      this.body.has_scaling_studies = null;
      this.body.scaling_studies_urls = [];
    }
    this.onFieldChange();
  }

  onFieldChange(): void {
    this.updateMds();
    this.queueTypeSave();
  }

  onSave(): void {
    this.queueTypeSave(0);
  }

  private queueTypeSave(debounceMs = 800): void {
    this.autoSave.schedulePayload('typeSpecific', this.buildPayload(), {
      debounceMs,
      statusKey: 'type-specific',
      executor: (resultId, body) => this.bilateralApi.PATCH_innovationUse(resultId, body),
    });
  }

  /** Flattens a sub-type back into `institution_types_id`, without mutating `body` (which the UI's cascade still needs). */
  private buildOrganizationsForSave(): any[] {
    return (this.body.organization ?? []).map((org: any) => {
      const { institution_sub_type_id, ...rest } = org;
      return institution_sub_type_id ? { ...rest, institution_types_id: institution_sub_type_id } : rest;
    });
  }

  private buildPayload(): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      innov_use_to_be_determined: this.body.innov_use_to_be_determined ?? null,
      innovation_use_level_id: this.body.innovation_use_level_id ?? null,
      innovatonUse: {
        actors: this.body.actors ?? [],
        organization: this.buildOrganizationsForSave(),
        measures: this.body.measures ?? [],
      },
      // P2-3424: everything below now round-trips through the legacy summary endpoint — its DTO
      // (server `api/results/summary/dto/create-innovation-use.dto.ts`) declares these keys and
      // `SummaryService.saveInnovationUse` persists them, so they survive a reload.
      // ⚠️ `investment_bilateral_usd` is deliberately NOT here: no column exists for it anywhere in the
      // server and the legacy controller has no `ValidationPipe`, so sending it only made the contract
      // look supported while the value was dropped on arrival. The input is disabled and tagged
      // `Coming soon` instead — see the note at the bottom of this file.
      has_scaling_studies: this.body.has_scaling_studies ?? null,
      scaling_studies_urls: this.body.scaling_studies_urls ?? [],
      innov_use_2030_to_be_determined: this.body.innov_use_2030_to_be_determined ?? null,
      readiness_level_explanation: this.body.readiness_level_explanation ?? null,
      has_innovation_link: this.body.has_innovation_link ?? null,
      // `pr-select` hands back the catalog's raw `id`, which arrives as a numeric STRING — normalize it so
      // the contract always carries numbers, the way the W1/W2 section stores them.
      linked_results: this.body.linked_result_id == null ? [] : [Number(this.body.linked_result_id)],
    };
    // Omit null PK so the server can AUTO_INCREMENT on first create.
    if (this.body.result_innovation_use_id != null) {
      payload['result_innovation_use_id'] = this.body.result_innovation_use_id;
    }
    return payload;
  }

  /** A measure only counts once it carries BOTH halves — a unit with no quantity says nothing (AC6). */
  private hasCompleteMeasure(): boolean {
    return (this.body.measures ?? []).some(
      (m: any) =>
        m.is_active !== false &&
        String(m.unit_of_measure ?? '').trim() !== '' &&
        m.quantity !== null &&
        m.quantity !== undefined &&
        String(m.quantity).trim() !== '',
    );
  }

  /**
   * P2-3428 / P2-3331 AC1 — the MDS set is Actors, Other quantitative measures, Use level and the W3/bilateral
   * investment amount. Only the first three are published here; see the TODO below for why the investment
   * amount is rendered disabled (`Coming soon`) and gates nothing. The old `use-determined` entry is gone on
   * purpose: the story counts the "Innovation Use to be Determined" radio as part of the Actors rule, not as
   * a separate MDS field, and every extra entry here silently raises the bar Submit is gated on
   * (`overallStatus() === 'complete'`). Nothing revealed by the full-metadata toggle may appear below — AC16.
   */
  updateMds(): void {
    const tbd = this.body.innov_use_to_be_determined;
    const tbdSet = tbd !== null && tbd !== undefined;
    const hasActors = (this.body.actors ?? []).some((a: any) => a.is_active !== false);
    this.mdsTracker.setSectionFields('type-specific', [
      {
        key: 'use-actors',
        label: 'Actors',
        // AC4: when the use is still to be determined no actor is requested, so the field is satisfied.
        filled: tbdSet && (tbd === true || hasActors),
      },
      {
        key: 'use-measures',
        label: 'Other quantitative measures of innovation use',
        filled: this.hasCompleteMeasure(),
      },
      {
        key: 'use-level',
        label: 'How would you assess the current use level of the innovation?',
        filled: this.body.innovation_use_level_id != null,
      },
      // TODO: `use-investment` no se publica al tracker a propósito, y desde el 26-ago-2026 el campo
      // tampoco se pide como obligatorio: `investment_bilateral_usd` no existe en el servidor y el
      // endpoint legacy lo descartaba en silencio, así que el usuario rellenaba un campo con asterisco
      // rojo cuyo valor desaparecía al recargar, sin ningún aviso. Ahora se muestra DESHABILITADO con el
      // tag `Coming soon` (regla de la casa) y no viaja en el payload. Habilitarlo exige repuntar a
      // `PATCH /v2/api/innovation-use/...`, que modela el monto POR PROYECTO
      // (`investment_bilateral: [{ id, kind_cash, is_determined }]`) y espera el NIVEL 0-9 en
      // `innovation_use_level_id`, no el id del catálogo — y la historia no define cómo repartir un
      // único total entre varios proyectos.
    ]);
  }
}
