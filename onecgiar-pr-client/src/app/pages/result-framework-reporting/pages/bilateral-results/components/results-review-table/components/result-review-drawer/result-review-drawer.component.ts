import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  effect,
  inject,
  model,
  OnDestroy,
  OnInit,
  output,
  signal,
  untracked
} from '@angular/core';
import { DrawerModule } from 'primeng/drawer';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { GeoscopeManagementModule } from '../../../../../../../../shared/components/geoscope-management/geoscope-management.module';
import { ResultToReview, BilateralResultDetail } from './result-review-drawer.interfaces';
import { KpContentComponent } from './components/kp-content/kp-content.component';
import { InnoDevContentComponent } from './components/inno-dev-content/inno-dev-content.component';
import { CapSharingContentComponent } from './components/cap-sharing-content/cap-sharing-content.component';
import { PolicyChangeContentComponent } from './components/policy-change-content/policy-change-content.component';
import { InnovationUseContentComponent } from './components/innovation-use-content/innovation-use-content.component';
import { SaveChangesJustificationDialogComponent } from './components/save-changes-justification-dialog/save-changes-justification-dialog.component';
import { RolesService } from '../../../../../../../../shared/services/global/roles.service';
import { BilateralResultsService } from '../../../../bilateral-results.service';
import { CustomFieldsModule } from '../../../../../../../../custom-fields/custom-fields.module';
import { CentersService } from '../../../../../../../../shared/services/global/centers.service';
import { InstitutionsService } from '../../../../../../../../shared/services/global/institutions.service';
import { RdContributorsAndPartnersModule } from '../../../../../../../../pages/results/pages/result-detail/pages/rd-contributors-and-partners/rd-contributors-and-partners.module';

