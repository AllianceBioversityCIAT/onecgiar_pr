// @akili-spec bilateral/manual-create-drawer — shared manual-create drawer orchestration
import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Observable, Subject, filter } from 'rxjs';
import { ApiService } from '../../../shared/services/api/api.service';
import { BilateralApiService } from '../../../shared/services/api/bilateral-api.service';
import { BilateralManualCreatePayload } from '../components/bilateral-manual-create-form/bilateral-manual-create-form.component';
import { BilateralContextService } from './bilateral-context.service';
import { BilateralCreationService } from './bilateral-creation.service';
import { BilateralProject } from './bilateral-creation.interfaces';
import { BilateralOverviewService } from './bilateral-overview.service';
import { BILATERAL_MANUAL_CREATE_COPY } from '../../../internationalization/bilateral-manual-create.copy';
import { isCenterMember } from './bilateral-center-membership.util';

/**
 * `ARM-T-1` (P2-3853, `docs/specs/bilateral/ai-queue-report-manually`) — the narrow argument
 * `beginFromJob` needs from an AI job. Deliberately NOT `NormalizedBilateralAiListJob` (design.md
 * §8): this service must not import the AI job model. Fields are nullable because R-4 C ("job
 * without a project or Center") is a no-op the method itself detects, not a precondition callers
 * must satisfy first.
 */
export interface BilateralJobEntryPoint {
  readonly projectId: number | null;
  readonly centerId: number | string | null;
  readonly centerAcronym: string | null;
}

@Injectable({ providedIn: 'root' })
export class BilateralManualCreateFlowService {
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly ctx = inject(BilateralContextService);
  private readonly creationService = inject(BilateralCreationService);
  private readonly overviewService = inject(BilateralOverviewService);
  private readonly bilateralApi = inject(BilateralApiService);

  readonly drawerOpen = signal(false);
  readonly isCreating = signal(false);
  readonly selectedReportingWay = signal<'manual' | 'ai' | null>(null);

  /** `ARM-T-1` — no replay: a `create` visit that mounts AFTER the entry fired must see nothing. */
  private readonly externalEntrySource = new Subject<void>();
  readonly externalEntry: Observable<void> = this.externalEntrySource.asObservable();

  /** Guards against a superseded call opening the drawer with a stale response (`ARM-R-4` A). */
  private jobRequestToken = 0;
  /** The path (no query/fragment) recorded by every opener — `beginFromProject`,
   * `openDrawerForManual` — the instant it opens the drawer, and cleared on `closeDrawer()`. Not
   * scoped to `beginFromJob`: the host now outlives pages regardless of which entry opened it
   * (design §7.1, `ARM-DD-6`), so a "+ Create result" or wizard Manual-entry open must close on a
   * later route change exactly like a job-driven open does. */
  private openPathAtEntry: string | null = null;

  constructor() {
    // design §7.1 "Close on path change" — wired unconditionally for the service's whole lifetime,
    // not only once a job has opened the drawer (Reviewer FAIL, attempt 1: a lazy, first-call-only
    // wire left every panel/wizard open unguarded until a job ran once). Query-only changes keep
    // the drawer open.
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe(() => {
      if (this.openPathAtEntry !== null && this.currentPath() !== this.openPathAtEntry) {
        this.closeDrawer();
      }
    });
  }

  readonly canShowCreateForm = computed(() => !!this.creationService.selectedPrimarySp());

  readonly hasMultipleSpOptions = computed(
    () => (this.creationService.selectedProject()?.sciencePrograms?.length ?? 0) > 1
  );

  readonly canGoBack = computed(() => !!this.selectedReportingWay());

  readonly backLabel = computed(() => BILATERAL_MANUAL_CREATE_COPY.navigation.backToCreateOptions);

  readonly showSpSelectionInDrawer = computed(() => this.hasMultipleSpOptions());

