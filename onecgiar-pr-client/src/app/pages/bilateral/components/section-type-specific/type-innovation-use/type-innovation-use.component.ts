import { Component, inject, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BilateralApiService } from '../../../../../shared/services/api/bilateral-api.service';
import { BilateralCreationService } from '../../../services/bilateral-creation.service';
import { BilateralMdsTrackerService } from '../../../services/bilateral-mds-tracker.service';
import { BilateralAutoSaveService } from '../../../services/bilateral-auto-save.service';
import { BilateralExpandableStateService } from '../../../services/bilateral-expandable-state.service';
import { InnovationControlListService } from '../../../../../shared/services/global/innovation-control-list.service';
import { CustomFieldsModule } from '../../../../../custom-fields/custom-fields.module';

const SECTION_NAME = 'type-specific';

/** actor_type_id whose row needs a free-text label (mirrors the W1/W2 anticipated-user-demand form). */
const OTHER_ACTOR_TYPE_ID = 5;

/** institution_types_id codes with an extra field, per the CLARISA institution-type tree (mirrors W1/W2). */
const OTHER_INSTITUTION_TYPE_ID = 78;
const GRADUATE_STUDENTS_INSTITUTION_TYPE_ID = 50;

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

  body: any = {};
  actorsTypeList: any[] = [];
  institutionsTypeTreeList: any[] = [];
  private readonly institutionsTypeTreeChildrenCache: Record<string, any[]> = {};

  readonly otherActorTypeId = OTHER_ACTOR_TYPE_ID;
  readonly otherInstitutionTypeId = OTHER_INSTITUTION_TYPE_ID;
  readonly graduateStudentsInstitutionTypeId = GRADUATE_STUDENTS_INSTITUTION_TYPE_ID;

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
    };
    // Omit null PK so the server can AUTO_INCREMENT on first create.
    if (this.body.result_innovation_use_id != null) {
      payload['result_innovation_use_id'] = this.body.result_innovation_use_id;
    }
    return payload;
  }

  updateMds(): void {
    const tbd = this.body.innov_use_to_be_determined;
    const tbdSet = tbd !== null && tbd !== undefined;
    const hasActors = (this.body.actors ?? []).some((a: any) => a.is_active !== false);
    this.mdsTracker.setSectionFields('type-specific', [
      { key: 'use-determined', label: 'Use to be determined', filled: tbdSet },
      {
        key: 'use-actors',
        label: 'Actors / users',
        filled: tbdSet && (tbd === true || hasActors),
      },
      {
        key: 'use-level',
        label: 'How would you assess the current use level of the innovation?',
        filled: this.body.innovation_use_level_id != null,
      },
    ]);
  }
}
