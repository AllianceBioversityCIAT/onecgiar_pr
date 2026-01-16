import { ChangeDetectionStrategy, Component, effect, inject, model, OnDestroy, OnInit, output, signal } from '@angular/core';
import { DrawerModule } from 'primeng/drawer';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RadioButtonModule } from 'primeng/radiobutton';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';

export interface ResultToReview {
  id: string;
  project_id: string;
  project_name: string;
  result_code: string;
  result_title: string;
  indicator_category: string;
  status_name: string;
  acronym: string;
  toc_title: string;
  indicator: string;
  submission_date: string;
}

export interface GroupedResult {
  project_id: string;
  project_name: string;
  results: ResultToReview[];
}

interface SelectOption {
  label: string;
  value: string | number;
}

// Bilateral Result Detail Interfaces
export interface BilateralResultDetail {
  commonFields: BilateralCommonFields;
  tocMetadata: BilateralTocMetadata[];
  geographicScope: BilateralGeographicScope;
  contributingCenters: BilateralContributingCenter[];
  contributingInstitutions: BilateralContributingInstitution[];
  contributingProjects: BilateralContributingProject[];
  contributingInitiatives: BilateralContributingInitiative[];
  evidence: BilateralEvidence[];
  resultTypeResponse: BilateralResultTypeResponse[];
}

export interface BilateralCommonFields {
  project_name: string;
  center_name: string;
  id: string;
  result_code: string;
  external_submitter: number;
  submitter_name: string;
  result_level_id: number;
  result_title: string;
  result_description: string | null;
  result_category: string;
}

export interface BilateralTocMetadata {
  planned_result: number;
  acronym: string;
  result_title: string;
  indicator_description: string;
}

export interface BilateralGeographicScope {
  regions: any[];
  countries: any[];
  geo_scope_id: number;
  has_extra_geo_scope: boolean | null;
  has_countries: boolean;
  has_regions: boolean;
  extra_geo_scope_id: number | null;
  extra_regions: any[];
  extra_countries: any[];
  has_extra_regions: boolean | null;
  has_extra_countries: boolean | null;
}

export interface BilateralContributingCenter {
  id: number;
  primary: number;
  from_cgspace: number;
  is_active: number;
  created_date: string;
  last_updated_date: string;
  result_id: string;
  created_by: number;
  last_updated_by: number | null;
  code: string;
  name: string;
  acronym: string;
  is_leading_result: number;
}

export interface BilateralContributingInstitution {
  id?: number;
  name?: string;
  acronym?: string;
}

export interface BilateralContributingProject {
  is_active: boolean;
  created_date: string;
  last_updated_date: string;
  created_by: string;
  last_updated_by: string | null;
  id: number;
  result_id: string;
  project_id: string;
  obj_clarisa_project: BilateralClarisaProject;
}

export interface BilateralClarisaProject {
  id: string;
  shortName: string;
  fullName: string;
  summary: string;
  description: string;
  startDate: string;
  endDate: string;
  totalBudget: string;
  remaining: string;
  annual: string;
  sourceOfFunding: string;
  organizationCode: string;
  funderCode: string | null;
  interimDirectorReview: string;
  projectResults: string;
  modificationJustification: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  isActive: boolean | null;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface BilateralContributingInitiative {
  initiative_role: string;
  official_code: string;
}

export interface BilateralEvidence {
  link: string;
}

export interface BilateralResultTypeResponse {
  source: string;
  year: string;
  knowledge_product_type: string;
  is_peer_reviewed: number;
  is_isi: number;
  accesibility: string;
  licence: string;
  is_agrovoc: number;
  keyword: string;
}

@Component({
  selector: 'app-result-review-drawer',
  imports: [DrawerModule, CommonModule, FormsModule, RadioButtonModule, SelectModule, ButtonModule, DialogModule, TextareaModule],
  templateUrl: './result-review-drawer.component.html',
  styleUrl: './result-review-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResultReviewDrawerComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);

  visible = model<boolean>(false);
  resultToReview = model<ResultToReview | null>(null);
  drawerFullScreen = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);

  // Output to notify parent when a decision is made
  decisionMade = output<void>();

  // Result detail from API
  resultDetail = signal<BilateralResultDetail | null>(null);

  // TOC Alignment fields
  tocAlignmentValue: boolean = true;
  selectedTocResult: string | null = null;
  selectedIndicator: string | null = null;
  rejectJustification: string = '';
  approveJustification: string = '';

  // Dialog state
  showConfirmApproveDialog = signal<boolean>(false);
  showConfirmRejectDialog = signal<boolean>(false);

  // Dropdown options (TODO: these should come from API)
  tocResultOptions: SelectOption[] = [
    { label: 'AOW01 - Evidence generated to support policy development in Africa and Asia', value: 'aow01' },
    { label: 'AOW02 - New wheat varieties adopted by farmers in target regions', value: 'aow02' },
    { label: 'AOW03 - Enhanced seed systems supporting wheat production', value: 'aow03' },
    { label: 'AOW04 - Small-scale producers and other actors use climate advisory services...', value: 'aow04' },
    { label: 'AOW05 - Climate-smart farming innovations with evidence at scale', value: 'aow05' },
    { label: 'AOW06 - Early warning systems for wheat diseases implemented', value: 'aow06' }
  ];

  indicatorOptions: SelectOption[] = [
    { label: 'Number of small-scale producers using climate services', value: 'ind01' },
    { label: 'Number of farmers adopting new learning resources', value: 'ind02' },
    { label: 'Number of policy instruments influenced by research', value: 'ind03' },
    { label: 'Number of innovations sessions delivered', value: 'ind04' }
  ];

  constructor() {
    effect(() => {
      const result = this.resultToReview();
      if (result && this.visible()) {
        this.initializeFormFromResult(result);
        this.loadResultDetail(result.id);
      }
    });
  }

  private loadResultDetail(resultId: string): void {
    this.isLoading.set(true);
    this.api.resultsSE.GET_BilateralResultDetail(resultId).subscribe({
      next: res => {
        this.resultDetail.set(res.response);
        this.isLoading.set(false);
        console.log(res.response);
        console.log(res.response.geographicScope);
      },
      error: err => {
        console.error('Error loading result detail:', err);
        this.isLoading.set(false);
      }
    });
  }

  private initializeFormFromResult(result: ResultToReview): void {
    this.tocAlignmentValue = true;
    this.selectedTocResult = result.acronym || null;
    this.selectedIndicator = null;
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
    this.approveJustification = '';
    this.resultDetail.set(null);
    this.showConfirmApproveDialog.set(false);
    this.showConfirmRejectDialog.set(false);
  }

  saveTocChanges(): void {
    // TODO: Implement API call to save TOC changes
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

  ngOnInit(): void {
    document.body.style.overflow = 'hidden';
  }

  ngOnDestroy(): void {
    document.body.style.overflow = 'auto';
  }
}
