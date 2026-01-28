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
  signal
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

  disabledInitiativesOptions = computed(() => {
    const disabled = this.disabledContributingInitiatives();
    const initiativesList = this.contributingInitiativesList();

    if (!disabled.length || !initiativesList.length) return [];

    return disabled
      .map((disabledInit: any) => {
        if (typeof disabledInit === 'object' && disabledInit.id) {
          return initiativesList.find((opt: any) => opt.id === disabledInit.id);
        }
        if (typeof disabledInit === 'object' && disabledInit.official_code) {
          return initiativesList.find((opt: any) => opt.official_code === disabledInit.official_code);
        }
        if (typeof disabledInit === 'string') {
          return initiativesList.find((opt: any) => opt.official_code === disabledInit);
        }
        if (typeof disabledInit === 'number') {
          return initiativesList.find((opt: any) => opt.id === disabledInit);
        }
        return null;
      })
      .filter(Boolean);
  });

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
  originalContributingInitiatives: any = null;

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
    // Only check if planned_result has been selected (Yes or No)
    // Since null is now treated as false, we only need to check for undefined
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
    if (!this.tocInitiative || !this.isTocFormValid()) return;

    const detail = this.resultDetail();
    if (!detail?.commonFields?.id) {
      console.error('Result ID not available');
      return;
    }

    const resultId = Number.parseInt(detail.commonFields.id, 10);

    const resultTocResults = this.tocInitiative.result_toc_results.map((tab: any) => {
      const resultTocResult: any = {
        toc_result_id: tab.toc_result_id,
        toc_progressive_narrative: tab.toc_progressive_narrative || null,
        toc_level_id: tab.toc_level_id
      };

      if (tab.result_toc_result_id) {
        resultTocResult.result_toc_result_id = tab.result_toc_result_id;
      }

      return resultTocResult;
    });

    const body = {
      tocMetadata: {
        planned_result: this.tocInitiative.planned_result,
        initiative_id: this.tocInitiative.initiative_id || this.initiativeIdSignal(),
        result_toc_results: resultTocResults
      },
      updateExplanation: this.saveChangesJustification
    };

    // Call the API
    this.api.resultsSE.PATCH_BilateralTocMetadata(resultId, body).subscribe({
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
        console.error('Error saving TOC metadata:', err);
        this.isSaving.set(false);
        this.cdr.markForCheck();
        // You might want to show an error message to the user here
      }
    });
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
      body.geographicScope = {
        has_countries: geoScope.has_countries || false,
        has_regions: geoScope.has_regions || false,
        regions: geoScope.regions?.map((r: any) => ({ id: r.id || r.region_id })) || [],
        countries: geoScope.countries?.map((c: any) => ({ id: c.id || c.country_id })) || [],
        geo_scope_id: geoScope.geo_scope_id || null,
        extra_geo_scope_id: geoScope.extra_geo_scope_id || null,
        extra_regions: geoScope.extra_regions?.map((r: any) => ({ id: r.id || r.region_id })) || [],
        extra_countries: geoScope.extra_countries?.map((c: any) => ({ id: c.id || c.country_id })) || [],
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
      if (Array.isArray(detail.contributingInitiatives)) {
        body.contributingInitiatives = {
          accepted_contributing_initiatives: [],
          pending_contributing_initiatives: detail.contributingInitiatives.map((init: any) => {
            if (typeof init === 'object' && init.id) {
              return {
                ...init,
                selected: true,
                new: true,
                is_active: true
              };
            }
            return init;
          })
        };
      } else if (typeof detail.contributingInitiatives === 'object') {
        body.contributingInitiatives = {
          accepted_contributing_initiatives: detail.contributingInitiatives.accepted_contributing_initiatives || [],
          pending_contributing_initiatives: (detail.contributingInitiatives.pending_contributing_initiatives || []).map((init: any) => ({
            ...init,
            selected: true,
            new: true,
            is_active: true
          }))
        };
      }
    }

    if (detail.contributingProjects && Array.isArray(detail.contributingProjects)) {
      body.contributingProjects = detail.contributingProjects.map((project: any) => {
        const projectId = project.project_id || project.id;
        return { project_id: projectId };
      });
    }

    if (detail.contributingInstitutions && Array.isArray(detail.contributingInstitutions)) {
      body.contributingInstitutions = detail.contributingInstitutions.map((inst: any) => ({
        id: inst.id || null,
        institution_id: inst.institution_id || inst.institutions_id || inst.id,
        institution_roles_id: inst.institution_roles_id || 2,
        is_active: inst.is_active !== undefined ? inst.is_active : 1,
        result_id: resultId
      }));
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
        case 1: {
          let implementingOrgs: any[] = [];

          if (
            resultType.implementing_organization &&
            Array.isArray(resultType.implementing_organization) &&
            resultType.implementing_organization.length > 0
          ) {
            const hasValidData = resultType.implementing_organization.some(
              (org: any) => org.institution_id !== null && org.institution_id !== undefined
            );
            if (hasValidData) {
              implementingOrgs = resultType.implementing_organization;
            }
          }

          if (
            implementingOrgs.length === 0 &&
            resultType.institutions &&
            Array.isArray(resultType.institutions) &&
            resultType.institutions.length > 0
          ) {
            const firstItem = resultType.institutions[0];

            if (firstItem && typeof firstItem === 'object') {
              implementingOrgs = resultType.institutions
                .map((item: any) => {
                  if (!item || typeof item !== 'object') return null;

                  // If it already has institution_id, use it
                  if (item.institution_id !== null && item.institution_id !== undefined) {
                    return {
                      institution_id:
                        typeof item.institution_id === 'string' ? Number.parseInt(item.institution_id, 10) : Number(item.institution_id),
                      acronym: item.acronym || null,
                      institution_name: item.institution_name || item.institutions_name || item.full_name || null
                    };
                  }

                  const instId = item.institutions_id || item.id || item.institution_id;
                  if (instId !== null && instId !== undefined) {
                    const numId = typeof instId === 'string' ? Number.parseInt(instId, 10) : Number(instId);
                    if (!isNaN(numId)) {
                      const institution = this.institutionsSE.institutionsList?.find((inst: any) => {
                        const instIdNum =
                          typeof inst.institutions_id === 'string' ? Number.parseInt(inst.institutions_id, 10) : Number(inst.institutions_id);
                        const instIdAlt = typeof inst.id === 'string' ? Number.parseInt(inst.id, 10) : Number(inst.id);
                        return instIdNum === numId || instIdAlt === numId;
                      });

                      return {
                        institution_id: numId,
                        acronym: institution?.acronym || item.acronym || null,
                        institution_name:
                          institution?.institutions_name ||
                          institution?.full_name ||
                          item.institution_name ||
                          item.institutions_name ||
                          item.full_name ||
                          null
                      };
                    }
                  }
                  return null;
                })
                .filter((org: any) => org !== null && org.institution_id !== null && !isNaN(org.institution_id));

              if (implementingOrgs.length > 0) {
                // Using institutions objects directly
              } else {
                // Objects mapping failed, trying ID extraction
              }
            }

            if (implementingOrgs.length === 0) {
              const validInstitutionIds = resultType.institutions
                .map((item: any) => {
                  if (typeof item === 'number') return item;
                  if (typeof item === 'string' && item !== '') {
                    const num = Number.parseInt(item, 10);
                    return !isNaN(num) ? num : null;
                  }
                  if (typeof item === 'object' && item !== null) {
                    return item.institutions_id || item.id || item.institution_id || null;
                  }
                  return null;
                })
                .filter((id: any) => id !== null && id !== undefined && !isNaN(id))
                .map((id: any) => (typeof id === 'string' ? Number.parseInt(id, 10) : Number(id)))
                .filter((id: number) => !isNaN(id));

              if (validInstitutionIds.length > 0 && this.institutionsSE.institutionsList && this.institutionsSE.institutionsList.length > 0) {
                implementingOrgs = validInstitutionIds
                  .map((instId: number) => {
                    const institution = this.institutionsSE.institutionsList.find((inst: any) => {
                      const instIdNum =
                        typeof inst.institutions_id === 'string' ? Number.parseInt(inst.institutions_id, 10) : Number(inst.institutions_id);
                      const instIdAlt = typeof inst.id === 'string' ? Number.parseInt(inst.id, 10) : Number(inst.id);
                      const instIdAlt2 =
                        typeof inst.institution_id === 'string' ? Number.parseInt(inst.institution_id, 10) : Number(inst.institution_id);

                      return instIdNum === instId || instIdAlt === instId || instIdAlt2 === instId;
                    });

                    if (institution) {
                      const finalId = institution.institutions_id || institution.id || institution.institution_id || instId;
                      return {
                        institution_id: typeof finalId === 'string' ? Number.parseInt(finalId, 10) : Number(finalId),
                        acronym: institution.acronym || null,
                        institution_name: institution.institutions_name || institution.full_name || institution.institution_name || null
                      };
                    }

                    return {
                      institution_id: instId,
                      acronym: null,
                      institution_name: null
                    };
                  })
                  .filter((org: any) => org.institution_id !== null && org.institution_id !== undefined && !isNaN(org.institution_id));
              }
            }
          }

          body.resultTypeResponse = {
            result_policy_change_id: resultType.result_policy_change_id || null,
            policy_type_id: resultType.policy_type_id || null,
            policy_stage_id: resultType.policy_stage_id || null,
            policy_stage_name: resultType.policy_stage_name || null,
            policy_type_name: resultType.policy_type_name || null,
            implementing_organization: implementingOrgs.length > 0 ? implementingOrgs : []
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

    effect(() => {
      const detail = this.resultDetail();
      const initiativesList = this.contributingInitiativesList();
      const disabledInitiatives = this.disabledContributingInitiatives();

      if (detail?.contributingInitiatives && Array.isArray(detail.contributingInitiatives) && initiativesList.length > 0) {
        const needsMapping = detail.contributingInitiatives.some((init: any) => {
          if (typeof init === 'number') return false;
          if (typeof init === 'string') return true;
          // Also check if it's an object that needs to be converted to ID
          if (typeof init === 'object' && init !== null) {
            return !init.id || (init.official_code && !init.id);
          }
          return false;
        });

        if (needsMapping) {
          const mappedInitiatives = detail.contributingInitiatives.map((initiative: any) => {
            // If it's already a number (ID), return as is
            if (typeof initiative === 'number') {
              return initiative;
            }
            // If it's a string (official_code), find the matching initiative and return its ID
            if (typeof initiative === 'string') {
              const found = initiativesList.find((opt: any) => opt.official_code === initiative || opt.id === Number(initiative));
              return found?.id || initiative;
            }
            // If it's an object, extract the ID if available, otherwise try to find it
            if (typeof initiative === 'object' && initiative !== null) {
              if (initiative.id) {
                return initiative.id;
              }
              if (initiative.official_code) {
                const found = initiativesList.find((opt: any) => opt.official_code === initiative.official_code);
                return found?.id || initiative;
              }
            }
            return initiative;
          });

          if (disabledInitiatives.length > 0) {
            const mappedDisabled = disabledInitiatives.map((initiative: any) => {
              if (typeof initiative === 'object' && initiative.official_code) {
                const found = initiativesList.find((opt: any) => opt.official_code === initiative.official_code);
                return found ? { ...initiative, id: found.id } : initiative;
              }
              return initiative;
            });
            this.disabledContributingInitiatives.set(mappedDisabled);
          }

          // Only update if the mapping actually changed something
          const hasChanged = mappedInitiatives.some((mapped: any, index: number) => mapped !== detail.contributingInitiatives[index]);

          if (hasChanged) {
            this.resultDetail.set({ ...detail, contributingInitiatives: mappedInitiatives });
          }
        }
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
      // If institutions are already loaded, resolve immediately
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

      // Otherwise, wait for the loadedInstitutions event
      const subscription = this.institutionsSE.loadedInstitutions.subscribe(() => {
        subscription.unsubscribe();
        doResolve();
      });

      // Timeout fallback (in case the service is already loaded but event was missed)
      // Check periodically if institutions are loaded
      const checkInterval = setInterval(() => {
        if (this.institutionsSE.institutionsList && this.institutionsSE.institutionsList.length > 0) {
          clearInterval(checkInterval);
          subscription.unsubscribe();
          doResolve();
        }
      }, 100);

      // Maximum wait time of 3 seconds
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
            detail.contributingInitiatives = detail.contributingInitiatives.map((initiative: any) => {
              // Prioritize id over official_code since optionValue="id" in the multi-select
              return initiative.id || initiative.official_code || initiative;
            });
            this.disabledContributingInitiatives.set([]);
          } else if (typeof detail.contributingInitiatives === 'object') {
            // New format: object with contributing_and_primary, accepted and pending arrays
            const contributingAndPrimary = detail.contributingInitiatives.contributing_and_primary_initiative || [];
            const accepted = detail.contributingInitiatives.accepted_contributing_initiatives || [];
            const pending = detail.contributingInitiatives.pending_contributing_initiatives || [];

            // Get primary initiative ID from contributing_and_primary_initiative
            if (contributingAndPrimary.length > 0 && contributingAndPrimary[0].id) {
              primaryInitiativeId = contributingAndPrimary[0].id;
            }

            this.disabledContributingInitiatives.set(contributingAndPrimary);

            const allInitiatives = [...contributingAndPrimary, ...accepted, ...pending];
            detail.contributingInitiatives = allInitiatives.map((initiative: any) => {
              // Prioritize id over official_code since optionValue="id" in the multi-select
              return initiative.id || initiative.official_code || initiative;
            });
          } else {
            detail.contributingInitiatives = [];
            this.disabledContributingInitiatives.set([]);
          }
        } else {
          detail.contributingInitiatives = [];
          this.disabledContributingInitiatives.set([]);
        }

        // Transform contributingInstitutions from objects to array of institutions_id
        if (detail.contributingInstitutions && Array.isArray(detail.contributingInstitutions)) {
          detail.contributingInstitutions = detail.contributingInstitutions.map((institution: any) => {
            const institutionId = institution.institutions_id || institution.id;
            return institutionId ? Number(institutionId) : institutionId;
          });
        } else {
          detail.contributingInstitutions = [];
        }

        if (detail.resultTypeResponse && Array.isArray(detail.resultTypeResponse)) {
          detail.resultTypeResponse = detail.resultTypeResponse.map((resultType: any) => {
            const newResultType = { ...resultType };

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

            // Create a new object reference to force change detection
            this.tocInitiative = { ...this.tocInitiative, ...tocInitiative };
            // Force change detection after updating tocInitiative
            // Use setTimeout to ensure ngModel binding updates
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
          resultTypeResponse: detail.resultTypeResponse ? detail.resultTypeResponse.map((rt: any) => ({ ...rt })) : detail.resultTypeResponse
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
