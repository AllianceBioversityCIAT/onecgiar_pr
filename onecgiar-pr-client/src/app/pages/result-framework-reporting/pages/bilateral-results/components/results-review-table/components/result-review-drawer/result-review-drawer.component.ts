import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, effect, inject, model, OnDestroy, OnInit, output, signal } from '@angular/core';
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

  // Contributing lists
  clarisaProjectsList = signal<any[]>([]);
  contributingInitiativesList = signal<any[]>([]);
  disabledContributingInitiatives = signal<any[]>([]);

  // TOC properties - using mutable object instead of signal so app-cp-multiple-wps can modify it directly
  tocInitiative: any = {
    planned_result: null,
    initiative_id: null,
    official_code: null,
    short_name: null,
    result_toc_results: [{
      uniqueId: '0',
      toc_level_id: null,
      toc_result_id: null,
      planned_result: null,
      initiative_id: null,
      toc_progressive_narrative: null,
      indicators: [{
        related_node_id: null,
        toc_results_indicator_id: null,
        targets: [{
          contributing_indicator: null
        }]
      }]
    }],
    toc_progressive_narrative: null
  };
  initiativeIdSignal = signal<number | null>(null);
  tocConsumed = signal<boolean>(true);

  // Computed signal to get disabled initiatives in the format expected by pr-multi-select
  disabledInitiativesOptions = computed(() => {
    const disabled = this.disabledContributingInitiatives();
    const initiativesList = this.contributingInitiativesList();
    
    if (!disabled.length || !initiativesList.length) return [];
    
    // Map disabled initiatives to option objects from the list
    return disabled.map((disabledInit: any) => {
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
    }).filter(Boolean);
  });

  visible = model<boolean>(false);
  resultToReview = model<ResultToReview | null>(null);
  drawerFullScreen = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);

  decisionMade = output<void>();

  resultDetail = signal<BilateralResultDetail | null>(null);

  rejectJustification: string = '';
  evidenceLinkInput: string = '';

  showConfirmApproveDialog = signal<boolean>(false);
  showConfirmRejectDialog = signal<boolean>(false);

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
    // Handle both array (legacy) and object (new) formats
    return Array.isArray(detail.tocMetadata) ? detail.tocMetadata[0] : detail.tocMetadata;
  }

  getTocAlertDescription(): string {
    return 'If your answer is <strong>Yes</strong>, please select the relevant <strong>HLO, indicator</strong>, and <strong>contribution to target</strong> below. If the result is not planned for in the 2025 ToC (planned indicators), please select <strong>No</strong> and, where applicable, choose the <strong>HLO</strong> under which it is most appropriate to report the result. Please also provide a short justification explaining why you are reporting it even though it is not reflected in a 2025 ToC indicator. These "No"-flagged results could be reviewed by the Program team as part of the adaptive management process and may inform updates or adjustments to the Program\'s 2026 ToC and planned indicators.';
  }

  onPlannedResultChangeValue(value: boolean | null): void {
    if (!this.tocInitiative) return;
    
    // Update planned_result value directly on the mutable object
    this.tocInitiative.planned_result = value;
    this.cdr.markForCheck();
  }

  onTocProgressiveNarrativeChange(value: string): void {
    if (!this.tocInitiative) return;
    
    // Update toc_progressive_narrative value directly on the mutable object
    this.tocInitiative.toc_progressive_narrative = value;
    // Also update in the first result_toc_result if it exists
    if (this.tocInitiative.result_toc_results && this.tocInitiative.result_toc_results.length > 0) {
      this.tocInitiative.result_toc_results[0].toc_progressive_narrative = value;
    }
    this.cdr.markForCheck();
  }

  onPlannedResultChange(): void {
    if (!this.tocInitiative) return;

    // Clear TOC data when planned_result changes
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
    
    // Set consumed after a short delay to allow component to update
    setTimeout(() => {
      this.tocConsumed.set(true);
      this.cdr.markForCheck();
    }, 100);
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
          return false;
        });
        
        if (needsMapping) {
          const mappedInitiatives = detail.contributingInitiatives.map((initiative: any) => {
            if (typeof initiative === 'number') {
              return initiative;
            }
            if (typeof initiative === 'string') {
              const found = initiativesList.find((opt: any) => opt.official_code === initiative);
              return found?.id || initiative;
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
          const hasChanged = mappedInitiatives.some((mapped: any, index: number) => 
            mapped !== detail.contributingInitiatives[index]
          );
          
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
    
    this.api.resultsSE.GET_BilateralResultDetail(resultId).subscribe({
      next: res => {
        const detail = res.response;
      
        this.api.resultsSE.currentResultId = Number.parseInt(resultId, 10);
        
        // Set currentResult and currentResultSignal FIRST for app-cp-multiple-wps component to work correctly
        // It needs access to currentResult for API calls and currentResultSignal for TocInitiativeOutcomeListsService
        // This must be set before mapping TOC data so the services can load the lists
        // IMPORTANT: Always use P25 for bilateral results drawer to ensure correct TOC endpoints
        if (detail.commonFields) {
          const currentResultData = {
            id: Number.parseInt(detail.commonFields.id, 10),
            result_id: Number.parseInt(detail.commonFields.id, 10),
            result_code: detail.commonFields.result_code,
            result_level_id: detail.commonFields.result_level_id,
            result_type_id: detail.commonFields.result_type_id, // Needed for filtering Level dropdown
            result_category: detail.commonFields.result_category, // Needed for filtering Level dropdown
            portfolio: 'P25' // Always use P25 for bilateral results drawer to ensure correct TOC endpoints
          } as any;
          
          this.api.dataControlSE.currentResult = currentResultData;
          // Also set the signal so TocInitiativeOutcomeListsService can load tocResultList
          // This triggers the effect in TocInitiativeOutcomeListsService to load GET_AllTocLevels
          // Setting portfolio to 'P25' ensures isP25() returns true, forcing P25 endpoints
          this.api.dataControlSE.currentResultSignal.set(currentResultData);
        }
        
        // Get primary initiative ID for TOC if not available in tocMetadata
        // Declare early so it's available in all callbacks
        let primaryInitiativeId: number | null = null;
        let finalInitiativeId: number | null = null; // Will hold the final initiative_id to use
        
        // Helper function to set initiativeIdSignal when we have a valid ID
        const setInitiativeIdIfNeeded = (initiativeId: number | null) => {
          if (initiativeId && (!this.initiativeIdSignal() || this.initiativeIdSignal() !== initiativeId)) {
            setTimeout(() => {
              this.initiativeIdSignal.set(initiativeId);
              this.cdr.markForCheck();
            }, 100);
          }
        };
        
        const activePortfolio = this.api.dataControlSE.currentResult?.portfolio || 'SP';
        this.api.resultsSE.GET_AllWithoutResults(activePortfolio).subscribe({
          next: ({ response }) => {
            this.contributingInitiativesList.set(response || []);
            // If primaryInitiativeId is still null after loading initiatives list, try to get it from the first available initiative
            // This ensures initiativeIdSignal always has a valid value for loading TOC lists
            if (!primaryInitiativeId && response && response.length > 0 && response[0].id) {
              primaryInitiativeId = response[0].id;
            }
            // Update finalInitiativeId if we have a valid primaryInitiativeId and finalInitiativeId is not set
            // This handles the case where GET_AllWithoutResults completes after tocMetadata processing
            if (primaryInitiativeId && !finalInitiativeId) {
              finalInitiativeId = primaryInitiativeId;
              setInitiativeIdIfNeeded(finalInitiativeId);
            }
            // Also update if initiativeIdSignal is null and we now have a valid ID
            if (primaryInitiativeId && !this.initiativeIdSignal()) {
              setInitiativeIdIfNeeded(primaryInitiativeId);
            }
          },
          error: () => this.contributingInitiativesList.set([])
        });
        
        // Transform contributingCenters from objects to array of codes
        if (detail.contributingCenters && Array.isArray(detail.contributingCenters)) {
          detail.contributingCenters = detail.contributingCenters.map((center: any) => center.code);
        } else {
          detail.contributingCenters = [];
        }
        
        // Transform contributingProjects from objects to array of project_ids
        if (detail.contributingProjects && Array.isArray(detail.contributingProjects)) {
          detail.contributingProjects = detail.contributingProjects.map((project: any) => {
            const projectId = project.project_id || project.obj_clarisa_project?.id || project.id;
            return projectId ? String(projectId) : projectId;
          });
        } else {
          detail.contributingProjects = [];
        }
        
        // Transform contributingInitiatives from object with contributing_and_primary/accepted/pending arrays to array of official_codes
        if (detail.contributingInitiatives) {
          if (Array.isArray(detail.contributingInitiatives)) {
            detail.contributingInitiatives = detail.contributingInitiatives.map((initiative: any) => {
              return initiative.official_code || initiative.id || initiative;
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
              return initiative.official_code || initiative.id || initiative;
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
            if (resultType.implementing_organization && Array.isArray(resultType.implementing_organization)) {
              resultType.institutions = resultType.implementing_organization.map((org: any) => {
                const institutionId = org.institution_id || org.institutions_id || org.id;
                return institutionId ? Number(institutionId) : institutionId;
              });
            } else if (!resultType.institutions) {
              resultType.institutions = [];
            }
            return resultType;
          });
        }
        
        // Map tocMetadata to the format expected by app-cp-multiple-wps
        // The response has: { planned_result: true, initiative_id: 58, result_toc_results: [...] }
        // The component expects: { planned_result: boolean, initiative_id: number, result_toc_results: array, ... }
        if (detail.tocMetadata) {
          const tocMeta = Array.isArray(detail.tocMetadata) ? detail.tocMetadata[0] : detail.tocMetadata;
          
          if (tocMeta) {
            // Create the initiative object in the format expected by app-cp-multiple-wps
            const tocInitiative: any = {
              planned_result: tocMeta.planned_result ?? null,
              initiative_id: tocMeta.initiative_id ?? null,
              official_code: tocMeta.official_code ?? null,
              short_name: tocMeta.short_name ?? null,
              result_toc_results: tocMeta.result_toc_results || [],
              toc_progressive_narrative: null
            };
            
            // Ensure result_toc_results is an array and has the correct structure
            if (!Array.isArray(tocInitiative.result_toc_results)) {
              tocInitiative.result_toc_results = [];
            }
            
            // If result_toc_results is empty, initialize with at least one empty tab
            // This is required for app-cp-multiple-wps to render correctly
            if (tocInitiative.result_toc_results.length === 0) {
              tocInitiative.result_toc_results = [{
                uniqueId: '0',
                toc_level_id: null,
                toc_result_id: null,
                planned_result: tocInitiative.planned_result,
                initiative_id: tocInitiative.initiative_id,
                toc_progressive_narrative: null,
                indicators: []
              }];
            }
            
            // Add uniqueId to each tab for the component and set toc_progressive_narrative from first tab
            tocInitiative.result_toc_results.forEach((tab: any, index: number) => {
              if (!tab.uniqueId) {
                tab.uniqueId = index.toString();
              }
              // Ensure indicators array exists
              if (!tab.indicators || !Array.isArray(tab.indicators)) {
                tab.indicators = [];
              }
              // If no indicators, add an empty one for the component to work
              if (tab.indicators.length === 0) {
                tab.indicators = [{
                  related_node_id: null,
                  toc_results_indicator_id: null,
                  targets: [{
                    contributing_indicator: null
                  }]
                }];
              }
              // Ensure targets array exists in first indicator
              if (tab.indicators[0] && (!tab.indicators[0].targets || !Array.isArray(tab.indicators[0].targets))) {
                tab.indicators[0].targets = [{ contributing_indicator: null }];
              }
              // Set toc_progressive_narrative from the first tab if not already set
              if (index === 0 && tab.toc_progressive_narrative && !tocInitiative.toc_progressive_narrative) {
                tocInitiative.toc_progressive_narrative = tab.toc_progressive_narrative;
              }
            });
            
            // Assign the object directly (mutable reference)
            Object.assign(this.tocInitiative, tocInitiative);
            
            // Use initiative_id from tocMeta, or fallback to primaryInitiativeId
            finalInitiativeId = tocMeta.initiative_id ?? primaryInitiativeId;
            
            // Set initiativeIdSignal - this triggers the effect in multiple-wps to load the lists
            // This will load outcomeList, outputList, and eoiList for the dropdowns
            if (finalInitiativeId) {
              setInitiativeIdIfNeeded(finalInitiativeId);
            }
            
            setTimeout(() => {
              this.tocConsumed.set(true);
              this.cdr.markForCheck();
            }, 100);
          } else {
            // Initialize empty if no TOC data, but use primaryInitiativeId if available
            finalInitiativeId = primaryInitiativeId;
            Object.assign(this.tocInitiative, {
              planned_result: null,
              initiative_id: primaryInitiativeId,
              official_code: null,
              short_name: null,
              result_toc_results: [{
                uniqueId: '0',
                toc_level_id: null,
                toc_result_id: null,
                planned_result: null,
                initiative_id: primaryInitiativeId,
                toc_progressive_narrative: null,
                indicators: [{
                  related_node_id: null,
                  toc_results_indicator_id: null,
                  targets: [{
                    contributing_indicator: null
                  }]
                }]
              }],
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
          // Initialize empty if no tocMetadata, but use primaryInitiativeId if available
          finalInitiativeId = primaryInitiativeId;
          Object.assign(this.tocInitiative, {
            planned_result: null,
            initiative_id: primaryInitiativeId,
            official_code: null,
            short_name: null,
            result_toc_results: [{
              uniqueId: '0',
              toc_level_id: null,
              toc_result_id: null,
              planned_result: null,
              initiative_id: primaryInitiativeId,
              toc_progressive_narrative: null,
              indicators: [{
                related_node_id: null,
                toc_results_indicator_id: null,
                targets: [{
                  contributing_indicator: null
                }]
              }]
            }],
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
        
        this.resultDetail.set(detail);
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
    // Load CLARISA projects
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
    this.disabledContributingInitiatives.set([]);
    Object.assign(this.tocInitiative, {
      planned_result: null,
      initiative_id: null,
      official_code: null,
      short_name: null,
      result_toc_results: [{
        uniqueId: '0',
        toc_level_id: null,
        toc_result_id: null,
        planned_result: null,
        initiative_id: null,
        toc_progressive_narrative: null,
        indicators: [{
          related_node_id: null,
          toc_results_indicator_id: null,
          targets: [{
            contributing_indicator: null
          }]
        }]
      }],
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
