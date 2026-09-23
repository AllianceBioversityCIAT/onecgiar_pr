// @akili-spec bilateral/manual-create-drawer — shared manual-create drawer orchestration
import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../../shared/services/api/api.service';
import { BilateralManualCreatePayload } from '../components/bilateral-manual-create-form/bilateral-manual-create-form.component';
import { BilateralContextService } from './bilateral-context.service';
import { BilateralCreationService } from './bilateral-creation.service';
import { BilateralProject } from './bilateral-creation.interfaces';
import { BilateralOverviewService } from './bilateral-overview.service';
import { BILATERAL_MANUAL_CREATE_COPY } from '../../../internationalization/bilateral-manual-create.copy';

@Injectable({ providedIn: 'root' })
export class BilateralManualCreateFlowService {
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly ctx = inject(BilateralContextService);
  private readonly creationService = inject(BilateralCreationService);
  private readonly overviewService = inject(BilateralOverviewService);

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

  /**
   * P2-3756: CLARISA fills `summary` and `description` independently — 2026 projects mostly arrive
   * with `summary: null` and the text in `description`, and either field can come back as `''`
   * rather than null (see `clarisa_projects`). Both are normalised and de-duplicated here, not in
   * the template, so the drawer can render one labelled block per field that actually has content:
   * a 2026 project shows a single block instead of an empty "Project Summary" box.
   */
  readonly drawerProjectSummary = computed(() => {
    const summary = BilateralManualCreateFlowService.clean(this.creationService.selectedProject()?.summary);
    return this.echoesProjectTitle(summary) ? '' : summary;
  });

  readonly drawerProjectDescription = computed(() => {
    const description = BilateralManualCreateFlowService.clean(
      this.creationService.selectedProject()?.description
    );
    if (!description || this.echoesProjectTitle(description)) {
      return '';
    }

    // Some projects repeat the same text in both fields; the summary block already shows it.
    const summary = this.drawerProjectSummary();
    return summary && description.toLowerCase() === summary.toLowerCase() ? '' : description;
  });

  /** Empty string for null, undefined and whitespace-only values alike. */
  private static clean(value: string | null | undefined): string {
    return value?.trim() ?? '';
  }

  /** The drawer already shows the project title above these fields — don't repeat it. */
  private echoesProjectTitle(text: string): boolean {
    if (!text) {
      return false;
    }
    const title = this.drawerProjectTitle().trim();
    return !!title && text.toLowerCase() === title.toLowerCase();
  }

  readonly drawerLeadCenterAcronym = computed(
    () => this.creationService.selectedProject()?.leadCenter?.acronym ?? ''
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
    // Night sweep 2026-09-23, C-2 — re-entry guard. The form's `canCreate` reads `creating` through an
    // input that only refreshes on the next change detection, so a fast double-click emitted twice and
    // two identical results were created (prtest #9573/#9574, #9577/#9578). This signal is set
    // synchronously below, so the second call returns here.
    if (this.isCreating()) return;
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

        const centerKey = this.ctx.centerId() || this.ctx.centerAcronym();
        const versionId = this.ctx.selectedVersionId() ?? (response?.version_id ? Number(response.version_id) : null);
        if (centerKey && versionId !== null) {
          this.overviewService.invalidate(centerKey, versionId);
        }

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
