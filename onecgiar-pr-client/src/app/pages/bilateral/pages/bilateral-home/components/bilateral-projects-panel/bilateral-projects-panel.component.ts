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
// @akili-spec bilateral/project-overview-metrics (BIL-POM-T-3) — `STATUS_KEY_TO_ID.pending` is the
// single source of truth for the "Pending" `status_id`, same import the aggregate uses.
import { parseBilateralQueryParams, STATUS_KEY_TO_ID } from '../../../../bilateral-query-params';

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

  /**
   * `BIL-POM-T-3` — count of results per project with `is_replicated === 1` (raw MySQL tinyint on
   * the wire — see `BilateralCenterResult.is_replicated` docstring — normalized via `Number(...)
   * === 1`, never a strict boolean comparison).
   */
  readonly replicatedCountByProject = computed<Map<number, number>>(() => {
    const rows = this.results();
    const countMap = new Map<number, number>();
    for (const row of rows) {
      const pId = row.project_id != null ? Number(row.project_id) : null;
      if (pId === null || !Number.isSafeInteger(pId) || pId <= 0) continue;
      if (Number(row.is_replicated) !== 1) continue;
      countMap.set(pId, (countMap.get(pId) ?? 0) + 1);
    }
    return countMap;
  });

  /**
   * `BIL-POM-T-3` — count of results per project that are "new for review": NOT replicated
   * (`BIL-POM-AC-3` mutual exclusivity with `replicatedCountByProject`) AND pending review
   * (`status_id === STATUS_KEY_TO_ID.pending`).
   */
  readonly newForReviewCountByProject = computed<Map<number, number>>(() => {
    const rows = this.results();
    const countMap = new Map<number, number>();
    for (const row of rows) {
      const pId = row.project_id != null ? Number(row.project_id) : null;
      if (pId === null || !Number.isSafeInteger(pId) || pId <= 0) continue;
      if (Number(row.is_replicated) === 1) continue;
      if (Number(row.status_id) !== STATUS_KEY_TO_ID.pending) continue;
      countMap.set(pId, (countMap.get(pId) ?? 0) + 1);
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
  readonly refreshing = signal<boolean>(false);

  readonly resultsLoading = computed<boolean>(() => {
    const centerKey = this.ctx.centerId() || this.ctx.centerAcronym();
    const versionId = this.effectiveVersionId();
    if (!centerKey || versionId === null) return false;
    return this.overviewService.resultsLoading(centerKey, versionId)();
  });

  readonly isRefreshing = computed<boolean>(() => this.refreshing() || this.resultsLoading());

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

    // `BIL-POM-OQ-1` correction (2026-09-22) — ONE effect, tracked on both `centerId` and
    // `versionId`, that branches internally rather than splitting into two effects. Two
    // separate effects (one center-tracked, one phase-tracked) raced on the very first
    // resolution — when both signals already have a value on the first flush, effect
    // registration order does not guarantee the phase effect's "already loaded?" check
    // observes the center effect's write before firing too, producing a redundant fetch (and,
    // in one measured case, a third one from a second CD pass). Tracking "did centerId itself
    // change" via a plain closure variable (not a signal — it must NOT retrigger the effect on
    // its own) makes the two paths mutually exclusive by construction: a genuine center change
    // always resets filters and does a full load; a phase-only change (center unchanged) only
    // refreshes `w1w2ContributorCount` in place, never touching search/filter/loading state.
    let lastCenterId: string | null = null;
    effect(() => {
      const centerId = this.ctx.centerId() || this.ctx.centerAcronym();
      const versionId = this.effectiveVersionId();
      if (!centerId) {
        lastCenterId = null;
        return;
      }
      const isNewCenter = centerId !== lastCenterId;
      lastCenterId = centerId;

      untracked(() => {
        if (isNewCenter) {
          this.searchQuery.set('');
          this.selectedProgramFilter.set('ALL');
          this.selectedMultiProgramOnly.set(false);
          this.loading.set(true);
          this.error.set(false);
        }

        this.bilateralApiService.GET_bilateralProjects(centerId, undefined, versionId ?? undefined).subscribe({
          next: ({ response }) => {
            const fetched: BilateralProject[] = response?.projects ?? response ?? [];
            if (isNewCenter) {
              this.projects.set(fetched);
              this.loading.set(false);
              // `COV-R-15` — read the deep-link params only after the catalog it targets exists,
              // and only once per load (not on every subsequent projects signal write).
              this.applyDeepLinkParams();
            } else {
              // Phase-only refresh: merge just the counts a phase switch can change, keep
              // everything else (including any in-progress search/filter) untouched.
              const countByProjectId = new Map(fetched.map(p => [Number(p.id), p.w1w2ContributorCount ?? 0]));
              this.projects.update(list =>
                list.map(p => ({ ...p, w1w2ContributorCount: countByProjectId.get(Number(p.id)) ?? p.w1w2ContributorCount ?? 0 }))
              );
            }
          },
          error: () => {
            if (isNewCenter) {
              this.error.set(true);
              this.loading.set(false);
            }
            // Phase-only refresh failure: non-fatal — the catalog is already loaded.
          }
        });
      });
    });
  }

  getProjectResultsCount(project: BilateralProject): number {
    return this.resultsCountByProject().get(Number(project.id)) ?? 0;
  }

  /** `BIL-POM-T-3` */
  getProjectReplicatedCount(project: BilateralProject): number {
    return this.replicatedCountByProject().get(Number(project.id)) ?? 0;
  }

  /** `BIL-POM-T-3` */
  getProjectNewForReviewCount(project: BilateralProject): number {
    return this.newForReviewCountByProject().get(Number(project.id)) ?? 0;
  }

  /**
   * `BIL-POM-OQ-1` correction — count of W1/W2 results tagged to this project as a contributor.
   * Server-computed (per-project, not derived from `results()`), unlike the three counts above.
   */
  getProjectW1w2ContributorCount(project: BilateralProject): number {
    return project.w1w2ContributorCount ?? 0;
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

  refresh(): void {
    const centerKey = this.ctx.centerId() || this.ctx.centerAcronym();
    const versionId = this.effectiveVersionId();
    this.refreshing.set(true);

    if (centerKey && versionId !== null) {
      this.overviewService.invalidate(centerKey, versionId);
    }

    if (centerKey) {
      this.bilateralApiService.GET_bilateralProjects(centerKey, undefined, versionId ?? undefined).subscribe({
        next: ({ response }) => {
          this.projects.set(response?.projects ?? response ?? []);
          this.refreshing.set(false);
        },
        error: () => {
          this.refreshing.set(false);
        }
      });
    } else {
      this.refreshing.set(false);
    }
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
