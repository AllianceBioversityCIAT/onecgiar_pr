import { ChangeDetectionStrategy, Component, computed, effect, inject, model, OnDestroy, OnInit, output, signal } from '@angular/core';
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
  bilateralResultsService = inject(BilateralResultsService);
  rolesSE = inject(RolesService);
  centersSE = inject(CentersService);
  institutionsSE = inject(InstitutionsService);

  // Contributing lists
  clarisaProjectsList = signal<any[]>([]);
  contributingInitiativesList = signal<any[]>([]);

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
  }

  private loadResultDetail(resultId: string): void {
    this.isLoading.set(true);
    this.loadContributingLists();
    this.api.resultsSE.GET_BilateralResultDetail(resultId).subscribe({
      next: res => {
        this.resultDetail.set(res.response);
        this.isLoading.set(false);
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
        this.clarisaProjectsList.set(response || []);
      },
      error: () => this.clarisaProjectsList.set([])
    });

    // Load contributing initiatives
    const activePortfolio = this.api.dataControlSE.currentResult?.portfolio;
    if (activePortfolio) {
      this.api.resultsSE.GET_AllWithoutResults(activePortfolio).subscribe({
        next: ({ response }) => {
          this.contributingInitiativesList.set(response || []);
        },
        error: () => this.contributingInitiativesList.set([])
      });
    }
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