@Component({
  selector: 'app-result-review-drawer',
  imports: [
    DrawerModule,
    CommonModule,
    FormsModule,
    ButtonModule,
    DialogModule,
    TextareaModule,
    GeoscopeManagementModule,
    KpContentComponent,
    InnoDevContentComponent,
    CapSharingContentComponent,
    PolicyChangeContentComponent,
    InnovationUseContentComponent,
    SaveChangesJustificationDialogComponent,
    CustomFieldsModule,
    RdContributorsAndPartnersModule
  ],
  templateUrl: './result-review-drawer.component.html',
  styleUrl: './result-review-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResultReviewDrawerComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  bilateralResultsService = inject(BilateralResultsService);
  rolesSE = inject(RolesService);
  centersSE = inject(CentersService);
  institutionsSE = inject(InstitutionsService);

  clarisaProjectsList = signal<any[]>([]);
  contributingInitiativesList = signal<any[]>([]);
  disabledContributingInitiatives = signal<any[]>([]);

  /** Chip label: only "SP01 - Breeding for Tomorrow" (official_code - initiative_name/short_name) */
  contributingInitiativesFormatter = (option: any): string => {
    if (!option) return '';
    const code = option.official_code ?? option.acronym ?? '';
    const name = option.initiative_name ?? option.short_name ?? option.name ?? option.full_name ?? '';
    if (!code && !name) return option.full_name || '';
    if (!code) return name;
    if (!name) return String(code);
    return `${code} - ${name}`;
  };

  tocInitiative: any = {
    planned_result: null,
    initiative_id: null,
    official_code: null,
    short_name: null,
    result_toc_results: [
      {
        uniqueId: '0',
        toc_level_id: null,
        toc_result_id: null,
        planned_result: null,
        initiative_id: null,
        toc_progressive_narrative: null,
        indicators: [
          {
            related_node_id: null,
            toc_results_indicator_id: null,
            targets: [
              {
                contributing_indicator: null
              }
            ]
          }
        ]
      }
    ],
    toc_progressive_narrative: null
  };
  initiativeIdSignal = signal<number | null>(null);
  tocConsumed = signal<boolean>(true);

  isTocFormValid = computed(() => {
    if (!this.tocInitiative?.result_toc_results || this.tocInitiative.result_toc_results.length === 0) {
      return false;
    }

    return this.tocInitiative.result_toc_results.every((tab: any) => {
      if (!tab.toc_level_id) return false;

      if (!tab.toc_result_id) return false;

      if (tab.indicators && tab.indicators.length > 0) {
        if (!tab.indicators[0].related_node_id) return false;
      }

      return true;
    });
  });

  visible = model<boolean>(false);
  resultToReview = model<ResultToReview | null>(null);
  drawerFullScreen = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);

  decisionMade = output<void>();

  resultDetail = signal<BilateralResultDetail | null>(null);
  originalAcceptedContributingInitiatives: any[] = [];
  contributingInitiativesStatusMap = signal<Map<number, 'accepted' | 'pending'>>(new Map());
  private _lastContributingInitiativesReapplyKey: string = '';
  originalContributingInitiatives: any = null;
  originalContributingInstitutions: any[] | null = null;

  rejectJustification: string = '';
  saveChangesJustification: string = '';
  saveChangesType: 'toc' | 'dataStandard' | null = null;
  evidenceLinkInput: string = '';

  showConfirmApproveDialog = signal<boolean>(false);
  showConfirmRejectDialog = signal<boolean>(false);
  showConfirmSaveChangesDialog = signal<boolean>(false);

  canReviewResults = computed(() => {
    if (this.api.rolesSE.isAdmin) {
      return true;
    }
    const myInitiativesList = this.api.dataControlSE.myInitiativesList || [];
    const found = myInitiativesList.find(item => item.official_code === this.bilateralResultsService.entityId());
    return !!found;
  });

  canEditInDrawer = computed(() => {
    if (!this.canReviewResults()) return false;
    const statusId = this.resultDetail()?.commonFields?.status_id;
    return statusId === '5';
  });

  getTocMetadata(): any {
    const detail = this.resultDetail();
    if (!detail?.tocMetadata) return null;
    return Array.isArray(detail.tocMetadata) ? detail.tocMetadata[0] : detail.tocMetadata;
  }

  getTocAlertDescription(): string {
    return 'If your answer is <strong>Yes</strong>, please select the relevant <strong>HLO, indicator</strong>, and <strong>contribution to target</strong> below. If the result is not planned for in the 2025 ToC (planned indicators), please select <strong>No</strong> and, where applicable, choose the <strong>HLO</strong> under which it is most appropriate to report the result. Please also provide a short justification explaining why you are reporting it even though it is not reflected in a 2025 ToC indicator. These "No"-flagged results could be reviewed by the Program team as part of the adaptive management process and may inform updates or adjustments to the Program\'s 2026 ToC and planned indicators.';
  }

  onPlannedResultChangeValue(value: boolean | null): void {
    if (!this.tocInitiative) return;

    this.tocInitiative.planned_result = value;
    this.cdr.markForCheck();
  }

  onTocProgressiveNarrativeChange(value: string): void {
    if (!this.tocInitiative) return;
    this.tocInitiative.toc_progressive_narrative = value;
    if (this.tocInitiative.result_toc_results && this.tocInitiative.result_toc_results.length > 0) {
      this.tocInitiative.result_toc_results[0].toc_progressive_narrative = value;
    }
    this.cdr.markForCheck();
  }

  onPlannedResultChange(): void {
    if (!this.tocInitiative) return;

    if (this.tocInitiative.result_toc_results) {
      this.tocInitiative.result_toc_results.forEach((tab: any) => {
        if (tab.indicators?.[0]) {
          tab.indicators[0].related_node_id = null;
          tab.indicators[0].toc_results_indicator_id = null;
          if (tab.indicators[0].targets?.[0]) {
            tab.indicators[0].targets[0].contributing_indicator = null;
          }
        }
        tab.toc_progressive_narrative = null;
        tab.toc_result_id = null;
        tab.toc_level_id = null;
      });
    }

    this.tocConsumed.set(false);

    setTimeout(() => {
      this.tocConsumed.set(true);
      this.cdr.markForCheck();
    }, 100);
  }

  onSaveTocChanges(): void {
    if (!this.tocInitiative || this.tocInitiative.planned_result === undefined) {
      return;
    }
    this.saveChangesType = 'toc';
    this.saveChangesJustification = '';
    this.showConfirmSaveChangesDialog.set(true);
  }
  onSaveDataStandardChanges(): void {
    this.saveChangesType = 'dataStandard';
    this.saveChangesJustification = '';
    this.showConfirmSaveChangesDialog.set(true);
  }

  cancelSaveChanges(): void {
    this.showConfirmSaveChangesDialog.set(false);
    this.saveChangesJustification = '';
    this.saveChangesType = null;
  }

  confirmSaveChanges(justification: string): void {
    if (!justification.trim()) return;

    this.saveChangesJustification = justification;

    this.isSaving.set(true);
    this.cdr.markForCheck();

    if (this.saveChangesType === 'toc') {
      this.executeSaveTocChanges();
    } else if (this.saveChangesType === 'dataStandard') {
      this.executeSaveDataStandardChanges();
    }
  }

  private executeSaveTocChanges(): void {
    if (!this.tocInitiative || this.tocInitiative.planned_result === undefined) {
      this.isSaving.set(false);
      this.showConfirmSaveChangesDialog.set(false);
      this.cdr.markForCheck();
      return;
    }

    const detail = this.resultDetail();
    if (!detail?.commonFields?.id) {
      console.error('Result ID not available');
      this.isSaving.set(false);
      this.showConfirmSaveChangesDialog.set(false);
      this.cdr.markForCheck();
      return;
    }

    const resultId = Number.parseInt(detail.commonFields.id, 10);

    const resultTocResults = (this.tocInitiative.result_toc_results || []).map((tab: any) => {
      const resultTocResult: any = {
        toc_result_id: tab.toc_result_id || null,
        toc_progressive_narrative: tab.toc_progressive_narrative || null,
        toc_level_id: tab.toc_level_id || null
      };

      if (tab.result_toc_result_id) {
        resultTocResult.result_toc_result_id = tab.result_toc_result_id;
      }

      if (tab.indicators && Array.isArray(tab.indicators)) {
        resultTocResult.indicators = tab.indicators.map((ind: any) => {
          const indicator: any = {
            toc_results_indicator_id: ind.toc_results_indicator_id ?? ind.related_node_id ?? null,
            indicator_contributing: ind.indicator_contributing ?? null,
            status_id: ind.status_id ?? null,
            related_node_id: ind.related_node_id ?? ind.toc_results_indicator_id ?? null,
            targets: []
          };
          if (ind.result_toc_result_indicator_id != null) {
            indicator.result_toc_result_indicator_id = ind.result_toc_result_indicator_id;
          }
          if (ind.targets && Array.isArray(ind.targets)) {
            indicator.targets = ind.targets.map((t: any) => ({
              indicators_targets: t.indicators_targets ?? t.id ?? null,
              number_target: t.number_target ?? null,
              contributing_indicator: t.contributing_indicator ?? null,
              target_date: t.target_date ?? null,
              target_progress_narrative: t.target_progress_narrative ?? null,
              indicator_question: t.indicator_question ?? null
            }));
          }
          return indicator;
        });
      } else {
        resultTocResult.indicators = [];
      }

      return resultTocResult;
    });

    const body = {
      tocMetadata: {
        planned_result: this.tocInitiative.planned_result,
        initiative_id: this.tocInitiative.initiative_id || this.initiativeIdSignal() || null,
        result_toc_results: resultTocResults.length > 0 ? resultTocResults : []
      },
      updateExplanation: this.saveChangesJustification
    };

    // Call the API
    this.api.resultsSE.PATCH_BilateralTocMetadata(resultId, body).subscribe({
      next: response => {
        this.loadResultDetail(String(resultId));
        this.showConfirmSaveChangesDialog.set(false);
        this.saveChangesJustification = '';
        this.saveChangesType = null;
        this.isSaving.set(false);
        this.cdr.markForCheck();
      },
      error: err => {
        console.error('Error saving TOC metadata:', err);
        this.isSaving.set(false);
        this.showConfirmSaveChangesDialog.set(false);
        this.saveChangesJustification = '';
        this.saveChangesType = null;
        this.cdr.markForCheck();
      }
    });
  }

  private buildImplementingOrgsFromSelection(currentInstitutions: any[]): Array<{ institution_id: number; acronym: string | null; institution_name: string | null }> {
    if (!currentInstitutions?.length) return [];

    const toNum = (v: any): number | null => {
      if (v == null) return null;
      const n = typeof v === 'string' ? Number.parseInt(v, 10) : Number(v);
      return Number.isNaN(n) ? null : n;
    };

    const resolveId = (item: any): number | null => {
      if (typeof item === 'number') return toNum(item);
      if (typeof item === 'string' && item !== '') return toNum(item);
      if (item && typeof item === 'object') return toNum(item.institutions_id ?? item.institution_id ?? item.id);
      return null;
    };

    const list = this.institutionsSE.institutionsList ?? [];

    return currentInstitutions
      .map((item: any) => {
        const id = resolveId(item);
        if (id == null) return null;

        const institution =
          typeof item === 'object' && item !== null && (item.acronym != null || item.institution_name != null || item.institutions_name != null || item.full_name != null)
            ? item
            : list.find((inst: any) => {
                const a = toNum(inst.institutions_id ?? inst.institution_id ?? inst.id);
                return a !== null && a === id;
              });

        const inst = institution as any;
        const institutionId = institution ? (toNum(inst.institutions_id ?? inst.institution_id ?? inst.id) ?? id) : id;
        const acronym = institution ? (inst.acronym ?? null) : null;
        const institutionName = institution ? (inst.institution_name ?? inst.institutions_name ?? inst.full_name ?? null) : null;

        return { institution_id: institutionId, acronym, institution_name: institutionName };
      })
      .filter((org): org is { institution_id: number; acronym: string | null; institution_name: string | null } => org?.institution_id != null && !Number.isNaN(org.institution_id));
  }

  private executeSaveDataStandardChanges(): void {
    const detail = this.resultDetail();
    if (!detail?.commonFields?.id) {
      console.error('Result ID not available');
      return;
    }

    const resultId = Number.parseInt(detail.commonFields.id, 10);

    // Build the request body
    const body: any = {
      commonFields: {
        id: resultId,
        result_description: detail.commonFields.result_description || null,
        result_type_id: detail.commonFields.result_type_id
      },
      updateExplanation: this.saveChangesJustification
    };

    if (detail.geographicScope) {
      const geoScope = detail.geographicScope;

      const mapCountryWithSubNational = (c: any) => {
        const countryId = c.id ?? c.country_id;
        const subNational = Array.isArray(c.sub_national)
          ? c.sub_national.map((sub: any) => ({
              id: sub.id,
              code: sub.code,
              name: sub.name,
              country_id: sub.country_id,
              local_name: sub.local_name ?? '',
              other_names: sub.other_names,
              language_iso_2: sub.language_iso_2,
              country_iso_alpha_2: sub.country_iso_alpha_2,
              romanization_system_name: sub.romanization_system_name,
              subnational_category_name: sub.subnational_category_name,
              is_active: sub.is_active
            }))
          : [];
        return { id: countryId, sub_national: subNational };
      };

      body.geographicScope = {
        has_countries: geoScope.has_countries || false,
        has_regions: geoScope.has_regions || false,
        regions: geoScope.regions?.map((r: any) => ({ id: r.id || r.region_id })) || [],
        countries: geoScope.countries?.map(mapCountryWithSubNational) || [],
        geo_scope_id: geoScope.geo_scope_id || null,
        extra_geo_scope_id: geoScope.extra_geo_scope_id || null,
        extra_regions: geoScope.extra_regions?.map((r: any) => ({ id: r.id || r.region_id })) || [],
        extra_countries: geoScope.extra_countries?.map(mapCountryWithSubNational) || [],
        has_extra_countries: geoScope.has_extra_countries || false,
        has_extra_regions: geoScope.has_extra_regions || false,
        has_extra_geo_scope: geoScope.has_extra_geo_scope || false
      };
    }

    if (detail.contributingCenters && Array.isArray(detail.contributingCenters)) {
      const centersArray: any[] = detail.contributingCenters;

      const codes = centersArray
        .map((item: any) => {
          if (typeof item === 'string') return item;
          if (item && item.code) return item.code;
          return null;
        })
        .filter(Boolean);

      body.contributingCenters = codes
        .map((code: string, index: number) => {
          const center = this.centersSE.centersList.find((c: any) => c.code === code);
          if (!center) return null;

          return {
            ...center,
            result_id: String(resultId),
            is_leading_result: index === 0 ? 1 : null,
            selected: true,
            new: true,
            is_active: true
          };
        })
        .filter(Boolean);
    }

    if (detail.contributingInitiatives) {
      const currentSelection = Array.isArray(detail.contributingInitiatives)
        ? detail.contributingInitiatives
        : [];
      const selectedInitiativeIds = currentSelection.map((init: any) =>
        typeof init === 'object' && init != null && init.id != null
          ? (typeof init.id === 'string' ? Number.parseInt(init.id, 10) : Number(init.id))
          : typeof init === 'number' ? init : Number(init)
      ).filter((id: any) => id != null && !Number.isNaN(id));

      const acceptedPayload: { id: number; share_result_request_id?: number; is_active?: boolean }[] = [];
      const pendingPayload: { id: number }[] = [];

      for (const initiativeId of selectedInitiativeIds) {
        const existing = this.originalAcceptedContributingInitiatives.find(
          (a: any) => (a.initiative_id != null ? a.initiative_id === initiativeId : a.id === initiativeId)
        );
        if (existing && existing.share_result_request_id != null) {
          acceptedPayload.push({
            id: existing.id,
            share_result_request_id: existing.share_result_request_id,
            is_active: existing.is_active !== undefined ? !!existing.is_active : true
          });
        } else {
          pendingPayload.push({ id: initiativeId });
        }
      }

      body.contributingInitiatives = {
        accepted_contributing_initiatives: acceptedPayload,
        pending_contributing_initiatives: pendingPayload
      };
    }

    if (detail.contributingProjects && Array.isArray(detail.contributingProjects)) {
      body.contributingProjects = detail.contributingProjects.map((project: any) => {
        const projectId = project.project_id || project.id;
        return { project_id: projectId };
      });
    }

    if (detail.contributingInstitutions && Array.isArray(detail.contributingInstitutions)) {
      body.contributingInstitutions = detail.contributingInstitutions.map((inst: any) => {
        const institutionId = typeof inst === 'object' && inst != null
          ? (inst.institutions_id ?? inst.institution_id ?? inst.id)
          : inst;

        // Try to find the original record id from the GET response
        let originalId: number | null = null;
        if (typeof inst === 'object' && inst != null && inst.id != null) {
          // If the current object has an id, use it
          originalId = typeof inst.id === 'string' ? Number.parseInt(inst.id, 10) : Number(inst.id);
        } else if (this.originalContributingInstitutions && institutionId != null) {
          // Otherwise, look it up in the original GET response
          const original = this.originalContributingInstitutions.find((orig: any) =>
            (orig.institutions_id ?? orig.institution_id) == institutionId
          );
          if (original && original.id != null) {
            originalId = typeof original.id === 'string' ? Number.parseInt(original.id, 10) : Number(original.id);
          }
        }

        return {
          id: originalId, // Use the preserved id from GET response, or null for new records
          institutions_id: institutionId ?? null,
          institution_roles_id: typeof inst === 'object' && inst?.institution_roles_id != null
            ? (typeof inst.institution_roles_id === 'string' ? Number.parseInt(inst.institution_roles_id, 10) : Number(inst.institution_roles_id))
            : 2,
          is_active: typeof inst === 'object' && inst?.is_active !== undefined ? inst.is_active : 1,
          result_id: resultId
        };
      });
    }

    if (detail.evidence && Array.isArray(detail.evidence)) {
      body.evidence = detail.evidence.map((ev: any) => ({
        id: ev.id || null,
        link: ev.link || ev.evidence_link || '',
        is_sharepoint: ev.is_sharepoint !== undefined ? ev.is_sharepoint : 0
      }));
    }

    const latestDetail = this.resultDetail();
    const resultTypeId = latestDetail?.commonFields?.result_type_id || detail.commonFields?.result_type_id;
    const resultTypeResponse = latestDetail?.resultTypeResponse || detail.resultTypeResponse;

    if (resultTypeResponse && Array.isArray(resultTypeResponse) && resultTypeResponse.length > 0) {
      const resultType: any = resultTypeResponse[0];

      switch (resultTypeId) {
        case 2: {
          // Innovation Use: resultTypeResponse is [ { actors, organizations, measures, investment_partners } ]
          body.resultTypeResponse = [
            {
              actors: resultType.actors ? resultType.actors.map((a: any) => ({ ...a })) : [],
              organizations: resultType.organizations ? resultType.organizations.map((o: any) => ({ ...o })) : [],
              measures: resultType.measures ? resultType.measures.map((m: any) => ({ ...m })) : [],
              investment_partners: resultType.investment_partners ? resultType.investment_partners.map((p: any) => ({ ...p })) : []
            }
          ];
          break;
        }
        case 1: {
          // Implementing Organization = only what is selected in "Whose policy is this?" (resultType.institutions).
          // If user removed an org from the dropdown, it is not sent so the PATCH removes it.
          const currentInstitutions = Array.isArray(resultType.institutions) ? [...resultType.institutions] : [];
          const implementingOrgs = this.buildImplementingOrgsFromSelection(currentInstitutions);

          body.resultTypeResponse = {
            result_policy_change_id: resultType.result_policy_change_id || null,
            policy_type_id: resultType.policy_type_id || null,
            policy_stage_id: resultType.policy_stage_id || null,
            policy_stage_name: resultType.policy_stage_name || null,
            policy_type_name: resultType.policy_type_name || null,
            implementing_organization: implementingOrgs
          };
          break;
        }

        case 5: // Capacity Development
          body.resultTypeResponse = {
            result_capacity_development_id: resultType.result_capacity_development_id || null,
            male_using: resultType.male_using ? Number(resultType.male_using) : null,
            female_using: resultType.female_using ? Number(resultType.female_using) : null,
            non_binary_using: resultType.non_binary_using ? Number(resultType.non_binary_using) : null,
            has_unkown_using: resultType.has_unkown_using !== undefined ? Number(resultType.has_unkown_using) : null,
            capdev_delivery_method_id: resultType.capdev_delivery_method_id || null,
            capdev_term_id: resultType.capdev_term_id || null
          };
          break;

        case 6: // Knowledge Product
          body.resultTypeResponse = {
            result_knowledge_product_id: resultType.result_knowledge_product_id || null,
            knowledge_product_type: resultType.knowledge_product_type || null,
            licence: resultType.licence || null,
            metadata: resultType.metadata || [],
            keywords: resultType.keywords || []
          };
          break;

        case 7: // Innovation Development
          body.resultTypeResponse = {
            result_innovation_dev_id: resultType.result_innovation_dev_id || null,
            innovation_nature_id: resultType.innovation_nature_id || null,
            innovation_type_id: resultType.innovation_type_id || null,
            innovation_type_name: resultType.innovation_type_name || null,
            innovation_developers: resultType.innovation_developers || null,
            innovation_readiness_level_id: resultType.innovation_readiness_level_id || null,
            readinness_level_id: resultType.readinness_level_id || resultType.innovation_readiness_level_id || null,
            level: resultType.level || null,
            name: resultType.name || null
          };
          break;
      }
    }

    // Call the API
    this.api.resultsSE.PATCH_BilateralDataStandard(resultId, body).subscribe({
      next: response => {
        // Reload the result detail to get updated data
        this.loadResultDetail(String(resultId));
        this.showConfirmSaveChangesDialog.set(false);
        this.saveChangesJustification = '';
        this.saveChangesType = null;
        this.isSaving.set(false);
        this.cdr.markForCheck();
      },
      error: err => {
        console.error('Error saving data standard:', err);
        this.isSaving.set(false);
        this.cdr.markForCheck();
        // You might want to show an error message to the user here
      }
    });
  }

  constructor() {
    effect(() => {
      const result = this.resultToReview();
      if (result && this.visible()) {
        this.loadResultDetail(result.id);
      }
    });

    // Effect: when options list is available, ensure contributingInitiatives (primary + accepted + pending) are selected
    effect(() => {
      const detail = this.resultDetail();
      const initiativesList = this.contributingInitiativesList();

      if (!detail?.contributingInitiatives || !Array.isArray(detail.contributingInitiatives) || initiativesList.length === 0) {
        return;
      }

      const allAreNumbers = detail.contributingInitiatives.every((init: any) => typeof init === 'number');

      if (allAreNumbers) {
        const reapplyKey = `${detail.commonFields?.id ?? ''}-${initiativesList.length}-${detail.contributingInitiatives.length}`;
        if (reapplyKey !== this._lastContributingInitiativesReapplyKey) {
          this._lastContributingInitiativesReapplyKey = reapplyKey;
          untracked(() => {
            setTimeout(() => {
              const currentDetail = this.resultDetail();
              if (currentDetail && Array.isArray(currentDetail.contributingInitiatives) && currentDetail.contributingInitiatives.length > 0) {
                this.resultDetail.set({
                  ...currentDetail,
                  contributingInitiatives: [...currentDetail.contributingInitiatives]
                });
                this.cdr.markForCheck();
              }
            }, 0);
          });
        }
        return;
      }

      const mappedInitiatives = detail.contributingInitiatives.map((initiative: any) => {
        if (typeof initiative === 'number') return initiative;
        if (typeof initiative === 'string') {
          const found = initiativesList.find((opt: any) => opt.official_code === initiative || opt.id === Number(initiative));
          return found?.id ?? Number(initiative) ?? initiative;
        }
        if (typeof initiative === 'object' && initiative !== null) {
          if (initiative.id != null) {
            return typeof initiative.id === 'string' ? Number.parseInt(initiative.id, 10) : Number(initiative.id);
          }
          if (initiative.official_code) {
            const found = initiativesList.find((opt: any) => opt.official_code === initiative.official_code);
            return found?.id ?? initiative;
          }
        }
        return initiative;
      }).filter((id: any) => id != null && id !== undefined);

      const currentIds = detail.contributingInitiatives.map((id: any) => String(id)).join(',');
      const mappedIds = mappedInitiatives.map((id: any) => String(id)).join(',');
      if (currentIds !== mappedIds) {
        untracked(() => {
          setTimeout(() => {
            const currentDetail = this.resultDetail();
            if (currentDetail && Array.isArray(currentDetail.contributingInitiatives)) {
              const newIds = currentDetail.contributingInitiatives.map((id: any) => String(id)).join(',');
              if (newIds !== mappedIds) {
                this.resultDetail.set({ ...currentDetail, contributingInitiatives: mappedInitiatives });
                this.cdr.markForCheck();
              }
            }
          }, 0);
        });
      }
    });
  }

  private loadResultDetail(resultId: string): void {
    this.isLoading.set(true);
    // Load CLARISA projects first
    this.loadContributingLists();

    // Ensure institutions are loaded before processing the result
    this.ensureInstitutionsLoaded().then(() => {
      this.fetchAndProcessResultDetail(resultId);
    });
  }

  private ensureInstitutionsLoaded(): Promise<void> {
    return new Promise(resolve => {
      if (this.institutionsSE.institutionsList && this.institutionsSE.institutionsList.length > 0) {
        resolve();
        return;
      }

      let resolved = false;
      const doResolve = () => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      };

      const subscription = this.institutionsSE.loadedInstitutions.subscribe(() => {
        subscription.unsubscribe();
        doResolve();
      });

      const checkInterval = setInterval(() => {
        if (this.institutionsSE.institutionsList && this.institutionsSE.institutionsList.length > 0) {
          clearInterval(checkInterval);
          subscription.unsubscribe();
          doResolve();
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkInterval);
        subscription.unsubscribe();
        doResolve();
      }, 3000);
    });
  }

  private fetchAndProcessResultDetail(resultId: string): void {
    this.api.resultsSE.GET_BilateralResultDetail(resultId).subscribe({
      next: res => {
        const detail = res.response;

        this.api.resultsSE.currentResultId = Number.parseInt(resultId, 10);

        if (detail.commonFields) {
          const currentResultData = {
            id: Number.parseInt(detail.commonFields.id, 10),
            result_id: Number.parseInt(detail.commonFields.id, 10),
            result_code: detail.commonFields.result_code,
            result_level_id: detail.commonFields.result_level_id,
            result_type_id: detail.commonFields.result_type_id,
            result_category: detail.commonFields.result_category,
            portfolio: 'P25'
          } as any;

          this.api.dataControlSE.currentResult = currentResultData;
          this.api.dataControlSE.currentResultSignal.set(currentResultData);
        }

        let primaryInitiativeId: number | null = null;
        let finalInitiativeId: number | null = null;

        const setInitiativeIdIfNeeded = (initiativeId: number | null) => {
          if (initiativeId && (!this.initiativeIdSignal() || this.initiativeIdSignal() !== initiativeId)) {
            this.initiativeIdSignal.set(initiativeId);
            setTimeout(() => {
              this.cdr.markForCheck();
            }, 50);
          }
        };

        const activePortfolio = this.api.dataControlSE.currentResult?.portfolio || 'SP';
        this.api.resultsSE.GET_AllWithoutResults(activePortfolio).subscribe({
          next: ({ response }) => {
            this.contributingInitiativesList.set(response || []);
            if (!primaryInitiativeId && response && response.length > 0 && response[0].id) {
              primaryInitiativeId = response[0].id;
            }
            if (primaryInitiativeId && !finalInitiativeId) {
              finalInitiativeId = primaryInitiativeId;
              setInitiativeIdIfNeeded(finalInitiativeId);
            }
            if (primaryInitiativeId && !this.initiativeIdSignal()) {
              setInitiativeIdIfNeeded(primaryInitiativeId);
            }
            // Note: The effect will automatically handle mapping when initiativesList is available
            // No need to force update here as it could cause infinite loops
          },
          error: () => this.contributingInitiativesList.set([])
        });

        if (detail.contributingCenters && Array.isArray(detail.contributingCenters)) {
          detail.contributingCenters = detail.contributingCenters.map((center: any) => center.code);
        } else {
          detail.contributingCenters = [];
        }

        if (detail.contributingProjects && Array.isArray(detail.contributingProjects)) {
          detail.contributingProjects = detail.contributingProjects.map((project: any) => {
            const projectId = project.project_id || project.obj_clarisa_project?.id || project.id;
            return projectId ? String(projectId) : projectId;
          });
        } else {
          detail.contributingProjects = [];
        }

        if (detail.contributingInitiatives) {
          if (Array.isArray(detail.contributingInitiatives)) {
            // Legacy format: array of initiatives
            detail.contributingInitiatives = detail.contributingInitiatives.map((initiative: any) => {
              return initiative.id || initiative.official_code || initiative;
            });
            this.disabledContributingInitiatives.set([]);
            this.contributingInitiativesStatusMap.set(new Map());
            this.originalAcceptedContributingInitiatives = [];
          } else if (typeof detail.contributingInitiatives === 'object') {
            const contributingAndPrimary = detail.contributingInitiatives.contributing_and_primary_initiative || [];
            const accepted = detail.contributingInitiatives.accepted_contributing_initiatives || [];
            const pending = detail.contributingInitiatives.pending_contributing_initiatives || [];

            // Filter primary: only initiatives with initiative_role_id === 1 (or "1")
            const primaryInitiatives = contributingAndPrimary.filter((init: any) => {
              const roleId = init.initiative_role_id;
              return roleId === 1 || roleId === '1';
            });

            this.disabledContributingInitiatives.set(primaryInitiatives);

            this.originalAcceptedContributingInitiatives = (accepted || []).map((a: any) => ({
              id: a.id,
              share_result_request_id: a.share_result_request_id,
              is_active: a.is_active,
              initiative_id: a.initiative_id ?? a.id
            }));

            // Build status map for tags: accepted or pending
            const statusMap = new Map<number, 'accepted' | 'pending'>();
            (accepted || []).forEach((a: any) => {
              const id = typeof a.id === 'string' ? Number.parseInt(a.id, 10) : Number(a.id);
              if (!Number.isNaN(id)) statusMap.set(id, 'accepted');
            });
            (pending || []).forEach((p: any) => {
              const id = typeof p.id === 'string' ? Number.parseInt(p.id, 10) : Number(p.id);
              if (!Number.isNaN(id)) statusMap.set(id, 'pending');
            });
            this.contributingInitiativesStatusMap.set(statusMap);

            // Pre-select only accepted and pending (NOT primary with role_id === 1)
            const nonPrimaryInitiatives = [...accepted, ...pending];

            detail.contributingInitiatives = nonPrimaryInitiatives.map((initiative: any) => {
              if (initiative.id != null) {
                return typeof initiative.id === 'string' ? Number.parseInt(initiative.id, 10) : Number(initiative.id);
              }
              return initiative.official_code || initiative;
            }).filter((id: any) => id != null && id !== undefined);
          } else {
            detail.contributingInitiatives = [];
            this.disabledContributingInitiatives.set([]);
            this.contributingInitiativesStatusMap.set(new Map());
            this.originalAcceptedContributingInitiatives = [];
          }
        } else {
          detail.contributingInitiatives = [];
          this.disabledContributingInitiatives.set([]);
          this.contributingInitiativesStatusMap.set(new Map());
          this.originalAcceptedContributingInitiatives = [];
        }

        if (detail.contributingInstitutions && Array.isArray(detail.contributingInstitutions)) {
          this.originalContributingInstitutions = detail.contributingInstitutions.map((inst: any) => ({
            id: inst.id,
            institutions_id: inst.institutions_id ?? inst.institution_id,
            institution_roles_id: inst.institution_roles_id
          }));

          detail.contributingInstitutions = detail.contributingInstitutions
            .map((institution: any) => {
              const institutionId = institution.institutions_id ?? institution.institution_id;
              if (institutionId == null) return null;
              const id = typeof institutionId === 'string' ? Number(institutionId) : Number(institutionId);
              if (!Number.isFinite(id)) return null;
              return id;
            })
            .filter((id: any) => id != null && id !== undefined);
        } else {
          detail.contributingInstitutions = [];
          this.originalContributingInstitutions = [];
        }

        if (detail.resultTypeResponse && Array.isArray(detail.resultTypeResponse)) {
          detail.resultTypeResponse = detail.resultTypeResponse.map((resultType: any) => {
            const newResultType = { ...resultType };

            // Innovation Use (case 2): first element has actors, organizations, measures, investment_partners
            if ('actors' in newResultType || 'measures' in newResultType || 'investment_partners' in newResultType) {
              if (!newResultType.actors) newResultType.actors = [];
              if (!newResultType.organizations) newResultType.organizations = [];
              if (!newResultType.measures) newResultType.measures = [];
              if (!newResultType.investment_partners) newResultType.investment_partners = [];
              return newResultType;
            }

            // Policy Change (case 1): implementing_organization -> institutions
            if (
              newResultType.implementing_organization &&
              Array.isArray(newResultType.implementing_organization) &&
              newResultType.implementing_organization.length > 0
            ) {
              newResultType.institutions = newResultType.implementing_organization
                .map((org: any) => {
                  const institutionId = org.institution_id || org.institutions_id || org.id;
                  return institutionId ? Number(institutionId) : null;
                })
                .filter((id: any) => id !== null);
            } else {
              if (!newResultType.institutions) {
                newResultType.institutions = [];
              }
            }
            return newResultType;
          });
        }

        if (detail.tocMetadata) {
          const tocMeta = Array.isArray(detail.tocMetadata) ? detail.tocMetadata[0] : detail.tocMetadata;

          if (tocMeta) {
            let resultTocResults: any[] = [];
            if (tocMeta.result_toc_results !== null && tocMeta.result_toc_results !== undefined) {
              if (Array.isArray(tocMeta.result_toc_results)) {
                resultTocResults = tocMeta.result_toc_results;
              } else {
                resultTocResults = [];
              }
            }

            // If planned_result is null, treat it as false (No)
            const plannedResult = tocMeta.planned_result === null || tocMeta.planned_result === undefined ? false : tocMeta.planned_result;

            const tocInitiative: any = {
              planned_result: plannedResult,
              initiative_id: tocMeta.initiative_id ?? null,
              official_code: tocMeta.official_code ?? null,
              short_name: tocMeta.short_name ?? null,
              result_toc_results: resultTocResults,
              toc_progressive_narrative: tocMeta.toc_progressive_narrative ?? null
            };

            if (!Array.isArray(tocInitiative.result_toc_results)) {
              tocInitiative.result_toc_results = [];
            }

            if (tocInitiative.result_toc_results.length === 0) {
              tocInitiative.result_toc_results = [
                {
                  uniqueId: '0',
                  toc_level_id: null,
                  toc_result_id: null,
                  planned_result: tocInitiative.planned_result,
                  initiative_id: tocInitiative.initiative_id,
                  toc_progressive_narrative: null,
                  indicators: []
                }
              ];
            }

            if (Array.isArray(tocInitiative.result_toc_results)) {
              tocInitiative.result_toc_results.forEach((tab: any, index: number) => {
                if (!tab || typeof tab !== 'object') {
                  return;
                }

                if (!tab.uniqueId) {
                  tab.uniqueId = index.toString();
                }
                if (!tab.indicators || !Array.isArray(tab.indicators)) {
                  tab.indicators = [];
                }
                if (tab.indicators.length === 0) {
                  tab.indicators = [
                    {
                      related_node_id: null,
                      toc_results_indicator_id: null,
                      targets: [
                        {
                          contributing_indicator: null
                        }
                      ]
                    }
                  ];
                }
                if (tab.indicators[0] && (!tab.indicators[0].targets || !Array.isArray(tab.indicators[0].targets))) {
                  tab.indicators[0].targets = [{ contributing_indicator: null }];
                }
                if (index === 0 && tab.toc_progressive_narrative && !tocInitiative.toc_progressive_narrative) {
                  tocInitiative.toc_progressive_narrative = tab.toc_progressive_narrative;
                }
              });
            }

            this.tocInitiative = { ...this.tocInitiative, ...tocInitiative };
            setTimeout(() => {
              this.cdr.markForCheck();
            }, 0);

            finalInitiativeId = tocMeta.initiative_id ?? primaryInitiativeId;

            if (finalInitiativeId) {
              setInitiativeIdIfNeeded(finalInitiativeId);
            }

            setTimeout(() => {
              this.tocConsumed.set(true);
              this.cdr.markForCheck();
            }, 100);
          } else {
            finalInitiativeId = primaryInitiativeId;
            Object.assign(this.tocInitiative, {
              planned_result: false, // null treated as false (No)
              initiative_id: primaryInitiativeId,
              official_code: null,
              short_name: null,
              result_toc_results: [
                {
                  uniqueId: '0',
                  toc_level_id: null,
                  toc_result_id: null,
                  planned_result: false, // null treated as false (No)
                  initiative_id: primaryInitiativeId,
                  toc_progressive_narrative: null,
                  indicators: [
                    {
                      related_node_id: null,
                      toc_results_indicator_id: null,
                      targets: [
                        {
                          contributing_indicator: null
                        }
                      ]
                    }
                  ]
                }
              ],
              toc_progressive_narrative: null
            });
            if (finalInitiativeId) {
              setInitiativeIdIfNeeded(finalInitiativeId);
            }
            setTimeout(() => {
              this.tocConsumed.set(true);
              this.cdr.markForCheck();
            }, 100);
          }
        } else {
          finalInitiativeId = primaryInitiativeId;
            Object.assign(this.tocInitiative, {
              planned_result: false, // null treated as false (No)
              initiative_id: primaryInitiativeId,
              official_code: null,
              short_name: null,
              result_toc_results: [
                {
                  uniqueId: '0',
                  toc_level_id: null,
                  toc_result_id: null,
                  planned_result: false, // null treated as false (No)
                  initiative_id: primaryInitiativeId,
                  toc_progressive_narrative: null,
                  indicators: [
                    {
                      related_node_id: null,
                      toc_results_indicator_id: null,
                      targets: [
                        {
                          contributing_indicator: null
                        }
                      ]
                    }
                  ]
                }
              ],
              toc_progressive_narrative: null
            });
            this.cdr.markForCheck();
            if (finalInitiativeId) {
              setInitiativeIdIfNeeded(finalInitiativeId);
            }
            setTimeout(() => {
              this.tocConsumed.set(true);
              this.cdr.markForCheck();
            }, 100);
        }

        const detailWithNewReference = {
          ...detail,
          resultTypeResponse: detail.resultTypeResponse
            ? Array.isArray(detail.resultTypeResponse)
              ? detail.resultTypeResponse.map((rt: any) => ({ ...rt }))
              : { ...detail.resultTypeResponse }
            : detail.resultTypeResponse
        };

        this.resultDetail.set(detailWithNewReference);
        this.isLoading.set(false);

        setTimeout(() => {
          const currentDetail = this.resultDetail();
          if (currentDetail) {
            const updatedDetail = { ...currentDetail };
            if (updatedDetail.contributingCenters?.length) {
              updatedDetail.contributingCenters = [...updatedDetail.contributingCenters];
            }
            if (updatedDetail.contributingProjects?.length) {
              updatedDetail.contributingProjects = [...updatedDetail.contributingProjects];
            }
            if (updatedDetail.contributingInstitutions?.length) {
              updatedDetail.contributingInstitutions = [...updatedDetail.contributingInstitutions];
            }
            if (updatedDetail.resultTypeResponse && Array.isArray(updatedDetail.resultTypeResponse)) {
              updatedDetail.resultTypeResponse = updatedDetail.resultTypeResponse.map((resultType: any) => {
                const newResultType = { ...resultType };
                if (
                  resultType.implementing_organization &&
                  Array.isArray(resultType.implementing_organization) &&
                  resultType.implementing_organization.length > 0
                ) {
                  if (!newResultType.institutions || newResultType.institutions.length === 0) {
                    newResultType.institutions = resultType.implementing_organization
                      .map((org: any) => {
                        const institutionId = org.institution_id || org.institutions_id || org.id;
                        return institutionId ? Number(institutionId) : null;
                      })
                      .filter((id: any) => id !== null);
                  }
                } else if (!newResultType.institutions) {
                  newResultType.institutions = [];
                }
                return newResultType;
              });
            }
            this.resultDetail.set(updatedDetail);
            this.cdr.markForCheck();
          }
        }, 300);
      },
      error: err => {
        console.error('Error loading result detail:', err);
        this.isLoading.set(false);
      }
    });
  }

  private loadContributingLists(): void {
    this.api.resultsSE.GET_ClarisaProjects().subscribe({
      next: ({ response }) => {
        const projects = response || [];
        projects.forEach((project: any) => {
          project.project_id = project.id ? String(project.id) : project.id;
        });
        this.clarisaProjectsList.set(projects);
      },
      error: () => this.clarisaProjectsList.set([])
    });
  }

  toggleFullScreen(): void {
    this.drawerFullScreen.set(!this.drawerFullScreen());
  }

  closeDrawer(): void {
    this.visible.set(false);
    this.drawerFullScreen.set(false);
    this.resetForm();
  }

  private resetForm(): void {
    this.rejectJustification = '';
    this.resultDetail.set(null);
    this.originalContributingInitiatives = null;
    this.originalContributingInstitutions = null;
    this.originalAcceptedContributingInitiatives = [];
    this.contributingInitiativesStatusMap.set(new Map());
    this._lastContributingInitiativesReapplyKey = '';
    this.disabledContributingInitiatives.set([]);
    Object.assign(this.tocInitiative, {
      planned_result: null, // Reset to null for initial state
      initiative_id: null,
      official_code: null,
      short_name: null,
      result_toc_results: [
        {
          uniqueId: '0',
          toc_level_id: null,
          toc_result_id: null,
          planned_result: null, // Reset to null for initial state
          initiative_id: null,
          toc_progressive_narrative: null,
          indicators: [
            {
              related_node_id: null,
              toc_results_indicator_id: null,
              targets: [
                {
                  contributing_indicator: null
                }
              ]
            }
          ]
        }
      ],
      toc_progressive_narrative: null
    });
    this.initiativeIdSignal.set(null);
    this.tocConsumed.set(true);
    this.showConfirmApproveDialog.set(false);
    this.showConfirmRejectDialog.set(false);
  }

  onApprove(): void {
    this.showConfirmApproveDialog.set(true);
  }

  confirmApprove(): void {
    const result = this.resultToReview();
    if (!result) return;
    this.isSaving.set(true);
    const body = {
      decision: 'APPROVE' as const,
      justification: 'Approved'
    };
    this.api.resultsSE.PATCH_BilateralReviewDecision(result.id, body).subscribe({
      next: () => {
        this.showConfirmApproveDialog.set(false);
        this.isSaving.set(false);
        this.decisionMade.emit();
        this.closeDrawer();
      },
      error: err => {
        console.error('Error approving result:', err);
        this.isSaving.set(false);
      }
    });
  }

  cancelApprove(): void {
    this.showConfirmApproveDialog.set(false);
  }

  onReject(): void {
    this.showConfirmRejectDialog.set(true);
  }

  confirmReject(): void {
    if (!this.rejectJustification.trim()) {
      return;
    }

    const result = this.resultToReview();
    if (!result) return;

    this.isSaving.set(true);
    const body = {
      decision: 'REJECT' as const,
      justification: this.rejectJustification
    };

    this.api.resultsSE.PATCH_BilateralReviewDecision(result.id, body).subscribe({
      next: () => {
        this.showConfirmRejectDialog.set(false);
        this.isSaving.set(false);
        this.decisionMade.emit();
        this.closeDrawer();
      },
      error: err => {
        console.error('Error rejecting result:', err);
        this.isSaving.set(false);
      }
    });
  }

  cancelReject(): void {
    this.showConfirmRejectDialog.set(false);
    this.rejectJustification = '';
  }

  addEvidenceLink(): void {
    if (!this.evidenceLinkInput?.trim()) return;

    const detail = this.resultDetail();
    if (!detail) return;

    if (!detail.evidence) {
      detail.evidence = [];
    }

    detail.evidence.push({ link: this.evidenceLinkInput.trim() });
    this.resultDetail.set({ ...detail });
    this.evidenceLinkInput = '';
  }

  removeEvidenceLink(index: number): void {
    const detail = this.resultDetail();
    if (!detail?.evidence) return;

    detail.evidence.splice(index, 1);
    this.resultDetail.set({ ...detail });
  }

  ngOnInit(): void {
    document.body.style.overflow = 'hidden';
  }

  ngOnDestroy(): void {
    document.body.style.overflow = 'auto';
  }
}
