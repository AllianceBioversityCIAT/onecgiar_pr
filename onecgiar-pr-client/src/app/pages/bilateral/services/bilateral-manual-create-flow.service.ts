// @akili-spec bilateral/manual-create-drawer — shared manual-create drawer orchestration
import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../../shared/services/api/api.service';
import { BilateralManualCreatePayload } from '../components/bilateral-manual-create-form/bilateral-manual-create-form.component';
import { BilateralContextService } from './bilateral-context.service';
import { BilateralCreationService } from './bilateral-creation.service';
import { BilateralProject } from './bilateral-creation.interfaces';
import { BILATERAL_MANUAL_CREATE_COPY } from '../../../internationalization/bilateral-manual-create.copy';

@Injectable({ providedIn: 'root' })
export class BilateralManualCreateFlowService {
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly ctx = inject(BilateralContextService);
  private readonly creationService = inject(BilateralCreationService);

  readonly drawerOpen = signal(false);
  readonly isCreating = signal(false);
  readonly selectedReportingWay = signal<'manual' | 'ai' | null>(null);

  readonly canShowCreateForm = computed(() => !!this.creationService.selectedPrimarySp());

  readonly hasMultipleSpOptions = computed(
    () => (this.creationService.selectedProject()?.sciencePrograms?.length ?? 0) > 1
  );

  readonly canGoBack = computed(() => !!this.selectedReportingWay());

  readonly backLabel = computed(() => BILATERAL_MANUAL_CREATE_COPY.navigation.backToCreateOptions);

  readonly showSpSelectionInDrawer = computed(() => this.hasMultipleSpOptions());

  readonly canUseAi = computed(
    () => !!this.creationService.selectedProject() && !!this.creationService.selectedPrimarySp()
  );

  readonly drawerProjectCode = computed(() => this.creationService.selectedProject()?.shortName ?? '');

  readonly drawerProjectTitle = computed(
    () => this.creationService.selectedProject()?.fullName || this.creationService.selectedProject()?.shortName || ''
  );

  readonly drawerProgramCode = computed(() => this.creationService.selectedPrimarySp()?.programCode ?? '');

  readonly drawerProgramName = computed(() => {
    const primary = this.creationService.selectedPrimarySp();
    if (!primary) return '';
    const mapped = this.creationService
      .selectedProject()
      ?.sciencePrograms?.find(sp => sp.programId === primary.programId);
    return mapped?.spName || mapped?.spShortName || '';
  });

  /** Home catalog entry: pre-select project, auto-pick SP when unambiguous, open drawer in place. */
  beginFromProject(project: BilateralProject, event?: Event): void {
    event?.preventDefault();
    this.creationService.selectProject(project);
    this.selectedReportingWay.set(null);
    this.autoSelectPrimarySpIfSingle();
    this.drawerOpen.set(true);
  }

  /** Wizard entry: reporting way already chosen as manual on the page. */
  openDrawerForManual(): void {
    this.selectedReportingWay.set('manual');
    this.drawerOpen.set(true);
  }

  selectReportingWay(way: 'manual' | 'ai'): void {
    this.selectedReportingWay.set(way);
  }

  goBack(): void {
    if (this.selectedReportingWay()) {
      this.selectedReportingWay.set(null);
    }
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
    this.selectedReportingWay.set(null);
  }

  submitCreate(payload: BilateralManualCreatePayload): void {
    if (!payload.levelId || !payload.typeId) return;
    this.creationService.resultLevelId.set(payload.levelId);
    this.creationService.resultTypeId.set(payload.typeId);
    this.isCreating.set(true);

    this.creationService.createResult(payload.levelId, payload.typeId, payload.handle, payload.title).subscribe({
      next: ({ response }) => {
        this.isCreating.set(false);
        this.closeDrawer();
        if (!response?.id) {
          this.api.alertsFe.show({
            id: 'bilateralCreateNoId',
            title: 'Error',
            description: 'Result created but no ID returned',
            status: 'error'
          });
          return;
        }

        this.creationService.clearEditorState();

        const resultCode = Number(response.result_code);
        const hasResultCode = Number.isFinite(resultCode) && resultCode > 0;
        if (!hasResultCode) {
          this.api.alertsFe.show({
            id: 'bilateralCreateNoResultCode',
            title: 'Result created without a result code',
            description: 'Opening it by internal id. Please report this — the result code sequence may not be configured.',
            status: 'warning',
            closeIn: 8000
          });
        }

        if (response.lead_center_resolved === false) {
          this.api.alertsFe.show({
            id: 'bilateralCreateNoLeadCenter',
            title: 'Result created without a lead center',
            description:
              'The selected project has no center on record, so section 3 cannot be completed yet. Please report it so the project can be corrected.',
            status: 'warning',
            closeIn: 8000
          });
        }

        this.router.navigate(['/bilateral', this.ctx.centerAcronym(), 'result', hasResultCode ? resultCode : response.id], {
          queryParams: hasResultCode && response.version_id ? { phase: response.version_id } : {}
        });
      },
      error: (err: HttpErrorResponse) => {
        this.isCreating.set(false);
        const detail = err.error?.message || err.statusText || 'Unknown error';
        this.api.alertsFe.show({
          id: 'bilateralCreateError',
          title: 'Failed to create result',
          description: detail,
          status: 'error',
          closeIn: 5000
        });
      }
    });
  }

  private autoSelectPrimarySpIfSingle(): void {
    const sps = this.creationService.selectedProject()?.sciencePrograms ?? [];
    if (sps.length !== 1) return;
    const sp = sps[0];
    this.creationService.selectPrimarySp({
      programId: sp.programId,
      programCode: sp.programCode,
      allocation: sp.allocation ?? ''
    });
  }
}
