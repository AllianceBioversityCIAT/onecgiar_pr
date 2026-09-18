import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, ElementRef, inject, signal, untracked } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BilateralApiService } from '../../../../../../shared/services/api/bilateral-api.service';
import { BilateralContextService } from '../../../../services/bilateral-context.service';
import { BilateralManualCreateFlowService } from '../../../../services/bilateral-manual-create-flow.service';
import { BilateralManualCreateDrawerHostComponent } from '../../../../components/bilateral-manual-create-drawer-host/bilateral-manual-create-drawer-host.component';
import { BilateralProject } from '../../../../services/bilateral-creation.interfaces';
import { BilateralCenterResult } from '../../../../services/bilateral-center-result.interface';
import { BilateralOverviewService } from '../../../../services/bilateral-overview.service';
import { PhasesService } from '../../../../../../shared/services/global/phases.service';
import { Phases } from '../../../../../../shared/interfaces/phasesList.interface';
// @akili-spec bilateral/center-overview-tab (COV-T-7, COV-R-15, COV-DD-9) — reads the shared
// query-param contract; this tab only READS (`program`, `project`, `multi`), it never writes back.
import { parseBilateralQueryParams } from '../../../../bilateral-query-params';

/** `COV-R-15`/`COV-DD-9` — how long the `?project=` highlight ring stays on the card. */
const PROJECT_HIGHLIGHT_DURATION_MS = 2000;

export interface KpiProgramStat {
  programId: number;
  programCode: string;
  spName: string;
  spShortName: string;
  count: number;
}

export interface KpiSummary {
  total: number;
  byProgram: KpiProgramStat[];
  multiProgramCount: number;
}

function getInitialViewMode(): 'grid' | 'list' {
  try {
    const saved = sessionStorage.getItem('pr.bilateral.viewMode');
    if (saved === 'grid' || saved === 'list') {
      return saved;
    }
  } catch {
    // Fallback if sessionStorage is not accessible
  }
  return 'grid';
}

