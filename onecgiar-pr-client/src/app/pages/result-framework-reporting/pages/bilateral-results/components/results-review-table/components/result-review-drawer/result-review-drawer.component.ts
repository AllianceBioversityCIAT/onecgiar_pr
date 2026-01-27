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
    CustomFieldsModule
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
        const activePortfolio = this.api.dataControlSE.currentResult?.portfolio || 'SP';
        this.api.resultsSE.GET_AllWithoutResults(activePortfolio).subscribe({
          next: ({ response }) => {
            this.contributingInitiativesList.set(response || []);
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