  /**
   * `ASC-T-5` rework, attempt 2 (`ASC-R-15`, `ASC-DD-7`) — Reviewer-found gap: this is the REAL
   * AI-create entry point. Both the bilateral-home "+ Create result" (`beginFromProject()`) and
   * the in-wizard drawer (`openDrawerForManual()`) route through this same drawer-host, whose
   * `app-bilateral-reporting-way-selector` binds `[canUseAi]="flow.canUseAi()"`
   * (`bilateral-manual-create-drawer-host.component.html:90`). The server's own `createJob` takes
   * the client-supplied `center_id` with no entitlement check (`ASC-DD-7`, pre-existing, recorded
   * — not fixed here), so on THIS path the client gate is the only barrier for a non-member admin.
   * Reads `rolesVersion` first for the same reason every other `isCenterMember` call site does:
   * `RolesService.roles` is a plain property, invisible to the signal graph on its own. Deliberately
   * never reads `isAdmin` — that is the short-circuit this gate exists to not repeat.
   */
  readonly canUseAi = computed(() => {
    this.api.rolesSE.rolesVersion;
    return (
      !!this.creationService.selectedProject() &&
      !!this.creationService.selectedPrimarySp() &&
      isCenterMember(this.api.rolesSE.getMyCenters(), this.ctx.centerId(), this.ctx.centerAcronym())
    );
  });

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
    this.recordOpenPath();
  }

  /**
   * `ARM-T-1` — the AI drawer's "Report manually" entry (`ai-processes-drawer-host`'s
   * `onReportManually`, wired by `ARM-T-3`). No-op when the job is missing a field it needs
   * (`ARM-R-4` C). Otherwise: stays in place on a bilateral route of the job's OWN Center that
   * isn't a result editor (design §7.2), or navigates to that Center's home first (`ARM-R-2`).
   * Either way, it fetches that Center's catalogue exactly once (`ARM-NFR-2`, `ARM-DD-2` — never
   * `creationService.getProjects()`, so `creationService.projects()` is left untouched), finds the
   * job's project and opens through the existing `beginFromProject` (`ARM-R-1`). Not found, or the
   * request errors, shows a toast and leaves the drawer closed (`ARM-R-4` B). A request token
   * makes a later call supersede an earlier one still in flight, so a stale response never opens
   * the drawer (`ARM-R-4` A).
   */
  beginFromJob(job: BilateralJobEntryPoint): void {
    const { projectId, centerId, centerAcronym } = job;
    if (projectId == null || centerId == null || !centerAcronym) return;

    const token = ++this.jobRequestToken;

    if (this.isInPlace(centerAcronym)) {
      this.resolveJobProject(token, centerId, projectId, this.currentPath());
      return;
    }

    void this.router.navigate(['/bilateral', centerAcronym, 'home']).then(navigated => {
      if (!navigated || token !== this.jobRequestToken) return;
      this.resolveJobProject(token, centerId, projectId, this.currentPath());
    });
  }

  /** design §7.2 "in-place" rule: seg1 `bilateral`, seg2 the job's OWN center, seg3 not `result`.
   * Reads the router URL, not `BilateralContextService` (`ctx` keeps the last Center after the
   * user leaves bilateral, design P-6). */
  private isInPlace(centerAcronym: string): boolean {
    const segments = this.currentPath().split('/').filter(Boolean);
    return segments[0] === 'bilateral' && segments[1] === centerAcronym && segments[2] !== 'result';
  }

  private currentPath(): string {
    return this.router.url.split('?')[0].split('#')[0];
  }

  /**
   * `pathAtClick` is the path `beginFromJob` resolved in-place against, or the path right after
   * its own navigation resolved — captured BEFORE this HTTP call, so a further navigation while
   * the catalogue is still in flight is caught here even though it also supersedes via
   * `NavigationEnd` + `closeDrawer()` (design §7.1): that only closes a drawer already open, it
   * does not stop this response from opening one on the page the user has since left.
   */
  private resolveJobProject(
    token: number,
    centerId: number | string,
    projectId: number,
    pathAtClick: string
  ): void {
    this.bilateralApi.GET_bilateralProjects(centerId).subscribe({
      next: ({ response }) => {
        if (token !== this.jobRequestToken) return; // superseded — a newer call already decided
        if (this.currentPath() !== pathAtClick) return; // navigated away while the request was in flight
        const projects: BilateralProject[] = response?.projects ?? [];
        const project = projects.find(p => Number(p.id) === projectId);
        if (!project) {
          this.closeDrawer();
          this.showJobProjectUnavailableToast();
          return;
        }
        this.beginFromProject(project);
        this.externalEntrySource.next();
      },
      error: () => {
        if (token !== this.jobRequestToken) return;
        this.closeDrawer();
        this.showJobProjectUnavailableToast();
      }
    });
  }

  private showJobProjectUnavailableToast(): void {
    this.api.alertsFe.show({
      id: 'bilateralManualCreateJobProjectUnavailable',
      title: BILATERAL_MANUAL_CREATE_COPY.externalEntry.projectUnavailableTitle,
      description: BILATERAL_MANUAL_CREATE_COPY.externalEntry.projectUnavailableDescription,
      status: 'error'
    });
  }

  /** design §7.1 — the path every opener records the instant it opens the drawer; `closeDrawer()`
   * clears it back to `null`. */
  private recordOpenPath(): void {
    this.openPathAtEntry = this.currentPath();
  }

  /** Wizard entry: reporting way already chosen as manual on the page. */
  openDrawerForManual(): void {
    this.selectedReportingWay.set('manual');
    this.drawerOpen.set(true);
    this.recordOpenPath();
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
    this.openPathAtEntry = null;
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