@Component({
  selector: 'app-bilateral-projects-panel',
  standalone: true,
  imports: [DecimalPipe, BilateralManualCreateDrawerHostComponent],
  templateUrl: './bilateral-projects-panel.component.html',
  styleUrl: './bilateral-projects-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BilateralProjectsPanelComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly phasesService = inject(PhasesService);
  private readonly overviewService = inject(BilateralOverviewService);
  private readonly bilateralApiService = inject(BilateralApiService);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  readonly ctx = inject(BilateralContextService);
  readonly manualCreateFlow = inject(BilateralManualCreateFlowService);

  readonly phases = signal<Phases[]>([]);

  readonly effectiveVersionId = computed<number | null>(() => {
    const fromUrl = this.activatedRoute.snapshot.queryParamMap.get('phase');
    if (fromUrl) {
      const n = Number(fromUrl);
      if (Number.isFinite(n) && n > 0) return n;
    }
    const fromCtx = this.ctx.selectedVersionId();
    if (fromCtx !== null) return fromCtx;
    const phases = this.phases();
    if (!phases.length) return null;
    const open = phases.find(p => p.status) ?? phases[0];
    return open ? Number(open.id) : null;
  });

  readonly results = computed<BilateralCenterResult[]>(() => {
    const centerKey = this.ctx.centerId() || this.ctx.centerAcronym();
    const versionId = this.effectiveVersionId();
    if (!centerKey || versionId === null) return [];
    return this.overviewService.resultsData(centerKey, versionId)() ?? [];
  });

  readonly resultsCountByProject = computed<Map<number, number>>(() => {
    const rows = this.results();
    const countMap = new Map<number, number>();
    for (const row of rows) {
      const pId = row.project_id != null ? Number(row.project_id) : null;
      if (pId !== null && Number.isSafeInteger(pId) && pId > 0) {
        countMap.set(pId, (countMap.get(pId) ?? 0) + 1);
      }
    }
    return countMap;
  });

  readonly projects = signal<BilateralProject[]>([]);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly searchQuery = signal('');
  readonly selectedProgramFilter = signal<string>('ALL');
  readonly selectedMultiProgramOnly = signal<boolean>(false);
  readonly viewMode = signal<'grid' | 'list'>(getInitialViewMode());

  /** `COV-R-15`/`COV-DD-9` — the project id `?project=` highlights (scroll + transient ring), for
   *  up to `PROJECT_HIGHLIGHT_DURATION_MS`. The catalog is never filtered by it — highlight, not
   *  filter. */
  readonly highlightedProjectId = signal<number | null>(null);
  private highlightTimer: ReturnType<typeof setTimeout> | null = null;

  readonly kpiSummary = computed<KpiSummary>(() => {
    const list = this.projects();
    const total = list.length;
    let multiProgramCount = 0;
    const statsMap = new Map<string, KpiProgramStat>();

    for (const project of list) {
      const sps = project.sciencePrograms ?? [];
      if (sps.length > 1) {
        multiProgramCount++;
      }

      const seenProgramsInProject = new Set<string>();
      for (const sp of sps) {
        const key = sp.programCode || sp.spName || String(sp.programId);
        if (!key || seenProgramsInProject.has(key)) continue;
        seenProgramsInProject.add(key);

        const existing = statsMap.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          statsMap.set(key, {
            programId: sp.programId,
            programCode: sp.programCode,
            spName: sp.spName,
            spShortName: sp.spShortName,
            count: 1
          });
        }
      }
    }

    const byProgram = Array.from(statsMap.values()).sort((a, b) => b.count - a.count);

    return {
      total,
      byProgram,
      multiProgramCount
    };
  });

  readonly filteredProjects = computed(() => {
    let list = this.projects();

    if (this.selectedMultiProgramOnly()) {
      list = list.filter(p => (p.sciencePrograms ?? []).length > 1);
    }

    const programFilter = this.selectedProgramFilter().trim().toLowerCase();
    if (programFilter && programFilter !== 'all') {
      list = list.filter(p =>
        (p.sciencePrograms ?? []).some(sp =>
          sp.spName?.toLowerCase() === programFilter ||
          sp.spShortName?.toLowerCase() === programFilter ||
          sp.programCode?.toLowerCase() === programFilter
        )
      );
    }

    const query = this.searchQuery().trim();
    if (query) {
      const tokens = normalize(query).split(/\s+/).filter(Boolean);

      list = list.filter(p => {
        const haystack = [
          p.shortName ?? '',
          p.fullName ?? '',
          p.summary ?? '',
          p.description ?? '',
          ...(p.sciencePrograms ?? []).map(sp => sp.spName ?? ''),
          ...(p.sciencePrograms ?? []).map(sp => sp.spShortName ?? ''),
          ...(p.sciencePrograms ?? []).map(sp => sp.programCode ?? ''),
        ].map(normalize).join(' ');

        return tokens.every(token => haystack.includes(token));
      });
    }

    return list;
  });

  constructor() {
    const reportingPhases = this.phasesService.phases?.reporting;
    if (reportingPhases?.length) {
      this.phases.set(reportingPhases);
    } else if (this.phasesService.getPhasesObservable) {
      this.phasesService
        .getPhasesObservable()
        .pipe(take(1), takeUntilDestroyed(this.destroyRef))
        .subscribe(loaded => this.phases.set(loaded ?? []));
    }

    effect(() => {
      const centerKey = this.ctx.centerId() || this.ctx.centerAcronym();
      const versionId = this.effectiveVersionId();
      if (centerKey && versionId !== null) {
        this.overviewService.load(centerKey, versionId);
      }
    });

    effect(() => {
      const centerId = this.ctx.centerId() || this.ctx.centerAcronym();
      if (!centerId) return;
      untracked(() => {
        this.searchQuery.set('');
        this.selectedProgramFilter.set('ALL');
        this.selectedMultiProgramOnly.set(false);
        this.loading.set(true);
        this.error.set(false);
        this.bilateralApiService.GET_bilateralProjects(centerId).subscribe({
          next: ({ response }) => {
            this.projects.set(response?.projects ?? response ?? []);
            this.loading.set(false);
            // `COV-R-15` — read the deep-link params only after the catalog it targets exists,
            // and only once per load (not on every subsequent projects signal write).
            this.applyDeepLinkParams();
          },
          error: () => {
            this.error.set(true);
            this.loading.set(false);
          }
        });
      });
    });
  }

  getProjectResultsCount(project: BilateralProject): number {
    return this.resultsCountByProject().get(Number(project.id)) ?? 0;
  }

  navigateToProjectResults(project: BilateralProject, event?: Event): void {
    event?.stopPropagation();
    const acronym = this.ctx.centerAcronym();
    if (!acronym) return;

    const queryParams: Record<string, unknown> = {
      project: project.id,
      role: 'all',
      source: 'all',
    };

    const versionId = this.effectiveVersionId();
    if (versionId !== null) {
      queryParams['phase'] = versionId;
    }

    void this.router.navigate(['/bilateral', acronym, 'results'], { queryParams });
  }

  setProgramFilter(program: string): void {
    this.selectedProgramFilter.set(program);
    this.selectedMultiProgramOnly.set(false);
  }

  setMultiProgramOnly(active: boolean): void {
    this.selectedMultiProgramOnly.set(active);
    if (active) {
      this.selectedProgramFilter.set('ALL');
    }
  }

  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode.set(mode);
    try {
      sessionStorage.setItem('pr.bilateral.viewMode', mode);
    } catch {
      // Fallback if sessionStorage is not accessible
    }
  }

  resetAllFilters(): void {
    this.searchQuery.set('');
    this.selectedProgramFilter.set('ALL');
    this.selectedMultiProgramOnly.set(false);
  }

  openManualCreate(project: BilateralProject, event?: Event): void {
    event?.stopPropagation?.();
    this.manualCreateFlow.beginFromProject(project, event);
  }

  onSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  /**
   * `COV-R-15`/`COV-DD-9` — `program` (first value) pre-selects the SP quick filter (matched by
   * `programCode`, same case-insensitive comparison `setProgramFilter` already drives), `multi=1`
   * turns on the Multi-Program quick filter, and `project` (first value) highlights + scrolls to
   * the matching card. Read-only: this tab never writes any of these back to the URL.
   */
  private applyDeepLinkParams(): void {
    const { params } = parseBilateralQueryParams(this.activatedRoute.snapshot.queryParamMap);

    if (params.program.length) {
      this.setProgramFilter(params.program[0]);
    }
    if (params.multi) {
      this.selectedMultiProgramOnly.set(true);
    }
    if (params.project.length) {
      this.highlightProject(params.project[0]);
    }
  }

  /** `COV-R-15`/`COV-DD-9` — whether `project` is the one `?project=` highlighted. The live API
   *  returns `id` as a string (e.g. `"1368"`) even though `BilateralProject.id` is typed `number`,
   *  so this always normalizes both sides through `Number()` rather than relying on `===` against
   *  `highlightedProjectId()` directly (which is a number and would never match a string id). */
  isHighlighted(project: BilateralProject): boolean {
    const highlighted = this.highlightedProjectId();
    return highlighted !== null && Number(project.id) === highlighted;
  }

  /** `COV-R-15` — scroll + transient ring for the card matching `projectId`; the catalog itself is
   *  never filtered. No-op when the id does not match a loaded project. */
  private highlightProject(projectId: number): void {
    if (!this.projects().some(p => Number(p.id) === projectId)) return;

    this.highlightedProjectId.set(projectId);
    if (this.highlightTimer) clearTimeout(this.highlightTimer);
    this.highlightTimer = setTimeout(() => this.highlightedProjectId.set(null), PROJECT_HIGHLIGHT_DURATION_MS);

    // Deferred a tick so the `@for` has rendered the card for the just-set `projects` list.
    setTimeout(() => {
      const card = this.elementRef.nativeElement.querySelector(`[data-project-id="${projectId}"]`);
      card?.scrollIntoView({ block: 'center' });
    });
  }
}

function normalize(text: string): string {
  return (text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ');
}
